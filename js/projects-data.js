// Карточки из Obsidian: чтение приватного репозитория hub-projects (только чтение), локальный кэш.
// Токен тот же, что у хаба; репозиторий проектов берётся рядом с репозиторием данных (владелец тот же).
import { dbGet, dbSet } from './data/db.js';
import { createGithub } from './data/github.js';
import { getSession } from './data/vault.js';
import { load } from './storage.js';
import { parseCard, updateCardText } from './projects-parse.js';
import { normalizeArch, schemaPath } from './arch-calc.js';

const CACHE_KEY = 'obsidian-projects';
const MAX_FILES = 80;
let state = { cards: [], schemas: {}, fetchedAt: null, loaded: false, busy: false, error: null, skipped: 0 };
const listeners = new Set();
const set = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn(state));
};
export const onProjects = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const getProjectsState = () => state;

const apiBase = () => load('hub.apiBase') || 'https://api.github.com';
export function projectsRepo(session = getSession()) {
  const custom = load('hub.projectsRepo');
  if (custom) return custom;
  const owner = session && session.repo ? session.repo.split('/')[0] : '';
  return owner ? `${owner}/hub-projects` : '';
}

function explain(e) {
  if (e && e.kind === 'notfound') return 'Репозиторий hub-projects не найден или токену не выдан к нему доступ';
  if (e && e.kind === 'auth') return 'Токену не выдан доступ к hub-projects: добавь репозиторий в настройках токена на GitHub';
  return e && e.message ? e.message : 'Не удалось прочитать hub-projects';
}

async function collectPaths(gh) {
  const root = await gh.listDir('');
  if (!root) return null;
  const paths = [];
  for (const it of root) {
    if (it.name.startsWith('.')) continue;
    if (it.type === 'file' && /\.md$/i.test(it.name) && !/^readme\.md$/i.test(it.name)) paths.push(it.path);
    else if (it.type === 'dir' && !['node_modules', 'data'].includes(it.name)) {
      const sub = (await gh.listDir(it.path)) || [];
      sub.filter((x) => x.type === 'file' && /\.md$/i.test(x.name)).forEach((x) => paths.push(x.path));
    }
  }
  return paths;
}

export async function loadProjects({ refresh = true } = {}) {
  if (state.busy) return;
  try {
    const c = await dbGet('files', CACHE_KEY);
    if (c && Array.isArray(c.cards)) state = { ...state, cards: c.cards, schemas: c.schemas || {}, fetchedAt: c.fetchedAt };
  } catch (_) {
    /* кэша нет */
  }
  set({ loaded: true });
  if (!refresh) return;
  const session = getSession();
  const repo = projectsRepo(session);
  if (!session.token || !repo) return;
  set({ busy: true, error: null });
  try {
    const gh = createGithub({ repo, token: session.token, apiBase: apiBase() });
    const paths = await collectPaths(gh);
    if (paths === null) throw Object.assign(new Error('x'), { kind: 'notfound' });
    const cards = [];
    let skipped = 0;
    for (const p of paths.slice(0, MAX_FILES)) {
      const f = await gh.getFile(p);
      const card = f ? parseCard(p, f.text) : null;
      if (card) cards.push(card);
      else skipped += 1;
    }
    const schemas = {};
    const sdir = (await gh.listDir('architecture').catch(() => null)) || [];
    for (const it of sdir.filter((x) => x.type === 'file' && /\.json$/i.test(x.name)).slice(0, MAX_FILES)) {
      try {
        const f = await gh.getFile(it.path);
        if (f) schemas[it.path] = normalizeArch(JSON.parse(f.text));
      } catch (_) {
        /* битая схема пропускается */
      }
    }
    const fetchedAt = new Date().toISOString();
    await dbSet('files', CACHE_KEY, { cards, schemas, fetchedAt }).catch(() => {});
    set({ cards, schemas, fetchedAt, skipped: skipped + Math.max(0, paths.length - MAX_FILES) });
  } catch (e) {
    set({ error: explain(e) });
  }
  set({ busy: false });
}

function writeError(e) {
  if (e && (e.kind === 'auth' || e.status === 403 || e.status === 404)) return 'Токену не хватает прав на запись в hub-projects: на GitHub в настройках токена для этого репозитория нужно «Contents: Read and write»';
  if (e && e.kind === 'conflict') return 'Файл изменился на GitHub. Нажми «Обновить» и повтори';
  return e && e.message ? e.message : 'Не удалось сохранить в Obsidian';
}
function client() {
  const session = getSession();
  const repo = projectsRepo(session);
  if (!session.token || !repo) throw new Error('Нет подключения к репозиторию');
  return createGithub({ repo, token: session.token, apiBase: apiBase() });
}
async function persist(cards, schemas = state.schemas) {
  const fetchedAt = new Date().toISOString();
  await dbSet('files', CACHE_KEY, { cards, schemas, fetchedAt }).catch(() => {});
  set({ cards, schemas, fetchedAt });
}

// Правит заметку на GitHub: берёт свежий текст файла, меняет только изменённые поля, отправляет.
export async function saveCard(card, fields) {
  try {
    const gh = client();
    const f = await gh.getFile(card.path);
    if (!f) throw new Error('Заметки уже нет в репозитории. Нажми «Обновить»');
    const before = parseCard(card.path, f.text) || card;
    // Связи не трогаем, если человек их не менял (в копии карточки их могло ещё не быть).
    const same = JSON.stringify(fields.related || []) === JSON.stringify(card.related || []);
    const next = updateCardText(f.text, before, same ? { ...fields, related: before.related } : fields);
    if (next !== f.text) await gh.putFile(card.path, next, f.sha, `Хаб: ${card.name}`);
    const fresh = parseCard(card.path, next) || { ...card, ...fields };
    await persist(state.cards.map((c) => (c.path === card.path ? fresh : c)));
  } catch (e) {
    throw new Error(writeError(e));
  }
}

export async function deleteCard(card) {
  try {
    const gh = client();
    const f = await gh.getFile(card.path);
    if (f) await gh.deleteFile(card.path, f.sha, `Хаб: удалена карточка ${card.name}`);
    const sp = schemaPath(card.path);
    const sf = state.schemas[sp] ? await gh.getFile(sp) : null;
    if (sf) await gh.deleteFile(sp, sf.sha, `Хаб: удалена схема ${card.name}`);
    const rest = { ...state.schemas };
    delete rest[sp];
    await persist(state.cards.filter((c) => c.path !== card.path), rest);
  } catch (e) {
    throw new Error(writeError(e));
  }
}

export const schemaOf = (card) => (card && card.source === 'obsidian' ? state.schemas[schemaPath(card.path)] || null : null);

// Схема карточки из Obsidian лежит файлом architecture/<имя>.json в hub-projects
export async function saveSchema(card, arch) {
  try {
    const gh = client();
    const path = schemaPath(card.path);
    const f = await gh.getFile(path);
    const text = `${JSON.stringify(normalizeArch(arch), null, 2)}\n`;
    await gh.putFile(path, text, f ? f.sha : undefined, `Хаб: схема ${card.name}`);
    await persist(state.cards, { ...state.schemas, [path]: normalizeArch(arch) });
  } catch (e) {
    throw new Error(writeError(e));
  }
}
