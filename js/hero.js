// Сцена сверху страницы. Её рисует движок тем (theme/engine.html в режиме #stage): тот же код, что в превью тем,
// поэтому руки, звезда, ASCII-тон и анимации выглядят один в один. Рамка с движком создаётся один раз
// и живёт между страницами: при смене страницы ей отправляется сообщение, перезагрузки нет.
import { getAppearance, motionAllowed, onAppearance } from './appearance.js';
import { THEMES, effectiveColors } from './theme.js';
import { QUOTES } from './data/quotes.js';
import { QUOTES_GOW, QUOTES_MACH } from './data/quotes-gow.js';

export const PAGE_INDEX = { today: 0, schedule: 1, tasks: 2, projects: 3, 'smart-home': 4, subscriptions: 5, notes: 6, knowledge: 7, settings: 8 };
// у «Итогов недели» сцена есть только в «Мифах» (индекс 9 в их карте страниц)
// у «Монолита» сцена только на «Сегодня» (остальные страницы по макету «Итогов»: без сцены)
const pgOf = (route, name) => (name === 'Монолит' ? (route === 'today' ? 0 : null) : route === 'weekly' ? (/^(Мифы|Бенто)/.test(name) ? 9 : null) : PAGE_INDEX[route]);
const ENGINE = new URL('../theme/engine.html', import.meta.url).href;

let box = null; // { el, frame, ready, pending, theme }
let projects = [];
let sent = ''; // что уже отправлено рамке, чтобы не перерисовывать сцену зря


// Цитата дня лежит на фоне под анимацией: только текст и автор, без плитки и кнопок. Меняется раз в сутки.
function dayQuote(name) {
  const list = name === 'Мифы' ? QUOTES_GOW : /^(Бенто|Монолит)$/.test(name) ? [...QUOTES_GOW, ...QUOTES_MACH] : QUOTES;
  const n = Math.floor(Date.now() / QUOTE_MS) + qShift;
  return list[((n % list.length) + list.length) % list.length];
}
const QUOTE_MS = 5 * 60 * 1000;
let qShift = 0;
let lastQ = '';
setInterval(() => {
  if (box) fillQuote(box.el, engineName(box.theme));
  // страницы без сцены (цитата в плитке «Монолита») узнают о смене цитаты из события
  const id = document.documentElement.dataset.theme;
  const q = dayQuote(engineName(id)).join('|');
  if (q !== lastQ) { lastQ = q; document.dispatchEvent(new CustomEvent('hub:quote')); }
}, 30000);
function fillQuote(el, name) {
  const [text, who] = dayQuote(name);
  el.querySelector('.hero__q').textContent = `«${text}»`;
  el.querySelector('.hero__who').textContent = who;
}
// Текущая цитата темы: [текст, автор]. nextQuote — кнопка «другая цитата» на любой странице.
export const currentQuote = (themeId) => dayQuote(engineName(themeId));
export function nextQuote() {
  qShift += 1;
  if (box) fillQuote(box.el, engineName(box.theme));
  lastQ = currentQuote(document.documentElement.dataset.theme).join('|');
  document.dispatchEvent(new CustomEvent('hub:quote'));
}

const engineName = (themeId) => (THEMES.find((t) => t.id === themeId) || {}).engine || null;

function message(m) {
  if (!box || !box.frame.contentWindow) return;
  if (!box.ready) { box.pending = { ...(box.pending || {}), ...m }; return; }
  box.frame.contentWindow.postMessage({ type: 'hub-set', ...m }, '*');
}

window.addEventListener('message', (e) => {
  if (!box || !e.data || e.data.type !== 'hub-engine-ready' || e.source !== box.frame.contentWindow) return;
  box.ready = true;
  box.frame.style.opacity = '1';
  if (projects.length) { sent = JSON.stringify(projects); message({ projects }); }
  if (box.pending) { const p = box.pending; box.pending = null; message(p); }
});

export function destroyHero() {
  if (box) { box.el.remove(); box = null; }
}

// Возвращает контейнер сцены (один и тот же между страницами) или null, если сцены нет.
export function sceneHero(themeId, route) {
  const name = engineName(themeId);
  const pg = pgOf(route, name);
  if (!getAppearance().hero || !motionAllowed() || pg == null || !name) { destroyHero(); return null; }
  const dk = effectiveColors(themeId).dk ? 1 : 0;
  if (box && box.theme === themeId) {
    message({ pg, dk });
    return box.el;
  }
  destroyHero();
  const frame = document.createElement('iframe');
  frame.className = 'hero__frame';
  frame.title = `Анимация темы «${name}»`;
  frame.setAttribute('loading', 'eager');
  // Движок тяжёлый (около 1,3 МБ): запускаем его после перехода между вкладками, чтобы сам переход не дёргался;
  // сцена проявляется, когда готова.
  frame.style.opacity = '0';
  frame.style.transition = 'opacity .6s ease';
  const src = `${ENGINE}#stage&t=${encodeURIComponent(name)}&pg=${pg}&dk=${dk}`;
  const start = () => { if (box && box.frame === frame) frame.src = src; };
  setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 600 }) : start()), 750);
  const el = document.createElement('div');
  el.className = 'hero hero--stage';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', `Анимация темы «${name}»`);
  const quote = document.createElement('figure');
  quote.className = 'hero__quote';
  quote.innerHTML = '<blockquote class="hero__q"></blockquote><figcaption class="hero__who"></figcaption><button type="button" class="hero__qn" aria-label="Другая цитата" title="Другая цитата">↻</button>';
  el.append(frame, quote);
  quote.querySelector('.hero__qn').addEventListener('click', () => nextQuote());
  fillQuote(el, name);
  sent = '';
  box = { el, frame, ready: false, pending: null, theme: themeId };
  return el;
}

// Смена темы без перезагрузки рамки.
export function setHeroTheme(themeId, route) {
  if (!box) return;
  const name = engineName(themeId);
  if (!name) { destroyHero(); return; }
  box.theme = themeId;
  fillQuote(box.el, name);
  message({ t: name, pg: pgOf(route, name) ?? 0, dk: effectiveColors(themeId).dk ? 1 : 0 });
}

// Список проектов для сцены «Проекты»: реальные названия вместо учебных.
export function setHeroProjects(list) {
  projects = (list || []).slice(0, 8).map((p, i) => ({ id: String(p.id || i), name: String(p.name || '').slice(0, 24), type: String(p.type || ''), st: String(p.st || 'в работе'), pr: Math.max(0, Math.min(100, Math.round(+p.pr || 0))), next: String(p.next || ''), upd: String(p.upd || '') }));
  if (projects.length && JSON.stringify(projects) !== sent) { sent = JSON.stringify(projects); message({ projects }); }
}

export function initHero() {
  onAppearance(() => { if (!getAppearance().hero || !motionAllowed()) destroyHero(); });
}
