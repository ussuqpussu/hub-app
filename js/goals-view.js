// Раздел «Цели»: цель с ручным прогрессом в процентах.
import { el } from './ui.js';

export const AREAS = ['программирование', 'ИИ', 'спорт', 'другое'];

export function goalsPanel({ store, rerender, editing, setEditing }) {
  const wrap = el('div', { class: 'stack' }, [el('h2', { text: 'Цели' })]);

  function goalForm(g) {
    const form = el('form', { class: 'task-form card' });
    const title = el('input', { class: 'field', type: 'text', 'aria-label': 'Название цели', placeholder: 'Например, выпустить хаб', maxlength: '120', value: g ? g.title : '' });
    const area = el('select', { class: 'field', 'aria-label': 'Направление' });
    AREAS.forEach((a) => {
      const o = el('option', { value: a, text: a });
      if ((g ? g.area : 'программирование') === a) o.selected = true;
      area.append(o);
    });
    const err = el('p', { class: 'err', role: 'alert' });
    const row = el('div', { class: 'task-form__row' }, [el('button', { type: 'submit', class: 'btn btn--primary', text: g ? 'Сохранить' : 'Добавить цель' })]);
    if (g) {
      const cancel = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Отмена' });
      cancel.addEventListener('click', () => {
        setEditing(null);
        rerender();
      });
      row.append(cancel);
    }
    form.append(title, area, err, row);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const t = title.value.trim();
      if (!t) {
        err.textContent = 'Напиши название цели.';
        title.focus();
        return;
      }
      if (g) await store.update('goals', g.id, { title: t, area: area.value });
      else await store.add('goals', { title: t, area: area.value, progress: 0 });
      setEditing(null);
      rerender();
    });
    return form;
  }

  wrap.append(goalForm(null));
  const goals = store.list('goals').sort((a, b) => a.created - b.created);
  if (!goals.length) {
    wrap.append(el('div', { class: 'empty' }, [el('strong', { text: 'Целей пока нет' }), el('span', { text: 'Добавь цель и двигай прогресс вручную.' })]));
    return wrap;
  }
  const ul = el('ul', { class: 'tasks' });
  goals.forEach((g) => {
    if (g.id === editing) {
      const li = el('li');
      li.append(goalForm(g));
      ul.append(li);
      return;
    }
    const li = el('li', { class: 'goal' });
    const name = el('span', { class: 'task__text' }, [
      el('span', { class: 'task__title', text: g.title }),
      el('span', { class: 'task__meta', text: `${g.area || 'другое'}${g.progress >= 100 ? ' · достигнута' : ''}` }),
    ]);
    const bar = el('progress', { class: 'bar', max: '100', value: String(g.progress), 'aria-label': `Прогресс: ${g.title}` });
    const range = el('input', { class: 'range', type: 'range', min: '0', max: '100', step: '5', value: String(g.progress), 'aria-label': `Изменить прогресс: ${g.title}` });
    const pct = el('span', { class: 'goal__pct', text: `${g.progress}%` });
    range.addEventListener('input', () => {
      pct.textContent = `${range.value}%`;
      bar.value = Number(range.value);
    });
    range.addEventListener('change', () => store.update('goals', g.id, { progress: Number(range.value) }));
    const edit = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Изменить', 'aria-label': `Изменить цель ${g.title}` });
    edit.addEventListener('click', () => {
      setEditing(g.id);
      rerender();
    });
    const del = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Удалить', 'aria-label': `Удалить цель ${g.title}` });
    del.addEventListener('click', () => store.remove('goals', g.id));
    li.append(name, pct, bar, range, el('span', { class: 'task__tools' }, [edit, del]));
    ul.append(li);
  });
  wrap.append(ul);
  return wrap;
}
