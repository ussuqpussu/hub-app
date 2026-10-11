// Разбор заметки Obsidian в карточку проекта. Карточка = заметка с блоком свойств (--- ... ---), где есть company, type или status.
import { STATUS_LABEL } from './projects-calc.js';

const KEYS = {
  company: ['company', 'компания', 'заказчик'],
  types: ['type', 'types', 'тип', 'типы'],
  status: ['status', 'статус'],
  tags: ['tags', 'tag', 'теги'],
  nextAction: ['next', 'nextaction', 'следующее действие', 'дальше'],
  title: ['title', 'название'],
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
    summary: noWiki(sec(s, 'сводка').join('\n').trim()).slice(0, 600),
    events,
    questions: bullets(sec(s, 'открытые вопросы')),
    links: bullets(sec(s, 'ссылки')).map(parseLink).filter(Boolean),
    created: 0,
  };
}
