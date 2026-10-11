// Вкладка «Расписание»: неделя колледжа по данным data/schedule.json (этап 4).
// Нет данных, не распознано, устарело, неделя вне таблицы: всё показывается честными пометками.
import { el, fmtTime } from './ui.js';
import { todayYmd, addDays, fromYmd, weekStart, weekType, WEEKDAYS } from './dates.js';
import { loadSchedule, refreshNow, importCsvFiles, onSchedule, getScheduleState, weekFor, isStale, pairPhase } from './schedule-data.js';

// Строка пары; используется и на «Сегодня»
export function pairRow(p, phase) {
  const meta = [p.kind, p.teacher, p.room ? `ауд. ${p.room}` : ''].filter(Boolean).join(' · ');
  const time = el('span', { class: 'pair__time' }, [el('b', { text: p.n != null ? `${p.n}.` : '·' }), el('span', { text: p.start ? `${p.start}–${p.end}` : '' })]);
  const body = el('span', {}, [el('span', { class: 'pair__subject', text: p.subject || p.raw })]);
  if (meta) body.append(el('span', { class: 'pair__meta', text: ` ${meta}` }));
  if (!p.parsed && p.raw && p.raw !== p.subject) body.append(el('span', { class: 'pair__meta', text: ` ${p.raw}` }));
  return el('li', { class: `pair${phase === 'now' ? ' pair--now' : phase === 'past' ? ' pair--past' : ''}`, 'data-phase': phase || '' }, [time, body]);
}

