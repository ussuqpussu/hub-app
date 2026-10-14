// Плавные переключатели для всех тем.
// 1) Боковая панель и нижняя панель: ползунок плавно переезжает к выбранной странице.
// 2) Сегменты («Все / Светлые / Тёмные», вкладки): ползунок едет от прежней кнопки к новой, даже если экран перерисовался.
// Без движения (эффекты выключены или «уменьшение движения» в системе) ползунок просто ставится на место.
import { motionAllowed } from './appearance.js';

const geo = new Map(); // ключ сегмента -> последняя геометрия выбранной кнопки

function rect(el) { return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }; }

function put(el, g) {
  el.style.setProperty('--ix', `${g.x}px`);
  el.style.setProperty('--iy', `${g.y}px`);
  el.style.setProperty('--iw', `${g.w}px`);
  el.style.setProperty('--ih', `${g.h}px`);
}

function settle(ind) {
  // включаем переходы только после первой установки, чтобы ползунок не летел из угла
  if (!ind.dataset.ready) requestAnimationFrame(() => { ind.dataset.ready = '1'; });
}

// ---- навигация ----
export function initNavIndicator(nav) {
  if (!nav) return;
  const ind = document.createElement('span');
  ind.className = 'nav__ind';
  ind.setAttribute('aria-hidden', 'true');
  nav.dataset.ind = '1';
  const place = () => {
    if (!ind.isConnected) nav.prepend(ind);
    const a = [...nav.querySelectorAll('.nav__item[aria-current="page"]')].find((el) => el.offsetParent !== null);
    if (!a) { ind.style.opacity = '0'; return; }
    ind.style.opacity = '1';
    put(ind, rect(a));
    settle(ind);
  };
  new MutationObserver(place).observe(nav, { attributes: true, attributeFilter: ['aria-current'], subtree: true, childList: true });
  new ResizeObserver(place).observe(nav);
  window.addEventListener('resize', place);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  place();
}

// ---- сегменты ----
function segKey(seg) {
  if (seg.dataset.segKey) return seg.dataset.segKey;
  const route = (location.hash || '').split('/').slice(0, 2).join('/');
  const all = [...document.querySelectorAll('.seg')];
  return `${route}|${all.indexOf(seg)}|${seg.children.length}`;
}

function updateSeg(seg) {
  const thumb = seg._thumb;
  if (!thumb) return;
  const btn = seg.querySelector('button[aria-pressed="true"]');
  if (!btn || !seg.offsetWidth) { thumb.style.opacity = '0'; return; }
  const key = seg._key || (seg._key = segKey(seg));
  const g = rect(btn);
  if (!seg._init) {
    seg._init = true;
    const prev = geo.get(key);
    if (prev && motionAllowed()) {
      put(thumb, prev);
      thumb.style.opacity = '1';
      void thumb.offsetWidth; // зафиксировать старое место, затем ехать на новое
      thumb.dataset.ready = '1';
    }
  }
  thumb.style.opacity = '1';
  put(thumb, g);
  geo.set(key, g);
  settle(thumb);
}

function setupSeg(seg) {
  if (seg._thumb && seg._thumb.isConnected) { updateSeg(seg); return; }
  seg._init = false; // экран перерисовал кнопки и унёс ползунок: ставим новый на прежнее место и едем к выбранной
  const thumb = document.createElement('span');
  thumb.className = 'seg__thumb';
  thumb.setAttribute('aria-hidden', 'true');
  seg.classList.add('seg--thumb');
  seg.prepend(thumb);
  seg._thumb = thumb;
  updateSeg(seg);
}

export function initSegThumbs(root = document.body) {
  const scan = () => root.querySelectorAll('.seg').forEach(setupSeg);
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; scan(); }); };
  new MutationObserver(later).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'hidden', 'class'] });
  window.addEventListener('resize', later);
  scan();
}

export function initMotionUi({ nav }) {
  initNavIndicator(nav);
  initSegThumbs();
}
