// Карточки из Obsidian: чтение приватного репозитория hub-projects (только чтение), локальный кэш.
// Токен тот же, что у хаба; репозиторий проектов берётся рядом с репозиторием данных (владелец тот же).
import { dbGet, dbSet } from './data/db.js';
import { createGithub } from './data/github.js';
import { getSession } from './data/vault.js';
import { load } from './storage.js';
import { parseCard } from './projects-parse.js';

const CACHE_KEY = 'obsidian-projects';
const MAX_FILES = 80;
let state = { cards: [], fetchedAt: null, loaded: false, busy: false, error: null, skipped: 0 };
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
    if (c && Array.isArray(c.cards)) state = { ...state, cards: c.cards, fetchedAt: c.fetchedAt };
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
    const fetchedAt = new Date().toISOString();
    await dbSet('files', CACHE_KEY, { cards, fetchedAt }).catch(() => {});
    set({ cards, fetchedAt, skipped: skipped + Math.max(0, paths.length - MAX_FILES) });
  } catch (e) {
    set({ error: explain(e) });
  }
  set({ busy: false });
}
