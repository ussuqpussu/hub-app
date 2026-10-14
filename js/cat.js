// Кот темы сидит на кнопке «+». Рисунок и настройки приходят от движка тем (тот же кот, что в превью);
// последний кот каждой темы запоминается на устройстве, чтобы он был на месте и до загрузки сцены.
import { load, save } from './storage.js';

const KEY = 'hub.cats';
let holder = null;

function ensure() {
  if (holder) return holder;
  holder = document.createElement('div');
  holder.className = 'fab-cat';
  holder.setAttribute('aria-hidden', 'true');
  document.body.append(holder);
  return holder;
}

function show(svg) {
  const h = ensure();
  // Рисунок приходит от нашего же движка тем; всё равно пропускаем только чистый svg без скриптов и ссылок.
  if (typeof svg === 'string' && svg.startsWith('<svg class="pet"') && svg.length < 20000 && !/<script|<foreignObject|on\w+\s*=|href\s*=/i.test(svg)) {
    h.innerHTML = svg;
    h.hidden = false;
    return;
  }
  h.replaceChildren();
  h.hidden = true;
}

export function initCat() {
  const cached = () => (load(KEY, {}) || {})[document.documentElement.dataset.theme] || '';
  show(cached());
  new MutationObserver(() => show(cached())).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (e.origin !== location.origin || !d || d.type !== 'hub-cat') return;
    const theme = document.documentElement.dataset.theme;
    const all = load(KEY, {}) || {};
    all[theme] = typeof d.svg === 'string' ? d.svg : '';
    save(KEY, all);
    show(all[theme]);
  });
}
