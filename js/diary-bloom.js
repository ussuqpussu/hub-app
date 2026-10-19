// Фигура настроения «стеклянный цветок» (вариант G): три прозрачных стеклянных слоя снаружи, тонкие контуры внутри.
// Форма и цвет зависят от уровня −3…+3 и плавно перетекают при дробных значениях (во время движения ползунка).
// Всё рисуется по формуле (полярная кривая с лепестками), без чужих картинок.
//  −3 острая восьмиконечная звезда, −2 волнистая, −1 мягкий восьмиугольник, 0 круг с кольцами,
//  +1 скруглённый пятиугольник, +2 пятиконечная звезда с мягкими лучами, +3 пятилепестковый цветок.
const NS = 'http://www.w3.org/2000/svg';
const N = 120; // точек на контур

// n лепестков, a размах, p острота лучей (больше — уже и острее)
const SHAPES = [
  { n: 8, a: 0.38, p: 2.9 },
  { n: 8, a: 0.22, p: 1.3 },
  { n: 8, a: 0.1, p: 1 },
  { n: 1, a: 0, p: 1 },
  { n: 5, a: 0.08, p: 1 },
  { n: 5, a: 0.2, p: 1.7 },
  { n: 5, a: 0.3, p: 0.9 },
];
// цвет уровня: тон, насыщенность, светлота (в процентах)
const COLORS = [
  [268, 78, 64],
  [236, 84, 68],
  [212, 88, 70],
  [194, 70, 74],
  [130, 60, 62],
  [58, 88, 62],
  [24, 94, 66],
];

const radii = SHAPES.map((s) => {
  const raw = [];
  let sum = 0;
  for (let i = 0; i < N; i += 1) {
    const th = (i / N) * Math.PI * 2;
    const w = ((1 + Math.cos(s.n * th)) / 2) ** s.p;
    raw.push(w); sum += w;
  }
  const mean = sum / N;
  const r = raw.map((w) => 1 + s.a * (w - mean));
  const mx = Math.max(...r);
  return r.map((x) => x / mx);
});

const clamp = (v) => Math.max(-3, Math.min(3, v));
const lerp = (a, b, t) => a + (b - a) * t;

export function colorAt(v) {
  const x = clamp(v) + 3;
  const i = Math.min(5, Math.floor(x));
  const t = x - i;
  return [lerp(COLORS[i][0], COLORS[i + 1][0], t), lerp(COLORS[i][1], COLORS[i + 1][1], t), lerp(COLORS[i][2], COLORS[i + 1][2], t)];
}
export const hsl = (c, a = 1, dl = 0) => `hsl(${c[0].toFixed(1)} ${c[1].toFixed(1)}% ${Math.max(0, Math.min(97, c[2] + dl)).toFixed(1)}% / ${a})`;
const shift = (c, dh, dl = 0) => [(c[0] + dh + 360) % 360, c[1], c[2] + dl];

function pathAt(v, scale, round) {
  const x = clamp(v) + 3;
  const i = Math.min(5, Math.floor(x));
  const t = x - i;
  const A = radii[i]; const B = radii[i + 1];
  let d = '';
  for (let k = 0; k < N; k += 1) {
    let r = lerp(A[k], B[k], t);
    r = 1 + (r - 1) * round; // у внутренних контуров лепестки мягче
    const th = (k / N) * Math.PI * 2;
    d += `${k ? 'L' : 'M'}${(Math.cos(th) * r * scale).toFixed(2)} ${(Math.sin(th) * r * scale).toFixed(2)}`;
  }
  return `${d}Z`;
}

const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const mk = (name, attrs = {}) => {
  const e = document.createElementNS(NS, name);
  Object.keys(attrs).forEach((k) => { if (attrs[k] != null) e.setAttribute(k, attrs[k]); });
  return e;
};

const LAY = [
  { s: 100, round: 0.92, rot: 3.2, ph: 0 },
  { s: 79, round: 0.84, rot: -4, ph: 21 },
  { s: 58, round: 0.74, rot: 3.2, ph: 42 },
];
const LINES = 8;


const GLASS_THEMES = ['mythmono', 'fusion', 'mythbento', 'myth', 'creation'];
// Стеклянный вид тяжелее: включаем его только на подходящих темах и не в экономном режиме. Иначе лёгкий вид.
export function bloomStyle() {
  const root = document.documentElement;
  if (root.dataset.lite === '1' || root.dataset.idle === '1') return 'light';
  return GLASS_THEMES.includes(root.dataset.theme) ? 'glass' : 'light';
}

