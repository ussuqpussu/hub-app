// Маленькие графики из motion-kit на токенах темы: кольца, бублик, столбцы, линия. Анимацию запускает motion-kit (drawIn по data-draw).
import { el } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}) {
  const n = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v)));
  return n;
}
const clamp01 = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

// Кольца активности: items = [{ label, value, p (0..1) }]; число value считается при появлении.
export function rings(items, { label = 'Кольца' } = {}) {
  const radii = [52, 40, 28];
  const svg = s('svg', { viewBox: '0 0 130 130', class: 'mk-ring', role: 'img', 'aria-label': `${label}: ${items.map((i) => `${i.label} ${Math.round(clamp01(i.p) * 100)}%`).join(', ')}` });
  items.slice(0, 3).forEach((it, i) => {
    const r = radii[i];
    svg.append(s('circle', { class: 'rb', cx: 65, cy: 65, r }));
    const f = s('circle', { class: 'rf', cx: 65, cy: 65, r, transform: 'rotate(-90 65 65)' });
    f.style.cssText = `--c:${(2 * Math.PI * r).toFixed(2)};--p:${clamp01(it.p).toFixed(3)};--ri:${i};stroke:var(--chart-${[2, 3, 1][i]})`;
    svg.append(f);
  });
  const stats = el('div', { class: 'mk-ringstat' }, items.slice(0, 3).map((it) => el('div', {}, [el('span', { text: it.label }), el('b', { text: String(it.value), 'data-count': '1200' })])));
  return el('div', { class: 'mk-wrap', 'data-draw': '' }, [svg, stats]);
}

// Бублик: segs = [{ share (0..1), color }], center = { value, label }
export function donut(segs, center) {
  const C = 2 * Math.PI * 80;
  const svg = s('svg', { viewBox: '0 0 200 200', role: 'img', 'aria-label': `${center.label}: ${center.value}` });
  svg.append(s('circle', { class: 'db', cx: 100, cy: 100, r: 80 }));
  let acc = 0;
  segs.forEach((g, i) => {
    const len = Math.max(0.5, C * clamp01(g.share) - (i < segs.length - 1 && segs.length > 1 ? 3 : 0));
    const c = s('circle', { class: 'dg', cx: 100, cy: 100, r: 80, stroke: g.color, 'stroke-dasharray': `${len} ${C}`, 'stroke-dashoffset': -acc });
    c.style.cssText = `--len:${len.toFixed(2)};--c:${C.toFixed(2)};--si:${i}`;
    svg.append(c);
    acc += C * clamp01(g.share);
  });
  const box = el('div', { class: 'mk-donut' }, [svg, el('div', { class: 'mk-donut__c' }, [el('b', { text: String(center.value), 'data-count': '1000' }), el('span', { text: center.label })])]);
  return box;
}

// Столбцы: values, labels (подписи под столбцами)
export function bars(values, labels = [], { label = 'График' } = {}) {
  const max = Math.max(1, ...values);
  const box = el('div', { 'data-draw': '' });
  const row = el('div', { class: 'mk-bars', role: 'img', 'aria-label': `${label}: ${values.map((v, i) => `${labels[i] || i + 1} ${v}`).join(', ')}` });
  values.forEach((v, i) => {
    const b = el('i', { style: `height:${Math.max(2, Math.round((v / max) * 100))}%;--bi:${i}` });
    if (!v) b.setAttribute('data-zero', '');
    row.append(b);
  });
  box.append(row);
  if (labels.length) box.append(el('div', { class: 'mk-axis' }, labels.map((t) => el('span', { text: t }))));
  return box;
}

// Линия с заливкой: values (накопительно или любые числа)
export function line(values, { label = 'Линия' } = {}) {
  const W = 600;
  const H = 120;
  const n = values.length;
  const max = Math.max(1, ...values);
  const P = values.map((v, i) => [n > 1 ? (i * W) / (n - 1) : W / 2, H - 6 - (v / max) * (H - 12)]);
  let d = `M${P[0][0]},${P[0][1].toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    const [x0, y0] = P[i - 1];
    const [x1, y1] = P[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx.toFixed(1)},${y0.toFixed(1)} ${cx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'mk-line', role: 'img', 'aria-label': label, preserveAspectRatio: 'none' });
  const defs = s('defs');
  const g = s('linearGradient', { id: 'mk-grad', x1: 0, y1: 0, x2: 0, y2: 1 });
  g.append(s('stop', { class: 'gs', offset: 0, 'stop-opacity': 0.35 }), s('stop', { class: 'gs', offset: 1, 'stop-opacity': 0 }));
  defs.append(g);
  svg.append(defs, s('path', { class: 'ar', d: `${d} L${W},${H} L0,${H} Z` }), s('path', { class: 'ln', d, pathLength: 1, 'vector-effect': 'non-scaling-stroke' }));
  return el('div', { 'data-draw': '' }, [svg]);
}
