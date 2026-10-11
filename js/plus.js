import { load, save } from './storage.js';

// Типы записей по разделу 6F плана. Сохранение появится на этапе 2:
// сейчас писать некуда, и кнопка честно отключена.
const TYPES = [
  { id: 'task', name: 'Задача' },
  { id: 'note', name: 'Заметка' },
  { id: 'event', name: 'Событие' },
  { id: 'question', name: 'Открытый вопрос' },
  { id: 'idea', name: 'Идея' },
];
const KEY = 'hub.plusType';

export function initPlus({ button, dialog }) {
  const chips = dialog.querySelector('.chips');
  const closeBtn = dialog.querySelector('[data-close]');
  const input = dialog.querySelector('#plus-text');
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
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    input.focus();
  });
  closeBtn.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.querySelector('form').addEventListener('submit', (e) => e.preventDefault());
}