// ----- стеклянный вид (вариант G): три прозрачных слоя, тонкие контуры внутри -----
function buildGlass(svg, uid) {
  let defs = `<filter id="${uid}w" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="${uid}r" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4.5"/></filter>
<filter id="${uid}t" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1"/></filter>
<filter id="${uid}d" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".3"/></filter>
<linearGradient id="${uid}e" gradientUnits="userSpaceOnUse" x1="-80" y1="-90" x2="80" y2="90"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop class="e1" offset=".5"/><stop class="e2" offset="1"/></linearGradient>
<linearGradient id="${uid}i" gradientUnits="userSpaceOnUse" x1="-90" y1="-90" x2="90" y2="90"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop class="i1" offset=".55"/><stop class="i2" offset="1"/></linearGradient>`;
  LAY.forEach((_, i) => {
    defs += `<linearGradient id="${uid}f${i}" gradientUnits="userSpaceOnUse" x1="-60" y1="-80" x2="70" y2="90"><stop class="f${i}a" offset="0"/><stop class="f${i}b" offset="1"/></linearGradient><clipPath id="${uid}k${i}"><path class="kp${i}"/></clipPath>`;
  });
  svg.innerHTML = `<defs>${defs}</defs>`;
  const q = (c) => svg.querySelector(c);

  const halo = mk('path', { filter: `url(#${uid}w)` });
  svg.append(halo);
  const layers = LAY.map((L, i) => {
    const g = mk('g', { filter: `url(#${uid}d)` });
    const fill = mk('path', { fill: `url(#${uid}f${i})` });
    const inner = mk('g', { 'clip-path': `url(#${uid}k${i})` });
    const glow = mk('path', { fill: 'none', filter: `url(#${uid}r)`, stroke: `url(#${uid}i)` });
    const thick = mk('path', { fill: 'none', filter: `url(#${uid}t)` });
    inner.append(glow, thick);
    const edge = mk('path', { fill: 'none', 'stroke-linejoin': 'round', stroke: `url(#${uid}e)` });
    const edge2 = mk('path', { fill: 'none', 'stroke-linejoin': 'round' });
    g.append(fill, inner, edge2, edge);
    svg.append(g);
    return { g, fill, glow, thick, edge, edge2, kp: q(`.kp${i}`), L };
  });
  const lineBox = mk('g');
  const lines = [];
  for (let i = 0; i < LINES; i += 1) {
    const g = mk('g');
    const p = mk('path', { fill: 'none', 'stroke-linejoin': 'round' });
    g.append(p); lineBox.append(g);
    lines.push({ g, p, k: i / (LINES - 1), dir: i % 2 ? -1 : 1, ph: i * 11 });
  }
  svg.append(lineBox);
  const dot = mk('circle', { r: 2.4, filter: `url(#${uid}t)`, fill: 'rgba(255,255,255,.9)' });
  svg.append(dot);

  // форма и цвет: пересчитываем только когда уровень изменился
  function shape(v, c) {
    const cols = [shift(c, -12, 2), c, shift(c, 12, -2)];
    halo.setAttribute('d', pathAt(v, 82, 0.8));
    halo.setAttribute('fill', hsl(c, 0.35, -14));
    q('.e1').setAttribute('stop-color', hsl(c, 0.55, 20));
    q('.e2').setAttribute('stop-color', hsl(shift(c, 16, -6), 0.85, 4));
    q('.i1').setAttribute('stop-color', hsl(c, 0.22, 20));
    q('.i2').setAttribute('stop-color', hsl(c, 0.5, 10));
    layers.forEach((o, i) => {
      const { L } = o; const cc = cols[i];
      const d = pathAt(v, L.s, L.round);
      q(`.f${i}a`).setAttribute('stop-color', hsl(cc, 0.16 - i * 0.02, 14));
      q(`.f${i}b`).setAttribute('stop-color', hsl(cc, 0.05, 0));
      o.fill.setAttribute('d', d); o.kp.setAttribute('d', d); o.glow.setAttribute('d', d);
      o.glow.setAttribute('stroke-width', String(11 - i * 2)); o.glow.setAttribute('stroke-opacity', '0.5');
      o.thick.setAttribute('d', d); o.thick.setAttribute('stroke', hsl(cc, 0.6, 26));
      o.thick.setAttribute('stroke-width', '2.6'); o.thick.setAttribute('stroke-opacity', '0.6');
      o.edge.setAttribute('d', d); o.edge.setAttribute('stroke-width', (1.2 - i * 0.15).toFixed(2));
      o.edge2.setAttribute('d', pathAt(v, L.s * 0.94, L.round));
      o.edge2.setAttribute('stroke', hsl(cc, 0.4, 34)); o.edge2.setAttribute('stroke-width', '0.45');
    });
    lines.forEach(({ p, k }) => {
      p.setAttribute('d', pathAt(v, 74 - k * 58, 0.94 - k * 0.3));
      p.setAttribute('stroke', hsl(shift(c, (k - 0.5) * 18), 0.45 + k * 0.4, 22 + k * 12));
      p.setAttribute('stroke-width', (0.5 + k * 0.35).toFixed(2));
    });
    svg.style.setProperty('--bloom-glow', hsl(c, 0.5));
  }


  function tick(t, breathe) {
    layers.forEach((o, i) => {
      o.g.setAttribute('transform', `rotate(${(t * o.L.rot + o.L.ph).toFixed(2)}) scale(${(1 + (breathe - 1) * (i + 1) * 0.7).toFixed(4)})`);
    });
    lines.forEach((o) => {
      o.g.setAttribute('transform', `rotate(${(t * 4.2 * o.dir * (0.5 + o.k) * 3.2 + o.ph).toFixed(2)})`);
    });
    lineBox.setAttribute('transform', `scale(${breathe.toFixed(4)})`);
  }
  return { shape, tick };
}