export function sourceLine(st) {
  if (!st.data) return '';
  const src = st.data.source === 'browser' ? 'обновлено на этом устройстве' : 'обновлено автоматически';
  return `${src}: ${fmtTime(Date.parse(st.data.fetchedAt))}`;
}

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function rangeTitle(start) {
  const a = fromYmd(start);
  const b = fromYmd(addDays(start, 6));
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MONTHS_GEN[b.getMonth()]}`
    : `${a.getDate()} ${MONTHS_GEN[a.getMonth()]} – ${b.getDate()} ${MONTHS_GEN[b.getMonth()]}`;
}

export function scheduleView() {
  const root = el('section', { class: 'view' }, [
    el('div', { class: 'view__head' }, [
      el('h1', { text: 'Расписание' }),
      el('p', { class: 'muted', text: 'Пары колледжа по неделям.' }),
    ]),
  ]);
  let cursor = todayYmd();
  const bar = el('div', { class: 'week-nav' });
  const body = el('div', { class: 'stack' });
  const foot = el('div', { class: 'stack' });

  function renderBar() {
    const start = weekStart(cursor);
    const prev = el('button', { type: 'button', class: 'btn btn--ghost btn--s', 'aria-label': 'Предыдущая неделя', text: '‹' });
    const next = el('button', { type: 'button', class: 'btn btn--ghost btn--s', 'aria-label': 'Следующая неделя', text: '›' });
    const now = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Эта неделя' });
    prev.addEventListener('click', () => { cursor = addDays(start, -7); render(); });
    next.addEventListener('click', () => { cursor = addDays(start, 7); render(); });
    now.addEventListener('click', () => { cursor = todayYmd(); render(); });
    bar.replaceChildren(prev, el('h2', { class: 'week-nav__title', text: `${rangeTitle(start)} · ${weekType(start)} неделя` }), next, now);
    return start;
  }

  function renderBody(start) {
    const st = getScheduleState();
    const kids = [];
    const today = todayYmd();
    const wf = weekFor(st.data, start);
    if (!st.data) {
      kids.push(
        el('div', { class: 'empty' }, [
          el('strong', { text: st.loaded ? 'Расписания пока нет' : 'Загружаю расписание' }),
          el('span', { text: st.note || 'Файл data/schedule.json появится после первого запуска автоматического обновления в репозитории hub-data. Можно нажать «Обновить сейчас» или загрузить файлы таблицы вручную.' }),
        ]),
      );
    } else if (!wf || !wf.week) {
      kids.push(el('div', { class: 'empty' }, [el('strong', { text: `Для ${weekType(start)} недели данных нет` }), el('span', { text: 'Эта вкладка таблицы не была распознана.' })]));
    } else {
      if (wf.week.status === 'kept') kids.push(el('p', { class: 'sched-note sched-note--warn', text: 'Вкладка не распознана при последнем обновлении, показана прошлая версия.' }));
      if (!wf.exact) kids.push(el('p', { class: 'sched-note', text: wf.week.monday ? `По шаблону: в таблице эта вкладка относится к неделе с ${wf.week.monday}. Расписание на эту дату может измениться.` : 'По шаблону: дата недели в таблице не указана. Расписание может измениться.' }));
      const days = wf.week.days.filter((d) => d.pairs.length);
      if (!days.length) kids.push(el('div', { class: 'empty' }, [el('strong', { text: 'Пар на этой неделе нет' })]));
      days.forEach((d) => {
        const date = addDays(start, d.day - 1);
        const isToday = date === today;
        const list = el('ul', { class: 'pairs' }, d.pairs.map((p) => pairRow(p, isToday ? pairPhase(p, date) : date < today ? 'past' : '')));
        kids.push(
          el('section', { class: `card sched-day${isToday ? ' sched-day--today' : ''}`, 'data-day': String(d.day) }, [
            el('div', { class: 'sched-day__head' }, [el('h3', { text: WEEKDAYS[(d.day) % 7][0].toUpperCase() + WEEKDAYS[d.day % 7].slice(1) }), el('span', { class: 'muted', text: `${fromYmd(date).getDate()}.${String(fromYmd(date).getMonth() + 1).padStart(2, '0')}` })]),
            list,
          ]),
        );
      });
    }
    body.replaceChildren(...kids);
  }

  function renderFoot() {
    const st = getScheduleState();
    const kids = [];
    if (st.data && isStale(st.data)) kids.push(el('p', { class: 'sched-note sched-note--warn', text: 'Расписание не обновлялось больше недели. Возможно, оно устарело.' }));
    if (st.data) {
      const warns = (st.data.warnings || []).filter((w) => w.code !== 'kept-previous');
      if (warns.length) kids.push(el('p', { class: 'sched-note', text: `Замечания при разборе таблицы: ${warns.map((w) => w.text).join('; ')}` }));
    }
    if (st.error) kids.push(el('p', { class: 'sched-note sched-note--warn', role: 'alert', text: st.error }));
    if (st.note && st.data) kids.push(el('p', { class: 'sched-note', role: 'status', text: st.note }));
    if (st.data) kids.push(el('p', { class: 'sched-note', text: sourceLine(st) }));
    const btn = el('button', { type: 'button', class: 'btn btn--s', text: st.busy ? 'Обновляю…' : 'Обновить сейчас' });
    btn.disabled = st.busy;
    btn.addEventListener('click', () => refreshNow());
    const upper = el('input', { type: 'file', accept: '.csv,text/csv', hidden: '', 'aria-label': 'Файл верхней недели' });
    const lower = el('input', { type: 'file', accept: '.csv,text/csv', hidden: '', 'aria-label': 'Файл нижней недели' });
    const mk = (label, input, key) => {
      const b = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: label });
      b.addEventListener('click', () => input.click());
      input.addEventListener('change', () => { if (input.files[0]) importCsvFiles({ [key]: input.files[0] }); });
      return b;
    };
    kids.push(el('div', { class: 'sched-actions' }, [btn, mk('Загрузить верхнюю (CSV)', upper, 'upper'), mk('Загрузить нижнюю (CSV)', lower, 'lower'), upper, lower]));
    foot.replaceChildren(...kids);
  }

  function render() {
    renderBody(renderBar());
    renderFoot();
  }

  let seen = false;
  const off = onSchedule(() => {
    if (root.isConnected) {
      seen = true;
      render();
    } else if (seen) off();
  });
  render();
  loadSchedule();
  root.append(bar, body, foot);
  return root;
}
