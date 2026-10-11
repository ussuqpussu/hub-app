// Расчёты вкладки «Проекты»: признаки, фильтры, группировка, сортировка. Без обращения к странице, поэтому проверяется тестами.
export const STATUS_LABEL = { active: 'Идёт', paused: 'На паузе', waiting: 'Ждёт заказчика', done: 'Сдан', archive: 'Архив' };
export const STATUS_ORDER = ['active', 'waiting', 'paused', 'done', 'archive'];
export const DEFAULT_TYPES = ['Сайт', 'Telegram-бот', 'PWA или приложение', 'Контент', 'Умный дом', 'Личное', 'Учёба'];
export const NO_COMPANY = 'Без компании';
export const NO_TYPE = 'Без типа';
export const SORTS = { recent: 'По последнему событию', name: 'По названию', status: 'По статусу', created: 'По дате создания' };
export const GROUPS = { none: 'Без групп', company: 'Компании', type: 'Типы', status: 'Статусы' };

const uniq = (a) => [...new Set(a)];
const clean = (s) => String(s || '').trim().replace(/\s+/g, ' ');

export function parseTags(raw) {
  return uniq(String(raw || '').split(/[,;\n]/).map((t) => clean(t).replace(/^#/, '')).filter(Boolean)).slice(0, 20);
}

export function normalizeProject(p) {
  return {
    ...p,
    company: clean(p.company),
    types: Array.isArray(p.types) ? uniq(p.types.map(clean).filter(Boolean)) : [],
    status: STATUS_LABEL[p.status] ? p.status : 'active',
    tags: Array.isArray(p.tags) ? p.tags : [],
    summary: p.summary || '',
    nextAction: p.nextAction || '',
    role: p.role || '',
    events: (Array.isArray(p.events) ? p.events : []).filter((e) => e && typeof e.date === 'string' && typeof e.text === 'string').sort((a, b) => b.date.localeCompare(a.date) || (b.at || 0) - (a.at || 0)),
    links: Array.isArray(p.links) ? p.links : [],
  };
}

// Дата последнего события (или создания) в виде YYYY-MM-DD.
export function lastActivity(p) {
  if (p.events && p.events.length) return p.events[0].date;
  const d = new Date(p.created || 0);
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function companies(list) {
  return uniq(list.map((p) => p.company).filter(Boolean)).sort((a, b) => a.localeCompare(b, 'ru'));
}
export function typeOptions(list) {
  return uniq([...DEFAULT_TYPES, ...list.flatMap((p) => p.types)]);
}

export function filterProjects(list, { company = null, type = null, status = null, query = '' } = {}) {
  const q = clean(query).toLocaleLowerCase('ru');
  return list.filter((p) => {
    if (company !== null && (company === NO_COMPANY ? p.company : p.company !== company)) return false;
    if (type !== null && (type === NO_TYPE ? p.types.length : !p.types.includes(type))) return false;
    if (status !== null && p.status !== status) return false;
    if (q && !(p.name.toLocaleLowerCase('ru').includes(q) || p.tags.some((t) => t.toLocaleLowerCase('ru').includes(q)))) return false;
    return true;
  });
}

export function sortProjects(list, sort = 'recent') {
  const by = {
    recent: (a, b) => lastActivity(b).localeCompare(lastActivity(a)) || a.name.localeCompare(b.name, 'ru'),
    name: (a, b) => a.name.localeCompare(b.name, 'ru'),
    status: (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.name.localeCompare(b.name, 'ru'),
    created: (a, b) => (b.created || 0) - (a.created || 0),
  }[sort] || (() => 0);
  return [...list].sort(by);
}

// Группы идут по алфавиту (статусы по порядку); «Без …» всегда в конце. Проект с несколькими типами попадает в каждую группу.
export function groupProjects(list, by = 'none') {
  if (by === 'none') return [{ key: '', label: '', items: list }];
  const keys = (p) => (by === 'company' ? [p.company || NO_COMPANY] : by === 'type' ? (p.types.length ? p.types : [NO_TYPE]) : [p.status]);
  const map = new Map();
  list.forEach((p) => keys(p).forEach((k) => map.set(k, [...(map.get(k) || []), p])));
  const rank = (k) => (by === 'status' ? STATUS_ORDER.indexOf(k) : k === NO_COMPANY || k === NO_TYPE ? 1e6 : 0);
  return [...map.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || String(a[0]).localeCompare(String(b[0]), 'ru'))
    .map(([key, items]) => ({ key, label: by === 'status' ? STATUS_LABEL[key] : key, items }));
}

// Цвет буквы на карточке: стабильный номер 1..7 по названию.
export function colorIndex(name) {
  let h = 0;
  for (const ch of String(name || '')) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return (h % 7) + 1;
}

export const gaps = (p) => [!p.company && 'компания', !p.types.length && 'тип'].filter(Boolean);

// Связи между карточками. Ссылка на карточку = её название (без запятых и лишних пробелов, регистр не важен).
export const refKey = (s) => String(s || '').toLowerCase().replace(/[,\s]+/g, ' ').trim();
export const refOf = (p) => String(p.name || '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

// Кто связан с карточкой p: та же компания (сама), связи, записанные в этой карточке, и те, кто ссылается на неё.
export function relatedProjects(list, p) {
  const me = refKey(p.name);
  const others = list.filter((x) => x.id !== p.id);
  const sameCompany = p.company ? others.filter((x) => refKey(x.company) === refKey(p.company)) : [];
  const taken = new Set(sameCompany.map((x) => x.id));
  const manual = (p.related || []).map((r) => others.find((x) => refKey(x.name) === refKey(r))).filter((x) => x && !taken.has(x.id));
  manual.forEach((x) => taken.add(x.id));
  const back = others.filter((x) => !taken.has(x.id) && (x.related || []).some((r) => refKey(r) === me));
  const missing = (p.related || []).filter((r) => !others.some((x) => refKey(x.name) === refKey(r)));
  return { sameCompany, manual: [...new Set(manual)], back, missing };
}
