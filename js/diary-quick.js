// Быстрая запись в дневник с любой страницы: кнопка над «+». Открывает ту же форму, что и вкладка «Дневник».
import { ICONS } from './ui.js';
import { openEntryForm } from './diary-view.js';
import { dayMap, ymd } from './diary-calc.js';

export function openDiaryQuick(store) {
  const t = ymd(new Date());
  const td = dayMap(store.list('diary')).get(t);
  openEntryForm(store, td && td.dayEntry ? td.dayEntry : null, { kind: 'day' });
}

export function initDiaryQuick({ button, store }) {
  if (!button) return;
  button.innerHTML = `${ICONS.mood}<span class="sr-only">Записать в дневник</span>`;
  button.addEventListener('click', () => openDiaryQuick(store));
}
