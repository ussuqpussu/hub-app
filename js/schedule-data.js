// Расписание колледжа: загрузка data/schedule.json из hub-data, локальный кэш, ручное обновление.
// Файл не секретный и лежит открытым текстом. Если данных нет, экран показывает честную заглушку.
import { dbGet, dbSet } from './data/db.js';
import { createGithub } from './data/github.js';
import { getSession } from './data/vault.js';
import { load } from './storage.js';
import { buildSchedule, sheetCsvUrl } from './schedule-parse.js';
import { weekStart, weekType, addDays, todayYmd, fromYmd } from './dates.js';

const CACHE_KEY = 'schedule';
const STALE_DAYS = 8;
let state = { data: null, loaded: false, busy: false, error: null, note: null };
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(state));
const set = (patch) => {
  state = { ...state, ...patch };
  emit();
};

export const onSchedule = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const getScheduleState = () => state;

const apiBase = () => load('hub.apiBase') || 'https://api.github.com';
const github = () => {
  const s = getSession();
  return s.token && s.repo ? createGithub({ repo: s.repo, token: s.token, apiBase: apiBase() }) : null;
};

function valid(d) {
  return !!(d && d.schema === 1 && d.weeks && typeof d.fetchedAt === 'string');
}
const newer = (a, b) => (!a ? b : !b ? a : Date.parse(b.fetchedAt) > Date.parse(a.fetchedAt) ? b : a);

// Читает кэш, затем пробует взять свежий файл из репозитория. Ошибки сети не мешают показать кэш.
export async function loadSchedule() {
  if (state.busy) return;
  let cached = null;
  try {
    const c = await dbGet('files', CACHE_KEY);
    if (valid(c)) cached = c;
  } catch (_) {
    /* кэша нет */
  }
  set({ data: cached, loaded: true, busy: true, error: null, note: null });
  const gh = github();
  if (!gh) {
    set({ busy: false });
    return;
  }
  try {
    const f = await gh.getFile('data/schedule.json');
    if (f) {
      const remote = JSON.parse(f.text);
      if (valid(remote)) {
        const best = newer(cached, remote);
        if (best === remote) await dbSet('files', CACHE_KEY, remote).catch(() => {});
        set({ data: best });
      } else set({ error: 'Файл расписания в репозитории не распознан' });
    } else if (!cached) set({ note: 'Файла расписания в репозитории ещё нет' });
  } catch (e) {
    set({ error: e && e.message ? e.message : 'Не удалось загрузить расписание' });
  }
  set({ busy: false });
}

async function readConfig() {
  const gh = github();
  if (!gh) throw new Error('Нет подключения к репозиторию');
  const f = await gh.getFile('data/schedule-config.json');
  if (!f) throw new Error('В репозитории нет data/schedule-config.json');
  const cfg = JSON.parse(f.text);
  if (!cfg.sheetId || !cfg.group || !cfg.tabs) throw new Error('schedule-config.json заполнен не полностью');
  return cfg;
}

async function applyCsv(csv, errors, cfg) {
  const out = buildSchedule({ csv, config: cfg, previous: state.data, errors, weekTypeOf: weekType });
  out.source = 'browser';
  if (out.weeks.upper.status !== 'ok' && out.weeks.lower.status !== 'ok') {
    set({ error: out.warnings.map((w) => w.text).join('; ') || 'Таблица не распознана' });
    return;
  }
  await dbSet('files', CACHE_KEY, out).catch(() => {});
  set({ data: out, error: null, note: 'Обновлено из таблицы напрямую, на этом устройстве' });
}

// Кнопка «Обновить сейчас»: напрямую из Google Таблицы. CORS не проверен; при отказе подсказываем загрузку файла.
export async function refreshNow() {
  set({ busy: true, error: null, note: null });
  try {
    const cfg = await readConfig();
    const csv = {};
    const errors = {};
    for (const key of ['upper', 'lower']) {
      try {
        const res = await fetch(sheetCsvUrl(cfg.sheetId, cfg.tabs[key]), { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        csv[key] = await res.text();
      } catch (e) {
        errors[key] = `Не удалось скачать вкладку (${e.message}). Возможно, Google не пускает браузер; загрузи файл вручную`;
      }
    }
    await applyCsv(csv, errors, cfg);
  } catch (e) {
    set({ error: e.message || 'Не удалось обновить' });
  }
  set({ busy: false });
}

// Запасной путь: файл CSV, выгруженный из таблицы вручную (одна вкладка = один файл).
export async function importCsvFiles(files) {
  set({ busy: true, error: null, note: null });
  try {
    const cfg = await readConfig();
    const csv = {};
    for (const [key, file] of Object.entries(files)) csv[key] = await file.text();
    // вкладка, которую не загрузили, берётся из прошлых данных
    await applyCsv(csv, {}, cfg);
  } catch (e) {
    set({ error: e.message || 'Не удалось прочитать файл' });
  }
  set({ busy: false });
}

// Какая неделя таблицы подходит к понедельнику start. exact: дата на вкладке совпала с понедельником.
export function weekFor(data, start) {
  if (!valid(data)) return null;
  const key = weekType(start) === 'верхняя' ? 'upper' : 'lower';
  const w = data.weeks[key];
  if (!w || !w.days || !w.days.length) return { key, week: null, exact: false };
  const exact = !!w.monday && w.monday === start;
  return { key, week: w, exact };
}

export function isStale(data, now = Date.now()) {
  return valid(data) && now - Date.parse(data.fetchedAt) > STALE_DAYS * 24 * 3600 * 1000;
}

// Текущая пара по времени устройства: 'now' | 'next' | 'past' | 'later'
export function pairPhase(pair, date, now = new Date()) {
  if (!pair.start || !pair.end) return 'later';
  const [h1, m1] = pair.start.split(':').map(Number);
  const [h2, m2] = pair.end.split(':').map(Number);
  const a = new Date(fromYmd(date)); a.setHours(h1, m1, 0, 0);
  const b = new Date(fromYmd(date)); b.setHours(h2, m2, 0, 0);
  if (now >= a && now < b) return 'now';
  if (now >= b) return 'past';
  return 'later';
}

// Пары дня по дате: { pairs, exact, key } или null
export function pairsOn(data, date) {
  const start = weekStart(date);
  const wf = weekFor(data, start);
  if (!wf || !wf.week) return null;
  const idx = Math.round((fromYmd(date) - fromYmd(start)) / 86400000);
  const day = wf.week.days.find((d) => d.day === idx + 1);
  return { pairs: day ? day.pairs : [], exact: wf.exact, key: wf.key, status: wf.week.status };
}
export { addDays, todayYmd };
