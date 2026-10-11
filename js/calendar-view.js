// Вкладка «Календарь»: месяц, неделя, день, свои события с повторами, экспорт .ics.
import { el, ICONS } from './ui.js';
import { load, save } from './storage.js';
import { todayYmd, addDays, fromYmd, ymd, isYmd, isHm, fmtDay, monthName, weekdayShort } from './dates.js';
import { REPEATS, expand, eventsOn, toIcs } from './events.js';

const KEY_MODE = 'hub.calMode';
const MODES = [
  ['month', 'Месяц'],
  ['week', 'Неделя'],
  ['day', 'День'],
];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

// Неделя начинается с понедельника.
export function weekStart(s) {
  const d = fromYmd(s);
  return addDays(s, -((d.getDay() + 6) % 7));
}

export function monthGrid(s) {
  const d = fromYmd(s);
  const first = ymd(new Date(d.getFullYear(), d.getMonth(), 1));
  const start = weekStart(first);
  const days = [];
  for (let i = 0; i < 42; i += 1) days.push(addDays(start, i));
  // последняя неделя целиком из чужого месяца не нужна
  return fromYmd(days[35]).getMonth() !== d.getMonth() ? days.slice(0, 35) : days;
}

function shiftMonth(s, n) {
  const d = fromYmd(s);
  return ymd(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

export function calendarView({ store, subscribe }) {
  const root = el('section', { class: 'view' }, [
    el('div', { class: 'view__head' }, [
      el('h1', { text: 'Календарь' }),
      el('p', { class: 'muted', text: 'Свои события и повторы. Расписание колледжа подключится на этапе 4.' }),
    ]),
  ]);

  let mode = load(KEY_MODE, 'month');
  if (!MODES.some((m) => m[0] === mode)) mode = 'month';
  let cursor = todayYmd();
  let adding = false;
  let editingId = null;
  let msg = '';

  const bar = el('div', { class: 'cal-bar' });
  const body = el('div', { class: 'stack' });
  const live = el('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });

  const allEvents = () => store.list('events');
  const tasksOn = (day) => store.list('tasks').filter((t) => !t.done && t.due === day);

  function title() {
    const d = fromYmd(cursor);
    if (mode === 'month') return `${monthName(d.getMonth())} ${d.getFullYear()}`;
    if (mode === 'week') {
      const a = fromYmd(weekStart(cursor));
      const b = fromYmd(addDays(weekStart(cursor), 6));
      return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MONTHS_GEN[b.getMonth()]}` : `${a.getDate()} ${MONTHS_GEN[a.getMonth()]} – ${b.getDate()} ${MONTHS_GEN[b.getMonth()]}`;
    }
    return fmtDay(cursor);
  }

  function move(n) {
    if (mode === 'month') cursor = shiftMonth(cursor, n);
    else cursor = addDays(cursor, n * (mode === 'week' ? 7 : 1));
    editingId = null;
    render();
  }

  function renderBar() {
    bar.replaceChildren();
    const modes = el('div', { class: 'chips', role: 'group', 'aria-label': 'Вид календаря' });
    MODES.forEach(([id, name]) => {
      const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(mode === id), text: name });
      b.addEventListener('click', () => {
        mode = id;
        save(KEY_MODE, mode);
        editingId = null;
        render();
      });
      modes.append(b);
    });
    const prev = el('button', { type: 'button', class: 'btn btn--ghost btn--s', 'aria-label': 'Назад', text: '‹' });
    const next = el('button', { type: 'button', class: 'btn btn--ghost btn--s', 'aria-label': 'Вперёд', text: '›' });
    const now = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Сегодня' });
    prev.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    now.addEventListener('click', () => {
      cursor = todayYmd();
      render();
    });
    bar.append(modes, el('div', { class: 'cal-nav' }, [prev, el('h2', { class: 'cal-title', text: title() }), next, now]));
  }

  // ---------- форма события ----------
  function eventForm(ev, onDone) {
    const form = el('form', { class: 'task-form card' });
    const f = (attrs) => el('input', { class: 'field', ...attrs });
    const titleI = f({ type: 'text', 'aria-label': 'Название события', placeholder: 'Название события', maxlength: '200', value: ev ? ev.title : '' });
    const date = f({ type: 'date', 'aria-label': 'Дата события', value: ev ? ev.date : cursor });
    const time = f({ type: 'time', 'aria-label': 'Начало', value: ev && ev.time ? ev.time : '' });
    const end = f({ type: 'time', 'aria-label': 'Конец', value: ev && ev.endTime ? ev.endTime : '' });
    const place = f({ type: 'text', 'aria-label': 'Место', placeholder: 'Место (необязательно)', maxlength: '120', value: ev ? ev.place || '' : '' });
    const rep = el('select', { class: 'field', 'aria-label': 'Повтор' });
    REPEATS.forEach((r) => {
      const o = el('option', { value: r.id, text: r.name });
      if ((ev ? ev.repeat || 'none' : 'none') === r.id) o.selected = true;
      rep.append(o);
    });
    const until = f({ type: 'date', 'aria-label': 'Повторять до', value: ev && ev.until ? ev.until : '' });
    const err = el('p', { class: 'err', role: 'alert' });
    const submit = el('button', { type: 'submit', class: 'btn btn--primary', text: ev ? 'Сохранить' : 'Добавить событие' });
    const cancel = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Отмена' });
    cancel.addEventListener('click', () => {
      adding = false;
      editingId = null;
      render();
    });
    form.append(
      titleI,
      el('div', { class: 'task-form__row' }, [date, time, end]),
      place,
      el('div', { class: 'task-form__row' }, [rep, until]),
      err,
      el('div', { class: 'task-form__row' }, [submit, cancel]),
    );
    if (ev && ev.repeat && ev.repeat !== 'none') form.append(el('p', { class: 'muted', text: 'Изменения коснутся всех повторов этого события.' }));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      const t = titleI.value.trim();
      if (!t) {
        err.textContent = 'Напиши название события.';
        titleI.focus();
        return;
      }
      if (!isYmd(date.value)) {
        err.textContent = 'Выбери дату.';
        return;
      }
      if (time.value && !isHm(time.value)) {
        err.textContent = 'Время начала указано неверно.';
        return;
      }
      if (end.value && !time.value) {
        err.textContent = 'Укажи время начала, если задан конец.';
        return;
      }
      if (end.value && end.value <= time.value) {
        err.textContent = 'Конец должен быть позже начала.';
        return;
      }
      if (until.value && until.value < date.value) {
        err.textContent = 'Дата «повторять до» раньше начала.';
        return;
      }
      const fields = {
        title: t,
        date: date.value,
        time: time.value || null,
        endTime: end.value || null,
        place: place.value.trim(),
        repeat: rep.value,
        until: rep.value !== 'none' && until.value ? until.value : null,
      };
      if (ev) await store.update('events', ev.id, fields);
      else await store.add('events', fields);
      cursor = fields.date;
      adding = false;
      editingId = null;
      msg = ev ? 'Событие сохранено.' : 'Событие добавлено.';
      render();
      onDone && onDone();
    });
    return form;
  }

  // ---------- строки ----------
  function repeatLabel(ev) {
    const r = REPEATS.find((x) => x.id === ev.repeat);
    return r && r.id !== 'none' ? r.name.toLowerCase() : '';
  }

  function eventRow(ev, showDate) {
    const li = el('li', { class: 'task' });
    const when = ev.time ? `${ev.time}${ev.endTime ? `–${ev.endTime}` : ''}` : 'весь день';
    const meta = [showDate ? fmtDay(showDate) : null, when, ev.place, repeatLabel(ev)].filter(Boolean).join(' · ');
    li.append(
      el('span', { class: 'cal-dot', 'aria-hidden': 'true' }),
      el('span', { class: 'task__text' }, [el('span', { class: 'task__title', text: ev.title }), el('span', { class: 'task__meta', text: meta })]),
    );
    const edit = el('button', { type: 'button', class: 'iconbtn', 'aria-label': `Изменить: ${ev.title}`, html: ICONS.edit });
    edit.addEventListener('click', () => {
      editingId = ev.id;
      adding = false;
      render();
    });
    const del = el('button', { type: 'button', class: 'iconbtn', 'aria-label': `Удалить: ${ev.title}`, html: ICONS.close });
    del.addEventListener('click', () => {
      store.remove('events', ev.id);
      editingId = null;
    });
    li.append(el('span', { class: 'task__tools' }, [edit, del]));
    return li;
  }

  function taskLine(t) {
    return el('li', { class: 'task task--ghost' }, [
      el('span', { class: 'cal-dot cal-dot--task', 'aria-hidden': 'true' }),
      el('span', { class: 'task__text' }, [el('span', { class: 'task__title', text: t.title }), el('span', { class: 'task__meta', text: `задача${t.time ? ` · ${t.time}` : ''}` })]),
      el('span'),
    ]);
  }

  function dayBlock(day, headed) {
    const evs = eventsOn(allEvents(), day);
    const ts = tasksOn(day);
    const wrap = el('div', { class: 'stack stack--tight' });
    if (headed) {
      const h = el('h3', { class: day === todayYmd() ? 'cal-today' : '', text: fmtDay(day) });
      wrap.append(h);
    }
    if (!evs.length && !ts.length) {
      wrap.append(el('p', { class: 'muted', text: 'Событий нет.' }));
      return wrap;
    }
    const ul = el('ul', { class: 'tasks' });
    evs.forEach((ev) => {
      if (ev.id === editingId) {
        const li = el('li');
        li.append(eventForm(ev));
        ul.append(li);
      } else ul.append(eventRow(ev));
    });
    ts.forEach((t) => ul.append(taskLine(t)));
    wrap.append(ul);
    return wrap;
  }

  // ---------- виды ----------
  function renderMonth() {
    const days = monthGrid(cursor);
    const grid = el('div', { class: 'cal-grid', role: 'grid', 'aria-label': title() });
    for (let i = 0; i < 7; i += 1) grid.append(el('span', { class: 'cal-wd', text: weekdayShort((i + 1) % 7) }));
    const month = fromYmd(cursor).getMonth();
    const evs = allEvents();
    const today = todayYmd();
    days.forEach((day) => {
      const d = fromYmd(day);
      const n = expand(evs, day, day).length;
      const b = el('button', {
        type: 'button',
        class: `cal-cell${d.getMonth() !== month ? ' cal-cell--out' : ''}${day === cursor ? ' cal-cell--sel' : ''}`,
        'aria-label': `${fmtDay(day)}${n ? `, событий: ${n}` : ''}`,
        'data-day': day,
      });
      if (day === today) b.setAttribute('aria-current', 'date');
      b.append(el('span', { class: 'cal-num', text: String(d.getDate()) }));
      if (n) b.append(el('span', { class: 'cal-count', text: String(n) }));
      b.addEventListener('click', () => {
        cursor = day;
        mode = 'day';
        save(KEY_MODE, mode);
        render();
      });
      grid.append(b);
    });
    body.append(grid);
  }

  function renderWeek() {
    const start = weekStart(cursor);
    for (let i = 0; i < 7; i += 1) body.append(dayBlock(addDays(start, i), true));
  }

  function renderDay() {
    body.append(dayBlock(cursor, false));
  }

  function exportIcs() {
    const text = toIcs(allEvents());
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
    const a = el('a', { href: url, download: 'hub-calendar.ics' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    msg = 'Файл календаря сохранён (.ics).';
    live.textContent = msg;
  }

  function render() {
    sig = signature();
    stale = false;
    renderBar();
    body.replaceChildren();
    if (mode === 'month') renderMonth();
    else if (mode === 'week') renderWeek();
    else renderDay();
    if (mode === 'month') {
      // под сеткой: события выбранного дня
      body.append(el('h3', { text: fmtDay(cursor) }), dayBlock(cursor, false));
    }
    const add = el('button', { type: 'button', class: 'btn btn--primary', text: adding ? 'Скрыть форму' : 'Добавить событие' });
    add.addEventListener('click', () => {
      adding = !adding;
      editingId = null;
      render();
    });
    const exp = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Экспорт .ics' });
    exp.addEventListener('click', exportIcs);
    const tools = el('div', { class: 'task-form__row' }, [add, exp]);
    body.append(tools);
    if (adding) body.append(eventForm(null));
    body.append(el('p', { class: 'muted', text: 'Расписание колледжа: не подключено (этап 4).' }));
    live.textContent = msg;
  }

  const signature = () => ['events', 'tasks'].map((m) => store.list(m).map((it) => `${it.id}:${it.updatedAt}`).join(',')).join('|');
  let sig = signature();
  let stale = false;
  const typing = () => root.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  subscribe(() => {
    const next = signature();
    if (next === sig) return;
    sig = next;
    if (typing()) stale = true;
    else render();
  });
  root.addEventListener('focusout', () => {
    setTimeout(() => {
      if (stale && !typing()) {
        stale = false;
        render();
      }
    }, 0);
  });

  render();
  root.append(bar, live, body);
  return root;
}
