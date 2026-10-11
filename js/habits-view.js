// Раздел «Привычки»: список, отметка за день, серия, отметки за последние 7 дней.
import { el, ICONS } from './ui.js';
import { todayYmd, fmtDay } from './dates.js';
import { doneDates, streak, lastDays, logId } from './habits.js';

const DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
let confirmId = null; // привычка, у которой ждём подтверждение удаления (живёт между перерисовками)

export function toggleDay(store, habitId, date) {
  const done = doneDates(store.list('habitlog'), habitId).has(date);
  return store.upsert('habitlog', logId(habitId, date), { habit: habitId, date, done: !done });
}

export function habitsPanel({ store, rerender }) {
  const today = todayYmd();
  const logs = store.list('habitlog');
  const wrap = el('div', { class: 'stack' }, [el('h2', { text: 'Привычки' })]);

  const form = el('form', { class: 'task-form card' });
  const title = el('input', { class: 'field', type: 'text', 'aria-label': 'Название привычки', placeholder: 'Например, тренировка или чтение', maxlength: '80' });
  const err = el('p', { class: 'err', role: 'alert' });
  form.append(title, err, el('button', { type: 'submit', class: 'btn btn--primary', text: 'Добавить привычку' }));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = title.value.trim();
    if (!t) {
      err.textContent = 'Напиши название привычки.';
      title.focus();
      return;
    }
    await store.add('habits', { title: t });
    rerender();
  });
  wrap.append(form);

  const habits = store.list('habits').sort((a, b) => a.created - b.created);
  if (!habits.length) {
    wrap.append(el('div', { class: 'empty' }, [el('strong', { text: 'Привычек пока нет' }), el('span', { text: 'Добавь привычку выше и отмечай её каждый день.' })]));
    return wrap;
  }
  const ul = el('ul', { class: 'tasks' });
  habits.forEach((h) => {
    const done = doneDates(logs, h.id);
    const li = el('li', { class: 'habit' });
    const check = el('button', {
      type: 'button',
      class: 'task__check',
      role: 'checkbox',
      'aria-checked': String(done.has(today)),
      'aria-label': `${h.title}: отметить сегодня`,
    });
    check.addEventListener('click', () => toggleDay(store, h.id, today));
    const n = streak(done, today);
    const head = el('span', { class: 'task__text' }, [
      el('span', { class: 'task__title', text: h.title }),
      el('span', { class: 'task__meta', text: n ? `серия: ${n} дн.` : 'серии пока нет' }),
    ]);
    const dots = el('span', { class: 'dots', role: 'group', 'aria-label': `${h.title}: последние 7 дней` });
    lastDays(today, 7).forEach((d) => {
      const b = el('button', {
        type: 'button',
        class: 'dot',
        role: 'checkbox',
        'aria-checked': String(done.has(d)),
        'aria-label': `${fmtDay(d)}: ${done.has(d) ? 'выполнено' : 'не отмечено'}`,
        title: fmtDay(d),
      }, [el('span', { class: 'dot__dow', text: DOW[new Date(d + 'T00:00:00').getDay()] })]);
      b.addEventListener('click', () => toggleDay(store, h.id, d));
      dots.append(b);
    });
    const del = el('button', {
      type: 'button',
      class: 'btn btn--ghost btn--s',
      text: confirmId === h.id ? 'Точно удалить?' : 'Удалить',
      'aria-label': `Удалить привычку ${h.title}`,
    });
    del.addEventListener('click', () => {
      if (confirmId === h.id) {
        store.remove('habits', h.id);
        confirmId = null;
      } else {
        confirmId = h.id;
        rerender();
      }
    });
    li.append(check, head, dots, del);
    ul.append(li);
  });
  wrap.append(ul);
  return wrap;
}
