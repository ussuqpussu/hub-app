// Экономный режим: хаб не должен мешать играм и тяжёлым программам.
//  - окно хаба не в фокусе (например, запущена игра): декоративные анимации на паузе, сцены 6 кадров/с, живые обои редко;
//  - страница скрыта или сцена вне экрана: сцена не рисуется вообще;
//  - «Экономный режим» (авто на слабых устройствах, можно включить вручную): без размытия стекла и тяжёлых теней, сцены 20 кадров/с.
import { getAppearance, onAppearance } from './appearance.js';

const root = document.documentElement;
const state = { idle: false, lite: false };
const seen = new Map(); // iframe -> виден ли на экране

export function autoLite() {
  const n = navigator;
  return (n.hardwareConcurrency && n.hardwareConcurrency <= 4) || (n.deviceMemory && n.deviceMemory <= 4) || !!(n.connection && n.connection.saveData);
}
const liteNow = () => { const m = getAppearance().lite; return m === 'on' || (m === 'auto' && autoLite()); };
const idleNow = () => document.hidden || !document.hasFocus();

export const frameGap = () => (state.idle ? 160 : state.lite ? 50 : 33);
export const isLite = () => state.lite;

function fpsFor(frame) {
  if (document.hidden) return 0;
  if (seen.get(frame) === false) return 0;
  return state.idle ? 6 : state.lite ? 20 : 30;
}
function broadcast() {
  document.querySelectorAll('iframe').forEach((f) => {
    try { f.contentWindow.postMessage({ type: 'hub-perf', fps: fpsFor(f) }, '*'); } catch (_) { /* кадр ещё не готов */ }
  });
}
function apply() {
  state.idle = idleNow();
  state.lite = liteNow();
  if (state.idle) { if (root.dataset.idle !== '1') root.dataset.idle = '1'; } else if (root.dataset.idle) delete root.dataset.idle;
  if (state.lite) { if (root.dataset.lite !== '1') root.dataset.lite = '1'; } else if (root.dataset.lite) delete root.dataset.lite;
  broadcast();
}

export function initPerf() {
  apply();
  window.addEventListener('blur', apply);
  window.addEventListener('focus', apply);
  document.addEventListener('visibilitychange', apply);
  onAppearance(apply);
  window.addEventListener('message', (e) => { if (e.data && e.data.type === 'hub-engine-ready') broadcast(); });
  // сцена вне экрана (прокрутили вниз) не рисуется
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((list) => {
      let ch = false;
      list.forEach((en) => { if (seen.get(en.target) !== en.isIntersecting) { seen.set(en.target, en.isIntersecting); ch = true; } });
      if (ch) broadcast();
    });
    const watched = new WeakSet();
    const scan = () => document.querySelectorAll('iframe').forEach((f) => { if (!watched.has(f)) { watched.add(f); io.observe(f); } });
    scan();
    const main = document.getElementById('main');
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    void main;
  }
}
