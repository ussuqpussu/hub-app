// Сцена сверху страницы. Её рисует движок тем (theme/engine.html в режиме #stage): тот же код, что в превью тем,
// поэтому руки, звезда, ASCII-тон и анимации выглядят один в один. Рамка с движком создаётся один раз
// и живёт между страницами: при смене страницы ей отправляется сообщение, перезагрузки нет.
import { getAppearance, motionAllowed, onAppearance } from './appearance.js';
import { THEMES, effectiveColors } from './theme.js';
import { QUOTES } from './data/quotes.js';
import { QUOTES_GOW } from './data/quotes-gow.js';

export const PAGE_INDEX = { today: 0, schedule: 1, tasks: 2, projects: 3, 'smart-home': 4, subscriptions: 5, notes: 6, knowledge: 7, settings: 8 };
const PATRON = { today: 'Кратос', schedule: 'Кронос', tasks: 'Афина', projects: 'Гефест', 'smart-home': 'Брок', subscriptions: 'Кронос', notes: 'Мимир', knowledge: 'Мимир', settings: 'Брок', weekly: 'Мойры' };
// у «Итогов недели» сцена есть только в «Мифах» (индекс 9 в их карте страниц)
const pgOf = (route, name) => (route === 'weekly' ? (name === 'Мифы' ? 9 : null) : PAGE_INDEX[route]);
const ENGINE = new URL('../theme/engine.html', import.meta.url).href;

let box = null; // { el, frame, ready, pending, theme }
let projects = [];
let sent = ''; // что уже отправлено рамке, чтобы не перерисовывать сцену зря


// Цитата дня лежит на фоне под анимацией: только текст и автор, без плитки и кнопок. Меняется раз в сутки.
function dayQuote(name) {
  const list = name === 'Мифы' ? QUOTES_GOW : QUOTES;
  const n = Math.floor(Date.now() / QUOTE_MS) + qShift;
  return list[((n % list.length) + list.length) % list.length];
}
const QUOTE_MS = 5 * 60 * 1000;
let qShift = 0;
setInterval(() => { if (box) fillQuote(box.el, engineName(box.theme)); }, 30000);
let rage = 0;
let curRoute = '';
function setMeta(route) {
  if (!box) return;
  if (route) curRoute = route; else route = curRoute;
  const my = engineName(box.theme) === 'Мифы';
  box.el.toggleAttribute('data-myth', my);
  const pat = box.el.querySelector('.hero__pat');
  if (pat) pat.textContent = my && route ? `Покровитель: ${PATRON[route] || 'Кратос'}` : '';
  const bar = box.el.querySelector('.hero__rage');
  if (bar) { bar.style.setProperty('--rage', rage + '%'); bar.querySelector('b').textContent = rage + '%'; }
}
// «Ярость»: растёт с каждой закрытой задачей, за неделю гаснет. 10 свежих задач = 100%.
export function setHeroRage(tasks, now = Date.now()) {
  const W = 7 * 864e5;
  const sum = (tasks || []).reduce((a, t) => (t.done && t.doneAt && now - t.doneAt < W ? a + (1 - (now - t.doneAt) / W) : a), 0);
  rage = Math.max(0, Math.min(100, Math.round(sum * 10)));
  if (box) setMeta('');
}
function fillQuote(el, name) {
  const [text, who] = dayQuote(name);
  el.querySelector('.hero__q').textContent = `«${text}»`;
  el.querySelector('.hero__who').textContent = who;
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
    setMeta(route);
    return box.el;
  }
  destroyHero();
  const frame = document.createElement('iframe');
  frame.className = 'hero__frame';
  frame.title = `Анимация темы «${name}»`;
  frame.setAttribute('loading', 'eager');
  frame.src = `${ENGINE}#stage&t=${encodeURIComponent(name)}&pg=${pg}&dk=${dk}`;
  const el = document.createElement('div');
  el.className = 'hero hero--stage';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', `Анимация темы «${name}»`);
  const quote = document.createElement('figure');
  quote.className = 'hero__quote';
  quote.innerHTML = '<blockquote class="hero__q"></blockquote><figcaption class="hero__who"></figcaption><button type="button" class="hero__qn" aria-label="Другая цитата" title="Другая цитата">↻</button><div class="hero__pat"></div><div class="hero__rage" title="Ярость растёт с закрытыми задачами и гаснет за неделю"><span>Ярость</span><i></i><b>0%</b></div>';
  el.append(frame, quote);
  quote.querySelector('.hero__qn').addEventListener('click', () => { qShift += 1; fillQuote(el, engineName(box ? box.theme : themeId)); });
  fillQuote(el, name);
  sent = '';
  box = { el, frame, ready: false, pending: null, theme: themeId };
  setMeta(route);
  return el;
}

// Смена темы без перезагрузки рамки.
export function setHeroTheme(themeId, route) {
  if (!box) return;
  const name = engineName(themeId);
  if (!name) { destroyHero(); return; }
  box.theme = themeId;
  fillQuote(box.el, name);
  setMeta(route);
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
