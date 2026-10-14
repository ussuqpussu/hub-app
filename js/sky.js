// «Небо за окном» и погода: анимированная сцена по времени суток и погоде, нарисованная в манере выбранной темы
// (те же приёмы shp/цвета, что у сцен тем: плоская заливка, линия, свечение, стекло, акварель).
import { renderScene } from './canvas-env.js';
import { motionAllowed, onAppearance } from './appearance.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hex = (h) => { const n = parseInt(String(h).replace('#', '').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const rgb = (a, al = 1) => `rgba(${a[0]},${a[1]},${a[2]},${al})`;

// Часы суток -> (верх неба, низ неба, свет звёзд 0..1)
const KEYS = [
  [0, [10, 14, 38], [22, 28, 62], 1],
  [5, [24, 30, 66], [120, 96, 120], 0.7],
  [7, [90, 150, 215], [250, 200, 160], 0.1],
  [12, [70, 140, 225], [170, 215, 245], 0],
  [17, [86, 140, 210], [250, 214, 168], 0],
  [19, [60, 70, 140], [240, 140, 110], 0.3],
  [21, [18, 22, 52], [50, 44, 86], 0.9],
  [24, [10, 14, 38], [22, 28, 62], 1],
];

export function skyColors(hour) {
  for (let i = 0; i < KEYS.length - 1; i += 1) {
    const [h0, t0, b0, s0] = KEYS[i];
    const [h1, t1, b1, s1] = KEYS[i + 1];
    if (hour >= h0 && hour <= h1) {
      const k = (hour - h0) / (h1 - h0);
      return { top: mix(t0, t1, k), bottom: mix(b0, b1, k), stars: s0 + (s1 - s0) * k };
    }
  }
  return { top: KEYS[0][1], bottom: KEYS[0][2], stars: 1 };
}

// Положение светила: день 6:30-19:30 солнце, иначе луна; x слева направо, y по дуге.
export function bodyPos(hour) {
  const day = hour >= 6.5 && hour <= 19.5;
  const k = day ? (hour - 6.5) / 13 : ((hour >= 19.5 ? hour - 19.5 : hour + 4.5) / 11);
  return { day, x: clamp(k, 0, 1), y: 1 - Math.sin(clamp(k, 0, 1) * Math.PI) };
}

// Сколько облаков и какие осадки для вида погоды
export const SKY_KINDS = { clear: { clouds: 1 }, cloud: { clouds: 5 }, fog: { clouds: 2, fog: true }, rain: { clouds: 5, rain: 1 }, storm: { clouds: 6, rain: 1.4, flash: true }, snow: { clouds: 4, snow: true } };

// Тема для рисования: сцены темы или запасной набор из цветов страницы (для «Сотворения» и своей темы).
export function skyTheme(themeId) {
  const cs = getComputedStyle(document.documentElement);
  const v = (n, d) => cs.getPropertyValue(n).trim() || d;
  const dk = cs.colorScheme.includes('dark');
  return { pal: [v('--c-accent', '#888'), v('--c-text', '#ddd'), v('--c-dim', '#999'), v('--c-surface', '#222')], dk, st: 'flat', t: v('--c-text', '#ddd'), b: v('--c-bg', '#000'), s: v('--c-surface', '#111'), ts: 'x' };
}

