// Страница «Итоги недели»: задачи, Рупор, события проектов, дедлайны на следующую неделю. Листается по неделям.
import { el } from './ui.js';
import { todayYmd, fromYmd } from './dates.js';
import { load, save } from './storage.js';
import { mergedProjects } from './projects-view.js';
import { buildFeed } from './feed-calc.js';
import { loadProjects, onProjects } from './projects-data.js';
import { ruporPosts } from './rupor-view.js';
import { summarizeWeek, weekId, prevWeekDay, nextWeekDay, shouldSnapshot } from './weekly-calc.js';

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const PL = { dzen: 'Дзен', vk: 'ВК', tg: 'Telegram' };
const short = (s) => { const d = fromYmd(s); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const range = (a, b) => `${short(a)} — ${short(b)}`;

// Данные недели считаются по текущему состоянию хаба.
export function liveSummary(store, day) {
  const events = buildFeed(mergedProjects(store)).map((e) => ({ date: e.date, project: e.project, text: e.text }));
  return summarizeWeek({ day, tasks: store.list('tasks'), posts: ruporPosts(store), records: store.list('rupor'), events });
}

// Сохраняет итог в хабе: воскресенье с 18:00 или первая же встреча после конца недели.
const inFlight = new Set();
export function ensureSnapshot(store, now = new Date()) {
  const have = new Set([...store.list('weekly').map((r) => r.week), ...inFlight]);
  const today = todayYmd(now);
  [today, prevWeekDay(today)].forEach((day) => {
    if (!shouldSnapshot(day, now, have)) return;
    const summary = liveSummary(store, day);
    if (!summary.hasData && !summary.deadlines.length) return;
    // id по номеру недели: два устройства не создадут двух итогов за одну неделю
    inFlight.add(summary.week);
    store.upsert('weekly', `weekly-${summary.week}`, { week: summary.week, summary, savedAt: Date.now() });
    have.add(summary.week);
  });
}

export function weeklyView({ store, subscribe }) {
  const root = el('section', { class: 'view' });
  let day = load('hub.weeklyDay', null) || todayYmd();
  const today = () => todayYmd();

  function list(title, items, empty) {
    return el('section', { class: 'card stack stack--tight' }, [el('h2', { text: title }), items.length ? el('ul', { class: 'hist' }, items) : el('p', { class: 'muted', text: empty })]);
  }

  function render() {
    const saved = store.list('weekly').find((r) => r.week === weekId(day));
    const live = liveSummary(store, day);
    const frozen = saved && weekId(day) !== weekId(today()) ? saved.summary : null;
    const s = frozen || live;
    const prev = el('button', { type: 'button', class: 'btn btn--ghost btn--s', 'aria-label': 'Прошлая неделя', text: '← Раньше' });
    const next = el('button', { type: 'button', class: 'btn btn--ghost btn--s', 'aria-label': 'Следующая неделя', text: 'Позже →', ...(weekId(day) >= weekId(today()) ? { disabled: '' } : {}) });
    prev.addEventListener('click', () => { day = prevWeekDay(day); save('hub.weeklyDay', day); render(); });
    next.addEventListener('click', () => { day = nextWeekDay(day); save('hub.weeklyDay', day); render(); });
    const isCur = weekId(day) === weekId(today());
    root.replaceChildren(
      el('div', { class: 'view__head' }, [el('h1', { text: 'Итоги недели' }), el('p', { class: 'muted', text: `${range(s.from, s.to)} · ${s.week}${isCur ? ' · неделя идёт' : ''}${frozen ? ' · сохранено' : ''}` })]),
      el('div', { class: 'pillrow' }, [prev, next]),
    );
    if (!s.hasData) root.append(el('div', { class: 'empty' }, [el('strong', { text: 'Нет данных' }), el('span', { text: 'За эту неделю нет закрытых задач, публикаций в «Рупоре» и событий проектов.' })]));
    root.append(
      list(`Задачи: закрыто ${s.tasks.closed.length}`, s.tasks.closed.map((t) => el('li', { text: t.project ? `${t.title} · ${t.project}` : t.title })), 'Закрытых задач нет.'),
      el('p', { class: 'muted', text: `Открытых задач сейчас: ${s.tasks.openCount}${s.tasks.overdue ? `, из них просрочено на начало недели: ${s.tasks.overdue}` : ''}.` }),
      list(`Рупор: опубликовано ${s.rupor.total}`, s.rupor.published.map((p) => el('li', { text: `${p.title} · ${p.platforms.map((k) => PL[k]).join(', ')}` })), 'Публикаций не отмечено.'),
      list('События проектов', s.events.map((e) => el('li', { text: `${short(e.date)} · ${e.project}: ${e.text}` })), 'Событий нет.'),
      list('Дедлайны на следующую неделю', s.deadlines.map((d) => el('li', { text: `${short(d.due)}${d.time ? ` ${d.time}` : ''} · ${d.title}${d.project ? ` · ${d.project}` : ''}` })), 'Дедлайнов нет.'),
    );
    if (frozen) root.append(el('p', { class: 'sched-note', text: 'Итог сохранён в конце недели и больше не меняется.' }));
  }

  subscribe(() => { if (root.isConnected) render(); });
  const off = onProjects(() => { if (root.isConnected) render(); else off(); });
  loadProjects({ refresh: false });
  render();
  return root;
}
