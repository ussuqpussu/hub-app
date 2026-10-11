// Разбор заметки Obsidian в карточку проекта. Карточка = заметка с блоком свойств (--- ... ---), где есть company, type или status.
import { STATUS_LABEL } from './projects-calc.js';

const KEYS = {
  company: ['company', 'компания', 'заказчик'],
  types: ['type', 'types', 'тип', 'типы'],
  status: ['status', 'статус'],
  tags: ['tags', 'tag', 'теги'],
  nextAction: ['next', 'nextaction', 'следующее действие', 'дальше'],
  title: ['title', 'название'],
  related: ['related', 'связано', 'связи', 'связанные'],
  role: ['role', 'роль', 'что я делаю'],
};
const STATUS_ALIAS = { 'идёт': 'active', 'идет': 'active', 'в работе': 'active', active: 'active', paused: 'paused', 'на паузе': 'paused', pause: 'paused', waiting: 'waiting', 'ждёт заказчика': 'waiting', 'ждет заказчика': 'waiting', done: 'done', 'сдан': 'done', archive: 'archive', archived: 'archive', 'архив': 'archive' };

const unq = (v) => String(v).trim().replace(/^["']|["']$/g, '').trim();
const noWiki = (t) => String(t).replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => b || a);

export function splitFrontmatter(text) {
  const t = String(text).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const m = t.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!m) return { props: null, body: t };
  const props = {};
  let key = null;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([^\s:#-][^:]*):\s*(.*)$/);
    if (kv) {
      key = kv[1].trim().toLowerCase();
      const v = kv[2].trim();
      if (!v) props[key] = [];
      else if (v.startsWith('[') && v.endsWith(']')) props[key] = v.slice(1, -1).split(',').map(unq).filter(Boolean);
      else props[key] = unq(v);
    } else if (key && /^\s*-\s+/.test(line)) {
      if (!Array.isArray(props[key])) props[key] = props[key] ? [props[key]] : [];
      props[key].push(unq(line.replace(/^\s*-\s+/, '')));
    }
  }
  return { props, body: t.slice(m[0].length) };
}

const pick = (props, names) => {
  for (const n of names) if (props[n] !== undefined) return props[n];
  return undefined;
};
const list = (v) => (v === undefined ? [] : Array.isArray(v) ? v : String(v).split(/[,;]/)).map((x) => unq(x).replace(/^#/, '')).filter(Boolean);

function sections(body) {
  const out = {};
  let cur = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (h) { cur = h[1].toLowerCase(); out[cur] = out[cur] || []; } else if (cur) out[cur].push(line);
  }
  return out;
}
const sec = (s, ...names) => {
  for (const n of names) for (const k of Object.keys(s)) if (k.startsWith(n)) return s[k];
  return [];
};
const bullets = (lines) => lines.map((l) => l.match(/^\s*[-*]\s+(.*)$/)).filter(Boolean).map((m) => noWiki(m[1].trim())).filter(Boolean);

function toYmd(d, m, y) {
  const z = (n) => String(n).padStart(2, '0');
  return `${y}-${z(m)}-${z(d)}`;
}
export function parseEvent(line) {
  let m = line.match(/^(\d{4})-(\d{2})-(\d{2})\s*[:—–-]?\s*(.+)$/);
  if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, text: m[4].trim() };
  m = line.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s*[:—–-]?\s*(.+)$/);
  if (m) return { date: toYmd(m[1], m[2], m[3]), text: m[4].trim() };
  return null;
}

function parseLink(line) {
  let m = line.match(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/);
  if (m) return { title: m[1], url: m[2] };
  m = line.match(/^(.*?)[:\s]*(https?:\/\/\S+)$/);
  return m ? { title: m[1].trim(), url: m[2] } : null;
}

// Возвращает карточку или null, если заметка не карточка.
export function parseCard(path, text) {
  const { props, body } = splitFrontmatter(text);
  if (!props) return null;
  const company = pick(props, KEYS.company);
  const types = pick(props, KEYS.types);
  const status = pick(props, KEYS.status);
  if (company === undefined && types === undefined && status === undefined) return null;
  const file = path.split('/').pop().replace(/\.md$/i, '');
  const s = sections(body);
  const events = bullets(sec(s, 'последние события', 'события')).map(parseEvent).filter(Boolean);
  const raw = Array.isArray(status) ? status[0] : status;
  const st = STATUS_ALIAS[String(raw || '').toLowerCase()] || 'active';
  return {
    id: `obs:${path}`,
    source: 'obsidian',
    path,
    name: unq(pick(props, KEYS.title) || file),
    company: Array.isArray(company) ? company[0] || '' : unq(company || ''),
    types: list(types),
    status: STATUS_LABEL[st] ? st : 'active',
    tags: list(pick(props, KEYS.tags)),
    nextAction: noWiki(unq(pick(props, KEYS.nextAction) || '')),
    related: list(pick(props, KEYS.related)).map(noWiki),
    role: noWiki(unq(pick(props, KEYS.role) || '')),
    summary: noWiki(sec(s, 'сводка').join('\n').trim()).slice(0, 600),
    events,
    questions: bullets(sec(s, 'открытые вопросы')),
    links: bullets(sec(s, 'ссылки')).map(parseLink).filter(Boolean),
    created: 0,
  };
}

