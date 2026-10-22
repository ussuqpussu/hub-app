// Тема «Монолит»: свои страницы «Сегодня» и «Итоги недели» точь-в-точь по четырём макетам.
//  - «Сегодня», вид «Сетка» (макет 1): карточка с руками и датой, «Закрыто сегодня», светлый «Фокус», «Подписки»,
//    «На сегодня», «Расписание», «Неделя». Все плитки помещаются в один экран.
//  - «Сегодня», вид «Руки на весь экран» (макет 3): сцена фоном, дата по центру, четыре карточки внизу.
//  - Телефон (макет 4): карточка с руками, «День», «Фокус», «Закрыто», «На сегодня».
//  - «Итоги недели» (макет 2): нарастающий итог, расходы в месяц, события проектов, «Рупор», цитата, цели, доска.
// Все цифры берутся из данных хаба; чего нет, показывается честно («нет данных»), без выдуманных значений.
import { el, ICONS } from './ui.js';
import { todayYmd, fromYmd, addDays, dueLabel, weekType, weekStart } from './dates.js';
import { save, load } from './storage.js';
import { rings, bars, line, donut } from './mk-widgets.js';
import { startFocus, focusActive, focusText, toast } from './island.js';
import { groupTasks, MAIN_LIMIT } from './tasks-view.js';
import { loadSchedule, onSchedule, getScheduleState, pairsOn, pairPhase } from './schedule-data.js';
import { monthlyTotalRub, categoryShares } from './subs-calc.js';
import { cachedRates, ensureRates } from './rates.js';
import { liveSummary, ensureSnapshot } from './weekly-view.js';
import { summarizeWeek, prevWeekDay } from './weekly-calc.js';
import { loadProjects, onProjects } from './projects-data.js';
import { roomText } from './schedule-view.js';
import { getAppearance, onAppearance } from './appearance.js';
import { currentQuote, nextQuote } from './hero.js';
import { boardView } from './tasks-board.js';
import { mergedProjects } from './projects-view.js';
import { buildFeed } from './feed-calc.js';
import { noteTitle } from './notes-calc.js';

const WD = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const isWide = () => !!(window.matchMedia && window.matchMedia('(min-width: 48rem)').matches);
const rub = (n) => `${Math.round(n).toLocaleString('ru-RU')} ₽`;
const plural = (n, f) => { const a = Math.abs(n) % 100; const b = a % 10; return f[a > 10 && a < 20 ? 2 : b === 1 ? 0 : b >= 2 && b <= 4 ? 1 : 2]; };
const kicker = (text) => el('span', { class: 'mt-k', text });

// ---------- общие куски ----------

function tile(cls, kids, attrs = {}) {
  return el('section', { class: `card mt ${cls}`, ...attrs }, kids);
}

function quoteNode(cls) {
  const id = document.documentElement.dataset.theme;
  const [text, who] = currentQuote(id);
  return el('p', { class: `mt-quote ${cls || ''}`.trim(), title: who, text: `«${text}»` });
}

// Задачи дня: просроченные и на сегодня, затем завтра, затем закрытые сегодня (кружок закрашен, метка «готово»).
function dayTasks(store, today, { withDone = true, limit = 5 } = {}) {
  const tasks = store.list('tasks');
  const g = groupTasks(tasks, today);
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const open = [...g.overdue, ...g.today];
  const tomorrow = tasks.filter((t) => !t.done && t.due === addDays(today, 1));
  const done = withDone ? tasks.filter((t) => t.done && t.doneAt >= dayStart.getTime()).sort((a, b) => a.doneAt - b.doneAt) : [];
  return [...open, ...tomorrow, ...done].slice(0, limit);
}

function taskRow(store, t, today) {
  const done = !!t.done;
  const check = el('button', { type: 'button', class: 'mt-check', role: 'checkbox', 'aria-checked': String(done), 'aria-label': done ? `Вернуть: ${t.title}` : `Выполнено: ${t.title}` });
  check.addEventListener('click', () => {
    if (done) { store.update('tasks', t.id, { done: false, doneAt: null }); return; }
    const prev = { done: false, doneAt: null, main: !!t.main };
    store.update('tasks', t.id, { done: true, doneAt: Date.now(), main: false });
    toast(`Выполнено: ${t.title.length > 26 ? `${t.title.slice(0, 25)}…` : t.title}`, { icon: 'check', ms: 3200, undo: () => store.update('tasks', t.id, prev) });
  });
  const chip = done ? 'готово' : t.due ? (t.due < today ? 'просрочено' : dueLabel(t.due, today)) : 'без срока';
  return el('li', { class: `mt-task${done ? ' is-done' : ''}` }, [check, el('span', { class: 'mt-task__t', text: t.title, title: t.title }), el('span', { class: 'mt-chip', text: chip })]);
}

