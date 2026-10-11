import { applyTheme, currentTheme } from './theme.js';
import { createLock } from './pin.js';
import { TABS, ICONS, renderRoute } from './views.js';
import { initPlus } from './plus.js';

applyTheme(currentTheme());

const nav = document.getElementById('nav');
const main = document.getElementById('main');
const title = document.getElementById('topbar-title');
const moreIds = TABS.filter((t) => t.group === 'more').map((t) => t.id);

function navItem(id, name, icon, extraClass) {
  const a = document.createElement('a');
  a.className = `nav__item ${extraClass}`.trim();
  a.href = `#/${id}`;
  a.dataset.route = id;
  a.innerHTML = `${ICONS[icon]}<span class="nav__label"></span>`;
  a.querySelector('.nav__label').textContent = name;
  return a;
}

function buildNav() {
  nav.replaceChildren();
  TABS.filter((t) => t.group === 'main').forEach((t) => nav.append(navItem(t.id, t.name, t.icon, '')));
  nav.append(navItem('more', 'Ещё', 'more', 'nav__item--phone'));
  TABS.filter((t) => t.group === 'more').forEach((t) => nav.append(navItem(t.id, t.name, t.icon, 'nav__item--desktop')));
  const sep = document.createElement('div');
  sep.className = 'nav__sep';
  nav.append(sep);
  nav.append(navItem('settings', 'Настройки', 'gear', 'nav__item--desktop nav__gear-side'));
}

function currentRoute() {
  const r = location.hash.replace(/^#\/?/, '');
  return r || 'today';
}

function route() {
  const id = currentRoute();
  main.replaceChildren(renderRoute(id, { onLockNow: () => lock.lockNow() }));
  const tab = TABS.find((t) => t.id === id);
  title.textContent = id === 'settings' ? 'Настройки' : id === 'more' ? 'Ещё' : tab ? tab.name : 'Хаб';
  document.title = `${title.textContent} · Хаб`;
  const activeId = moreIds.includes(id) ? null : id;
  nav.querySelectorAll('.nav__item').forEach((a) => {
    const r = a.dataset.route;
    // На телефоне «Ещё» подсвечивается и для вкладок внутри него.
    const isMoreParent = r === 'more' && moreIds.includes(id);
    if (r === activeId || isMoreParent || r === id) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

buildNav();
document.getElementById('gear').innerHTML = ICONS.gear;
document.getElementById('fab').innerHTML = `${ICONS.plus}<span class="sr-only">Добавить запись</span>`;
document.getElementById('plus-close').innerHTML = `${ICONS.close}<span class="sr-only">Закрыть</span>`;
initPlus({ button: document.getElementById('fab'), dialog: document.getElementById('plus') });

const lock = createLock(document.getElementById('lock'), {
  onUnlock() {
    if (!location.hash) location.hash = '#/today';
    route();
  },
});

window.addEventListener('hashchange', () => {
  if (!document.getElementById('app').hidden) route();
});

lock.start();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* офлайн-режим просто не включится */
    });
  });
}
