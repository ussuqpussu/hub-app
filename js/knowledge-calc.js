// «Знания»: разбор файлов из hub-projects/knowledge и подготовка к показу. Чистые функции, без ИИ.
// Тот же код собирает knowledge/index.json в GitHub Actions (scripts/build-knowledge.mjs) и читает файлы в хабе, если индекса ещё нет.
//
// Хроника: knowledge/chronicle/ГГГГ-ММ-ДД--проект.md
//   ---
//   date: 2026-10-19
//   project: Хаб
//   title: короткий заголовок (необязательно)
//   source: откуда запись (необязательно)
//   ---
//   По проекту Хаб было сделано:
//   - пункт
//   ## Решено
//   - пункт
// Скилл: knowledge/skills/<имя>/SKILL.md и его файлы. Промпт: knowledge/prompts/<имя>.md (title, about, tags, date).

export const KNOWLEDGE_DIR = 'knowledge';
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const unq = (v) => String(v).trim().replace(/^(["'])([\s\S]*)\1$/, '$2').trim();

// Шапка между --- и ---: простые строки «ключ: значение» и списки [a, b].
export function parseFront(text) {
  const src = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    const v = kv[2].trim();
    if (/^\[.*\]$/.test(v)) meta[kv[1]] = v.slice(1, -1).split(',').map(unq).filter(Boolean);
    else meta[kv[1]] = unq(v);
  }
  return { meta, body: src.slice(m[0].length) };
}

const baseName = (p) => String(p).split('/').pop().replace(/\.md$/i, '');

// Одна запись хроники. Пункты без заголовка идут в раздел «Сделано».
export function parseChronicle(path, text) {
  const { meta, body } = parseFront(text);
  const fromName = baseName(path).match(/^(\d{4}-\d{2}-\d{2})(?:--?(.+))?$/);
  const date = YMD.test(meta.date || '') ? meta.date : fromName ? fromName[1] : '';
  const project = String(meta.project || (fromName && fromName[2] ? fromName[2].replace(/-/g, ' ') : '')).trim();
  if (!date || !project) return null;
  const sections = [];
  let cur = null;
  let lead = '';
  const open = (name) => {
    cur = sections.find((s) => s.name === name);
    if (!cur) { cur = { name, items: [] }; sections.push(cur); }
  };
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const h = line.match(/^#{1,6}\s+(.+?)\s*:?\s*$/);
    if (h) { open(h[1]); continue; }
    const it = line.match(/^(?:[-*•–]|\d+[.)])\s+(.+)$/);
    if (it) {
      if (!cur) open('Сделано');
      cur.items.push(it[1].trim());
      continue;
    }
    if (/^по проекту .+ (?:было )?сделано\s*:?$/i.test(line)) { open('Сделано'); continue; }
    if (!cur && !lead) lead = line;
    else if (cur && cur.items.length) cur.items[cur.items.length - 1] += ` ${line}`;
  }
  const clean = sections.filter((s) => s.items.length);
  if (!clean.length) return null;
  return {
    id: baseName(path),
    path,
    date,
    project,
    title: String(meta.title || lead || '').trim(),
    source: String(meta.source || '').trim(),
    sections: clean,
  };
}

// «Версия 1.4 — 2026-10-06» в начале SKILL.md, иначе поля шапки.
export function parseSkill(name, text, files = []) {
  const { meta, body } = parseFront(text);
  const v = body.match(/Версия\s+([\d.]+)\s*[—–-]\s*(\d{4}-\d{2}-\d{2})/);
  return {
    id: String(meta.name || name),
    name: String(meta.name || name),
    about: String(meta.description || '').trim(),
    version: String(meta.version || (v ? v[1] : '')),
    date: YMD.test(meta.date || '') ? meta.date : v ? v[2] : '',
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    body: body.trim(),
    files: files.map(([f, n]) => [String(f), Number(n) || 0]).sort((a, b) => (b[0] === 'SKILL.md') - (a[0] === 'SKILL.md') || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
  };
}

export function parsePrompt(path, text) {
  const { meta, body } = parseFront(text);
  const t = body.trim();
  if (!t) return null;
  const h = t.match(/^#\s+(.+)$/m);
  return {
    id: baseName(path),
    name: String(meta.title || (h ? h[1] : baseName(path))).trim(),
    about: String(meta.about || meta.description || '').trim(),
    tags: Array.isArray(meta.tags) ? meta.tags : meta.tags ? [String(meta.tags)] : [],
    date: YMD.test(meta.date || '') ? meta.date : '',
    body: t,
  };
}

// Новое сверху; внутри дня по названию проекта.
export const sortChronicle = (list) => [...list].sort((a, b) => b.date.localeCompare(a.date) || a.project.localeCompare(b.project, 'ru'));

// files: { chronicle: [{path, text}], skills: [{name, text, files: [[путь, байты]]}], prompts: [{path, text}], tags: {имя: [теги]} }
export function buildKnowledge(files, builtAt = new Date().toISOString()) {
  const tags = (files && files.tags) || {};
  const chronicle = sortChronicle((files.chronicle || []).map((f) => parseChronicle(f.path, f.text)).filter(Boolean));
  const skills = (files.skills || []).map((s) => {
    const k = parseSkill(s.name, s.text, s.files || []);
    if (!k.tags.length && Array.isArray(tags[k.id])) k.tags = tags[k.id];
    return k;
  }).sort((a, b) => a.name.localeCompare(b.name));
  const prompts = (files.prompts || []).map((f) => parsePrompt(f.path, f.text)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  return { v: 1, builtAt, chronicle, skills, prompts };
}

// Индекс из сети или кэша: всё лишнее и битое отбрасывается, чтобы экран не упал.
export function normalizeKnowledge(o) {
  if (!o || typeof o !== 'object') return null;
  const str = (v) => (typeof v === 'string' ? v : '');
  const arr = (v) => (Array.isArray(v) ? v : []);
  const chronicle = arr(o.chronicle).filter((e) => e && YMD.test(e.date) && str(e.project)).map((e) => ({
    id: str(e.id) || `${e.date}--${e.project}`,
    date: e.date,
    project: e.project,
    title: str(e.title),
    source: str(e.source),
    sections: arr(e.sections).map((s) => ({ name: str(s && s.name) || 'Сделано', items: arr(s && s.items).map(String).filter(Boolean) })).filter((s) => s.items.length),
  })).filter((e) => e.sections.length);
  const skills = arr(o.skills).filter((k) => k && str(k.name)).map((k) => ({
    id: str(k.id) || k.name, name: k.name, about: str(k.about), version: str(k.version), date: str(k.date),
    tags: arr(k.tags).map(String), body: str(k.body), files: arr(k.files).filter((f) => Array.isArray(f) && f.length === 2).map(([f, n]) => [String(f), Number(n) || 0]),
  }));
  const prompts = arr(o.prompts).filter((p) => p && str(p.name) && str(p.body)).map((p) => ({
    id: str(p.id) || p.name, name: p.name, about: str(p.about), tags: arr(p.tags).map(String), date: str(p.date), body: p.body,
  }));
  return { v: 1, builtAt: str(o.builtAt), chronicle: sortChronicle(chronicle), skills, prompts };
}

// Проекты хроники: сначала с самой свежей записью.
export function chronicleProjects(list) {
  const map = new Map();
  for (const e of list) {
    const p = map.get(e.project) || { name: e.project, count: 0, last: '' };
    p.count += 1;
    if (e.date > p.last) p.last = e.date;
    map.set(e.project, p);
  }
  return [...map.values()].sort((a, b) => b.last.localeCompare(a.last) || b.count - a.count || a.name.localeCompare(b.name, 'ru'));
}

// Записи по дням: [{date, entries}] в порядке списка.
export function groupByDay(list) {
  const out = [];
  for (const e of list) {
    const last = out[out.length - 1];
    if (last && last.date === e.date) last.entries.push(e);
    else out.push({ date: e.date, entries: [e] });
  }
  return out;
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WD = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
// «19 октября, понедельник»; год пишется, только если он не текущий. «Сегодня» и «Вчера» для свежих дней.
export function dayLabel(ymd, now = new Date()) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((today - dt) / 86400000);
  const base = `${d} ${MONTHS[m - 1]}${y !== now.getFullYear() ? ` ${y}` : ''}`;
  if (diff === 0) return `Сегодня, ${base}`;
  if (diff === 1) return `Вчера, ${base}`;
  return `${base}, ${WD[dt.getDay()]}`;
}

// Слова для поиска по записи хроники.
export const chronicleText = (e) => [e.title, e.source, ...e.sections.flatMap((s) => [s.name, ...s.items])].join(' ');

// Заголовок раздела «Сделано» в карточке: «По проекту Хаб было сделано».
export const doneHeading = (e) => `По проекту ${e.project} было сделано`;
