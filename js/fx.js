// Живые обои: тихая анимация на холсте позади содержимого. Рисуется в половинном разрешении, не чаще 30 кадров в секунду,
// стоит, когда вкладка скрыта, эффекты выключены или в системе включено «уменьшение движения».
import { getAppearance, onAppearance, motionAllowed } from './appearance.js';
import { THEME_DEFS } from './theme-data.js';

// Какая анимация подходит каждой теме по умолчанию.
export const THEME_FX = { creation: 'stars' };

const rnd = (a, b) => a + Math.random() * (b - a);
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

const ENGINES = {
  stars: (w, h) => {
    const s = Array.from({ length: Math.round((w * h) / 9000) }, () => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(0.4, 1.3), p: rnd(0, 6.3), v: rnd(0.4, 1.2) }));
    return (c, t, col) => { s.forEach((o) => { c.globalAlpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * o.v + o.p)); c.fillStyle = col.text; c.beginPath(); c.arc(o.x, o.y, o.r, 0, 6.3); c.fill(); }); };
  },
  blobs: (w, h) => {
    const b = Array.from({ length: 4 }, (_, i) => ({ x: rnd(0, w), y: rnd(0, h), r: Math.max(w, h) * rnd(0.22, 0.38), sp: rnd(0.04, 0.09), ph: rnd(0, 6.3), i }));
    return (c, t, col) => { b.forEach((o) => { const x = o.x + Math.sin(t * o.sp + o.ph) * w * 0.12; const y = o.y + Math.cos(t * o.sp * 0.8 + o.ph) * h * 0.1; const g = c.createRadialGradient(x, y, 0, x, y, o.r); g.addColorStop(0, col.pal[o.i % col.pal.length]); g.addColorStop(1, 'transparent'); c.globalAlpha = 0.18; c.fillStyle = g; c.fillRect(0, 0, w, h); }); };
  },
  dust: (w, h) => {
    const d = Array.from({ length: Math.round((w * h) / 12000) }, () => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(0.5, 1.6), vx: rnd(-6, 6), vy: rnd(-4, -1), p: rnd(0, 6.3) }));
    let last = 0;
    return (c, t, col) => { const dt = Math.min(0.1, t - last); last = t; d.forEach((o) => { o.x += o.vx * dt; o.y += o.vy * dt; if (o.y < -4) o.y = h + 4; if (o.x < -4) o.x = w + 4; if (o.x > w + 4) o.x = -4; c.globalAlpha = 0.18 + 0.3 * (0.5 + 0.5 * Math.sin(t * 0.8 + o.p)); c.fillStyle = col.accent; c.beginPath(); c.arc(o.x, o.y, o.r, 0, 6.3); c.fill(); }); };
  },
  fireflies: (w, h) => {
    const f = Array.from({ length: Math.max(8, Math.round((w * h) / 30000)) }, () => ({ x: rnd(0, w), y: rnd(0, h), a: rnd(0, 6.3), sp: rnd(4, 10), p: rnd(0, 6.3) }));
    let last = 0;
    return (c, t, col) => { const dt = Math.min(0.1, t - last); last = t; f.forEach((o) => { o.a += rnd(-1, 1) * dt * 2; o.x = (o.x + Math.cos(o.a) * o.sp * dt + w) % w; o.y = (o.y + Math.sin(o.a) * o.sp * dt + h) % h; const k = 0.5 + 0.5 * Math.sin(t * 1.3 + o.p); const g = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, 14); g.addColorStop(0, col.accent); g.addColorStop(1, 'transparent'); c.globalAlpha = 0.15 + 0.5 * k; c.fillStyle = g; c.fillRect(o.x - 14, o.y - 14, 28, 28); }); };
  },
  mist: (w, h) => {
    const m = Array.from({ length: 5 }, (_, i) => ({ y: h * (0.2 + i * 0.16), ph: rnd(0, 6.3), sp: rnd(0.03, 0.07) }));
    return (c, t, col) => { m.forEach((o) => { const x = ((t * o.sp * w * 0.4 + o.ph * 80) % (w * 1.6)) - w * 0.3; const g = c.createLinearGradient(x, 0, x + w * 0.9, 0); g.addColorStop(0, 'transparent'); g.addColorStop(0.5, col.text); g.addColorStop(1, 'transparent'); c.globalAlpha = 0.05; c.fillStyle = g; c.fillRect(x, o.y - 30, w * 0.9, 60); }); };
  },
  sun: (w, h) => (c, t, col) => { const x = w * (0.2 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.03))); const g = c.createRadialGradient(x, -h * 0.1, 0, x, -h * 0.1, Math.max(w, h) * 0.9); g.addColorStop(0, col.accent); g.addColorStop(1, 'transparent'); c.globalAlpha = 0.16; c.fillStyle = g; c.fillRect(0, 0, w, h); },
};

export function pickEngine(themeId, live) {
  if (live === 'off') return null;
  const id = live === 'auto' ? THEME_FX[themeId] || 'off' : live;
  return ENGINES[id] ? id : null;
}

let cv = null;
let raf = 0;
let draw = null;
let engineId = null;
let lastFrame = 0;

function stop() { cancelAnimationFrame(raf); raf = 0; }
function clear() { if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); }

function frame(ts) {
  raf = requestAnimationFrame(frame);
  if (ts - lastFrame < 33) return;
  lastFrame = ts;
  const c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  const def = THEME_DEFS.find((t) => t.id === document.documentElement.dataset.theme);
  const col = { text: cssVar('--c-text') || '#888', accent: cssVar('--c-accent') || '#888', pal: (def && def.pal) || [cssVar('--c-accent') || '#888'] };
  c.save();
  draw(c, ts / 1000, col);
  c.restore();
  c.globalAlpha = 1;
}

export function refreshFx() {
  const root = document.documentElement;
  const a = getAppearance();
  const id = motionAllowed() ? pickEngine(root.dataset.theme, a.live) : null;
  if (!id || document.hidden) { stop(); clear(); if (!id && cv) cv.hidden = true; engineId = id; return; }
  if (!cv) {
    cv = document.createElement('canvas');
    cv.className = 'fx';
    cv.setAttribute('aria-hidden', 'true');
    document.body.prepend(cv);
  }
  cv.hidden = false;
  const w = Math.max(160, Math.round(window.innerWidth / 2));
  const h = Math.max(160, Math.round(window.innerHeight / 2));
  if (engineId !== id || cv.width !== w || cv.height !== h) {
    cv.width = w; cv.height = h;
    draw = ENGINES[id](w, h);
    engineId = id;
  }
  if (!raf) raf = requestAnimationFrame(frame);
}

export function initFx() {
  refreshFx();
  onAppearance(refreshFx);
  document.addEventListener('visibilitychange', refreshFx);
  window.addEventListener('resize', () => { clearTimeout(initFx.t); initFx.t = setTimeout(refreshFx, 250); });
  new MutationObserver(refreshFx).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (window.matchMedia) window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', refreshFx);
}