function todoTile(store, today, { add = true, withDone = true, limit = 5 } = {}) {
  const list = dayTasks(store, today, { withDone, limit });
  const head = el('div', { class: 'mt-head' }, [el('h2', { class: 'mt-h', text: 'На сегодня' })]);
  if (add) {
    const b = el('button', { type: 'button', class: 'mt-add', text: '+ Задача' });
    b.addEventListener('click', () => { save('hub.plusType', 'task'); const f = document.getElementById('fab'); if (f) f.click(); });
    head.append(b);
  }
  const body = list.length
    ? el('ul', { class: 'mt-tasks' }, list.map((t) => taskRow(store, t, today)))
    : el('p', { class: 'mt-empty', text: 'На сегодня задач нет.' });
  return tile('mt-todo', [head, body], { 'data-t': 'todo' });
}

// Кольца: внешнее — задачи дня, среднее — цели, внутреннее — пройденная часть суток.
function dayStats(store, today) {
  const tk = store.list('tasks');
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const doneToday = tk.filter((t) => t.done && t.doneAt >= dayStart.getTime()).length;
  const g = groupTasks(tk, today);
  const left = new Set([...g.overdue, ...g.today, ...tk.filter((t) => t.main && !t.done)].map((t) => t.id)).size;
  const plan = doneToday + left;
  const gl = store.list('goals').filter((x) => x.progress < 100);
  const goals = gl.length ? Math.round(gl.reduce((a, x) => a + x.progress, 0) / gl.length) : null;
  const n = new Date();
  const dayP = Math.min(1, (n.getHours() * 60 + n.getMinutes()) / 1440);
  return { doneToday, plan, goals, dayP };
}
function ringsNode(st) {
  return rings([
    { label: 'Задачи за день', value: st.doneToday, p: st.plan ? st.doneToday / st.plan : 0 },
    { label: 'Цели', value: st.goals ?? 0, p: (st.goals ?? 0) / 100 },
    { label: 'День', value: Math.round(st.dayP * 100), p: st.dayP },
  ], { label: 'Кольца дня' });
}

function closedTile(store, today, mode) {
  const st = dayStats(store, today);
  const r = ringsNode(st);
  if (mode === 'phone') {
    return tile('mt-closed mt-closed--phone', [el('div', { class: 'mt-rings' }, [r]), el('div', {}, [kicker('Закрыто'), el('p', { class: 'mt-num', text: `${st.doneToday} из ${st.plan}` })])], { 'data-t': 'rings' });
  }
  return tile('mt-closed', [
    kicker('Закрыто сегодня'),
    el('div', { class: 'mt-rings' }, [r]),
    el('div', { class: 'mt-pair' }, [
      el('div', {}, [el('p', { class: 'mt-num', text: String(st.doneToday), 'data-count': '900' }), el('span', { class: 'mt-sub', text: `из ${st.plan} ${plural(st.plan, ['задачи', 'задач', 'задач'])}` })]),
      el('div', { class: 'mt-right' }, [el('p', { class: 'mt-num', text: st.goals == null ? '—' : `${st.goals}%` }), el('span', { class: 'mt-sub', text: st.goals == null ? 'целей нет' : 'цели' })]),
    ]),
  ], { 'data-t': 'rings' });
}

