// Погода на «Сегодня»: хаб сам спрашивает Open-Meteo. Нет сети: остаётся последний ответ, сохранённый на устройстве;
// старый weather.json в репозитории данных читается как запасной путь, если он там есть.
import { createGithub } from './data/github.js';
import { getSession } from './data/vault.js';
import { load, save } from './storage.js';
import { buildWeather } from './weather-fetch.js';

const KEY_WEATHER = 'hub.weather';
const apiBase = () => load('hub.apiBase') || 'https://api.github.com';

function client() {
  const s = getSession();
  if (!s || !s.token || !s.repo) return null;
  return createGithub({ repo: s.repo, token: s.token, apiBase: apiBase() });
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
