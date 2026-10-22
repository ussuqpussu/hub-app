// Остров-навигация. Буква «Х» сверху, шесть значков (Сегодня, Расписание, Задачи, Проекты, Итоги, Заметки).
// Остальное (Знания, Подписки, Поиск, светлая/тёмная, Настройки) — маленькими значками внизу панели, как у других тем;
// на телефоне капсула листается вбок.
import { el } from './ui.js';

const ico = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
// свои простые значки в духе макета
export const RAIL_ICONS = {
  today: ico('<rect x="4.5" y="4.5" width="6" height="6" rx="1.6"/><rect x="13.5" y="4.5" width="6" height="6" rx="1.6"/><rect x="4.5" y="13.5" width="6" height="6" rx="1.6"/><rect x="13.5" y="13.5" width="6" height="6" rx="1.6"/>'),
  schedule: ico('<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>'),
  tasks: ico('<circle cx="12" cy="12" r="8"/><path d="M8.5 12.2l2.4 2.4 4.7-4.9"/>'),
  projects: ico('<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>'),
  weekly: ico('<path d="M5 19.5V13M10 19.5V8M15 19.5v-5M20 19.5V5"/>'),
  notes: ico('<path d="M7 3.5h7l4 4v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z"/><path d="M14 3.5v4h4M8.5 12.5h7M8.5 16h5"/>'),
  subscriptions: ico('<rect x="3.5" y="6" width="17" height="12" rx="2.5"/><path d="M3.5 10h17M7 14.5h4"/>'),
  knowledge: ico('<path d="M4.5 5.5h5a2.5 2.5 0 0 1 2.5 2.5v11a2 2 0 0 0-2-2H4.5zM19.5 5.5h-5A2.5 2.5 0 0 0 12 8v11a2 2 0 0 1 2-2h5.5z"/>'),
  settings: ico('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  more: ico('<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>'),
};


export function initRail({ nav, store }) {
  // «Х» — первым элементом панели
  const logo = el('button', { type: 'button', class: 'nav__logo', 'aria-label': 'Сегодня' }, [el('span', { text: 'X' })]);
  nav.prepend(logo);

  logo.addEventListener('click', () => { location.hash = '#/today'; });

  // значки острова: свои, в одном стиле; у каждого подпись при наведении
  nav.querySelectorAll('.nav__item[data-route]').forEach((a) => {
    const svg = a.querySelector('svg');
    if (svg && RAIL_ICONS[a.dataset.route]) svg.outerHTML = RAIL_ICONS[a.dataset.route];
    const lbl = a.querySelector('.nav__label');
    if (lbl) a.dataset.tip = lbl.textContent;
  });
  logo.dataset.tip = 'Сегодня';
}