// ----- лёгкий вид (вариант A): четыре стеклянных контура со свечением, без внутренних линий и обрезки -----
function buildLight(svg, uid) {
  svg.innerHTML = `<defs><filter id="${uid}w" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter></defs>`;
  const halo = mk('path', { filter: `url(#${uid}w)` });
  svg.append(halo);
  const SC = [98, 82, 66, 50];
  const RO = [0.9, 0.8, 0.7, 0.6];
  const layers = SC.map((s, i) => {
    const g = mk('g');
    const p = mk('path');
    const e = mk('path', { fill: 'none', 'stroke-linejoin': 'round' });
    g.append(p, e); svg.append(g);
    return { g, p, e, s, round: RO[i], rot: i % 2 ? -5 : 4, ph: i * 19 };
  });
  function shape(v, c) {
    halo.setAttribute('d', pathAt(v, 72, 0.8));
    halo.setAttribute('fill', hsl(c, 0.28, -10));
    layers.forEach((o, i) => {
      const d = pathAt(v, o.s, o.round);
      o.p.setAttribute('d', d); o.e.setAttribute('d', d);
      o.p.setAttribute('fill', hsl(c, 0.1 + i * 0.06, -14 + i * 2));
      o.e.setAttribute('stroke', hsl(c, 0.85, 18)); o.e.setAttribute('stroke-width', '1.1');
    });
    svg.style.setProperty('--bloom-glow', hsl(c, 0.5));
  }
  function tick(t, breathe) {
    layers.forEach((o, i) => o.g.setAttribute('transform', `rotate(${(t * o.rot + o.ph).toFixed(2)}) scale(${(1 + (breathe - 1) * (i < 2 ? 0.6 : 1)).toFixed(4)})`));
  }
  return { shape, tick };
}

// живая фигура: set(v, ms) плавно переводит к уровню v; destroy() останавливает анимацию
// style: 'glass' | 'light' | 'auto' (по теме и экономному режиму)
export function createBloom({ live = true, style = 'auto' } = {}) {
  const uid = `bl${Math.random().toString(36).slice(2, 8)}`;
  const svg = mk('svg', { viewBox: '-112 -112 224 224', class: 'bloom', 'aria-hidden': 'true' });
  const kind = style === 'auto' ? bloomStyle() : style;
  const view = kind === 'glass' ? buildGlass(svg, uid) : buildLight(svg, uid);
  let cur = 0; let from = 0; let to = 0; let t0 = 0; let dur = 0; let raf = 0; let alive = true; let lastV = null;
  const ph = Math.random() * 6;
  const listeners = new Set();

  function paint(v, time) {
    const c = colorAt(v);
    if (v !== lastV) { view.shape(v, c); lastV = v; }
    const breathe = 1 + Math.sin(time / 1700 + ph) * 0.02;
    view.tick(live ? time / 1000 : 0, breathe);
    cur = v;
    listeners.forEach((fn) => fn(v, c));
  }

  const ease = (x) => 1 - (1 - x) ** 3;
  function frame(now) {
    if (!alive) return;
    if (document.hidden) { raf = requestAnimationFrame(frame); return; }
    let v = cur;
    if (dur > 0) {
      const k = Math.min(1, (now - t0) / dur);
      v = lerp(from, to, ease(k));
      if (k >= 1) dur = 0;
    }
    paint(v, now);
    if (live && !reduced()) raf = requestAnimationFrame(frame);
    else if (dur > 0) raf = requestAnimationFrame(frame);
    else raf = 0;
  }
  function kick() { if (!raf && alive) raf = requestAnimationFrame(frame); }

  paint(0, 0);
  return {
    el: svg,
    value: () => cur,
    // ms = 0: мгновенно (двигаем пальцем); иначе плавный переход
    set(v, ms = 0) {
      const nv = clamp(v);
      if (ms <= 0 || reduced()) { dur = 0; paint(nv, performance.now()); kick(); return; }
      from = cur; to = nv; t0 = performance.now(); dur = ms; kick();
    },
    onPaint(fn) { listeners.add(fn); },
    start() { if (live) kick(); },
    destroy() { alive = false; if (raf) cancelAnimationFrame(raf); raf = 0; listeners.clear(); },
  };
}

// неподвижная маленькая фигура для карточек списка
export function staticBloom(v) {
  const b = createBloom({ live: false, style: 'light' });
  b.set(v, 0);
  b.destroy();
  return b.el;
}

// цвет подложки: для фона листа
export function tintVars(c) {
  return { '--dm-h': c[0].toFixed(1), '--dm-s': `${c[1].toFixed(1)}%`, '--dm-l': `${c[2].toFixed(1)}%` };
}
