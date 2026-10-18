// Остров: одна тёмная капсула сверху, которая меняет форму. «Тост» (синхронизировано, задача выполнена с кнопкой «Отменить»),
// компактный таймер фокуса и раскрытая карточка с большим таймером. Форма меняется через clip-path, время как в рилсе (600 мс).
import { playSound } from './appearance.js';

const ICON = {
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  warn: '<path d="M12 3 2 20h20zM12 10v4M12 17v.5"/>',
  pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
  play: '<path d="M6 3 20 12 6 21Z"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
};
const svg = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ''}</svg>`;

const FOCUS_SEC = 25 * 60;
const S = { base: 'idle', rem: FOCUS_SEC, run: false, endAt: 0, iv: null, tm: null, undo: null, nodes: null, live: null };

function fmt(s) { return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
function set(state) { if (S.nodes) S.nodes.root.dataset.state = state; }
function say(text) { if (!S.live) return; S.live.textContent = ''; setTimeout(() => { S.live.textContent = text; }, 30); }

function paint() {
  if (!S.nodes) return;
  S.nodes.compact.textContent = S.nodes.big.textContent = fmt(S.rem);
  S.nodes.root.dataset.run = String(S.run);
  S.nodes.pause.innerHTML = svg(S.run ? 'pause' : 'play');
  S.nodes.pause.setAttribute('aria-label', S.run ? 'Пауза' : 'Продолжить');
}

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
  S.tm = setTimeout(() => set(S.base), ms);
}

function tick() {
  if (!S.run) return;
  S.rem = Math.max(0, Math.round((S.endAt - Date.now()) / 1000));
  paint();
  if (S.rem <= 0) {
    clearInterval(S.iv);
    S.run = false;
    S.base = 'idle';
    S.rem = FOCUS_SEC;
    playSound('done');
    toast('Фокус закончился. Сделай перерыв.', { icon: 'moon', ms: 4000 });
    paint();
  }
}

export function startFocus() {
  if (!S.nodes) return;
  S.base = 'timer';
  S.run = true;
  S.endAt = Date.now() + S.rem * 1000;
  paint();
  toast('Фокус начался: можно не отвлекаться', { icon: 'moon', ms: 1900 });
  clearInterval(S.iv);
  S.iv = setInterval(tick, 500);
}
export const focusActive = () => S.base !== 'idle';

function stop() {
  clearInterval(S.iv);
  S.run = false;
  S.rem = FOCUS_SEC;
  S.base = 'idle';
  clearTimeout(S.tm);
  paint();
  set('idle');
}

export function initIsland() {
  if (S.nodes || document.getElementById('island')) return;
  const wrap = document.createElement('div');
  wrap.className = 'island-wrap';
  wrap.innerHTML = `<div class="island" id="island" data-state="idle" data-run="false" role="button" tabindex="0" aria-label="Остров уведомлений">
    <div class="layer l-toast"><span class="ico" data-role="ico"></span><span data-role="text"></span><button type="button" data-role="undo" hidden>Отменить</button></div>
    <div class="layer l-timer"><span class="ring"></span><span>Фокус</span><b data-role="compact">25:00</b></div>
    <div class="layer l-open"><div class="o-top"><div><small>Фокус</small>25 минут без отвлечений</div><b data-role="big">25:00</b></div>
      <div class="o-btns"><button type="button" data-a="plus">+5 мин</button><button type="button" data-a="pause" aria-label="Пауза"></button><button type="button" data-a="stop" aria-label="Остановить"></button></div></div>
  </div>`;
  const live = document.createElement('div');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  document.body.append(wrap, live);
  const root = wrap.firstElementChild;
  const q = (s) => root.querySelector(s);
  S.live = live;
  S.nodes = { root, ico: q('[data-role=ico]'), text: q('[data-role=text]'), undo: q('[data-role=undo]'), compact: q('[data-role=compact]'), big: q('[data-role=big]'), pause: q('[data-a=pause]') };
  q('[data-a=stop]').innerHTML = svg('stop');
  paint();
  root.addEventListener('click', (e) => {
    if (e.target === S.nodes.undo) { const f = S.undo; S.undo = null; clearTimeout(S.tm); set(S.base); if (f) f(); return; }
    const btn = e.target.closest('[data-a]');
    const a = btn && btn.dataset.a;
    if (a === 'plus') { S.rem += 300; if (S.run) S.endAt += 300000; }
    else if (a === 'pause') {
      S.run = !S.run;
      if (S.run) S.endAt = Date.now() + S.rem * 1000;
    } else if (a === 'stop') { stop(); return; }
    else if (root.dataset.state === 'timer') { set('open'); clearTimeout(S.tm); S.tm = setTimeout(() => set('timer'), 6000); return; }
    else if (root.dataset.state === 'open') set('timer');
    paint();
  });
  root.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === root) { e.preventDefault(); root.click(); } });
}
