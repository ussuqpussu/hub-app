// Фигура настроения «цветок»: три вложенных контура и светящаяся середина.
// Форма и цвет зависят от уровня −3…+3 и плавно перетекают при дробных значениях (во время движения ползунка).
// Фигуры рисуются по формуле (полярная кривая с лепестками), без чужих картинок.
//  −3 острая восьмиконечная звезда, −2 волнистая, −1 мягкий волнистый восьмиугольник, 0 круг с кольцами,
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
  [268, 78, 60],
  [236, 84, 64],
  [212, 88, 68],
  [194, 82, 78],
  [122, 72, 62],
  [58, 92, 60],
  [24, 96, 66],
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
export const hsl = (c, a = 1, dl = 0) => `hsl(${c[0].toFixed(1)} ${c[1].toFixed(1)}% ${Math.min(96, c[2] + dl).toFixed(1)}% / ${a})`;

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
    const px = Math.cos(th) * r * scale;
    const py = Math.sin(th) * r * scale;
    d += `${k ? 'L' : 'M'}${px.toFixed(2)} ${py.toFixed(2)}`;
  }
  return `${d}Z`;
}

const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

const LAYERS = [
  { s: 100, round: 1, rot: 4, fill: 0.2, w: 1.2 },
  { s: 80, round: 0.88, rot: -6, fill: 0.36, w: 1.2 },
];
const CORE = { s: 56, round: 0.92, rot: 5 };
const K = 60; // граней у середины
const lightA = -Math.PI * 0.72; // откуда падает свет