// ---------- Обратная запись: правим только то, что изменилось, остальное в заметке не трогаем ----------
const GROUP_OF = {};
Object.entries(KEYS).forEach(([g, names]) => names.forEach((n) => { GROUP_OF[n] = g; }));
const DEFAULT_KEY = { company: 'company', types: 'type', status: 'status', tags: 'tags', nextAction: 'next', related: 'related' };
const SECTION_TITLE = { summary: 'Сводка', events: 'Последние события', questions: 'Открытые вопросы', links: 'Ссылки' };
const SECTION_START = { summary: ['сводка'], events: ['последние события', 'события'], questions: ['открытые вопросы'], links: ['ссылки'] };

const q = (v) => (/[:#\[\]{},]|^\s|\s$/.test(v) ? `"${v.replace(/"/g, "'")}"` : v);
const inline = (a) => `[${a.map(q).join(', ')}]`;
function fmValue(group, v) {
  if (group === 'types' || group === 'tags' || group === 'related') return inline(v);
  return v ? q(v) : '';
}

export const SECTION_FIELDS = ['summary', 'events', 'questions', 'links'];
const sectionLines = {
  summary: (v) => (v ? v.split('\n') : []),
  events: (v) => v.map((e) => `- ${e.date}: ${e.text}`),
  questions: (v) => v.map((x) => `- ${x}`),
  links: (v) => v.map((l) => (l.title ? `- [${l.title}](${l.url})` : `- ${l.url}`)),
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// before: карточка, как её разобрали; after: поля из формы (company, types, status, tags, nextAction, summary, events, questions, links).
export function updateCardText(text, before, after) {
  let t = String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const m = t.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  let fmLines = m ? m[1].split('\n') : [];
  let body = m ? t.slice(m[0].length) : t;

  // Блок свойств
  for (const group of ['company', 'types', 'status', 'tags', 'nextAction', 'related']) {
    if (same(before[group], after[group])) continue;
    const value = fmValue(group, after[group]);
    let idx = -1;
    let key = DEFAULT_KEY[group];
    for (let i = 0; i < fmLines.length; i += 1) {
      const kv = fmLines[i].match(/^([^\s:#-][^:]*):\s*(.*)$/);
      if (kv && GROUP_OF[kv[1].trim().toLowerCase()] === group) { idx = i; key = kv[1].trim(); break; }
    }
    const line = `${key}: ${value}`.trimEnd();
    if (idx === -1) {
      if (value !== '' && !(Array.isArray(after[group]) && !after[group].length)) fmLines.push(line);
    } else {
      let end = idx + 1;
      while (end < fmLines.length && /^\s*-\s+/.test(fmLines[end])) end += 1;
      fmLines.splice(idx, end - idx, line);
    }
  }

  // Разделы
  const lines = body.split('\n');
  for (const f of SECTION_FIELDS) {
    if (same(before[f], after[f])) continue;
    const gen = sectionLines[f](after[f]);
    const hIdx = lines.findIndex((l) => {
      const h = l.match(/^#{1,6}\s+(.+?)\s*$/);
      return h && SECTION_START[f].some((n) => h[1].toLowerCase().startsWith(n));
    });
    if (hIdx === -1) {
      if (!gen.length) continue;
      while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
      lines.push('', `## ${SECTION_TITLE[f]}`, ...gen, '');
    } else {
      let end = hIdx + 1;
      while (end < lines.length && !/^#{1,6}\s+/.test(lines[end])) end += 1;
      lines.splice(hIdx + 1, end - hIdx - 1, ...gen, ...(gen.length && end < lines.length ? [''] : []));
    }
  }
  body = lines.join('\n');
  const head = fmLines.length || m ? `---\n${fmLines.join('\n')}\n---\n` : '';
  return head + body;
}
