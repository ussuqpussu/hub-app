import { applyTheme, currentTheme, invertTheme, effectiveColors } from './theme.js';
import { createLock } from './pin.js';
import { TABS, ICONS, renderRoute, statusText } from './views.js';
import { initPlus } from './plus.js';
import { initSearch } from './search-view.js';
import { load } from './storage.js';
import { createStore } from './data/store.js';
import { getSession } from './data/vault.js';
import { applyAppearance, applyGlass, showSplash, playSound, motionAllowed } from './appearance.js';
import { enterView, leaveView, themeWipe } from './motion-kit.js';
import { initIsland, toast } from './island.js';
import { initFx } from './fx.js';
import { initPerf } from './perf.js';
import { sceneHero, initHero, setHeroTheme, setHeroProjects } from './hero.js';
import { initSky } from './sky.js';
import { initMotionUi } from './motion-ui.js';
import { refreshWeather } from './weather-sync.js';
import { onProjects, getProjectsState } from './projects-data.js';
import { mergedProjects } from './projects-view.js';

applyTheme(currentTheme());
applyAppearance();
// правки каталога тем сохраняются в соседней рамке: цвета хаба и сцена обновляются на лету
window.addEventListener('storage', (e) => { if (e.key === 'hub.themeOvr') { applyTheme(currentTheme()); setHeroTheme(currentTheme(), currentRoute()); } });
initFx();
initHero();
initPerf();
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
  applyGlass();
  const full = currentRoute();
  if (full.includes('/')) return;
  const th = document.documentElement.dataset.theme;
  if (!main.querySelector(':scope > .hero')) {
    const h = sceneHero(th, full);
    if (h) main.prepend(h);
  } else setHeroTheme(th, full);
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
// светлая/тёмная меняет цвета через style: обои стекла подстраиваются (applyGlass сама ничего не пишет, если всё уже верно)
new MutationObserver(() => applyGlass()).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

// Смена страницы: старая уходит за ~170 мс, новая выходит из блюра каскадом. Повторный переход во время анимации отменяет предыдущий.
let routeToken = 0;
let lastFull = null;
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
  const my = ++routeToken;
  const changed = lastFull !== full;
  const old = changed && lastFull !== null ? main.querySelector(':scope > .view') : null;
  const swap = () => {
    if (my !== routeToken) return;
    lastFull = full;
    main.dataset.page = id;
    const view = renderRoute(id, { onLockNow: () => lock.lockNow(), store, subscribe, param });
    const hero = param ? null : sceneHero(document.documentElement.dataset.theme, id);
    // рамку со сценой не трогаем (иначе она перезагрузится): меняем только содержимое страницы
    [...main.children].forEach((c) => { if (c !== hero) c.remove(); });
    if (hero && hero.parentNode !== main) main.prepend(hero);
    main.append(view);
    if (changed) enterView(view);
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  };
  if (old && motionAllowed()) leaveView(old).then(swap);
  else swap();
}

buildNav();
initMotionUi({ nav });
initIsland();

// Кнопка «светлая / тёмная»: волнистая заливка растёт из кнопки (работает в любой теме, меняет местами фон и текст).
const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
const themeBtns = [];
function paintThemeBtns() {
  const dark = effectiveColors(currentTheme()).dk;
  themeBtns.forEach((b) => {
    const lbl = dark ? 'Сделать тему светлой' : 'Сделать тему тёмной';
    b.setAttribute('aria-label', lbl);
    b.title = lbl;
    b.querySelector('.themebtn__ic').innerHTML = dark ? MOON : SUN;
    const t = b.querySelector('.nav__label');
    if (t) t.textContent = dark ? 'Светлая тема' : 'Тёмная тема';
  });
}
function toggleTheme(btn) {
  themeWipe(btn, () => { invertTheme(currentTheme()); setHeroTheme(currentTheme(), currentRoute()); paintThemeBtns(); });
}
{
  const top = document.querySelector('.topbar__right');
  const a = document.createElement('button');
  a.type = 'button';
  a.className = 'iconbtn themebtn';
  a.innerHTML = '<span class="themebtn__ic"></span>';
  if (top) top.prepend(a);
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'nav__item nav__item--desktop themebtn';
  b.innerHTML = '<span class="themebtn__ic"></span><span class="nav__label"></span>';
  const gearSide = nav.querySelector('#search-side');
  if (gearSide) nav.insertBefore(b, gearSide); else nav.append(b);
  [a, b].forEach((x) => { themeBtns.push(x); x.addEventListener('click', () => toggleTheme(x)); });
  paintThemeBtns();
  new MutationObserver(paintThemeBtns).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
}
document.getElementById('gear').innerHTML = ICONS.gear;
document.getElementById('search-btn').innerHTML = ICONS.search;
document.getElementById('fab').innerHTML = `${ICONS.plus}<span class="sr-only">Добавить запись</span>`;
document.getElementById('plus-close').innerHTML = `${ICONS.close}<span class="sr-only">Закрыть</span>`;
initPlus({ button: document.getElementById('fab'), dialog: document.getElementById('plus'), store });
initSearch({ store, button: document.getElementById('search-btn'), extraButtons: [document.getElementById('search-side')] });

store.on(renderStatus);
// Остров сообщает итог синхронизации, если её запустила ты или после неё ушли отложенные записи
let manualSync = false;
let prevSt = { state: '', pending: 0 };
store.on((st) => {
  const was = prevSt;
  prevSt = { state: st.state, pending: st.pending || 0 };
  if (st.state === 'syncing' || st.state === 'notoken') return;
  if (was.state === 'syncing' || (was.pending > 0 && !st.pending)) {
    if (st.state === 'error') toast('Не получилось синхронизировать', { icon: 'warn', ms: 3000 });
    else if (st.state === 'offline') { if (manualSync) toast('Нет связи: записи подождут', { icon: 'warn', ms: 2800 }); }
    else if (manualSync || was.pending > 0) toast('Синхронизировано', { icon: 'check', ms: 1800 });
    manualSync = false;
  }
});
document.addEventListener('click', (e) => {
  if (e.target.closest && e.target.closest('[data-sync]')) { manualSync = true; store.syncNow(); }
});

// Погода: при входе и при возврате в приложение (сама не спрашивает чаще раза в 30 минут).
async function weatherTick() {
  const before = JSON.stringify(load('hub.weather', null));
  await refreshWeather();
  const changed = JSON.stringify(load('hub.weather', null)) !== before;
  if (changed && location.hash === '#/today' && !main.contains(document.activeElement)) route();
}
// Список проектов для сцены темы.
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
    weatherTick();
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
    weatherTick();
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
