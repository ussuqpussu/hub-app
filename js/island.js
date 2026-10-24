// Остров: одна тёмная капсула сверху, которая меняет форму. Показывает «тост»: короткое сообщение вроде «синхронизировано»
// или «задача выполнена» с кнопкой «Отменить». Форма меняется через clip-path.
const ICON = {
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  warn: '<path d="M12 3 2 20h20zM12 10v4M12 17v.5"/>',
};
const svg = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ''}</svg>`;

const S = { tm: null, undo: null, nodes: null, live: null };

function set(state) { if (S.nodes) S.nodes.root.dataset.state = state; }
function say(text) { if (!S.live) return; S.live.textContent = ''; setTimeout(() => { S.live.textContent = text; }, 30); }

export function toast(text, { icon = 'check', undo = null, ms = 2400 } = {}) {
  if (!S.nodes) return;
  const n = S.nodes;
  n.ico.className = `ico ${icon === 'check' ? 'ok' : icon === 'warn' ? 'warn' : ''}`.trim();
  n.ico.innerHTML = svg(icon);
  n.text.textContent = text;
  n.undo.hidden = !undo;
  S.undo = undo;
  say(text);
  set('toast');
  clearTimeout(S.tm);
  S.tm = setTimeout(() => set('idle'), ms);
}

export function initIsland() {
  if (S.nodes || document.getElementById('island')) return;
  const wrap = document.createElement('div');
  wrap.className = 'island-wrap';
  wrap.innerHTML = `<div class="island" id="island" data-state="idle" role="status" aria-label="Уведомления">
    <div class="layer l-toast"><span class="ico" data-role="ico"></span><span data-role="text"></span><button type="button" data-role="undo" hidden>Отменить</button></div>
  </div>`;
  const live = document.createElement('div');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  document.body.append(wrap, live);
  const root = wrap.firstElementChild;
  const q = (s) => root.querySelector(s);
  S.live = live;
  S.nodes = { root, ico: q('[data-role=ico]'), text: q('[data-role=text]'), undo: q('[data-role=undo]') };
  root.addEventListener('click', (e) => {
    if (e.target === S.nodes.undo) { const f = S.undo; S.undo = null; clearTimeout(S.tm); set('idle'); if (f) f(); return; }
    clearTimeout(S.tm); set('idle');
  });
}
