// Экономный режим: хаб не должен мешать играм и тяжёлым программам.
//  - страница скрыта (свёрнута, закрыта другим окном или полноэкранной игрой): анимации на паузе, сцена не рисуется;
//  - сцена вне экрана: не рисуется;
//  - окно просто без фокуса (рядом открыта другая программа) больше НЕ тормозит анимации: раньше сцена падала до 6 кадров/с,
//    и это выглядело как лаги;
//  - «Экономный режим» (авто на слабых устройствах, можно включить вручную): без размытия стекла и тяжёлых теней, сцены 20 кадров/с.
//  - сцена всегда рисуется не чаще 30 кадров/с: руки двигаются медленно, а на большом экране (4K) каждый кадр дорогой.
import { getAppearance, onAppearance } from './appearance.js';

const state = { idle: false, lite: false };
const seen = new Map(); // iframe -> виден ли на экране

export function autoLite() {
  const n = navigator;
  return (n.hardwareConcurrency && n.hardwareConcurrency <= 4) || (n.deviceMemory && n.deviceMemory <= 4) || !!(n.connection && n.connection.saveData);
}
const liteNow = () => { const m = getAppearance().lite; return m === 'on' || (m === 'auto' && autoLite()); };
const idleNow = () => document.hidden;

export const frameGap = () => (state.idle ? 160 : state.lite ? 50 : 33);
export const isLite = () => state.lite;

function fpsFor(frame) {
  if (document.hidden) return 0;
  if (seen.get(frame) === false) return 0;
  return state.idle ? 0 : state.lite ? 20 : 30;
}
function broadcast() {
  document.querySelectorAll('iframe').forEach((f) => {
    try { f.contentWindow.postMessage({ type: 'hub-perf', fps: fpsFor(f) }, '*'); } catch (_) { /* кадр ещё не готов */ }
  });
}
function apply() {
  const root = document.documentElement;
  state.idle = idleNow();
  state.lite = liteNow();
  if (state.idle) { if (root.dataset.idle !== '1') root.dataset.idle = '1'; } else if (root.dataset.idle) delete root.dataset.idle;
  if (state.lite) { if (root.dataset.lite !== '1') root.dataset.lite = '1'; } else if (root.dataset.lite) delete root.dataset.lite;
  broadcast();
}

export function initPerf() {
  apply();
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
