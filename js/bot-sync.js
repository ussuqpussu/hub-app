// Разбор папки inbox/ репозитория данных, отправка конфига боту, чтение статуса «Пульса».
// Без токена ничего не делает. Все запросы идут тем же токеном, что и синхронизация.
import { createGithub } from './data/github.js';
import { getSession } from './data/vault.js';
import { load, save } from './storage.js';
import { inboxToRecord, buildBotConfig, pulseFor } from './bot-calc.js';
import { buildWeather } from '../bot/weather.js';

const KEY_DONE = 'hub.inboxDone';
const KEY_LAST = 'hub.inboxLast';
const KEY_PULSE = 'hub.pulse';
const KEY_CFG = 'hub.botConfigSent';
const KEY_HUBERR = 'hub.hubErrSent';
const KEY_WEATHER = 'hub.weather';
const KEY_ACTIONS = 'hub.botActions';
const apiBase = () => load('hub.apiBase') || 'https://api.github.com';

function client() {
  const s = getSession();
  if (!s || !s.token || !s.repo) return null;
  return createGithub({ repo: s.repo, token: s.token, apiBase: apiBase() });
}

export const getLast = () => load(KEY_LAST, null);
export const getPulse = () => load(KEY_PULSE, null);
export const getActions = () => load(KEY_ACTIONS, []);
export const setActions = (list) => save(KEY_ACTIONS, list);
export const pulseOf = (project) => pulseFor(getPulse(), project);

let busy = false;
let lastRun = 0;

// Возвращает {imported, cancelled, bad, error}. Файл удаляется только после того, как запись принята хабом.
export async function importInbox({ store, gh = client(), force = false, now = Date.now() }) {
  if (!gh) return { imported: 0, cancelled: 0, bad: 0, error: 'notoken' };
  if (busy || (!force && now - lastRun < 60000)) return { imported: 0, cancelled: 0, bad: 0, skipped: true };
  busy = true;
  lastRun = now;
  const out = { imported: 0, cancelled: 0, bad: 0, error: null };
  try {
    const dir = await gh.listDir('inbox');
    const files = (dir || []).filter((f) => f.type === 'file' && /\.json$/.test(f.name));
    const done = new Set(load(KEY_DONE, []));
    for (const f of files) {
      const file = await gh.getFile(f.path);
      if (!file) continue;
      let o = null;
      try { o = JSON.parse(file.text); } catch (_) { o = null; }
      const rec = inboxToRecord(o, now);
      if (rec.skip === 'bad') { out.bad += 1; continue; } // битый файл оставляем на месте, чтобы можно было посмотреть
      if (!rec.skip && !done.has(rec.id)) {
        const exists = store.list(rec.module).some((x) => x.id === rec.id);
        if (!exists) await store.upsert(rec.module, rec.id, rec.fields);
        done.add(rec.id);
        out.imported += 1;
      } else if (rec.skip === 'cancelled') out.cancelled += 1;
      try {
        await gh.deleteFile(f.path, file.sha, 'inbox: принято хабом');
      } catch (_) { /* удалим при следующем разборе, запись уже в хабе и дубля не будет */ }
    }
    save(KEY_DONE, [...done].slice(-300));
  } catch (e) {
    out.error = e && e.kind ? e.kind : 'error';
  } finally {
    busy = false;
  }
  save(KEY_LAST, { at: now, imported: out.imported, cancelled: out.cancelled, bad: out.bad, error: out.error });
  return out;
}

// Статус «Пульса» для карточек проектов.
export async function refreshPulse({ gh = client() } = {}) {
  if (!gh) return null;
  try {
    const f = await gh.getFile('pulse/status.json');
    if (!f) return null;
    const st = JSON.parse(f.text);
    save(KEY_PULSE, st);
    return st;
  } catch (_) {
    return getPulse();
  }
}

// Список проектов и сайтов для бота. Пишем, только если что-то изменилось.
export async function sendBotConfig(projects, { gh = client() } = {}) {
  if (!gh || !projects || !projects.length) return false;
  const cfg = buildBotConfig(projects, getActions());
  const text = JSON.stringify(cfg, null, 2);
  const sig = text.length + ':' + [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
  if (load(KEY_CFG, '') === sig) return false;
  try {
    const cur = await gh.getFile('bot-config.json');
    if (!cur || cur.text !== text) await gh.putFile('bot-config.json', text, cur ? cur.sha : null, 'bot: список проектов');
    save(KEY_CFG, sig);
    return true;
  } catch (_) {
    return false;
  }
}

// Сообщение об ошибке самого хаба: бот прочитает pulse/hub.json и напишет один раз. errors: [{id,text}]
export async function reportHubErrors(errors, { gh = client() } = {}) {
  if (!gh) return false;
  const text = JSON.stringify({ v: 1, errors }, null, 2);
  if (load(KEY_HUBERR, '[]') === JSON.stringify(errors)) return false;
  try {
    const cur = await gh.getFile('pulse/hub.json');
    await gh.putFile('pulse/hub.json', text, cur ? cur.sha : null, 'hub: состояние');
    save(KEY_HUBERR, JSON.stringify(errors));
    return true;
  } catch (_) {
    return false;
  }
}

// Погода: хаб сам спрашивает Open-Meteo (бесплатно, без ключа, ответ доступен браузеру напрямую).
// Не получилось (нет сети, сервис недоступен) — берём weather.json из репозитория данных, если облачная функция его кладёт,
// иначе остаётся последний ответ, сохранённый на устройстве. Доступность Open-Meteo из России: не проверено.
export const getWeather = () => load(KEY_WEATHER, null);
const WEATHER_TTL = 30 * 60 * 1000;
const timed = (ms) => (url) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms); return fetch(url, { signal: c.signal }).finally(() => clearTimeout(t)); };
let weatherBusy = null;
export function refreshWeather(opts = {}) {
  if (weatherBusy && !opts.force) return weatherBusy;
  const p = loadWeather(opts).finally(() => { if (weatherBusy === p) weatherBusy = null; });
  weatherBusy = p;
  return p;
}
async function loadWeather({ gh = client(), force = false, fetchImpl = timed(8000) } = {}) {
  const prev = getWeather();
  const age = prev && Date.parse(prev.fetchedAt || '');
  if (!force && Number.isFinite(age) && Date.now() - age < WEATHER_TTL) return prev;
  try {
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      const { fresh, data } = await buildWeather(prev, fetchImpl);
      if (fresh) { save(KEY_WEATHER, data); return data; }
    }
  } catch (_) { /* пробуем файл из репозитория */ }
  if (!gh) return prev;
  try {
    const f = await gh.getFile('weather.json');
    if (!f) return prev;
    const w = JSON.parse(f.text);
    if (!prev || Date.parse(w.fetchedAt || '') > Date.parse(prev.fetchedAt || 0)) save(KEY_WEATHER, w);
    return getWeather();
  } catch (_) {
    return prev;
  }
}
