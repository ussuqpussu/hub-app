// Доска «Открытые вопросы»: сбор вопросов из карточек проектов и ручных записей, статусы, группировка, текст для заказчика.
import { refKey } from './projects-calc.js';

export const Q_STATUS = { open: 'Открыт', postponed: 'Отложен', resolved: 'Решён' };
export const Q_WHO = { unset: 'Не указано', customer: 'Заказчик', me: 'Я сам', other: 'Кто-то ещё' };
export const NO_PROJECT = 'Без проекта';

export const keyOf = (projectId, text) => `${projectId}|${refKey(text)}`;

// projects: нормализованные карточки (с questions), records: записи модуля questions.
// Вопрос из карточки живёт в заметке; в хабе хранится только его статус и «у кого спросить».
// Если строка пропала из заметки, а запись есть, вопрос считается закрытым сам (auto).
export function collectQuestions(projects, records) {
  const byKey = new Map();
  records.filter((r) => r.origin === 'card').forEach((r) => byKey.set(r.key, r));
  const nameOf = new Map(projects.map((p) => [p.id, p.name]));
  const items = [];
  const seen = new Set();
  projects.forEach((p) => {
    (p.questions || []).forEach((text) => {
      const key = keyOf(p.id, text);
      if (seen.has(key)) return;
      seen.add(key);
      const r = byKey.get(key);
      items.push({ key, id: r ? r.id : null, text, projectId: p.id, project: p.name, who: r ? r.who : 'unset', status: r ? r.status : 'open', origin: 'card', created: r ? r.created : 0, auto: false });
    });
  });
  records.forEach((r) => {
    if (r.origin === 'card') {
      if (seen.has(r.key)) return;
      items.push({ key: r.key, id: r.id, text: r.text, projectId: r.projectId, project: nameOf.get(r.projectId) || r.projectName || NO_PROJECT, who: r.who, status: 'resolved', origin: 'card', created: r.created, auto: r.status !== 'resolved' });
    } else {
      items.push({ key: `m|${r.id}`, id: r.id, text: r.text, projectId: r.projectId || '', project: r.projectId ? nameOf.get(r.projectId) || r.projectName || NO_PROJECT : NO_PROJECT, who: r.who, status: r.status, origin: 'manual', created: r.created, auto: false });
    }
  });
  return items;
}

export const countOpen = (items) => items.filter((q) => q.status === 'open').length;

export function filterQuestions(items, { status = 'open', projectId = null } = {}) {
  return items.filter((q) => (status === 'all' || q.status === status) && (projectId === null || q.projectId === projectId));
}

// Группировка по проекту или по тому, у кого спросить. Пустые группы не возвращаются.
export function groupQuestions(items, by = 'project') {
  const groups = new Map();
  items.forEach((q) => {
    const label = by === 'who' ? Q_WHO[q.who] : q.project;
    if (!groups.has(label)) groups.set(label, { label, projectId: q.projectId, items: [] });
    groups.get(label).items.push(q);
  });
  const arr = [...groups.values()];
  const order = Object.values(Q_WHO);
  arr.sort((a, b) => {
    if (by === 'who') return order.indexOf(a.label) - order.indexOf(b.label);
    if (a.label === NO_PROJECT) return 1;
    if (b.label === NO_PROJECT) return -1;
    return a.label.localeCompare(b.label, 'ru');
  });
  arr.forEach((g) => g.items.sort((x, y) => (y.created || 0) - (x.created || 0) || x.text.localeCompare(y.text, 'ru')));
  return arr;
}

// Вопросы для сообщения заказчику: открытые, не помеченные «я сам». Просто сборка из списка.
export function customerQuestions(items, projectId) {
  return items.filter((q) => q.projectId === projectId && q.status === 'open' && q.who !== 'me');
}
export function customerMessage(projectName, qs) {
  if (!qs.length) return '';
  const lines = qs.map((q, i) => `${i + 1}. ${q.text.replace(/\s+/g, ' ').trim().replace(/[.;]+$/, '')}`);
  return `Добрый день! По проекту «${projectName}» остались вопросы:\n${lines.join('\n')}\nПодскажите, пожалуйста, когда сможете.`;
}
