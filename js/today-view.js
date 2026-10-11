// Вкладка «Сегодня»: главные задачи, задачи на сегодня, входящие, цели.
// Источники, которых ещё нет (расписание, подписки, погода, проекты), показываются одной честной строкой.
import { el } from './ui.js';
import { todayYmd, fromYmd, fmtDay, dueLabel, weekType } from './dates.js';
import { nextDue, lamp } from './subs-calc.js';
import { dueText, money } from './subs-parts.js';
import { pairRow } from './schedule-view.js';
import { loadSchedule, onSchedule, getScheduleState, pairsOn, pairPhase, isStale, withGaps } from './schedule-data.js';
import { groupTasks, openTasksTab, INBOX_OLD_DAYS, MAIN_LIMIT } from './tasks-view.js';

const WEEKDAYS_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export function todayView({ store, subscribe }) {
  const root = el('section', { class: 'view' });
  const keys = ['inbox', 'tasks', 'goals', 'subs'];
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

    // Ближайшие списания
    const subs = store.list('subs').filter((x) => x.status === 'active').sort((a, b) => (nextDue(a, today) || '9').localeCompare(nextDue(b, today) || '9')).slice(0, 3);
    if (subs.length) {
      const ul = el('ul', { class: 'tasks' });
      subs.forEach((x) => {
        const lvl = lamp(x, today);
        ul.append(
          el('li', { class: 'task', 'data-level': lvl }, [
            el('span'),
            el('span', { class: 'task__text' }, [el('span', { class: 'task__title', text: `${x.name} · ${money(x.price, x.currency)}` }), el('span', { class: lvl === 'red' || lvl === 'yellow' ? 'task__meta today-warn' : 'task__meta', text: dueText(x, today) })]),
            el('span'),
          ]),
        );
      });
      root.append(tile('Ближайшие платежи', ul, el('a', { class: 'tile__link', href: '#/subscriptions', text: 'Все подписки' })));
    }

    // Источники, которых ещё нет
    root.append(el('p', { class: 'muted', text: 'Пока не подключено: проекты и следующие шаги (этап 6), погода (этап 17).' }));

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
