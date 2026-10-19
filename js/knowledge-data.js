// «Знания»: чтение hub-projects/knowledge (тот же токен, что у хаба). Сначала готовый index.json, его собирает GitHub Actions;
// если индекса ещё нет, хаб сам читает файлы. Последний удачный ответ хранится на устройстве и показывается без сети.
import { dbGet, dbSet } from './data/db.js';
import { createGithub } from './data/github.js';
import { getSession } from './data/vault.js';
import { load } from './storage.js';
import { projectsRepo } from './projects-data.js';
import { KNOWLEDGE_DIR, normalizeKnowledge, buildKnowledge } from './knowledge-calc.js';

const CACHE_KEY = 'knowledge';
const MAX_FILES = 150;
let state = { data: null, fetchedAt: null, loaded: false, busy: false, error: null };
const listeners = new Set();
const set = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn(state));
};
export const onKnowledge = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const getKnowledgeState = () => state;

const apiBase = () => load('hub.apiBase') || 'https://api.github.com';

function explain(e) {
  if (e && e.kind === 'notfound') return 'Папки knowledge в hub-projects пока нет или токену не выдан доступ к hub-projects';
  if (e && e.kind === 'auth') return 'Токену не выдан доступ к hub-projects: добавь репозиторий в настройках токена на GitHub';
  if (e && e.kind === 'network') return 'Нет связи с GitHub: показана последняя сохранённая версия';
  if (e && e.kind === 'ratelimit') return 'GitHub временно ограничил запросы: попробуй позже';
  return e && e.message ? e.message : 'Не удалось прочитать знания';
}

async function readFiles(gh) {
  const base = KNOWLEDGE_DIR;
  const md = (list) => (list || []).filter((x) => x.type === 'file' && /\.md$/i.test(x.name) && !/^readme\.md$/i.test(x.name));
  const chronicle = [];
  for (const f of md(await gh.listDir(`${base}/chronicle`)).slice(-MAX_FILES)) {
    const t = await gh.getFile(f.path);
    if (t) chronicle.push({ path: `chronicle/${f.name}`, text: t.text });
  }
  const prompts = [];
  for (const f of md(await gh.listDir(`${base}/prompts`)).slice(0, 60)) {
    const t = await gh.getFile(f.path);
    if (t) prompts.push({ path: `prompts/${f.name}`, text: t.text });
  }
  const skills = [];
  for (const d of ((await gh.listDir(`${base}/skills`)) || []).filter((x) => x.type === 'dir').slice(0, 40)) {
    const t = await gh.getFile(`${d.path}/SKILL.md`);
    if (t) skills.push({ name: d.name, text: t.text, files: [['SKILL.md', t.text.length]] });
  }
  return buildKnowledge({ chronicle, skills, prompts });
}

export async function loadKnowledge({ refresh = true } = {}) {
  if (state.busy) return;
  if (!state.loaded) {
    try {
      const c = await dbGet('files', CACHE_KEY);
      const data = c ? normalizeKnowledge(c.data) : null;
      if (data) state = { ...state, data, fetchedAt: c.fetchedAt || null };
    } catch (_) {
      /* кэша нет */
    }
    set({ loaded: true });
  }
  if (!refresh) return;
  const session = getSession();
  const repo = projectsRepo(session);
  if (!session || !session.token || !repo) return;
  set({ busy: true, error: null });
  try {
    const gh = createGithub({ repo, token: session.token, apiBase: apiBase() });
    const idx = await gh.getFile(`${KNOWLEDGE_DIR}/index.json`);
    let data = null;
    if (idx) {
      try { data = normalizeKnowledge(JSON.parse(idx.text)); } catch (_) { data = null; }
    }
    if (!data) {
      const root = await gh.listDir(KNOWLEDGE_DIR);
      if (!root) throw Object.assign(new Error('x'), { kind: 'notfound' });
      data = normalizeKnowledge(await readFiles(gh));
    }
    const fetchedAt = Date.now();
    try { await dbSet('files', CACHE_KEY, { data, fetchedAt }); } catch (_) { /* без кэша тоже работает */ }
    set({ data, fetchedAt, busy: false, error: null });
  } catch (e) {
    set({ busy: false, error: explain(e) });
  }
}
