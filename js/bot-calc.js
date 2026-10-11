// Мост между ботом и хабом: разбор файлов inbox/, конфиг для бота, статус «Пульса». Чистые функции.
import { validInbox } from '../bot/classify.js';
import { normalizeUrl } from './notes-calc.js';
import { isYmd, isHm } from './dates.js';

// Файл inbox -> { module, id, fields } или null (отменено/повреждено). id постоянный, повторный разбор ничего не дублирует.
export function inboxToRecord(o, now = Date.now()) {
  if (!validInbox(o)) return { skip: 'bad' };
  if (o.cancelled) return { skip: 'cancelled' };
  const id = `in-${o.id}`;
  const str = (v, max = 4000) => String(v == null ? '' : v).slice(0, max);
  if (o.kind === 'task') {
    const title = str(o.title, 300).trim() || str(o.text, 300).trim();
    if (!title) return { skip: 'bad' };
    return { module: 'tasks', id, fields: { title, due: isYmd(o.due) ? o.due : null, time: isHm(o.time) ? o.time : null, project: str(o.project, 120), done: false, main: false } };
  }
  if (o.kind === 'link') {
    const url = normalizeUrl(o.url);
    if (!url) return { skip: 'bad' };
    return { module: 'notes', id, fields: { kind: 'link', title: str(o.title, 200), text: str(o.text), url, tags: [], from: o.source } };
  }
  if (o.kind === 'question') {
    const text = str(o.text).trim();
    if (!text) return { skip: 'bad' };
    return { module: 'questions', id, fields: { origin: 'manual', text, projectId: '', projectName: str(o.project, 120), who: 'unset', status: 'open', created: now } };
  }
  const text = str(o.text).trim() || str(o.title).trim();
  if (!text) return { skip: 'bad' };
  return { module: 'notes', id, fields: { kind: 'note', title: '', text, tags: [], from: o.source } };
}

// Конфиг для бота: названия проектов (для привязки задач), адреса сайтов (для «Пульса»), свои слова-действия.
export function buildBotConfig(projects, actions = []) {
  const site = (p) => (p.links || []).find((l) => /сайт|site|web/i.test(l.title || '') || (!/t\.me|telegram|vk\.|dzen/i.test(l.url) && /^https?:/.test(l.url)));
  const list = (projects || []).filter((p) => p && p.name && p.status !== 'archive').map((p) => {
    const s = site(p);
    const url = s && /^https?:\/\//i.test(s.url) ? s.url : '';
    return url ? { name: p.name, url } : { name: p.name };
  }).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const acts = [...new Set((actions || []).map((a) => String(a).trim().toLowerCase()).filter((a) => a.length >= 3))].slice(0, 100);
  return { v: 1, projects: list, actions: acts };
}

export const parseActions = (s) => [...new Set(String(s || '').split(/[,;\n]+/).map((x) => x.trim().toLowerCase()).filter((x) => x.length >= 3))].slice(0, 100);

// Состояние сайта проекта из pulse/status.json.
export function pulseFor(status, project) {
  if (!status || !Array.isArray(status.targets) || !project) return null;
  const t = status.targets.find((x) => x.name === project.name);
  return t ? { ok: t.ok, code: t.code, since: t.since, checkedAt: status.checkedAt } : null;
}
