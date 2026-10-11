import { applyTheme, currentTheme } from './theme.js';
import { createLock } from './pin.js';
import { TABS, ICONS, renderRoute, statusText } from './views.js';
import { initPlus } from './plus.js';
import { load } from './storage.js';
import { createStore } from './data/store.js';
import { getSession } from './data/vault.js';

applyTheme(currentTheme());

const nav = document.getElementById('nav');
const main = document.getElementById('main');
const title = document.getElementById('topbar-title');
const moreIds = TABS.filter((t) => t.group === 'more').map((t) => t.id);

// Слой данных. apiBase и debounceMs меняются только в тестах (localStorage).
const store = createStore({
  getKey: () => getSession().dataKey,
  getAccess: () => {
    const s = getSession();
    return s.token && s.repo ? { repo: s.repo, token: s.token } : null;
  },
  debounceMs: Number(load('hub.debounceMs', 15000)) || 15000,
});
const apiBase = load('hub.apiBase');
if (apiBase) store.configure({ apiBase });

// Подписки текущего экрана очищаются при смене маршрута.
let subs = [];
const subscribe = (fn) => subs.push(store.on(fn));

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
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'sync-chip sync-chip--side';
  chip.dataset.sync = '';
  nav.append(chip);
  nav.append(navItem('settings', 'Настройки', 'gear', 'nav__item--desktop nav__gear-side'));
}

function renderStatus(st) {
  document.querySelectorAll('[data-sync]').forEach((chip) => {
    chip.textContent = statusText(st);
    chip.title = 'Нажми, чтобы синхронизировать сейчас';
    chip.dataset.state = st.state;
  });
}

function currentRoute() {
  const r = location.hash.replace(/^#\/?/, '');
  return r || 'today';
}

function route() {
  subs.forEach((off) => off());
  subs = [];
  const id = currentRoute();
  main.replaceChildren(renderRoute(id, { onLockNow: () => lock.lockNow(), store, subscribe }));
  const tab = TABS.find((t) => t.id === id);
  title.textContent = id === 'settings' ? 'Настройки' : id === 'more' ? 'Ещё' : tab ? tab.name : 'Хаб';
  document.title = `${title.textContent} · Хаб`;
  const activeId = moreIds.includes(id) ? null : id;
  nav.querySelectorAll('.nav__item').forEach((a) => {
    const r = a.dataset.route;
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
initPlus({ button: document.getElementById('fab'), dialog: document.getElementById('plus'), store });

store.on(renderStatus);
document.addEventListener('click', (e) => {
  if (e.target.closest && e.target.closest('[data-sync]')) store.syncNow();
});

const lock = createLock(document.getElementById('lock'), {
  async onUnlock() {
    await store.init();
    renderStatus(store.getStatus());
    if (!location.hash) location.hash = '#/today';
    route();
    store.syncNow();
  },
  onLock() {
    store.init(); // ключа нет: статус «заблокировано», память очищается
  },
});

window.addEventListener('hashchange', () => {
  if (!document.getElementById('app').hidden) route();
});

window.addEventListener('online', () => store.syncNow());
document.addEventListener('visibilitychange', () => {
  if (!getSession().dataKey) return;
  if (document.hidden) {
    if (store.getStatus().pending > 0) store.syncNow();
  } else {
    store.syncNow();
  }
});

lock.start();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* офлайн-режим просто не включится */
    });
  });
}

// Для автотестов: доступ к хранилищу из страницы включается только флагом в localStorage.
if (load('hub.testHook')) window.__hub = { store };
