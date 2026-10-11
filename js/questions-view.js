// Вопросы по проектам как плитки: общие части для раздела «Задачи» (плитка вопроса, копирование заказчику).
import { el } from './ui.js';
import { Q_STATUS, Q_WHO, collectQuestions, customerQuestions, customerMessage, keyOf } from './questions-calc.js';

const sel = (label, value, options, onChange) => {
  const s = el('select', { class: 'field', 'aria-label': label }, options.map(([v, t]) => el('option', { value: v, text: t })));
  s.value = value;
  s.addEventListener('change', () => onChange(s.value));
  return s;
};

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    const ta = el('textarea', { class: 'sr-only', 'aria-hidden': 'true' });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (__) { ok = false; }
    ta.remove();
    return ok;
  }
}

export const allQuestions = (store, projects) => collectQuestions(projects, store.list('questions'));

// Запись состояния вопроса. Вопрос из заметки получает запись в хабе только когда человек что-то изменил.
export function patchQuestion(store, q, fields) {
  if (q.id) return store.update('questions', q.id, fields);
  return store.add('questions', { origin: 'card', key: keyOf(q.projectId, q.text), text: q.text, projectId: q.projectId, projectName: q.project, who: 'unset', status: 'open', created: 0, ...fields });
}

const WHO_ORDER = Object.keys(Q_WHO);

// Плитка вопроса: «у кого спросить» переключается нажатием по кругу, статус выбирается списком.
export function questionTile(store, q, { showProject = false } = {}) {
  const st = sel('Статус', q.status, Object.entries(Q_STATUS), (v) => patchQuestion(store, q, { status: v }));
  st.classList.add('qtile__sel');
  st.disabled = q.auto;
  const who = el('button', { type: 'button', class: 'qtile__who', 'aria-label': `У кого спросить: ${Q_WHO[q.who]}. Нажми, чтобы сменить`, text: q.who === 'unset' ? 'Вопрос' : `Вопрос · ${Q_WHO[q.who]}` });
  who.addEventListener('click', () => patchQuestion(store, q, { who: WHO_ORDER[(WHO_ORDER.indexOf(q.who) + 1) % WHO_ORDER.length] }));
  const body = el('p', { class: 'qtile__text', text: q.text, title: q.text });
  body.addEventListener('click', () => body.closest('.qtile').classList.toggle('qtile--open'));
  const kids = [el('div', { class: 'qtile__top' }, [who]), body];
  if (showProject) kids.push(el('span', { class: 'qtile__proj', text: q.project }));
  if (q.auto) kids.push(el('span', { class: 'qtile__proj', text: 'Строки больше нет в заметке, закрыт сам' }));
  kids.push(el('div', { class: 'qtile__foot' }, [st]));
  const li = el('li', { class: 'qtile', 'data-status': q.status, 'data-kind': 'question', 'data-origin': q.origin }, kids);
  if (q.origin === 'manual') {
    const del = el('button', { type: 'button', class: 'qtile__del', 'aria-label': 'Удалить вопрос', text: '×' });
    del.addEventListener('click', () => store.remove('questions', q.id));
    li.append(del);
  }
  return li;
}

// Кнопка «Скопировать вопросы заказчику» для проекта; сообщение о результате пишет в note.
export function copyButton(items, projectId, projectName, note) {
  const qs = customerQuestions(items, projectId);
  const b = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Скопировать вопросы заказчику', ...(qs.length ? {} : { disabled: '' }) });
  b.addEventListener('click', async () => {
    const ok = await copyText(customerMessage(projectName, qs));
    note.textContent = ok ? `Скопировано: ${qs.length} в сообщении по проекту «${projectName}».` : 'Не удалось скопировать. Выдели текст вручную.';
  });
  return b;
}