function focusTile({ button = true } = {}) {
  const time = el('p', { class: 'mt-num mt-focus__time', text: focusText() });
  const kids = [kicker('Фокус'), time];
  let go = null;
  if (button) {
    go = el('button', { type: 'button', class: 'mt-go', text: focusActive() ? 'Идёт' : 'Начать' });
    go.disabled = focusActive();
    go.addEventListener('click', () => startFocus());
    kids.push(go);
  }
  const node = tile('mt-focus tile--focus', kids, { 'data-t': 'focus' });
  if (!button) {
    // на телефоне кнопки нет: нажатие на плитку запускает фокус
    node.setAttribute('role', 'button'); node.tabIndex = 0; node.setAttribute('aria-label', 'Начать фокус на 25 минут');
    const run = () => { if (!focusActive()) startFocus(); };
    node.addEventListener('click', run);
    node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(); } });
  }
  const sync = (e) => {
    if (!node.isConnected) { document.removeEventListener('hub:focus', sync); return; }
    const d = e.detail || {};
    time.textContent = d.text;
    if (go) { go.disabled = !!d.active; go.textContent = d.active ? (d.run ? 'Идёт' : 'Пауза') : 'Начать'; }
  };
  document.addEventListener('hub:focus', sync);
  return node;
}

function subsTile(store) {
  const subs = store.list('subs');
  const tot = monthlyTotalRub(subs, cachedRates());
  const active = subs.filter((s) => s.status === 'active').length;
  const a = el('a', { class: 'card mt mt-subs', href: '#/subscriptions', 'data-t': 'subs', 'aria-label': 'Подписки: открыть' }, [
    kicker('Подписки'),
    el('p', { class: 'mt-num mt-num--s', text: active ? rub(tot.amount) : '0 ₽' }),
  ]);
  if (tot.missing.length) a.append(el('span', { class: 'mt-sub', text: 'без части валют: нет курса' }));
  return a;
}

function dayTile() {
  const n = new Date();
  const p = Math.round(Math.min(1, (n.getHours() * 60 + n.getMinutes()) / 1440) * 100);
  return tile('mt-day', [kicker('День'), el('p', { class: 'mt-num', text: `${p}%`, 'aria-label': `День пройден на ${p} процентов` })], { 'data-t': 'day' });
}

function schedTile(today) {
  const st = getScheduleState();
  const kids = [kicker('Расписание')];
  const day = st.data ? pairsOn(st.data, today) : null;
  if (!st.data) kids.push(el('p', { class: 'mt-empty', text: st.loaded ? 'Расписания пока нет.' : 'Загружаю расписание…' }));
  else if (!day) kids.push(el('p', { class: 'mt-empty', text: 'На эту неделю данных нет.' }));
  else if (!day.pairs.length) kids.push(el('p', { class: 'mt-empty', text: 'Сегодня пар нет.' }));
  else {
    kids.push(el('ol', { class: 'mt-line' }, day.pairs.map((pr) => {
      const ph = day.exact ? pairPhase(pr, today) : 'later';
      return el('li', { class: `mt-pair-i is-${ph}` }, [
        el('p', { class: 'mt-pair-i__t' }, [el('b', { text: pr.start || (pr.n != null ? `${pr.n}.` : '') }), ` ${pr.subject || pr.raw || ''}`]),
        el('span', { class: 'mt-sub', text: roomText(pr.room) || pr.kind || '' }),
      ]);
    })));
    if (!day.exact) kids.push(el('p', { class: 'mt-sub', text: 'по шаблону, может измениться' }));
  }
  const a = el('a', { class: 'mt-link', href: '#/schedule', 'aria-label': 'Расписание на неделю' });
  return tile('mt-sched', [...kids, a], { 'data-t': 'sched' });
}

// Неделя: закрытые задачи по дням, сегодняшний столбик светлый; сравнение с прошлой неделей, если она была.
function weekNumbers(store, today) {
  const cur = liveSummary(store, today);
  const prev = summarizeWeek({ day: prevWeekDay(today), tasks: store.list('tasks') });
  const n = cur.tasks.closed.length;
  const p = prev.tasks.closed.length;
  const delta = p > 0 ? Math.round(((n - p) / p) * 100) : null;
  return { cur, n, delta };
}
function weekBars(byDay, today) {
  const idx = (fromYmd(today).getDay() + 6) % 7;
  const b = bars(byDay, DAYS, { label: 'Закрыто задач по дням' });
  const row = b.querySelector('.mk-bars');
  if (row && row.children[idx]) row.children[idx].classList.add('is-today');
  return b;
}
function weekTile(store, today, mode) {
  const w = weekNumbers(store, today);
  const head = el('div', { class: 'mt-head' }, [kicker('Неделя')]);
  if (w.delta != null) head.append(el('span', { class: 'mt-chip mt-chip--d', text: `${w.delta >= 0 ? '+' : '−'}${Math.abs(w.delta)}%`, title: 'К прошлой неделе' }));
  return tile('mt-week', [
    head,
    el('p', { class: 'mt-num', text: String(w.n), 'data-count': '900' }),
    el('span', { class: 'mt-sub', text: `${plural(w.n, ['задача закрыта', 'задачи закрыто', 'задач закрыто'])}` }),
    weekBars(w.cur.tasks.byDay, today),
    el('a', { class: 'mt-link', href: '#/weekly', 'aria-label': 'Итоги недели' }),
  ], { 'data-t': 'weekly' });
}

