// Сцена сверху страницы: анимация темы на отдельной полосе, текст её не перекрывает.
// Сцены (js/scenes.js) перенесены из превью тем; у каждой страницы своя сцена из четырёх.
import { getAppearance, motionAllowed, onAppearance } from './appearance.js';
import { SCENE_THEMES, SCENE_NAMES, renderScene } from './scenes.js';
import { asciiFrame, ASCII_NAMES } from './ascii-scenes.js';

export const PAGE_INDEX = { today: 0, schedule: 1, tasks: 2, projects: 3, 'smart-home': 4, subscriptions: 5, notes: 6, knowledge: 7, settings: 8 };

// Номер сцены (0..3) на странице: выбор человека, иначе значение по умолчанию из темы.
export function sceneIndex(themeId, pg) {
  const th = SCENE_THEMES[themeId];
  const mine = (getAppearance().scenes || {})[themeId];
  const v = Array.isArray(mine) ? mine[pg] : null;
  if (Number.isInteger(v) && v >= 0 && v < 4) return v;
  return ((th && th.tm) || [0, 1, 2, 3, 0, 1, 2, 3, 0])[pg] || 0;
}
export const sceneInfo = (themeId, route) => {
  const th = SCENE_THEMES[themeId];
  const pg = PAGE_INDEX[route];
  if (themeId === 'creation' && pg != null) return { pg, name: ASCII_NAMES[pg] || 'Сцена', ascii: true };
  if (!th || pg == null) return null;
  const k = sceneIndex(themeId, pg);
  return { pg, name: (SCENE_NAMES[th.ts] || [])[k] || 'Сцена' };
};

let current = null; // { cv, theme, pg, raf }
function stop() { if (current) { cancelAnimationFrame(current.raf); current.raf = 0; } }

// ASCII-сцена «Сотворения»: кадр текстом в <pre>, размер шрифта подбирается под полосу.
function drawAscii(c, t) {
  const f = asciiFrame(c.pg, c.pg === 6 ? t + 12 : t);
  if (!f) return;
  const el = c.cv;
  el.textContent = f;
  const lines = f.split('\n');
  const cols = lines.reduce((m, l) => Math.max(m, l.length), 1);
  const w = el.clientWidth;
  const h = el.clientHeight;
  if (w && h) el.style.fontSize = `${Math.max(2, Math.min(w / (cols * 0.6), h / lines.length)).toFixed(2)}px`;
}
function drawFrame(c, t) { if (c.ascii) drawAscii(c, t); else { const th = SCENE_THEMES[c.theme]; const tm = (th.tm || [0, 1, 2, 3, 0, 1, 2, 3, 0]).slice(); tm[c.pg] = sceneIndex(c.theme, c.pg); renderScene(c.cv, c.theme, c.pg, t, 2, null, { ...th, tm }); } }

function loop(now) {
  const c = current;
  if (!c) return;
  c.raf = requestAnimationFrame(loop);
  if (!c.cv.isConnected) { stop(); current = null; return; }
  if (now - c.last < (c.ascii ? 90 : 33)) return;
  c.last = now;
  drawFrame(c, (now - c.t0) / 1000);
}

function drawStill() { if (current && current.cv.isConnected) drawFrame(current, 2.5); }

function sync() {
  if (!current) return;
  stop();
  if (document.hidden) return;
  if (motionAllowed()) { current.last = 0; current.raf = requestAnimationFrame(loop); } else drawStill();
}

// Возвращает холст или null, если для темы и страницы сцены нет или она выключена.
export function sceneHero(themeId, route) {
  stop();
  current = null;
  if (!getAppearance().hero) return null;
  const info = sceneInfo(themeId, route);
  if (!info) return null;
  const cv = document.createElement(info.ascii ? 'pre' : 'canvas');
  cv.className = info.ascii ? 'hero hero--ascii' : 'hero';
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', `Анимация: ${info.name}`);
  current = { cv, theme: themeId, pg: info.pg, ascii: !!info.ascii, raf: 0, t0: performance.now(), last: 0 };
  // размеры известны только после вставки в страницу
  requestAnimationFrame(() => { if (current && current.cv === cv) sync(); });
  return cv;
}

export function initHero() {
  onAppearance(sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('resize', () => { clearTimeout(initHero.t); initHero.t = setTimeout(sync, 200); });
}