// живая фигура: set(v, ms) плавно переводит к уровню v; destroy() останавливает анимацию
export function createBloom({ live = true } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '-110 -110 220 220');
  svg.setAttribute('class', 'bloom');
  svg.setAttribute('aria-hidden', 'true');
  const uid = `bg${Math.random().toString(36).slice(2, 8)}`;
  const defs = document.createElementNS(NS, 'defs');
  defs.innerHTML = `<radialGradient id="${uid}a"><stop class="a0" offset="0.25"/><stop class="a1" offset="1"/></radialGradient>
<radialGradient id="${uid}b"><stop class="b0" offset="0.2"/><stop class="b1" offset="1"/></radialGradient>
<radialGradient id="${uid}c"><stop offset="0" stop-color="#fff" stop-opacity="0.38"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.32"/></radialGradient>
<filter id="${uid}s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2.5" stdDeviation="3" flood-color="#000" flood-opacity="0.35"/></filter>`;
  svg.append(defs);
  const q = (c) => defs.querySelector(c);
  const groups = LAYERS.map((L) => {
    const g = document.createElementNS(NS, 'g');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('stroke-linejoin', 'round');
    g.append(p); g.setAttribute('filter', `url(#${uid}s)`); svg.append(g);
    return { g, p, L };
  });
  // второй, тонкий контур у кромки: двоит край, как стекло
  groups.forEach((o) => {
    const p2 = document.createElementNS(NS, 'path');
    p2.setAttribute('fill', 'none'); p2.setAttribute('stroke-linejoin', 'round');
    o.g.append(p2); o.p2 = p2;
  });
  const core = document.createElementNS(NS, 'g');
  const facets = [];
  for (let k = 0; k < K; k += 1) {
    const f = document.createElementNS(NS, 'path');
    core.append(f); facets.push(f);
  }
  const rim = document.createElementNS(NS, 'path');
  rim.setAttribute('fill', 'none'); rim.setAttribute('stroke-linejoin', 'round');
  const sheen = document.createElementNS(NS, 'ellipse');
  sheen.setAttribute('rx', '15'); sheen.setAttribute('ry', '8'); sheen.setAttribute('cx', '-6'); sheen.setAttribute('cy', '-12');
  sheen.setAttribute('transform', 'rotate(-28 -6 -12)');
  const shade = document.createElementNS(NS, 'path');
  shade.setAttribute('fill', `url(#${uid}c)`);
  core.append(shade, rim);
  svg.append(core);
  const dot = document.createElementNS(NS, 'circle');
  dot.setAttribute('r', '2');
  svg.append(sheen, dot);

  let cur = 0; let from = 0; let to = 0; let t0 = 0; let dur = 0; let raf = 0; let alive = true; let ph = Math.random() * 6;
  const listeners = new Set();

  let lastV = null;
  function shape(v, c) {
    q('.a0').setAttribute('stop-color', hsl(c, 0.02, 4)); q('.a1').setAttribute('stop-color', hsl(c, 0.3, 8));
    q('.b0').setAttribute('stop-color', hsl(c, 0.05, 2)); q('.b1').setAttribute('stop-color', hsl(c, 0.46, 6));
    groups.forEach(({ p, p2, L }, gi) => {
      p.setAttribute('d', pathAt(v, L.s, L.round));
      p2.setAttribute('d', pathAt(v, L.s * 0.955, L.round));
      p.setAttribute('fill', `url(#${uid}${gi ? 'b' : 'a'})`); p.setAttribute('stroke', hsl(c, 0.95, 26)); p.setAttribute('stroke-width', String(L.w));
      p2.setAttribute('stroke', hsl(c, 0.5, 30)); p2.setAttribute('stroke-width', '0.6');
    });
    // грани середины: свет слева сверху, выступающие части светлее
    const x = clamp(v) + 3; const i = Math.min(5, Math.floor(x)); const t = x - i;
    const A = radii[i]; const B = radii[i + 1];
    const rad = (k) => { const r = lerp(A[k % N], B[k % N], t); return 1 + (r - 1) * CORE.round; };
    const step = N / K;
    for (let k = 0; k < K; k += 1) {
      const i0 = Math.round(k * step); const i1 = Math.round((k + 1) * step);
      const th0 = (i0 / N) * Math.PI * 2; const th1 = (i1 / N) * Math.PI * 2;
      const r0 = rad(i0); const r1 = rad(i1);
      const mid = (th0 + th1) / 2; const rm = (r0 + r1) / 2;
      const lit = Math.cos(mid - lightA);
      const l = c[2] - 12 + lit * 9 + (rm - 0.85) * 55;
      const d = `M0 0L${(Math.cos(th0) * r0 * CORE.s).toFixed(2)} ${(Math.sin(th0) * r0 * CORE.s).toFixed(2)}L${(Math.cos(th1) * r1 * CORE.s).toFixed(2)} ${(Math.sin(th1) * r1 * CORE.s).toFixed(2)}Z`;
      const f = facets[k];
      f.setAttribute('d', d);
      const col = `hsl(${c[0].toFixed(1)} ${Math.min(100, c[1] + 6).toFixed(1)}% ${Math.max(18, Math.min(92, l)).toFixed(1)}%)`;
      f.setAttribute('fill', col); f.setAttribute('stroke', col); f.setAttribute('stroke-width', '0.35');
    }
    rim.setAttribute('d', pathAt(v, CORE.s, CORE.round));
    shade.setAttribute('d', pathAt(v, CORE.s, CORE.round));
    rim.setAttribute('stroke', hsl(c, 0.9, 26)); rim.setAttribute('stroke-width', '0.9');
    sheen.setAttribute('fill', 'rgb(255 255 255 / 0.26)');
    dot.setAttribute('fill', hsl([c[0], c[1], 30], 0.85));
    svg.style.setProperty('--bloom-glow', hsl(c, 0.6));
  }

  function paint(v, time) {
    const c = colorAt(v);
    if (v !== lastV) { shape(v, c); lastV = v; }
    const breathe = 1 + Math.sin(time / 1900 + ph) * 0.022;
    const rot = (time / 1000) * (live ? 1 : 0);
    groups.forEach(({ g, L }, i) => {
      g.setAttribute('transform', `rotate(${(rot * L.rot + i * 17).toFixed(2)}) scale(${(1 + (breathe - 1) * 0.6).toFixed(4)})`);
    });
    core.setAttribute('transform', `rotate(${(rot * CORE.rot + 31).toFixed(2)}) scale(${breathe.toFixed(4)})`);
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
  const b = createBloom({ live: false });
  b.set(v, 0);
  b.destroy();
  return b.el;
}

// цвет подложки: для фона листа
export function tintVars(c) {
  return { '--dm-h': c[0].toFixed(1), '--dm-s': `${c[1].toFixed(1)}%`, '--dm-l': `${c[2].toFixed(1)}%` };
}
