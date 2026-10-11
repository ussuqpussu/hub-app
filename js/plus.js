import { load, save } from './storage.js';
import { parseQuick, dueLabel } from './dates.js';

// Типы записей по разделу 6F плана. «Задача» создаёт настоящую задачу, остальные типы
// сохраняются во «Входящие» (зашифрованно, с отправкой в репозиторий данных).
export const TYPES = [
  { id: 'task', name: 'Задача' },
  { id: 'note', name: 'Заметка' },
  { id: 'question', name: 'Открытый вопрос' },
  { id: 'idea', name: 'Идея' },
];
const KEY = 'hub.plusType';

export function initPlus({ button, dialog, store }) {
  const chips = dialog.querySelector('.chips');
  const closeBtn = dialog.querySelector('[data-close]');
  const input = dialog.querySelector('#plus-text');
  const note = dialog.querySelector('#plus-note');
  let active = load(KEY, 'task');
  if (!TYPES.some((t) => t.id === active)) active = 'task';

  function render() {
    chips.replaceChildren();
    TYPES.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = t.name;
      b.setAttribute('aria-pressed', String(t.id === active));
      b.addEventListener('click', () => {
        active = t.id;
        save(KEY, active);
        render();
      });
      chips.append(b);
    });
  }

  button.addEventListener('click', () => {
    render();
    note.textContent = '';
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    input.focus();
  });
  closeBtn.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  dialog.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) {
      note.textContent = 'Напиши хотя бы одну строку.';
      return;
    }
    let created = null;
    try {
      if (active === 'task') {
        // «з завтра 15:00 сдать лабу» превращается в задачу со сроком
        const q = parseQuick(text);
        created = await store.add('tasks', { title: q.title, due: q.due, time: q.time, project: '', done: false, main: false });
      } else {
        await store.add('inbox', { type: active, text });
      }
    } catch (_) {
      note.textContent = 'Не удалось сохранить: приложение заблокировано.';
      return;
    }
    input.value = '';
    const st = store.getStatus();
    if (created) {
      const when = created.due ? `, срок: ${dueLabel(created.due)}${created.time ? ` ${created.time}` : ''}` : '';
      note.textContent = `Задача добавлена${when}.`;
    } else if (st.state === 'notoken') {
      note.textContent = 'Сохранено на этом устройстве. Токен GitHub не подключён, в репозиторий запись пока не уходит (Настройки → Данные).';
    } else {
      note.textContent = 'Сохранено. Отправится в репозиторий в ближайшие секунды.';
    }
    input.focus();
  });
}