function heroTile(d, today, { short = false } = {}) {
  const wd = WD[d.getDay()];
  return tile('mt-hero', [
    el('div', { class: 'mt-hero__txt' }, [
      kicker(short ? wd : `${wd} · ${weekType(today)} неделя`),
      el('h1', { class: 'mt-date', text: `${d.getDate()} ${MON[d.getMonth()]}` }),
    ]),
    quoteNode('mt-hero__q'),
  ], { 'data-t': 'hero' });
}


// ---------- нижний ряд «Сегодня»: цитата, проекты, лента, заметки и ссылки ----------
function quoteBigTile() {
  const [text, who] = currentQuote(document.documentElement.dataset.theme);
  const btn = el('button', { type: 'button', class: 'mt-qbtn', 'aria-label': 'Другая цитата', title: 'Другая цитата', text: '↻' });
  btn.addEventListener('click', () => nextQuote());
  return tile('mt-q2', [el('div', { class: 'mt-head' }, [kicker('Цитата'), btn]), el('p', { class: 'mt-q2__t', text: `«${text}»` }), el('span', { class: 'mt-sub', text: who })], { 'data-t': 'quote' });
}
function projectsTile(store) {
  const list = mergedProjects(store).filter((p) => p.status !== 'archive');
  const kids = [kicker('Проекты'), el('p', { class: 'mt-num mt-num--m', text: String(list.length) }), el('span', { class: 'mt-sub', text: list.length ? plural(list.length, ['проект в работе', 'проекта в работе', 'проектов в работе']) : 'проектов пока нет' })];
  if (list.length) kids.push(el('p', { class: 'mt-line1', text: list.slice(0, 3).map((p) => p.name).join(' · ') }));
  kids.push(el('a', { class: 'mt-link', href: '#/projects', 'aria-label': 'Проекты: открыть' }));
  return tile('mt-proj', kids, { 'data-t': 'projects' });
}
function feedTile(store) {
  const items = buildFeed(mergedProjects(store)).slice(0, 3);
  const kids = [kicker('Лента проектов')];
  if (!items.length) kids.push(el('p', { class: 'mt-empty', text: 'Событий пока нет.' }));
  else kids.push(el('ul', { class: 'mt-feed' }, items.map((e) => el('li', {}, [el('b', { text: e.project }), ` ${e.text}`]))));
  kids.push(el('a', { class: 'mt-link', href: '#/projects', 'aria-label': 'Лента проектов: открыть' }));
  return tile('mt-feedt', kids, { 'data-t': 'feed' });
}
function notesTile(store) {
  const all = store.list('notes').slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const links = all.filter((n) => n.kind === 'link').length;
  const kids = [kicker('Заметки и ссылки'), el('p', { class: 'mt-num mt-num--m', text: String(all.length) }), el('span', { class: 'mt-sub', text: all.length ? `${plural(all.length - links, ['заметка', 'заметки', 'заметок'])} и ${links} ${plural(links, ['ссылка', 'ссылки', 'ссылок'])}` : 'пока пусто' })];
  if (all.length) kids.push(el('p', { class: 'mt-line1', text: noteTitle(all[0]) }));
  kids.push(el('a', { class: 'mt-link', href: '#/notes', 'aria-label': 'Заметки и ссылки: открыть' }));
  return tile('mt-notest', kids, { 'data-t': 'notes' });
}

// ---------- «Сегодня» ----------