// Сама сцена. E — окружение из scenes.js (ctx, w, h, t, shp, circ, th, P, dk, LW).
export function skyScene(E, kind, date) {
  const { ctx: c, w, h, t, shp, circ, th, P, LW } = E;
  const k = SKY_KINDS[kind] || SKY_KINDS.clear;
  const hour = date.getHours() + date.getMinutes() / 60;
  const s = skyColors(hour);
  const themeBg = hex(th.b || '#888888');
  const grey = kind === 'rain' || kind === 'storm' || kind === 'fog' || kind === 'cloud';
  const ok = (v, d) => (v && /^#[0-9a-f]{6}/i.test(v) ? hex(v) : d);
  const acc = ok(P[0], themeBg);
  const acc2 = ok(P[1], acc);
  const top = mix(mix(mix(s.top, acc, 0.3), themeBg, 0.1), [110, 118, 130], grey ? 0.3 : 0);
  const bot = mix(mix(mix(s.bottom, acc2, 0.28), themeBg, 0.1), [150, 156, 166], grey ? 0.3 : 0);
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, rgb(top));
  g.addColorStop(1, rgb(bot));
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);

  // звёзды (ночью, в ясную погоду ярче)
  const night = s.stars * (grey ? 0.35 : 1);
  if (night > 0.05) {
    for (let i = 0; i < 46; i += 1) {
      const fx = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const fy = (Math.sin(i * 78.233) * 12345.6789) % 1;
      const x = Math.abs(fx) * w;
      const y = Math.abs(fy) * h * 0.62;
      c.globalAlpha = night * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (0.8 + (i % 5) * 0.3) + i)));
      shp(th.t || '#fff', () => circ(x, y, Math.max(0.7, LW * (0.35 + (i % 3) * 0.2))), { fill: 'only' });
    }
    c.globalAlpha = 1;
  }

  // солнце или месяц
  const b = bodyPos(hour);
  const bx = w * (0.12 + 0.76 * b.x);
  const by = h * (0.12 + 0.5 * b.y);
  const r = Math.min(w, h) * 0.13;
  const dim = grey ? 0.55 : 1;
  c.globalAlpha = dim;
  if (b.day) {
    const sun = P[1] && /^#/.test(P[1]) ? P[1] : '#f2b84b';
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * 6.2832 + t * 0.15;
      shp(sun, () => { c.moveTo(bx + Math.cos(a) * r * 1.35, by + Math.sin(a) * r * 1.35); c.lineTo(bx + Math.cos(a) * r * (1.7 + 0.15 * Math.sin(t * 2 + i)), by + Math.sin(a) * r * (1.7 + 0.15 * Math.sin(t * 2 + i))); }, { st: 'line', lw: 1.6 });
    }
    shp(sun, () => circ(bx, by, r), { solid: 1 });
  } else {
    const moon = th.dk ? (th.t || '#eef') : '#f4f1e4';
    shp(moon, () => { c.arc(bx, by, r, 0, 6.2832); c.arc(bx + r * 0.5, by - r * 0.2, r * 0.82, 0, 6.2832, true); }, { solid: 1 });
  }
  c.globalAlpha = 1;

  // облака плывут
  const cloudCol = grey ? mix(hex(th.s && th.s.startsWith('#') ? th.s : '#cccccc'), [120, 126, 138], kind === 'cloud' ? 0.25 : 0.5) : mix(hex(th.s && th.s.startsWith('#') ? th.s : '#ffffff'), [255, 255, 255], 0.4);
  for (let i = 0; i < k.clouds; i += 1) {
    const sp = 0.012 + (i % 3) * 0.006;
    const cx = (((i * 0.31 + t * sp) % 1.5) - 0.25) * w;
    const cy = h * (0.18 + ((i * 0.23) % 0.4));
    const cs = Math.min(w, h) * (0.16 + (i % 3) * 0.05);
    shp(rgb(cloudCol, 0.92), () => {
      circ(cx, cy, cs * 0.55); c.moveTo(cx + cs * 1.05, cy + cs * 0.1); circ(cx + cs * 0.7, cy + cs * 0.05, cs * 0.5);
      c.moveTo(cx - cs * 0.15, cy + cs * 0.1); circ(cx - cs * 0.55, cy + cs * 0.15, cs * 0.42);
      c.rect(cx - cs * 0.6, cy + cs * 0.1, cs * 1.75, cs * 0.45);
    }, { ns: 1 });
  }

  if (k.fog) { for (let i = 0; i < 4; i += 1) { const y = h * (0.35 + i * 0.14) + Math.sin(t * 0.4 + i) * 4; c.fillStyle = rgb([230, 233, 238], 0.28); c.fillRect(0, y, w, h * 0.08); } }

  // дождь
  if (k.rain) {
    const col = P[0] && /^#/.test(P[0]) ? P[0] : '#8fb3ff';
    for (let i = 0; i < 38; i += 1) {
      const x = ((i * 53.7) % w + t * 12 * k.rain) % w;
      const y = ((i * 37.3) % h + t * h * 0.9 * k.rain) % h;
      shp(col, () => { c.moveTo(x, y); c.lineTo(x - 3, y + h * 0.09); }, { st: 'line', lw: 0.9 });
    }
  }
  // снег
  if (k.snow) {
    for (let i = 0; i < 46; i += 1) {
      const x = (((i * 47.1) % w) + Math.sin(t * 0.8 + i) * 8 + w) % w;
      const y = ((i * 29.3) % h + t * h * 0.12 * (0.6 + (i % 4) * 0.2)) % h;
      shp('#ffffff', () => circ(x, y, Math.max(1, LW * (0.7 + (i % 3) * 0.35))), { fill: 'only' });
    }
  }
  // молния
  if (k.flash && Math.floor(t * 0.5) % 5 === 0 && (t * 0.5) % 1 < 0.12) { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(0, 0, w, h); }

  // холмы в цветах темы
  const hillA = mix(hex(P[2] && /^#/.test(P[2]) ? P[2] : '#445544'), bot, 0.45);
  const hillB = mix(hex(P[3] && /^#/.test(P[3]) ? P[3] : '#223322'), bot, 0.2);
  [[hillA, 0.74, 0.07, 1.1], [hillB, 0.86, 0.05, 2.3]].forEach(([col, y0, amp, ph]) => {
    shp(rgb(col), () => { c.moveTo(0, h); for (let i = 0; i <= 24; i += 1) c.lineTo((i / 24) * w, h * (y0 - amp * Math.sin(i * 0.5 + ph))); c.lineTo(w, h); c.closePath(); }, { ns: 1 });
  });
}

// ---- Показ на странице ----
const mounted = new Set();
let raf = 0;
function tick(now) {
  raf = requestAnimationFrame(tick);
  mounted.forEach((m) => {
    if (!m.cv.isConnected) { mounted.delete(m); return; }
    if (now - m.last < 33) return;
    m.last = now;
    draw(m, (now - m.t0) / 1000);
  });
  if (!mounted.size) { cancelAnimationFrame(raf); raf = 0; }
}
function draw(m, t) {
  const th = skyTheme(document.documentElement.dataset.theme);
  renderScene(m.cv, null, 0, t, 2, (E) => skyScene(E, m.kind(), new Date()), th);
}
function sync() {
  cancelAnimationFrame(raf); raf = 0;
  if (document.hidden || !mounted.size) return;
  if (motionAllowed()) raf = requestAnimationFrame(tick); else mounted.forEach((m) => draw(m, 3));
}

// Рисует небо в холсте cv. kind — функция, возвращающая вид погоды (clear, cloud, fog, rain, storm, snow).
export function mountSky(cv, kind = () => 'clear') {
  const m = { cv, kind, t0: performance.now(), last: 0 };
  mounted.add(m);
  requestAnimationFrame(() => sync());
  return m;
}
export function initSky() {
  onAppearance(sync);
  document.addEventListener('visibilitychange', sync);
  new MutationObserver(() => mounted.forEach((m) => draw(m, 3))).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
