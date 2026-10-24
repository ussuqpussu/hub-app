// Примитивы движения из motion-kit: появление страниц с блюром и каскадом, уход старой страницы, счётчики,
// вычерчивание графиков, «клякса» смены темы, FLIP-перестройка списков. Всё без ИИ и без библиотек.
// Всё подчиняется motionAllowed(): выключатель «Эффекты» и системное «уменьшить движение» отключают движение целиком.
import { motionAllowed } from './appearance.js';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const css = (name, fallback) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || fallback;

// ---- какие элементы страницы появляются по очереди ----
const FLAT = '.bento, .sched-body, .stack, .kan';
function riseTargets(view) {
  const out = [];
  const walk = (parent, depth) => {
    [...parent.children].forEach((c) => {
      if (c.tagName === 'SCRIPT' || c.hidden) return;
      if (depth < 2 && c.matches(FLAT) && c.children.length > 1) walk(c, depth + 1);
      else out.push(c);
    });
  };
  walk(view, 0);
  return out;
}

// Появление: карточка выходит из блюра, текст внутри приходит позже. Класс снимается, чтобы перерисовка при синхронизации не мигала.
export function enterView(view) {
  if (!view || !motionAllowed()) return;
  riseTargets(view).forEach((el, i) => { el.dataset.rise = ''; el.style.setProperty('--i', String(i)); });
  view.classList.add('is-entering');
  const total = css('--mk-in', 0.7) * 1000 + 8 * css('--mk-step', 70) + 150;
  setTimeout(() => {
    view.classList.remove('is-entering');
    view.querySelectorAll('[data-rise]').forEach((el) => { delete el.dataset.rise; el.style.removeProperty('--i'); });
  }, total);
  countIn(view);
  drawIn(view);
}

// Уход: старая страница уходит за ~170 мс. Возвращает true, если пришлось ждать.
export async function leaveView(view) {
  if (!view || !motionAllowed()) return false;
  view.classList.add('is-leaving');
  await sleep(css('--mk-out', 170) + 5);
  return true;
}

// ---- счётчики ----
const NUM = /-?\d[\d\s ]*(?:[.,]\d+)?/;
export function countUp(el, { dur = 1200, delay = 0 } = {}) {
  const raw = el.textContent;
  const m = NUM.exec(raw);
  if (!m || !motionAllowed()) return;
  const numText = m[0];
  const to = parseFloat(numText.replace(/[\s ]/g, '').replace(',', '.'));
  if (!Number.isFinite(to) || Math.abs(to) > 1e12) return;
  const sepComma = /,\d+$/.test(numText);
  const dec = (numText.match(/[.,](\d+)$/) || [])[1]?.length || 0;
  const group = /[\s ]/.test(numText.trim());
  const pre = raw.slice(0, m.index);
  const post = raw.slice(m.index + numText.length);
  const fmt = (v) => {
    let s = Math.abs(v).toFixed(dec);
    if (group) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    if (sepComma) s = s.replace('.', ',');
    return `${pre}${v < 0 ? '-' : ''}${s}${post}`;
  };
  el.setAttribute('aria-label', raw.trim());
  el.textContent = fmt(0);
  let t0 = null;
  setTimeout(() => requestAnimationFrame(function tick(ts) {
    if (!el.isConnected) return;
    t0 ??= ts;
    const p = Math.min((ts - t0) / dur, 1);
    el.textContent = p < 1 ? fmt(to * easeOutCubic(p)) : raw;
    if (p < 1) requestAnimationFrame(tick);
  }), delay);
}
export function countIn(root) {
  if (!motionAllowed()) return;
  root.querySelectorAll('[data-count]').forEach((el) => {
    const card = el.closest('[data-rise]');
    const i = card ? +card.style.getPropertyValue('--i') || 0 : 0;
    countUp(el, { delay: 120 + Math.min(i, 8) * css('--mk-step', 70), dur: Math.min(+el.dataset.count || 1200, 700) });
  });
}

// ---- графики: контейнеру data-draw ставится mk-draw, через два кадра mk-go запускает переходы ----
export function drawIn(root) {
  if (!motionAllowed()) return;
  const boxes = [...root.querySelectorAll('[data-draw]')];
  boxes.forEach((b) => b.classList.add('mk-draw'));
  if (!boxes.length) return;
  requestAnimationFrame(() => requestAnimationFrame(() => boxes.forEach((b) => b.classList.add('mk-go'))));
}

// ---- смена темы «каплей»: View Transitions + волнистый clip-path из кнопки ----
export function blobFrames(cx, cy, W, H, steps = 30) {
  const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.3;
  const N = 72;
  const out = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    const R = e * maxR;
    const wob = Math.sin(Math.PI * t) * 0.2;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const k = 1 + wob * (0.6 * Math.sin(3 * a + t * 5) + 0.4 * Math.sin(5 * a - t * 7));
      pts.push(`${(cx + R * k * Math.cos(a)).toFixed(1)}px ${(cy + R * k * Math.sin(a)).toFixed(1)}px`);
    }
    out.push(`polygon(${pts.join(',')})`);
  }
  return out;
}
// Смена темы: мягкое перетекание снимка (только прозрачность, считается на видеокарте). Прежняя «клякса» из 72 точек
// перерисовывала весь экран на каждом кадре и сильно лагала на больших мониторах; blobFrames оставлен для совместимости.
export async function themeWipe(originEl, apply) {
  if (!document.startViewTransition || !motionAllowed()) { apply(); return; }
  try {
    const vt = document.startViewTransition(apply);
    await vt.finished;
  } catch (_) { /* без эффекта: тема уже применена */ }
}

// ---- FLIP: элементы с data-flip плавно переезжают на новые места после перерисовки ----
export function flipSwap(container, mutate, dur = 450) {
  const first = new Map();
  if (motionAllowed()) container.querySelectorAll('[data-flip]').forEach((el) => { const r = el.getBoundingClientRect(); if (r.width || r.height) first.set(el.dataset.flip, r); });
  mutate();
  if (!first.size) return;
  container.querySelectorAll('[data-flip]').forEach((el) => {
    const f = first.get(el.dataset.flip);
    if (!f) return;
    const l = el.getBoundingClientRect();
    if (!l.width && !l.height) return;
    const dx = f.left - l.left;
    const dy = f.top - l.top;
    if (!dx && !dy) return;
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: dur, easing: 'cubic-bezier(.22,1,.36,1)' });
  });
}
