// Сцена сверху страницы. Её рисует движок тем (theme/engine.html в режиме #stage): тот же код, что в превью тем,
// поэтому руки, звезда, ASCII-тон и анимации выглядят один в один. Рамка с движком создаётся один раз
// и живёт между страницами: при смене страницы ей отправляется сообщение, перезагрузки нет.
import { getAppearance, motionAllowed, onAppearance } from './appearance.js';
import { THEMES, effectiveColors } from './theme.js';

export const PAGE_INDEX = { today: 0, schedule: 1, tasks: 2, projects: 3, 'smart-home': 4, subscriptions: 5, notes: 6, knowledge: 7, settings: 8 };
const ENGINE = new URL('../theme/engine.html', import.meta.url).href;

let box = null; // { el, frame, ready, pending, theme }
let projects = [];
let sent = ''; // что уже отправлено рамке, чтобы не перерисовывать сцену зря

const engineName = (themeId) => (THEMES.find((t) => t.id === themeId) || {}).engine || null;

function message(m) {
  if (!box || !box.frame.contentWindow) return;
  if (!box.ready) { box.pending = { ...(box.pending || {}), ...m }; return; }
  box.frame.contentWindow.postMessage({ type: 'hub-set', ...m }, '*');
}

window.addEventListener('message', (e) => {
  if (!box || !e.data || e.data.type !== 'hub-engine-ready' || e.source !== box.frame.contentWindow) return;
  box.ready = true;
  if (projects.length) { sent = JSON.stringify(projects); message({ projects }); }
  if (box.pending) { const p = box.pending; box.pending = null; message(p); }
});

export function destroyHero() {
  if (box) { box.el.remove(); box = null; }
}

// Возвращает контейнер сцены (один и тот же между страницами) или null, если сцены нет.
export function sceneHero(themeId, route) {
  const pg = PAGE_INDEX[route];
  const name = engineName(themeId);
  if (!getAppearance().hero || !motionAllowed() || pg == null || !name) { destroyHero(); return null; }
  const dk = effectiveColors(themeId).dk ? 1 : 0;
  if (box && box.theme === themeId) {
    message({ pg, dk });
    return box.el;
  }
  destroyHero();
  const frame = document.createElement('iframe');
  frame.className = 'hero__frame';
  frame.title = `Анимация темы «${name}»`;
  frame.setAttribute('loading', 'eager');
  frame.src = `${ENGINE}#stage&t=${encodeURIComponent(name)}&pg=${pg}&dk=${dk}`;
  const el = document.createElement('div');
  el.className = 'hero hero--stage';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', `Анимация темы «${name}»`);
  el.append(frame);
  sent = '';
  box = { el, frame, ready: false, pending: null, theme: themeId };
  return el;
}

// Смена темы без перезагрузки рамки.
export function setHeroTheme(themeId, route) {
  if (!box) return;
  const name = engineName(themeId);
  if (!name) { destroyHero(); return; }
  box.theme = themeId;
  message({ t: name, pg: PAGE_INDEX[route] ?? 0, dk: effectiveColors(themeId).dk ? 1 : 0 });
}

// Список проектов для сцены «Проекты»: реальные названия вместо учебных.
export function setHeroProjects(list) {
  projects = (list || []).slice(0, 8).map((p, i) => ({ id: String(p.id || i), name: String(p.name || '').slice(0, 24), type: String(p.type || ''), st: String(p.st || 'в работе'), pr: Math.max(0, Math.min(100, Math.round(+p.pr || 0))), next: String(p.next || ''), upd: String(p.upd || '') }));
  if (projects.length && JSON.stringify(projects) !== sent) { sent = JSON.stringify(projects); message({ projects }); }
}

export function initHero() {
  onAppearance(() => { if (!getAppearance().hero || !motionAllowed()) destroyHero(); });
}
