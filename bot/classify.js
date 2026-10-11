// Правила «задача или заметка» для сообщений бота и ярлыка. Без ИИ, чистая функция.
// Используется и облачной функцией (bot/worker.js), и хабом (js/inbox-import.js для проверки).
import { parseQuick } from '../js/dates.js';
import { normalizeUrl } from '../js/notes-calc.js';

// Слова-действия: сравниваем по началу слова (основа), поэтому «добавить», «добавь», «добавлю» подходят.
export const DEFAULT_ACTIONS = [
  'добав', 'сдела', 'исправ', 'поправ', 'купи', 'позвон', 'провер', 'напиш', 'отправ', 'оплат', 'запиш',
  'подготов', 'созда', 'обнов', 'почин', 'настро', 'сходи', 'забер', 'заказ', 'доработ', 'выложи', 'опубликуй',
  'сдат', 'закро', 'перенес', 'разобр',
];

const COMMANDS = [
  { kind: 'task', re: /^\/(?:з|t|task)(?:@\w+)?(?:\s+|$)/i },
  { kind: 'note', re: /^\/(?:н|n|note)(?:@\w+)?(?:\s+|$)/i },
  { kind: 'question', re: /^\/(?:в|q|question)(?:@\w+)?(?:\s+|$)/i },
];

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"']+/i;
const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е');
const words = (s) => norm(s).split(/[^a-zа-я0-9]+/).filter(Boolean);

export function hasAction(text, actions = DEFAULT_ACTIONS) {
  const ws = words(text);
  return ws.some((w) => actions.some((a) => w.startsWith(norm(a))));
}

// Ищем название проекта в тексте (без учёта регистра), берём самое длинное совпадение.
export function findProject(text, projects) {
  const t = ` ${norm(text)} `;
  let best = null;
  (projects || []).forEach((name) => {
    const n = norm(name).trim();
    if (!n) return;
    const re = new RegExp(`(^|[^a-zа-я0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^a-zа-я0-9])`, 'i');
    if (re.test(t) && (!best || n.length > norm(best).length)) best = name;
  });
  return best;
}

function stripProject(text, name) {
  const re = new RegExp(`(^|[\\s,:;—-])${String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[\\s,:;.!?—-])`, 'i');
  return text.replace(re, ' ').replace(/^[\s,:;—-]+/, '').replace(/\s{2,}/g, ' ').trim();
}

// Возвращает { kind: 'task'|'note'|'link'|'question', title, text, url, project, due, time, by }
// by: 'command' | 'project+action' | 'action' | 'link' | 'default'
export function classify(raw, { projects = [], actions = DEFAULT_ACTIONS, now = new Date() } = {}) {
  let text = String(raw || '').replace(/\r/g, '').trim();
  const empty = { kind: 'note', title: '', text: '', url: '', project: '', due: null, time: null, by: 'default' };
  if (!text) return empty;

  let forced = null;
  for (const c of COMMANDS) {
    if (c.re.test(text)) { forced = c.kind; text = text.replace(c.re, '').trim(); break; }
  }
  if (forced && !text) return { ...empty, kind: forced, by: 'command' };

  const project = findProject(text, projects) || '';

  const asTask = (by) => {
    let body = project ? stripProject(text, project) : text;
    const q = parseQuick(body, now);
    return { kind: 'task', title: q.title || body, text: '', url: '', project, due: q.due, time: q.time, by };
  };

  if (forced === 'task') return asTask('command');
  if (forced === 'question') return { ...empty, kind: 'question', text, project, by: 'command' };
  if (forced === 'note') return { ...empty, kind: 'note', title: '', text, project, by: 'command' };

  const m = text.match(URL_RE);
  if (m) {
    const url = normalizeUrl(m[0].replace(/[.,;!?)]+$/, ''));
    if (url) {
      const rest = text.replace(m[0], ' ').replace(/\s{2,}/g, ' ').trim();
      return { ...empty, kind: 'link', title: rest.split('\n')[0].slice(0, 120), text: rest.split('\n').slice(1).join('\n').trim(), url, project, by: 'link' };
    }
  }
  if (hasAction(text, actions)) return asTask(project ? 'project+action' : 'action');
  return { ...empty, kind: 'note', text, project, by: 'default' };
}

export const KIND_NAME = { task: 'задачу', note: 'заметку', link: 'ссылку', question: 'открытый вопрос' };

// Короткий ответ бота: что именно сделано.
export function describe(c) {
  if (c.kind === 'task') {
    const bits = [`Записала задачу: «${c.title}»`];
    if (c.project) bits.push(`проект ${c.project}`);
    if (c.due) bits.push(`срок ${c.due}${c.time ? ' ' + c.time : ''}`);
    return bits.join(', ') + '.';
  }
  if (c.kind === 'link') return `Сохранила ссылку: ${c.url}`;
  if (c.kind === 'question') return `Записала открытый вопрос: «${c.text.slice(0, 120)}».`;
  return `Записала заметку: «${c.text.slice(0, 120)}${c.text.length > 120 ? '…' : ''}».`;
}

// Формат файла inbox/<id>.json. v: 1.
export function toInbox({ id, source, at, c, msgId = 0 }) {
  return { v: 1, id, source, at, kind: c.kind, title: c.title, text: c.text, url: c.url, project: c.project, due: c.due, time: c.time, msgId, cancelled: false };
}

export function validInbox(o) {
  return !!o && o.v === 1 && typeof o.id === 'string' && /^[\w.-]{6,80}$/.test(o.id) && ['task', 'note', 'link', 'question'].includes(o.kind) && typeof o.at === 'string';
}

// Исправление кнопками: перекладываем уже распознанное в другой вид.
export function reclassify(o, to) {
  if (to === 'x') return { ...o, cancelled: true };
  const body = o.kind === 'task' ? o.title : o.kind === 'link' ? [o.title, o.url].filter(Boolean).join(' ') : o.text;
  if (to === 't') return { ...o, kind: 'task', title: (o.title || body).slice(0, 200), text: '', url: o.kind === 'link' ? '' : o.url, cancelled: false };
  if (to === 'n') return { ...o, kind: 'note', title: '', text: body, due: null, time: null, cancelled: false };
  return o;
}
