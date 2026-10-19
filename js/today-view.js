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
import { mountSky, bodyPos } from './sky.js';
import { getWeather, refreshWeather } from './weather-sync.js';
import { weatherState, cityLine, dayLine } from './weather-calc.js';
import { getAppearance, motionAllowed } from './appearance.js';
import { rings } from './mk-widgets.js';
import { startFocus, focusActive, focusText } from './island.js';
import { bars } from './mk-widgets.js';
import { groupTasks, openTasksTab, INBOX_OLD_DAYS, MAIN_LIMIT } from './tasks-view.js';

const TILE_KEYS = { 'Сегодня': 'rings', 'Фокус': 'focus', 'Погода': 'weather', 'Расписание': 'sched', 'Главные задачи': 'mains', 'Цели': 'goals', 'Рупор': 'rupor', 'Ближайшие платежи': 'subs', 'Ближайшие задачи': 'upcoming' };
const WEEKDAYS_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export function todayView({ store, subscribe }) {
  const root = el('section', { class: 'view' });
  const keys = ['inbox', 'tasks', 'goals', 'subs', 'rupor', 'rposts'];
  const signature = () => keys.map((m) => store.list(m).map((it) => `${it.id}:${it.updatedAt}`).join(',')).join('|');
  let sig = '';
  const wsBefore = JSON.stringify(getWeather());
  let shown = '';

  // size: 'w2' — на две колонки, 'h2' — на две строки (раскладка «бенто», см. .bento в layout.css)
  function tile(title, children, link, size = '') {
    const head = el('div', { class: 'tile__head' }, [el('h2', { text: title })]);
    if (link) head.append(link);
    const key = TILE_KEYS[title] || (/^На сегодня/.test(title) ? 'todo' : /^Итоги недели/.test(title) ? 'weekly' : '');
    const node = el('section', { class: `card tile${size ? ` ${size.split(' ').map((x) => `tile--${x}`).join(' ')}` : ''}` }, [head, ...[].concat(children)]);
    if (key) node.dataset.t = key;
    return node;
  }

  // Главная задача отдельной плиткой: крупное название, проект и срок, кнопка «Готово».
  function mainTile(t, today, i) {
    const meta = [];
    if (t.due) meta.push(`${dueLabel(t.due, today)}${t.time ? ` ${t.time}` : ''}`);
    if (t.project) meta.push(t.project);
    const done = el('button', { type: 'button', class: 'btn btn--s', text: 'Готово', 'aria-label': `Выполнено: ${t.title}` });
    done.addEventListener('click', () => store.update('tasks', t.id, { done: true, doneAt: Date.now(), main: false }));
    return el('section', { class: 'card tile tile--main', 'data-t': 'mains', 'data-n': String(i + 1) }, [
      el('span', { class: 'tile__kicker', text: `Главная ${i + 1}` }),
      el('p', { class: 'tile__big', text: t.title }),
      el('p', { class: 'muted tile__meta', text: meta.length ? meta.join(' · ') : 'Без срока' }),
      done,
    ]);
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
        el('h1', {}, [el('span', { class: 'vh__wd', text: `${WEEKDAYS_FULL[d.getDay()][0].toUpperCase()}${WEEKDAYS_FULL[d.getDay()].slice(1)}, ` }), `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`]),
        el('p', { class: 'muted', 'data-wd': WEEKDAYS_FULL[d.getDay()], text: `${weekType(today)[0].toUpperCase()}${weekType(today).slice(1)} неделя` }),
      ]),
    );
    const grid = el('div', { class: 'bento' });
    root.append(grid);

    // День пройден: доля суток от 00:00 до 24:00, обновляется раз в минуту
    {
      const myth = /^(myth|fusion)/.test(document.documentElement.dataset.theme || '');
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'daypath'); svg.setAttribute('viewBox', '0 0 120 70'); svg.setAttribute('role', 'img');
      const arc = (cls) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', 'M 10 64 A 50 50 0 0 1 110 64'); p.setAttribute('class', cls); p.setAttribute('stroke-width', '3'); return p; };
      const bg = arc('dp-bg'); const fg = arc('dp-fg'); fg.setAttribute('pathLength', '100'); fg.setAttribute('stroke-dasharray', '100'); fg.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(.22,.8,.3,1)';
      const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', '4');
      svg.append(bg, fg, dot);
      const pct = el('p', { class: 'daypct' });
      const note = el('p', { class: 'muted tile__meta daynote' });
      const upd = () => {
        const n = new Date();
        const f = Math.min(1, (n.getHours() * 60 + n.getMinutes()) / 1440);
        const a = Math.PI * (1 - f);
        dot.setAttribute('cx', String(60 + 50 * Math.cos(a))); dot.setAttribute('cy', String(64 - 50 * Math.sin(a)));
        fg.setAttribute('stroke-dashoffset', String(100 - f * 100));
        pct.textContent = `${Math.round(f * 100)}%`;
        svg.setAttribute('aria-label', `День пройден на ${Math.round(f * 100)} процентов`);
        note.textContent = `день пройден на ${Math.round(f * 100)}%`;
      };
      upd();
      { const to = fg.getAttribute('stroke-dashoffset'); if (motionAllowed()) { fg.setAttribute('stroke-dashoffset', '100'); dot.style.opacity = '0'; setTimeout(() => { fg.setAttribute('stroke-dashoffset', to); dot.style.transition = 'opacity .4s'; dot.style.opacity = '1'; }, 450); } }
      const iv = setInterval(() => { if (root.isConnected) upd(); else clearInterval(iv); }, 60000);
      grid.append(el('section', { class: 'card tile tile--day tile--w2', 'data-t': 'day' }, [el('span', { class: 'tile__kicker', text: myth ? 'Путь Гелиоса' : 'День' }), svg, pct, note]));
    }

    // Кольца дня: сколько задач закрыто из того, что было на сегодня, и средний прогресс целей
    {
      const tk = store.list('tasks');
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
      const doneToday = tk.filter((t) => t.done && t.doneAt >= dayStart.getTime()).length;
      const gg0 = groupTasks(tk, today);
      const left = new Set([...gg0.overdue, ...gg0.today, ...tk.filter((t) => t.main && !t.done)].map((t) => t.id)).size;
      const plan = doneToday + left;
      const gl = store.list('goals').filter((x) => x.progress < 100);
      const avg = gl.length ? Math.round(gl.reduce((a, x) => a + x.progress, 0) / gl.length) : 0;
      const items = [{ label: 'Задачи за день', value: doneToday, p: plan ? doneToday / plan : 0 }];
      if (gl.length) items.push({ label: 'Цели, %', value: avg, p: avg / 100 });
      const body = [rings(items, { label: 'Кольца дня' })];
      if (!plan) body.push(el('p', { class: 'muted tile__meta', text: 'На сегодня задач нет: кольцо заполнится, когда появятся и закроются дела.' }));
      else body.push(el('p', { class: 'muted tile__meta', text: `Закрыто ${doneToday} из ${plan}.` }));
      grid.append(tile('Сегодня', body, null, 'w2'));
    }

    // Фокус: таймер 25 минут живёт в острове сверху
    {
      const go = el('button', { type: 'button', class: 'btn btn--primary btn--s', text: focusActive() ? 'Фокус идёт' : 'Начать фокус' });
      const time = el('p', { class: 'focus__time', 'aria-live': 'off', text: focusText() });
      const sync = (e) => {
        const d = e.detail || {};
        time.textContent = d.text;
        go.disabled = !!d.active;
        go.textContent = d.active ? (d.run ? 'Фокус идёт' : 'Пауза') : 'Начать фокус';
      };
      document.addEventListener('hub:focus', sync);
      const off = setInterval(() => { if (!root.isConnected) { document.removeEventListener('hub:focus', sync); clearInterval(off); } }, 5000);
      go.disabled = focusActive();
      go.addEventListener('click', () => { startFocus(); });
      const ft = tile('Фокус', [time, el('p', { class: 'muted tile__meta', text: '25 минут без отвлечений. Таймер в капсуле сверху, нажми на неё, чтобы раскрыть.' }), go]);
      ft.classList.add('tile--focus');
      grid.append(ft);
    }

    // Погода (хаб сам спрашивает Open-Meteo; нет сети — последний ответ)
    {
      const ws = weatherState(getWeather());
      const body = [];
      if (!ws) body.push(el('p', { class: 'muted', text: 'Данных о погоде пока нет: хаб не достучался до сервиса погоды (Open-Meteo). Нужна сеть; как только она появится, погода подгрузится сама.' }));
      else {
        const sel = ws.cities.find((c) => c.name === load('hub.weatherCity', 'Москва')) || ws.cities[0];
        if (ws.cities.length > 1) {
          const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Город для погоды' }, ws.cities.map((c) => {
            const b = el('button', { type: 'button', text: c.name, 'aria-pressed': String(c.name === sel.name) });
            b.addEventListener('click', () => { save('hub.weatherCity', c.name); sig = ''; render(); });
            return b;
          }));
          body.push(seg);
        }
        body.push(el('p', { text: `${sel.name}: ${cityLine(sel)}` }), el('p', { class: 'muted', text: dayLine(sel) }));
        if (ws.stale) body.push(el('p', { class: 'sched-note sched-note--warn', text: 'Данные устарели: сервис погоды давно не отвечал.' }));
        else if (ws.fetchedAt) body.push(el('p', { class: 'sched-note', text: `Обновлено ${new Date(ws.fetchedAt).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` }));
      }
      if (getAppearance().sky) {
        const sel2 = ws && (ws.cities.find((c) => c.name === load('hub.weatherCity', 'Москва')) || ws.cities[0]);
        const now = new Date();
        const cv = el('canvas', { class: 'sky', role: 'img', 'aria-label': `Небо за окном: сейчас ${bodyPos(now.getHours() + now.getMinutes() / 60).day ? 'день' : 'ночь'}${sel2 && !ws.stale ? `, ${String(sel2.text).toLowerCase()}` : ''}` });
        mountSky(cv, () => { const w2 = weatherState(getWeather()); const c2 = w2 && (w2.cities.find((c) => c.name === load('hub.weatherCity', 'Москва')) || w2.cities[0]); return c2 && !w2.stale ? c2.kind : 'clear'; });
        body.unshift(cv);
      }
      grid.append(tile('Погода', body, null, 'w2'));
    }

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
    grid.append(tile('Расписание', schedBody, el('a', { class: 'tile__link', href: '#/schedule', text: 'Неделя' }), 'w2 h2'));

    // Главные задачи
    const mains = tasks.filter((t) => t.main && !t.done).sort((a, b) => a.created - b.created).slice(0, MAIN_LIMIT);
    if (mains.length) mains.forEach((t, i) => grid.append(mainTile(t, today, i)));
    else grid.append(tile('Главные задачи', el('p', { class: 'muted', text: `Отметь звёздочкой до ${MAIN_LIMIT} главных задач в разделе «Задачи».` }), goTo('#/tasks', { id: 'tasks', label: 'Все задачи' }), 'w2'));

    // Задачи на сегодня и просроченные
    const rest = [...g.overdue, ...g.today].filter((t) => !t.main);
    if (rest.length) {
      const ul = el('ul', { class: 'tasks' }, rest.slice(0, 6).map((t) => taskLine(t, today)));
      const more = rest.length > 6 ? el('p', { class: 'muted', text: `И ещё: ${rest.length - 6}` }) : null;
      const title = g.overdue.some((t) => !t.main) ? `На сегодня · просрочено: ${g.overdue.filter((t) => !t.main).length}` : 'На сегодня';
      grid.append(tile(title, more ? [ul, more] : ul, goTo('#/tasks', { id: 'tasks', label: 'Все задачи' }), 'w2'));
    }

    // Входящие
    const inbox = store.list('inbox').filter((it) => !it.resolved);
    const oldest = inbox.reduce((m, it) => Math.min(m, it.created), Infinity);
    const days = inbox.length ? Math.floor((Date.now() - oldest) / (24 * 3600 * 1000)) : 0;
    const old = inbox.length && days >= INBOX_OLD_DAYS;
    const toInbox = el('a', { class: 'btn btn--s', href: '#/tasks', text: 'Разобрать' });
    toInbox.addEventListener('click', () => openTasksTab('inbox'));
    grid.append(el('section', { class: `card tile tile--inbox${old ? ' tile--warn' : ''}`, 'data-t': 'inbox' }, [
      el('span', { class: 'tile__kicker', text: 'Входящие' }),
      el('p', { class: 'tile__num', text: String(inbox.length), 'data-count': '900' }),
      el('p', { class: old ? 'today-warn tile__meta' : 'muted tile__meta', text: !inbox.length ? 'Всё разобрано' : old ? `Старой записи ${days} дн.` : 'Есть неразобранные' }),
      toInbox,
    ]));

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
      grid.append(tile('Цели', ul, goTo('#/tasks', { id: 'goals', label: 'Все цели' }), 'w2'));
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
      grid.append(tile('Рупор', body, null, 'w2'));
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
      grid.append(tile('Ближайшие платежи', ul, el('a', { class: 'tile__link', href: '#/subscriptions', text: 'Все подписки' }), 'w2'));
    }

    // Ближайшие задачи: то, чего нет выше (не главные, не на сегодня и не просроченные)
    const upcoming = [...g.later, ...g.nodue].filter((t) => !t.main).slice(0, 4);
    if (upcoming.length) {
      const hidden = g.later.filter((t) => !t.main).length + g.nodue.filter((t) => !t.main).length - upcoming.length;
      const items = [el('ul', { class: 'tasks' }, upcoming.map((t) => taskLine(t, today)))];
      if (hidden > 0) items.push(el('p', { class: 'muted', text: `И ещё: ${hidden}` }));
      grid.append(tile('Ближайшие задачи', items, goTo('#/tasks', { id: 'tasks', label: 'Все задачи' }), 'w2'));
    }

    // Итоги недели: ссылка и коротко, сколько сделано; в воскресенье вечером итог сохраняется
    try { ensureSnapshot(store); } catch (_) { /* итог сохранится при следующем открытии */ }
    const ws = liveSummary(store, today);
    const sunEve = new Date().getDay() === 0 && new Date().getHours() >= 18;
    grid.append(tile(sunEve ? 'Итоги недели готовы' : 'Итоги недели', [el('p', { class: ws.hasData ? '' : 'muted', text: ws.hasData ? `Закрыто задач: ${ws.tasks.closed.length}. Опубликовано в «Рупоре»: ${ws.rupor.total}. Событий проектов: ${ws.events.length}.` : 'За эту неделю пока нет данных.' }), ...(ws.hasData && ws.tasks.byDay ? [el('div', { class: 'tile__bars' }, [bars(ws.tasks.byDay, ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], { label: 'Закрыто задач по дням' })])] : [])], el('a', { class: 'tile__link', href: '#/weekly', text: 'Открыть' }), 'w2'));


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
  refreshWeather().then(() => { if (root.isConnected && JSON.stringify(getWeather()) !== wsBefore) { sig = ''; render(); } }).catch(() => {});
  render();
  return root;
}
