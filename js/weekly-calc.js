// Итоги недели: простой подсчёт по данным хаба, без ИИ. Неделя ISO, с понедельника по воскресенье.
import { addDays, ymd, weekStart } from './dates.js';

const dayOf = (ts) => ymd(new Date(ts));

// Номер недели по ISO: «2026-W41».
export function weekId(s) {
  const d = new Date(`${s}T12:00:00`);
  const t = new Date(d);
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const first = new Date(t.getFullYear(), 0, 4);
  const n = 1 + Math.round(((t - first) / 86400000 - 3 + ((first.getDay() + 6) % 7)) / 7);
  return `${t.getFullYear()}-W${String(n).padStart(2, '0')}`;
}
export function weekRange(s) {
  const from = weekStart(s);
  return { from, to: addDays(from, 6) };
}
export const prevWeekDay = (s) => addDays(weekStart(s), -7);
export const nextWeekDay = (s) => addDays(weekStart(s), 7);

// События ленты: [{ date, project, text }]; задачи: store.list('tasks'); posts и records из «Рупора».
export function summarizeWeek({ day, tasks = [], posts = [], records = [], events = [] }) {
  const { from, to } = weekRange(day);
  const inRange = (s) => s >= from && s <= to;
  const closed = tasks.filter((t) => t.done && t.doneAt && inRange(dayOf(t.doneAt))).sort((a, b) => a.doneAt - b.doneAt).map((t) => ({ title: t.title, project: t.project || '' }));
  const open = tasks.filter((t) => !t.done);
  const byId = new Map(posts.map((p) => [p.id, p]));
  const published = [];
  const counts = { dzen: 0, vk: 0, tg: 0 };
  records.forEach((r) => {
    const p = byId.get(r.postId);
    if (!p || !r.at) return;
    const pl = ['dzen', 'vk', 'tg'].filter((k) => r.at[k] && inRange(dayOf(r.at[k])));
    pl.forEach((k) => { counts[k] += 1; });
    if (pl.length) published.push({ title: p.title, date: p.date, platforms: pl });
  });
  published.sort((a, b) => a.date.localeCompare(b.date));
  const evs = events.filter((e) => inRange(e.date)).map((e) => ({ date: e.date, project: e.project, text: e.text })).sort((a, b) => a.date.localeCompare(b.date));
  const nextFrom = addDays(to, 1);
  const nextTo = addDays(to, 7);
  const deadlines = open.filter((t) => t.due && t.due >= nextFrom && t.due <= nextTo).sort((a, b) => a.due.localeCompare(b.due) || (a.time || '').localeCompare(b.time || '')).map((t) => ({ title: t.title, due: t.due, time: t.time || '', project: t.project || '' }));
  return {
    week: weekId(day), from, to,
    tasks: { closed, byDay: Array.from({ length: 7 }, (_, i) => tasks.filter((t) => t.done && t.doneAt && dayOf(t.doneAt) === addDays(from, i)).length), openCount: open.length, overdue: open.filter((t) => t.due && t.due < from).length },
    rupor: { published, counts, total: counts.dzen + counts.vk + counts.tg },
    events: evs,
    deadlines,
    hasData: !!(closed.length || published.length || evs.length),
  };
}

// Когда сохранять итог: в воскресенье с 18:00 (текущая неделя) или позже (прошедшая), если файла ещё нет.
export function shouldSnapshot(day, now, existingWeeks) {
  const cur = weekId(ymd(now));
  const w = weekId(day);
  if (existingWeeks.has(w)) return false;
  if (w < cur) return true;
  return w === cur && now.getDay() === 0 && now.getHours() >= 18;
}
