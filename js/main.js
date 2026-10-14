import { applyTheme, currentTheme } from './theme.js';
import { createLock } from './pin.js';
import { TABS, ICONS, renderRoute, statusText } from './views.js';
import { initPlus } from './plus.js';
import { initSearch } from './search-view.js';
import { load } from './storage.js';
import { createStore } from './data/store.js';
import { getSession } from './data/vault.js';
import { applyAppearance, showSplash, playSound } from './appearance.js';
import { initFx } from './fx.js';
import { initCat } from './cat.js';
import { sceneHero, initHero, setHeroTheme, setHeroProjects } from './hero.js';
import { initSky } from './sky.js';
import { initMotionUi } from './motion-ui.js';
import { importInbox, refreshPulse, refreshWeather, sendBotConfig, reportHubErrors } from './bot-sync.js';
import { onProjects, getProjectsState } from './projects-data.js';
import { mergedProjects } from './projects-view.js';

applyTheme(currentTheme());
applyAppearance();
// правки каталога тем сохраняются в соседней рамке: цвета хаба и сцена обновляются на лету
window.addEventListener('storage', (e) => { if (e.key === 'hub.themeOvr') { applyTheme(currentTheme()); setHeroTheme(currentTheme(), currentRoute()); } });
initFx();
initHero();
initCat();
initSky();

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
  const sb = document.createElement('button');
  sb.type = 'button';
  sb.className = 'nav__item nav__item--desktop nav__gear-side';
  sb.id = 'search-side';
  sb.innerHTML = `${ICONS.search}<span class="nav__label">Поиск</span>`;
  nav.append(sb);
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
  if (r === 'calendar') return 'schedule'; // старое имя вкладки
  return r || 'today';
}

// Смена темы: рамку со сценой не пересоздаём, ей отправляется новое имя темы.
new MutationObserver(() => {
  const full = currentRoute();
  if (full.includes('/')) return;
  const th = document.documentElement.dataset.theme;
  if (!main.querySelector(':scope > .hero')) {
    const h = sceneHero(th, full);
    if (h) main.prepend(h);
  } else setHeroTheme(th, full);
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

function route() {
  subs.forEach((off) => off());
  subs = [];
  const full = currentRoute();
  const slash = full.indexOf('/');
  const id = slash === -1 ? full : full.slice(0, slash);
  let param = '';
  try {
    param = slash === -1 ? '' : decodeURIComponent(full.slice(slash + 1));
  } catch (_) {
    param = '';
  }
  const view = renderRoute(id, { onLockNow: () => lock.lockNow(), store, subscribe, param });
  const hero = param ? null : sceneHero(document.documentElement.dataset.theme, id);
  // рамку со сценой не трогаем (иначе она перезагрузится): меняем только содержимое страницы
  [...main.children].forEach((c) => { if (c !== hero) c.remove(); });
  if (hero && hero.parentNode !== main) main.prepend(hero);
  main.append(view);
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
initMotionUi({ nav });
document.getElementById('gear').innerHTML = ICONS.gear;
document.getElementById('search-btn').innerHTML = ICONS.search;
document.getElementById('fab').innerHTML = `${ICONS.plus}<span class="sr-only">Добавить запись</span>`;
document.getElementById('plus-close').innerHTML = `${ICONS.close}<span class="sr-only">Закрыть</span>`;
initPlus({ button: document.getElementById('fab'), dialog: document.getElementById('plus'), store });
initSearch({ store, button: document.getElementById('search-btn'), extraButtons: [document.getElementById('search-side')] });

store.on(renderStatus);
document.addEventListener('click', (e) => {
  if (e.target.closest && e.target.closest('[data-sync]')) store.syncNow();
});

// Входящие бота: разбираем при входе и при возврате в приложение (не чаще раза в минуту).
async function inboxTick() {
  const r = await importInbox({ store });
  if (r && r.imported) store.syncNow();
  refreshPulse();
  await refreshWeather();
  if (location.hash === '#/today' && !main.contains(document.activeElement)) route();
}
// Список проектов и ошибка загрузки проектов уходят боту, когда меняются.
const HERO_ST = { active: 'в работе', done: 'готов' };
const HERO_PR = { active: 55, done: 100, paused: 25 };
function pushHeroProjects() {
  try {
    setHeroProjects(mergedProjects(store).filter((p) => p.status !== 'archive').map((p) => ({ id: p.id, name: p.name, type: (p.types || [])[0] || '', st: HERO_ST[p.status] || p.status, pr: HERO_PR[p.status] ?? 15, next: p.nextAction || '', upd: '' })));
  } catch (_) { /* сцена обойдётся учебными названиями */ }
}
store.on(() => pushHeroProjects());
onProjects((st) => {
  pushHeroProjects();
  if (!getSession().dataKey || st.busy) return;
  if (st.error) reportHubErrors([{ id: 'projects', text: 'не получилось обновить карточки проектов из hub-projects' }]);
  else if (st.loaded && st.fetchedAt) { reportHubErrors([]); sendBotConfig(mergedProjects(store)); }
});

const lock = createLock(document.getElementById('lock'), {
  async onUnlock() {
    playSound('unlock');
    showSplash();
    await store.init();
    renderStatus(store.getStatus());
    if (!location.hash) location.hash = '#/today';
    // Не перерисовываем экран, если человек уже что-то печатает в нём.
    if (!main.childElementCount || !main.contains(document.activeElement)) route();
    store.syncNow();
    inboxTick();
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
    inboxTick();
  }
});

lock.start();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {
      /* офлайн-режим просто не включится */
    });
  });
}

// Для автотестов: доступ к хранилищу из страницы включается только флагом в localStorage.
if (load('hub.testHook')) window.__hub = { store };
