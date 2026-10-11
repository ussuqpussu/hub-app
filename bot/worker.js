// Облачная функция (Cloudflare Workers): Telegram-бот хаба, приём из ярлыка iPhone, «Пульс проектов».
// Секреты (только в настройках Worker, не в коде): BOT_TOKEN, WEBHOOK_SECRET, OWNER_ID, GH_TOKEN, SHARE_KEY.
// Переменные (не секретные): DATA_REPO (логин/hub-data), TZ_OFFSET_MIN (смещение от UTC в минутах, по умолчанию 180).
import { classify, describe, toInbox, validInbox, reclassify, DEFAULT_ACTIONS } from './classify.js';
import { evaluatePulse, checkTarget } from './pulse.js';
import { buildWeather } from './weather.js';

const enc = new TextEncoder();
const dec = new TextDecoder();
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

function b64(text) {
  const bytes = enc.encode(text);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function unb64(s) {
  const bin = atob(String(s).replace(/\n/g, ''));
  return dec.decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

// Сравнение за постоянное время, чтобы ключ нельзя было подобрать по скорости ответа.
function same(a, b) {
  const x = enc.encode(String(a || ''));
  const y = enc.encode(String(b || ''));
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}

// ---- GitHub (репозиторий данных) ----
function gh(env, fetchImpl = fetch) {
  const base = `https://api.github.com/repos/${env.DATA_REPO}/contents/`;
  const h = { Authorization: `Bearer ${env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'hub-bot' };
  const u = (p) => base + p.split('/').map(encodeURIComponent).join('/');
  return {
    async get(path) {
      const r = await fetchImpl(u(path), { headers: h });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`GitHub ${r.status}`);
      const b = await r.json();
      return { sha: b.sha, text: unb64(b.content) };
    },
    async put(path, text, sha, message) {
      const r = await fetchImpl(u(path), { method: 'PUT', headers: { ...h, 'content-type': 'application/json' }, body: JSON.stringify({ message, content: b64(text), ...(sha ? { sha } : {}) }) });
      if (!r.ok) throw new Error(`GitHub ${r.status}`);
      return r.json();
    },
  };
}

// ---- Telegram ----
async function tg(env, method, body, fetchImpl = fetch) {
  const r = await fetchImpl(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return r.json().catch(() => ({}));
}
const keyboard = (id) => ({ inline_keyboard: [[
  { text: 'В заметки', callback_data: `n:${id}` },
  { text: 'В задачи', callback_data: `t:${id}` },
  { text: 'Отменить', callback_data: `x:${id}` },
]] });

function newId(now = Date.now()) {
  const d = new Date(now).toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return `${d}-${Math.random().toString(36).slice(2, 7)}`;
}

// Конфиг от хаба: названия проектов и адреса сайтов. Файл bot-config.json в репозитории данных.
const cfgCache = { at: 0, v: null };
async function readConfig(env, fetchImpl) {
  if (cfgCache.v && Date.now() - cfgCache.at < 300000) return cfgCache.v;
  let v = { projects: [], actions: [] };
  try {
    const f = await gh(env, fetchImpl).get('bot-config.json');
    if (f) v = { ...v, ...JSON.parse(f.text) };
  } catch (_) { /* работаем с пустым конфигом */ }
  cfgCache.at = Date.now();
  cfgCache.v = v;
  return v;
}

async function saveInbox(env, o, fetchImpl) {
  await gh(env, fetchImpl).put(`inbox/${o.id}.json`, JSON.stringify(o, null, 2), null, `inbox: ${o.source} ${o.kind}`);
}

const HELP = [
  'Я записываю сообщения в хаб.',
  '/t (/з) текст: задача; /n (/н) текст: заметка; /q (/в) текст: открытый вопрос.',
  'Без команды: ссылка уходит в закладки; название проекта и слово-действие дают задачу; остальное в заметки.',
  'Сроки понимаю: завтра, в пятницу, в 15:00.',
].join('\n');

export async function handleTelegram(update, env, fetchImpl = fetch, now = Date.now()) {
  const owner = String(env.OWNER_ID || '');
  // Кнопки исправления
  if (update.callback_query) {
    const cq = update.callback_query;
    if (!owner || String(cq.from && cq.from.id) !== owner) return;
    const [to, id] = String(cq.data || '').split(':');
    const answer = (text) => tg(env, 'answerCallbackQuery', { callback_query_id: cq.id, text }, fetchImpl);
    if (!['n', 't', 'x'].includes(to) || !/^[\w.-]{6,80}$/.test(id || '')) return answer('Не понял кнопку');
    const api = gh(env, fetchImpl);
    const f = await api.get(`inbox/${id}.json`).catch(() => undefined);
    if (f === undefined) return answer('Не получилось связаться с GitHub, попробуй ещё раз');
    if (!f) return answer('Хаб уже забрал запись. Исправь её в самом хабе.');
    let o;
    try { o = JSON.parse(f.text); } catch (_) { return answer('Запись повреждена'); }
    if (!validInbox(o)) return answer('Запись повреждена');
    const next = reclassify(o, to);
    await api.put(`inbox/${id}.json`, JSON.stringify(next, null, 2), f.sha, `inbox: fix ${to}`);
    const label = to === 'x' ? 'Отменено.' : to === 't' ? 'Теперь это задача.' : 'Теперь это заметка.';
    if (cq.message) await tg(env, 'editMessageText', { chat_id: cq.message.chat.id, message_id: cq.message.message_id, text: label }, fetchImpl);
    return answer(label);
  }

  const msg = update.message;
  if (!msg || !msg.text) return;
  // Чужие сообщения игнорируем молча.
  if (!owner || String(msg.from && msg.from.id) !== owner) return;
  const chat = msg.chat.id;
  const t = msg.text.trim();
  if (/^\/(start|help)(@\w+)?$/i.test(t)) return tg(env, 'sendMessage', { chat_id: chat, text: HELP }, fetchImpl);

  const cfg = await readConfig(env, fetchImpl);
  const off = Number(env.TZ_OFFSET_MIN ?? 180);
  const local = new Date(now + (Number.isFinite(off) ? off : 180) * 60000);
  const c = classify(t, { projects: cfg.projects.map((p) => p.name || p), actions: [...DEFAULT_ACTIONS, ...(cfg.actions || [])], now: local });
  const id = newId(now);
  const o = toInbox({ id, source: 'bot', at: new Date(now).toISOString(), c, msgId: msg.message_id });
  try {
    await saveInbox(env, o, fetchImpl);
  } catch (_) {
    return tg(env, 'sendMessage', { chat_id: chat, text: 'Не получилось записать в GitHub. Сообщение не сохранено, отправь ещё раз позже.' }, fetchImpl);
  }
  return tg(env, 'sendMessage', { chat_id: chat, text: describe(c), reply_markup: keyboard(id) }, fetchImpl);
}

// Ярлык iPhone: POST /share {key, text, source}
export async function handleShare(body, env, fetchImpl = fetch, now = Date.now()) {
  if (!env.SHARE_KEY || !same(body && body.key, env.SHARE_KEY)) return { status: 401, out: { ok: false, error: 'key' } };
  const text = String((body && body.text) || '').trim().slice(0, 8000);
  if (!text) return { status: 400, out: { ok: false, error: 'empty' } };
  const cfg = await readConfig(env, fetchImpl);
  const off = Number(env.TZ_OFFSET_MIN ?? 180);
  const local = new Date(now + (Number.isFinite(off) ? off : 180) * 60000);
  const c = classify(text, { projects: cfg.projects.map((p) => p.name || p), actions: [...DEFAULT_ACTIONS, ...(cfg.actions || [])], now: local });
  const o = toInbox({ id: newId(now), source: 'share', at: new Date(now).toISOString(), c });
  try { await saveInbox(env, o, fetchImpl); } catch (_) { return { status: 502, out: { ok: false, error: 'github' } }; }
  return { status: 200, out: { ok: true, kind: c.kind } };
}

// «Пульс проектов»: запускается по расписанию (cron). Состояние хранится в pulse/status.json репозитория данных.
export async function runPulse(env, fetchImpl = fetch, now = Date.now()) {
  const api = gh(env, fetchImpl);
  const cfg = await readConfig(env, fetchImpl);
  const targets = (cfg.projects || []).filter((p) => p && p.url).map((p) => ({ name: p.name, url: p.url }));
  const prevFile = await api.get('pulse/status.json').catch(() => null);
  let prev = {};
  try { prev = prevFile ? JSON.parse(prevFile.text) : {}; } catch (_) { prev = {}; }
  const checks = await Promise.all(targets.map((t) => checkTarget(t, fetchImpl)));
  let hubErrors = [];
  try {
    const hf = await api.get('pulse/hub.json');
    if (hf) hubErrors = (JSON.parse(hf.text).errors || []).filter((e) => e && e.id && e.text);
  } catch (_) { /* ошибок хаба нет или файл не читается */ }
  const { status, messages } = evaluatePulse(prev, checks, hubErrors, now);
  for (const text of messages) await tg(env, 'sendMessage', { chat_id: env.OWNER_ID, text }, fetchImpl);
  await api.put('pulse/status.json', JSON.stringify(status, null, 2), prevFile ? prevFile.sha : null, 'pulse: status');
  return { checked: checks.length, sent: messages.length };
}

// Погода раз в 30 минут (запуск по расписанию каждые 5 минут, погоду берём на :00 и :30).
export async function runWeather(env, fetchImpl = fetch, now = Date.now()) {
  const api = gh(env, fetchImpl);
  const f = await api.get('weather.json').catch(() => null);
  let prev = null;
  try { prev = f ? JSON.parse(f.text) : null; } catch (_) { prev = null; }
  const { fresh, data } = await buildWeather(prev, fetchImpl, now);
  if (!fresh) return { fresh: 0 }; // ничего нового: старый файл не трогаем
  await api.put('weather.json', JSON.stringify(data, null, 2), f ? f.sha : null, 'weather: обновление');
  return { fresh };
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/health') return new Response('ok');
    if (req.method !== 'POST') return new Response('not found', { status: 404 });
    if (url.pathname === '/tg') {
      if (!same(req.headers.get('x-telegram-bot-api-secret-token'), env.WEBHOOK_SECRET) || !env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
      const update = await req.json().catch(() => null);
      // Telegram ждёт быстрого ответа: основную работу доделываем после ответа.
      if (update) ctx.waitUntil(handleTelegram(update, env).catch(() => {}));
      return json({ ok: true });
    }
    if (url.pathname === '/share') {
      const body = await req.json().catch(() => null);
      const { status, out } = await handleShare(body, env);
      return json(out, status);
    }
    return new Response('not found', { status: 404 });
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runPulse(env).catch(() => {}));
    if (new Date(event.scheduledTime || Date.now()).getMinutes() % 30 < 5) ctx.waitUntil(runWeather(env).catch(() => {}));
  },
};
