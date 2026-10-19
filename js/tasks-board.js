// Доска задач: три колонки по уже существующим полям задачи (никаких новых данных).
//  «В очереди»: открытые, не главные; «Главные на сегодня»: открытые с отметкой main; «Сделано»: выполненные.
import { el } from './ui.js';
import { dueLabel } from './dates.js';
import { toast } from './island.js';
import { initKanban } from './kanban.js';

const GRIP = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>';

export function boardColumns(tasks) {
  const byCreated = (a, b) => (a.created || 0) - (b.created || 0);
  return {
    queue: tasks.filter((t) => !t.done && !t.main).sort(byCreated),
    main: tasks.filter((t) => !t.done && t.main).sort(byCreated),
    done: tasks.filter((t) => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 20),
  };
}

// Что записать в задачу при переносе в колонку; null, если перенос не нужен
export function patchFor(task, to, now = Date.now()) {
  if (to === 'main') return { main: true, done: false, doneAt: null };
  if (to === 'queue') return { main: false, done: false, doneAt: null };
  if (to === 'done') return { done: true, doneAt: now, main: false };
  return null;
}

export function boardView({ store, tasks, today, mainLimit, labels = ['В очереди', 'Главные на сегодня', 'Сделано'] }) {
  const cols = boardColumns(tasks);
  const defs = [['queue', labels[0]], ['main', labels[1]], ['done', labels[2]]];
  const live = el('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  const wrap = el('div', { class: 'kan', role: 'group', 'aria-label': 'Доска задач' });
  defs.forEach(([key, title]) => {
    const list = cols[key];
    const cards = el('div', { class: 'kan__cards' });
    if (!list.length) cards.append(el('p', { class: 'kan__empty', text: key === 'main' ? `До ${mainLimit} дел на сегодня` : key === 'done' ? 'Пока ничего' : 'Пусто' }));
    list.forEach((t) => {
      const late = t.due && t.due < today && !t.done;
      const meta = [t.due ? `${dueLabel(t.due, today)}${t.time ? ` ${t.time}` : ''}` : '', t.project || ''].filter(Boolean).join(' · ');
      const card = el('div', { class: 'kc', tabindex: '0', role: 'button', 'data-id': t.id, 'data-flip': t.id, 'data-done': t.done ? '1' : '0', 'aria-label': `${t.title}. Стрелки влево и вправо переносят задачу между колонками` }, [
        el('b', { text: t.title, title: t.title }),
        el('span', { class: `kc__meta${late ? ' kc__meta--late' : ''}`, text: meta || 'без срока' }),
        el('span', { class: 'kc__grip', 'aria-hidden': 'true', html: GRIP }),
      ]);
      cards.append(card);
    });
    wrap.append(el('div', { class: 'kan__col', 'data-col': key, 'aria-label': title }, [el('h3', {}, [el('span', { text: title }), el('em', { text: String(list.length) })]), cards]));
  });
  const move = (id, to) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return false;
    const from = t.done ? 'done' : t.main ? 'main' : 'queue';
    if (from === to) return false;
    if (to === 'main' && tasks.filter((x) => x.main && !x.done).length >= mainLimit) {
      toast(`Главных задач не больше ${mainLimit}`, { icon: 'warn', ms: 2600 });
      return false;
    }
    const prev = { main: !!t.main, done: !!t.done, doneAt: t.doneAt || null };
    store.update('tasks', id, patchFor(t, to));
    if (to === 'done') toast(`Выполнено: ${t.title}`, { icon: 'check', ms: 2600, undo: () => store.update('tasks', id, prev) });
    return true;
  };
  initKanban(wrap, { onMove: move, say: (s) => { live.textContent = ''; setTimeout(() => { live.textContent = s; }, 30); } });
  return el('div', { class: 'stack stack--tight' }, [wrap, live, el('p', { class: 'sched-note', text: 'Перетащи задачу в другую колонку (пальцем за значок справа вверху) или выбери её и нажми стрелки влево и вправо.' })]);
}
