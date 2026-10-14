// Кот темы сидит на ровной поверхности внутри страницы: на плитке «Погода» на «Сегодня», на панели выбора в «Настройках»,
// на первой карточке на остальных страницах. Рисунок и настройки (где сидит, размер, спрятать) приходят от движка тем,
// это тот же кот, что в превью; последний кот каждой темы запоминается на устройстве.
import { load, save } from './storage.js';

const KEY = 'hub.cats';
const PERCH = {};
let holder = null;
let svgNow = '';
let queued = false;

const route = () => (location.hash || '#/today').replace(/^#\//, '').split('/')[0] || 'today';

function clean(svg) {
  // Рисунок приходит от нашего же движка тем; всё равно пропускаем только чистый svg без скриптов и ссылок.
  return typeof svg === 'string' && svg.startsWith('<svg class="pet"') && svg.length < 60000 && !/<script|<foreignObject|on\w+\s*=|href\s*=/i.test(svg) ? svg : '';
}

function target() {
  const main = document.getElementById('main');
  if (!main) return null;
  const r = route();
  const sel = [PERCH[r], '.view > .view__head', '.view .card'].filter(Boolean);
  for (const s of sel) {
    const el = main.querySelector(s);
    if (el && el.offsetParent !== null) return el;
  }
  return null;
}

function place() {
  queued = false;
  const t = svgNow ? target() : null;
  if (!t) { if (holder) holder.remove(); holder = null; return; }
  if (holder && holder.parentElement === t && holder.dataset.svg === svgNow) return;
  if (holder) holder.remove();
  holder = document.createElement('div');
  holder.className = 'cat-holder';
  holder.setAttribute('aria-hidden', 'true');
  holder.dataset.svg = svgNow;
  holder.innerHTML = svgNow;
  t.classList.add('has-cat');
  t.append(holder);
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(place);
}

export function initCat() {
  const cached = () => clean((load(KEY, {}) || {})[document.documentElement.dataset.theme]);
  svgNow = cached();
  const main = document.getElementById('main');
  if (main) new MutationObserver(schedule).observe(main, { childList: true, subtree: true });
  window.addEventListener('hashchange', schedule);
  new MutationObserver(() => { svgNow = cached(); schedule(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (e.origin !== location.origin || !d || d.type !== 'hub-cat') return;
    const theme = document.documentElement.dataset.theme;
    const all = load(KEY, {}) || {};
    all[theme] = clean(d.svg);
    save(KEY, all);
    svgNow = all[theme];
    schedule();
  });
  schedule();
}