export function homeToday({ store, subscribe }) {
  const root = el('section', { class: 'view hb-view hb-view--today' });
  let ro = null;

  // карточка с руками: сама сцена лежит в .main (её нельзя переносить, иначе рамка перезагрузится),
  // поэтому подгоняем её положение под пустую плитку.
  function syncHero() {
    const main = document.getElementById('main');
    const ph = root.querySelector('.mt-hero');
    if (!main) return;
    if (!ph) { main.style.removeProperty('--hx'); return; }
    const a = main.getBoundingClientRect();
    const b = ph.getBoundingClientRect();
    main.style.setProperty('--hx', `${b.left - a.left + main.scrollLeft}px`);
    main.style.setProperty('--hy', `${b.top - a.top}px`);
    main.style.setProperty('--hw', `${b.width}px`);
    main.style.setProperty('--hh', `${b.height}px`);
  }

  function render() {
    const today = todayYmd();
    const d = fromYmd(today);
    const wide = isWide();
    const mode = wide ? 'grid' : 'phone';
    root.dataset.mode = mode;
    if (mode === 'phone') {
      root.replaceChildren(el('div', { class: 'mt-grid mt-grid--phone' }, [
        heroTile(d, today, { short: true }),
        dayTile(),
        focusTile({ button: false }),
        closedTile(store, today, 'phone'),
        todoTile(store, today, { add: false, withDone: false, limit: 6 }),
      ]));
    } else {
      root.replaceChildren(
        el('div', { class: 'mt-grid mt-grid--home' }, [
          heroTile(d, today),
          closedTile(store, today, 'grid'),
          focusTile(),
          subsTile(store),
          todoTile(store, today),
          schedTile(today),
          weekTile(store, today, 'grid'),
        ]),
        el('div', { class: 'mt-grid mt-grid--more' }, [quoteBigTile(), projectsTile(store), feedTile(store), notesTile(store)]),
      );
    }
    requestAnimationFrame(syncHero);
    if (ro) ro.disconnect();
    const ph = root.querySelector('.mt-hero');
    if (ph && 'ResizeObserver' in window) { ro = new ResizeObserver(syncHero); ro.observe(ph); }
  }

  let sig = '';
  const signature = () => ['tasks', 'goals', 'subs', 'notes', 'projects'].map((m) => store.list(m).map((it) => `${it.id}:${it.updatedAt}`).join(',')).join('|');
  const alive = () => root.isConnected;
  subscribe(() => { const s = signature(); if (s !== sig) { sig = s; render(); } });
  const offS = onSchedule(() => { if (alive()) render(); else offS(); });
  loadProjects({ refresh: false });
  const offP = onProjects(() => { if (alive()) render(); else offP(); });
  const offA = onAppearance(() => { if (alive()) render(); else offA(); });
  const mq = window.matchMedia ? window.matchMedia('(min-width: 48rem)') : null;
  const onMq = () => { if (alive()) render(); else if (mq) mq.removeEventListener('change', onMq); };
  if (mq) mq.addEventListener('change', onMq);
  const onQ = () => { if (!alive()) { document.removeEventListener('hub:quote', onQ); return; } root.querySelectorAll('.mt-quote').forEach((q) => { const n = quoteNode(q.className.replace('mt-quote', '').trim()); q.replaceWith(n); }); };
  document.addEventListener('hub:quote', onQ);
  window.addEventListener('resize', () => { if (alive()) syncHero(); });
  // день и проценты обновляются раз в минуту, в полночь — новая дата
  let shown = todayYmd();
  const iv = setInterval(() => {
    if (!alive()) { clearInterval(iv); return; }
    if (todayYmd() !== shown) { shown = todayYmd(); render(); return; }
    const day = root.querySelector('.mt-day .mt-num');
    if (day) { const n = new Date(); day.textContent = `${Math.round(Math.min(1, (n.getHours() * 60 + n.getMinutes()) / 1440) * 100)}%`; }
  }, 60000);
  ensureRates(() => { if (alive()) render(); });
  loadSchedule();
  sig = signature();
  render();
  return root;
}

// ---------- шапка страниц без сцены (как на макете «Итогов») ----------
export function hubTools() {
  const search = el('button', { type: 'button', class: 'hb-search', 'aria-label': 'Поиск по хабу' }, [el('span', { html: ICONS.search }), el('span', { class: 'hb-search__t', text: 'Поиск по хабу' })]);
  search.addEventListener('click', () => { const b = document.getElementById('search-btn'); if (b) b.click(); });
  return el('div', { class: 'hb-tools' }, [search]);
}

