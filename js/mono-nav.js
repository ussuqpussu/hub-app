// «Монолит»: панель как на макетах. Буква «Х» сверху, шесть значков (Сегодня, Расписание, Задачи, Проекты, Итоги, Заметки).
// Остальное (Подписки, Знания, Поиск, светлая/тёмная, Настройки) — по настройке «Навигация»:
//  «menu»  — меню по нажатию на «Х»; на телефоне капсула листается вбок;
//  «icons» — маленькие значки внизу панели; на телефоне шестая кнопка «Ещё».
import { el, ICONS } from './ui.js';

const ico = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
// свои простые значки в духе макета
export const MONO_ICONS = {
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

const isMono = () => document.documentElement.dataset.theme === 'mythmono';

export function initMonoNav({ nav }) {
  // «Х» — первым элементом панели
  const logo = el('button', { type: 'button', class: 'nav__logo', 'aria-label': 'Меню: остальные разделы', 'aria-expanded': 'false', 'aria-haspopup': 'true' }, [el('span', { text: 'X' })]);
  nav.prepend(logo);

  const menu = el('div', { class: 'mono-menu', role: 'menu', hidden: '' });
  const item = (label, icon, act) => {
    const b = el('button', { type: 'button', class: 'mono-menu__i', role: 'menuitem' }, [el('span', { html: icon }), el('span', { text: label })]);
    b.addEventListener('click', () => { close(); act(); });
    return b;
  };
  const go = (h) => () => { location.hash = h; };
  menu.append(
    item('Подписки', MONO_ICONS.subscriptions, go('#/subscriptions')),
    item('Дневник', MONO_ICONS.notes, go('#/diary')),
    item('Знания', MONO_ICONS.knowledge, go('#/knowledge')),
    item('Поиск', ICONS.search, () => { const b = document.getElementById('search-btn'); if (b) b.click(); }),
    item('Светлая / тёмная', ico('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'), () => { const b = nav.querySelector('.themebtn'); if (b) b.click(); }),
    item('Настройки', MONO_ICONS.settings, go('#/settings')),
  );
  document.body.append(menu);

  function close() { menu.hidden = true; logo.setAttribute('aria-expanded', 'false'); }
  function open() {
    const r = logo.getBoundingClientRect();
    menu.style.left = `${Math.round(r.right + 14)}px`;
    menu.style.top = `${Math.round(r.top)}px`;
    menu.hidden = false;
    logo.setAttribute('aria-expanded', 'true');
    const first = menu.querySelector('button'); if (first) first.focus();
  }
  logo.addEventListener('click', () => {
    if (!isMono() || document.documentElement.dataset.monoNav === 'icons') { location.hash = '#/today'; return; }
    if (menu.hidden) open(); else close();
  });
  document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target) && !logo.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { close(); logo.focus(); } });
  window.addEventListener('hashchange', close);

  // значки: в «Монолите» свои, в других темах прежние
  const paint = () => {
    const on = isMono();
    nav.querySelectorAll('.nav__item[data-route]').forEach((a) => {
      const svg = a.querySelector('svg');
      if (!svg) return;
      if (!a.dataset.icon0) a.dataset.icon0 = svg.outerHTML;
      const want = on && MONO_ICONS[a.dataset.route] ? MONO_ICONS[a.dataset.route] : a.dataset.icon0;
      if (svg.outerHTML !== want) svg.outerHTML = want;
    });
    if (!on) close();
  };
  paint();
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
