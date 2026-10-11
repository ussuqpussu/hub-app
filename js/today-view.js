// Вкладка «Сегодня»: главные задачи, задачи на сегодня, входящие, цели.
// Источники, которых ещё нет (расписание, подписки, погода, проекты), показываются одной честной строкой.
import { el } from './ui.js';
import { todayYmd, fromYmd, fmtDay, dueLabel, weekType } from './dates.js';
import { nextDue, lamp } from './subs-calc.js';
import { dueText, money, dateText, periodText, lampNode, logoNode } from './subs-parts.js';
import { pairRow } from './schedule-view.js';
import { loadSchedule, onSchedule, getScheduleState, pairsOn, pairPhase, isStale, withGaps } from './schedule-data.js';
import { load, save } from './storage.js';
import { loadProjects, onProjects } from './projects-data.js';
import { ruporPosts } from './rupor-view.js';
import { pendingPost, publishedCount, recOf, dayNeed } from './rupor-calc.js';
import { liveSummary, ensureSnapshot } from './weekly-view.js';
import { groupTasks, openTasksTab, INBOX_OLD_DAYS, MAIN_LIMIT } from './tasks-view.js';

const WEEKDAYS_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export function todayView({ store, subscribe }) {
  const root = el('section', { class: 'view' });
  const keys = ['inbox', 'tasks', 'goals', 'subs', 'rupor', 'rposts'];
  const signature = () => keys.map((m) => store.list(m).map((it) => `${it.id}:${it.updatedAt}`).join(',')).join('|');
  let sig = '';
  let shown = '';

  function tile(title, children, link) {
    const head = el('div', { class: 'tile__head' }, [el('h2', { text: title })]);
    if (link) head.append(link);
    return el('section', { class: 'card tile' }, [head, ...[].concat(children)]);
  }

  function goTo(hash, tab) {
    const a = el('a', { class: 'tile__link', href: hash, text: tab.label });
    a.addEventListener('click', () => openTasksTab(tab.id));
    return a;
  }

  function taskLine(t, today) {
    const li = el('li', { class: 'task' });
    const check = el('button', { type: 'button', class: 'task__check', role: 'checkbox', 'aria-checked': 'false', 'aria-label': `Выполнено: ${t.title}` });
    check.addEventListener('click', () => store.update('tasks', t.id, { done: true, doneAt: Date.now(), main: false }));
    const meta = [];
    if (t.due) meta.push(`${dueLabel(t.due, today)}${t.time ? ` ${t.time}` : ''}`);
    if (t.project) meta.push(t.project);
    const text = el('span', { class: 'task__text' }, [el('span', { class: 'task__title', text: t.title })]);
    if (meta.length) text.append(el('span', { class: 'task__meta', text: meta.join(' · ') }));
    li.append(check, text, el('span'));
    return li;
  }

  function render() {
    sig = signature();
    const today = todayYmd();
    shown = today;
    const d = fromYmd(today);
    const tasks = store.list('tasks');
    const g = groupTasks(tasks, today);
    root.replaceChildren(
      el('div', { class: 'view__head' }, [
        el('h1', { text: `${WEEKDAYS_FULL[d.getDay()][0].toUpperCase()}${WEEKDAYS_FULL[d.getDay()].slice(1)}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}` }),
        el('p', { class: 'muted', text: `${weekType(today)[0].toUpperCase()}${weekType(today).slice(1)} неделя` }),
      ]),
    );

    // Расписание на сегодня
    const sst = getScheduleState();
    const day = sst.data ? pairsOn(sst.data, today) : null;
    let schedBody;
    if (!sst.data) schedBody = el('p', { class: 'muted', text: sst.loaded ? 'Расписания пока нет. Оно появится после первого автоматического обновления.' : 'Загружаю расписание…' });
    else if (!day) schedBody = el('p', { class: 'muted', text: 'Для этой недели данных нет.' });
    else {
      const parts = [];
      if (!day.pairs.length) parts.push(el('p', { class: 'muted', text: 'Сегодня пар нет.' }));
      else parts.push(el('ul', { class: 'pairs' }, withGaps(sst.data, day.pairs).map((p) => pairRow(p, p.empty ? 'free' : day.exact ? pairPhase(p, today) : ''))));
      if (!day.exact) parts.push(el('p', { class: 'sched-note', text: 'По шаблону, может измениться.' }));
      if (day.status === 'kept') parts.push(el('p', { class: 'sched-note sched-note--warn', text: 'Показана прошлая версия таблицы.' }));
      if (isStale(sst.data)) parts.push(el('p', { class: 'sched-note sched-note--warn', text: 'Расписание не обновлялось больше недели.' }));
      schedBody = parts;
    }
    root.append(tile('Расписание', schedBody, el('a', { class: 'tile__link', href: '#/schedule', text: 'Неделя' })));

    // Главные задачи
    const mains = tasks.filter((t) => t.main && !t.done).sort((a, b) => a.created - b.created).slice(0, MAIN_LIMIT);
    const mainBody = mains.length
      ? el('ul', { class: 'tasks' }, mains.map((t) => taskLine(t, today)))
      : el('p', { class: 'muted', text: `Отметь звёздочкой до ${MAIN_LIMIT} главных задач в разделе «Задачи».` });
    root.append(tile(`Главные задачи${mains.length ? ` · ${mains.length}` : ''}`, mainBody, goTo('#/tasks', { id: 'tasks', label: 'Все задачи' })));

    // Задачи на сегодня и просроченные
    const rest = [...g.overdue, ...g.today].filter((t) => !t.main);
    if (rest.length) {
      const ul = el('ul', { class: 'tasks' }, rest.slice(0, 6).map((t) => taskLine(t, today)));
      const more = rest.length > 6 ? el('p', { class: 'muted', text: `И ещё: ${rest.length - 6}` }) : null;
      const title = g.overdue.some((t) => !t.main) ? `На сегодня · просрочено: ${g.overdue.filter((t) => !t.main).length}` : 'На сегодня';
      root.append(tile(title, more ? [ul, more] : ul, goTo('#/tasks', { id: 'tasks', label: 'Все задачи' })));
    }

    // Входящие
    const inbox = store.list('inbox').filter((it) => !it.resolved);
    const oldest = inbox.reduce((m, it) => Math.min(m, it.created), Infinity);
    const days = inbox.length ? Math.floor((Date.now() - oldest) / (24 * 3600 * 1000)) : 0;
    const old = inbox.length && days >= INBOX_OLD_DAYS;
    root.append(
      tile(
        `Входящие: ${inbox.length}`,
        el('p', { class: old ? 'today-warn' : 'muted', text: !inbox.length ? 'Всё разобрано.' : old ? `Самая старая запись висит ${days} дн. Пора разобрать.` : 'Есть неразобранные записи.' }),
        goTo('#/tasks', { id: 'inbox', label: 'Разобрать' }),
      ),
    );

    // Цели
    const goals = store.list('goals').filter((x) => x.progress < 100).sort((a, b) => a.created - b.created).slice(0, 3);
    if (goals.length) {
      const ul = el('ul', { class: 'tasks' });
      goals.forEach((x) => {
        ul.append(
          el('li', { class: 'goal goal--compact' }, [
            el('span', { class: 'task__text' }, [el('span', { class: 'task__title', text: x.title }), el('span', { class: 'task__meta', text: x.area || 'другое' })]),
            el('span', { class: 'goal__pct', text: `${x.progress}%` }),
            el('progress', { class: 'bar', max: '100', value: String(x.progress), 'aria-label': `Прогресс: ${x.title}` }),
          ]),
        );
      });
      root.append(tile('Цели', ul, goTo('#/tasks', { id: 'goals', label: 'Все цели' })));
    }

    // Рупор: что публиковать сегодня и сколько площадок уже готово
    const rp = ruporPosts(store);
    if (rp.length) {
      const recs = store.list('rupor');
      const need = dayNeed(today) === 'article' ? 'нужна статья' : 'нужен пост';
      const dayName = WEEKDAYS_FULL[d.getDay()];
      const body = [el('p', { class: 'muted', text: `Сегодня ${dayName}, ${need}.` })];
      const pp = pendingPost(rp, recs, today);
      if (pp) {
        const open = el('button', { type: 'button', class: 'btn btn--primary btn--s', text: 'Открыть' });
        open.addEventListener('click', () => {
          const ui = load('hub.projectsUi', {}) || {};
          save('hub.projectsUi', { ...ui, tab: 'rupor', rSub: 'posts', rPost: pp.id });
          location.hash = '#/projects';
        });
        body.push(el('p', { text: `${pp.title}, опубликовано ${publishedCount(recOf(recs, pp.id))} из 3` }), open);
      } else body.push(el('p', { class: 'muted', text: 'Всё, что было подготовлено, опубликовано.' }));
      root.append(tile('Рупор', body));
    }

    // Ближайшие списания
    const subs = store.list('subs').filter((x) => x.status === 'active').sort((a, b) => (nextDue(a, today) || '9').localeCompare(nextDue(b, today) || '9')).slice(0, 3);
    if (subs.length) {
      const ul = el('ul', { class: 'card sublist' });
      subs.forEach((x) => {
        const l = lamp(x, today);
        const d = nextDue(x, today);
        ul.append(el('li', { class: 'subrow', 'data-lamp': l }, [
          el('a', { class: 'subrow__main subrow__main--link', href: '#/subscriptions' }, [
            logoNode(x),
            el('span', { class: 'subrow__text' }, [
              el('span', { class: 'subrow__name', text: x.name }),
              el('span', { class: 'subrow__due' }, [lampNode(l), el('span', { text: dueText(x, today) })]),
              el('span', { class: 'subrow__meta', text: dateText(d, today) }),
            ]),
            el('span', { class: 'subrow__money' }, [el('span', { class: 'subrow__price', text: money(x.price, x.currency) }), el('span', { class: 'subrow__period', text: periodText(x).toLowerCase() })]),
          ]),
        ]));
      });
      root.append(tile('Ближайшие платежи', ul, el('a', { class: 'tile__link', href: '#/subscriptions', text: 'Все подписки' })));
    }

    // Ближайшие задачи: то, чего нет выше (не главные, не на сегодня и не просроченные)
    const upcoming = [...g.later, ...g.nodue].filter((t) => !t.main).slice(0, 4);
    if (upcoming.length) {
      const hidden = g.later.filter((t) => !t.main).length + g.nodue.filter((t) => !t.main).length - upcoming.length;
      const items = [el('ul', { class: 'tasks' }, upcoming.map((t) => taskLine(t, today)))];
      if (hidden > 0) items.push(el('p', { class: 'muted', text: `И ещё: ${hidden}` }));
      root.append(tile('Ближайшие задачи', items, goTo('#/tasks', { id: 'tasks', label: 'Все задачи' })));
    }

    // Итоги недели: ссылка и коротко, сколько сделано; в воскресенье вечером итог сохраняется
    try { ensureSnapshot(store); } catch (_) { /* итог сохранится при следующем открытии */ }
    const ws = liveSummary(store, today);
    const sunEve = new Date().getDay() === 0 && new Date().getHours() >= 18;
    root.append(tile(sunEve ? 'Итоги недели готовы' : 'Итоги недели', el('p', { class: ws.hasData ? '' : 'muted', text: ws.hasData ? `Закрыто задач: ${ws.tasks.closed.length}. Опубликовано в «Рупоре»: ${ws.rupor.total}. Событий проектов: ${ws.events.length}.` : 'За эту неделю пока нет данных.' }), el('a', { class: 'tile__link', href: '#/weekly', text: 'Открыть' })));

    // Источники, которых ещё нет
    root.append(el('p', { class: 'muted', text: 'Пока не подключено: погода (этап 17).' }));

    // Смена суток: в полночь экран обновляется сам
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 5);
    setTimeout(() => {
      if (root.isConnected && shown !== todayYmd()) render();
    }, Math.max(1000, next - new Date()));
  }

  let seen = false;
  const offSched = onSchedule(() => {
    if (root.isConnected) {
      seen = true;
      render();
    } else if (seen) offSched();
  });
  loadSchedule();
  loadProjects({ refresh: false });
  const offP = onProjects(() => { if (root.isConnected) render(); else offP(); });
  subscribe(() => {
    const next = signature();
    if (next !== sig) render();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && root.isConnected && shown !== todayYmd()) render();
  });
  render();
  return root;
}