// ---------- «Итоги недели» ----------

export function homeWeekly({ store, subscribe }) {
  const root = el('section', { class: 'view hb-view hb-view--weekly' });
  const st = { span: load('hub.homeSpan', 'week') === 'month' ? 'month' : 'week', list: load('hub.homeBoard', 'board') === 'list' ? 'list' : 'board' };

  function cumulative(today) {
    const tasks = store.list('tasks').filter((t) => t.done && t.doneAt);
    let from; let len;
    if (st.span === 'month') { const d = fromYmd(today); from = `${today.slice(0, 8)}01`; len = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); } else { from = weekStart(today); len = 7; }
    const vals = [];
    let acc = 0;
    for (let i = 0; i < len; i += 1) {
      const day = addDays(from, i);
      if (day > today) break;
      acc += tasks.filter((t) => todayYmd(new Date(t.doneAt)) === day).length;
      vals.push(acc);
    }
    return { vals: vals.length > 1 ? vals : [0, ...vals], total: acc };
  }

  function render() {
    const today = todayYmd();
    try { ensureSnapshot(store); } catch (_) { /* итог сохранится позже */ }
    const ws = liveSummary(store, today);
    const from = fromYmd(ws.from); const to = fromYmd(ws.to);
    const range = from.getMonth() === to.getMonth() ? `${from.getDate()} — ${to.getDate()} ${MON[to.getMonth()]}` : `${from.getDate()} ${MON[from.getMonth()]} — ${to.getDate()} ${MON[to.getMonth()]}`;

    // нарастающий итог
    const cu = cumulative(today);
    const spanBtn = el('button', { type: 'button', class: 'mt-pill', 'aria-label': 'Период: неделя или месяц', text: st.span === 'month' ? 'Месяц ▾' : 'Неделя ▾' });
    spanBtn.addEventListener('click', () => { st.span = st.span === 'week' ? 'month' : 'week'; save('hub.homeSpan', st.span); render(); });
    const cum = tile('mw-cum', [
      el('div', { class: 'mt-head' }, [kicker('Нарастающим итогом'), spanBtn]),
      el('p', { class: 'mt-num mt-num--xl' }, [el('span', { text: String(cu.total), 'data-count': '900' }), el('small', { text: plural(cu.total, ['задача', 'задачи', 'задач']) })]),
      el('div', { class: 'mw-cum__line' }, [line(cu.vals, { label: 'Закрыто задач нарастающим итогом' })]),
    ]);

    // расходы в месяц (подписки по категориям)
    const subs = store.list('subs');
    const shares = categoryShares(subs, cachedRates());
    const tot = monthlyTotalRub(subs, cachedRates());
    const tones = ['#f2f2f2', '#8d8f98', '#55575e', '#c8c9ce', '#3a3b40'];
    const spendKids = [kicker('Расходы в месяц')];
    if (!shares.length) spendKids.push(el('p', { class: 'mt-empty', text: 'Активных подписок нет.' }));
    else {
      spendKids.push(el('div', { class: 'mw-donut' }, [donut(shares.slice(0, 5).map((s, i) => ({ share: s.share, color: tones[i] })), { value: rub(tot.amount), label: 'в месяц' })]));
      spendKids.push(el('ul', { class: 'mw-legend' }, shares.slice(0, 3).map((s, i) => el('li', {}, [el('i', { style: `background:${tones[i]}` }), el('span', { text: s.category }), el('span', { class: 'mt-chip', text: `${Math.round(s.share * 100)}%` })]))));
    }
    const spend = el('a', { class: 'card mt mw-spend', href: '#/subscriptions', 'aria-label': 'Расходы на подписки: открыть' }, spendKids);

    // события проектов (светлая плитка)
    const evN = ws.events.length;
    const ev = el('a', { class: 'card mt mw-events tile--focus', href: '#/projects', 'aria-label': 'События проектов: открыть' }, [
      kicker('События проектов'),
      el('p', { class: 'mt-num mt-num--xl', text: String(evN), 'data-count': '900' }),
      el('span', { class: 'mt-sub', text: `${plural(evN, ['событие', 'события', 'событий'])} в проектах за неделю` }),
    ]);

    // Рупор и цитата
    const rp = ws.rupor.total;
    const rupor = el('a', { class: 'card mt mw-small', href: '#/projects', 'aria-label': 'Рупор: открыть' }, [kicker('Рупор'), el('p', { class: 'mt-num mt-num--m', text: String(rp) }), el('span', { class: 'mt-sub', text: plural(rp, ['публикация', 'публикации', 'публикаций']) })]);
    const qBtn = el('button', { type: 'button', class: 'mt-qbtn', 'aria-label': 'Другая цитата', title: 'Другая цитата', text: '↻' });
    qBtn.addEventListener('click', () => nextQuote());
    const [qt, qw] = currentQuote(document.documentElement.dataset.theme);
    const quote = tile('mw-small mw-quote', [el('div', { class: 'mt-head' }, [kicker('Цитата'), qBtn]), el('p', { class: 'mw-quote__t', text: `«${qt}»` }), el('span', { class: 'mt-sub', text: qw })]);

    // цели
    const goals = store.list('goals').filter((x) => x.progress < 100).sort((a, b) => a.created - b.created).slice(0, 4);
    const gKids = [kicker('Цели')];
    if (!goals.length) gKids.push(el('p', { class: 'mt-empty', text: 'Целей пока нет.' }));
    else gKids.push(el('ul', { class: 'mw-goals' }, goals.map((g) => el('li', {}, [
      el('div', { class: 'mw-goal__row' }, [el('span', { text: g.title }), el('span', { class: 'mt-sub', text: `${g.progress}%` })]),
      el('div', { class: 'mw-bar', role: 'progressbar', 'aria-valuenow': String(g.progress), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': g.title }, [el('i', { style: `--w:${g.progress}%` })]),
    ]))));
    const goalsT = tile('mw-goals-t', gKids);

    // доска
    const lb = el('button', { type: 'button', class: 'mt-add', text: st.list === 'list' ? 'Доска' : 'Список' });
    lb.addEventListener('click', () => { st.list = st.list === 'list' ? 'board' : 'list'; save('hub.homeBoard', st.list); render(); });
    const tasks = store.list('tasks');
    let boardBody;
    if (st.list === 'list') {
      const open = tasks.filter((t) => !t.done).sort((a, b) => (b.main ? 1 : 0) - (a.main ? 1 : 0) || (a.due || '9').localeCompare(b.due || '9'));
      boardBody = open.length ? el('ul', { class: 'mt-tasks mw-list' }, open.slice(0, 8).map((t) => taskRow(store, t, today))) : el('p', { class: 'mt-empty', text: 'Открытых задач нет.' });
    } else boardBody = boardView({ store, tasks, today, mainLimit: MAIN_LIMIT, labels: ['Очередь', 'Главные', 'Готово'] });
    const board = tile('mw-board', [el('div', { class: 'mt-head' }, [el('h2', { class: 'mt-h', text: 'Доска' }), lb]), boardBody]);

    root.replaceChildren(
      el('div', { class: 'view__head mono-head' }, [el('h1', { text: 'Итоги недели' }), el('p', { class: 'muted', text: range })]),
      el('div', { class: 'mt-grid mt-grid--weekly' }, [cum, spend, ev, rupor, quote, goalsT, board]),
    );
  }

  let sig = '';
  const signature = () => ['tasks', 'goals', 'subs', 'rupor', 'rposts'].map((m) => store.list(m).map((it) => `${it.id}:${it.updatedAt}`).join(',')).join('|');
  const alive = () => root.isConnected;
  subscribe(() => { const s = signature(); if (s !== sig) { sig = s; render(); } });
  loadProjects({ refresh: false });
  const offP = onProjects(() => { if (alive()) render(); else offP(); });
  const onQ = () => {
    if (!alive()) { document.removeEventListener('hub:quote', onQ); return; }
    const [t, w] = currentQuote(document.documentElement.dataset.theme);
    const q = root.querySelector('.mw-quote__t'); const s2 = root.querySelector('.mw-quote .mt-sub');
    if (q) q.textContent = `«${t}»`; if (s2) s2.textContent = w;
  };
  document.addEventListener('hub:quote', onQ);
  ensureRates(() => { if (alive()) render(); });
  sig = signature();
  render();
  return root;
}
