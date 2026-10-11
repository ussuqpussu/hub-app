// Вкладка «Подписки»: список, статистика, календарь списаний, выгрузка .ics, копия и импорт.
import { el } from './ui.js';
import { todayYmd, dueLabel, fromYmd, addDays, monthName, isYmd } from './dates.js';
import { load, save } from './storage.js';
import { nextDue, daysUntil, dueLevel, markPaid, monthlyCost, totalsByCurrency, byCategory, monthGrid, buildIcs, convertBackup, toBackup, PERIOD_LABEL } from './subs-calc.js';

const KEY_TAB = 'hub.subsTab';
const CURRENCIES = ['RUB', 'USD', 'EUR'];

export function money(amount, currency) {
  const n = Number(amount) || 0;
  const frac = Math.abs(n - Math.round(n)) < 0.005 ? 0 : 2;
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency, minimumFractionDigits: frac, maximumFractionDigits: frac }).format(n);
  } catch (_) {
    return `${n.toFixed(frac)} ${currency}`;
  }
}
export const moneyMap = (o) => Object.entries(o).map(([c, v]) => money(v, c)).join(' · ') || '0';

export function periodText(s) {
  if (s.period === 'custom') return `каждые ${s.customDays} дн.`;
  return PERIOD_LABEL[s.period] || s.period;
}

function logoNode(s) {
  const box = el('span', { class: 'sub__logo', 'aria-hidden': 'true' });
  const letter = () => box.replaceChildren(el('span', { text: (s.name || '?').trim().slice(0, 1).toUpperCase() }));
  let src = s.logo || '';
  if (!src && s.url) {
    try {
      src = `${new URL(s.url).origin}/favicon.ico`;
    } catch (_) {
      src = '';
    }
  }
  if (!src) {
    letter();
    return box;
  }
  const img = el('img', { src, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
  img.addEventListener('error', letter);
  box.append(img);
  return box;
}

export function dueText(s, today) {
  const d = nextDue(s, today);
  if (!d) return 'дата не задана';
  const n = daysUntil(d, today);
  const when = n < 0 ? `просрочено на ${-n} дн.` : n === 0 ? 'сегодня' : n === 1 ? 'завтра' : `через ${n} дн.`;
  return `${dueLabel(d, today)} · ${when}`;
}

export function subsView({ store, subscribe }) {
  const root = el('section', { class: 'view' }, [
    el('div', { class: 'view__head' }, [el('h1', { text: 'Подписки' }), el('p', { class: 'muted', text: 'Регулярные платежи и ближайшие списания.' })]),
  ]);
  let tab = load(KEY_TAB, 'list');
  if (!['list', 'stats', 'calendar'].includes(tab)) tab = 'list';
  let editing = null; // id, 'new' или null
  let confirmDel = null;
  let otherOpen = false;
  let msg = '';
  const now = new Date();
  let cal = { y: now.getFullYear(), m: now.getMonth() };

  const tabs = el('div', { class: 'chips', role: 'group', 'aria-label': 'Раздел' });
  const body = el('div', { class: 'stack' });
  const live = el('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });
  const all = () => store.list('subs').sort((a, b) => a.created - b.created);

  function setTab(t) {
    tab = t;
    save(KEY_TAB, t);
    render();
  }

  function form(s) {
    const f = el('form', { class: 'task-form card sub-form' });
    const inp = (label, attrs) => el('input', { class: 'field', 'aria-label': label, placeholder: label, ...attrs });
    const name = inp('Название', { type: 'text', maxlength: '80', value: s ? s.name : '' });
    const price = inp('Сумма', { type: 'text', inputmode: 'decimal', value: s ? String(s.price) : '' });
    const cur = el('select', { class: 'field', 'aria-label': 'Валюта' }, CURRENCIES.map((c) => el('option', { value: c, text: c })));
    cur.value = s ? s.currency : 'RUB';
    const period = el('select', { class: 'field', 'aria-label': 'Периодичность' }, [['monthly', 'Каждый месяц'], ['yearly', 'Каждый год'], ['weekly', 'Каждую неделю'], ['custom', 'Каждые N дней']].map(([v, t]) => el('option', { value: v, text: t })));
    period.value = s ? s.period : 'monthly';
    const days = inp('Сколько дней между списаниями', { type: 'number', min: '1', step: '1', value: s && s.customDays ? String(s.customDays) : '30' });
    const start = inp('Дата первого списания', { type: 'date', value: s ? s.startDate : todayYmd() });
    const category = inp('Категория', { type: 'text', maxlength: '40', value: s ? s.category || '' : '', list: 'sub-cats' });
    const dl = el('datalist', { id: 'sub-cats' }, [...new Set(all().map((x) => x.category).filter(Boolean))].map((c) => el('option', { value: c })));
    const url = inp('Ссылка на сайт (для значка)', { type: 'url', value: s ? s.url || '' : '' });
    const remind = inp('Напомнить за (дней)', { type: 'number', min: '0', step: '1', value: s && s.reminders && s.reminders.length ? String(s.reminders[0]) : '3' });
    const notes = inp('Заметка', { type: 'text', maxlength: '200', value: s ? s.notes || '' : '' });
    const err = el('p', { class: 'err', role: 'alert' });
    const syncDays = () => {
      days.hidden = period.value !== 'custom';
    };
    period.addEventListener('change', syncDays);
    syncDays();
    const cancel = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Отмена' });
    cancel.addEventListener('click', () => {
      editing = null;
      render();
    });
    f.append(
      name,
      el('div', { class: 'task-form__row' }, [price, cur]),
      el('div', { class: 'task-form__row' }, [period, days]),
      el('label', { class: 'stack stack--tight' }, [el('span', { class: 'muted', text: 'Дата первого списания' }), start]),
      el('div', { class: 'task-form__row' }, [category, remind]),
      url,
      notes,
      dl,
      err,
      el('div', { class: 'task-form__row' }, [el('button', { type: 'submit', class: 'btn btn--primary', text: s ? 'Сохранить' : 'Добавить подписку' }), cancel]),
    );
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nm = name.value.trim();
      const pr = Number(String(price.value).replace(',', '.'));
      if (!nm) return void ((err.textContent = 'Напиши название.'), name.focus());
      if (!Number.isFinite(pr) || pr < 0 || price.value === '') return void ((err.textContent = 'Укажи сумму числом.'), price.focus());
      if (!isYmd(start.value)) return void ((err.textContent = 'Укажи дату первого списания.'), start.focus());
      const fields = {
        name: nm,
        price: pr,
        currency: cur.value,
        period: period.value,
        startDate: start.value,
        category: category.value.trim(),
        reminders: [Math.max(0, Math.round(Number(remind.value) || 0))],
        url: url.value.trim(),
        notes: notes.value.trim(),
      };
      if (fields.url && !/^https?:\/\//i.test(fields.url)) return void ((err.textContent = 'Ссылка должна начинаться с http:// или https://.'), url.focus());
      if (period.value === 'custom') fields.customDays = Math.max(1, Math.round(Number(days.value) || 1));
      else fields.customDays = undefined;
      if (s) {
        // поменялась дата или период: отметки оплаты старого графика не переносим
        const scheduleChanged = s.startDate !== fields.startDate || s.period !== fields.period || s.customDays !== fields.customDays;
        if (scheduleChanged) fields.paidThrough = undefined;
        if (s.price !== pr || s.currency !== fields.currency) fields.priceHistory = [...(s.priceHistory || []), { date: todayYmd(), currency: s.currency, price: s.price }];
        await store.update('subs', s.id, fields);
      } else await store.add('subs', { ...fields, status: 'active', payments: [] });
      editing = null;
      render();
    });
    return f;
  }

  function subCard(s, today) {
    const level = s.status === 'active' ? dueLevel(s, today) : 'later';
    const card = el('li', { class: `card sub sub--${level}`, 'data-id': s.id, 'data-level': level });
    const title = el('div', { class: 'sub__main' }, [
      el('strong', { class: 'sub__name', text: s.name }),
      el('span', { class: 'sub__price', text: `${money(s.price, s.currency)} · ${periodText(s)}` }),
      el('span', { class: `sub__due${level === 'overdue' || level === 'soon' ? ' today-warn' : ''}`, text: s.status === 'active' ? dueText(s, today) : s.status === 'paused' ? 'на паузе' : 'в архиве' }),
    ]);
    if (s.category) title.append(el('span', { class: 'muted', text: s.category }));
    if (s.notes) title.append(el('span', { class: 'muted', text: s.notes }));
    const btn = (label, fn, cls = 'btn btn--ghost btn--s') => {
      const b = el('button', { type: 'button', class: cls, text: label });
      b.addEventListener('click', fn);
      return b;
    };
    const tools = el('div', { class: 'sub__tools' });
    if (s.status === 'active') tools.append(btn('Оплачено', async () => { await store.update('subs', s.id, markPaid(s, today)); }, 'btn btn--s'));
    tools.append(btn('Изменить', () => { editing = s.id; render(); }));
    if (s.status === 'active') tools.append(btn('Пауза', () => store.update('subs', s.id, { status: 'paused' })));
    else tools.append(btn('Вернуть', () => store.update('subs', s.id, { status: 'active' })));
    if (s.status !== 'archived') tools.append(btn('В архив', () => store.update('subs', s.id, { status: 'archived' })));
    if (confirmDel === s.id) {
      tools.append(btn('Точно удалить', async () => { confirmDel = null; await store.remove('subs', s.id); }, 'btn btn--s btn--danger'));
      tools.append(btn('Нет', () => { confirmDel = null; render(); }));
    } else tools.append(btn('Удалить', () => { confirmDel = s.id; render(); }));
    card.append(logoNode(s), title, tools);
    return card;
  }

  function listPanel() {
    const today = todayYmd();
    const subs = all();
    const wrap = el('div', { class: 'stack' });
    const add = el('button', { type: 'button', class: 'btn btn--primary', text: 'Добавить подписку' });
    add.addEventListener('click', () => { editing = 'new'; render(); });
    const active = subs.filter((s) => s.status === 'active').sort((a, b) => (nextDue(a, today) || '9').localeCompare(nextDue(b, today) || '9'));
    const other = subs.filter((s) => s.status !== 'active');
    const month = totalsByCurrency(active);
    const year = totalsByCurrency(active, (s) => monthlyCost(s) * 12);
    wrap.append(el('div', { class: 'card sub-sum' }, [
      el('div', {}, [el('span', { class: 'muted', text: 'В месяц (в среднем)' }), el('strong', { class: 'sub-sum__v', text: moneyMap(month) })]),
      el('div', {}, [el('span', { class: 'muted', text: 'В год' }), el('strong', { class: 'sub-sum__v', text: moneyMap(year) })]),
    ]));
    if (active.length && Object.keys(month).length > 1) wrap.append(el('p', { class: 'sched-note', text: 'Валюты не пересчитываются: курсов в хабе нет.' }));
    wrap.append(editing === 'new' ? form(null) : add);
    if (!subs.length) {
      wrap.append(el('div', { class: 'empty' }, [el('strong', { text: 'Подписок пока нет' }), el('span', { text: 'Добавь первую или загрузи копию из старого приложения (внизу страницы).' })]));
    }
    const ul = el('ul', { class: 'subs' });
    active.forEach((s) => ul.append(s.id === editing ? el('li', {}, [form(s)]) : subCard(s, today)));
    if (active.length) wrap.append(ul);
    if (other.length) {
      const ul2 = el('ul', { class: 'subs' });
      other.forEach((s) => ul2.append(s.id === editing ? el('li', {}, [form(s)]) : subCard(s, today)));
      const det = el('details', { class: 'done-box' }, [el('summary', { text: `Пауза и архив: ${other.length}` }), ul2]);
      if (otherOpen) det.open = true;
      det.addEventListener('toggle', () => { otherOpen = det.open; });
      wrap.append(det);
    }
    wrap.append(dataPanel());
    return wrap;
  }

  function download(name, type, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function dataPanel() {
    const box = el('div', { class: 'settings-group' }, [el('h2', { text: 'Календарь и копия' })]);
    const ics = el('button', { type: 'button', class: 'btn', text: 'Скачать .ics (календарь)' });
    ics.addEventListener('click', () => {
      download('subscriptions.ics', 'text/calendar', buildIcs(all()));
      msg = 'Календарь на 12 месяцев сохранён. Открой файл на телефоне, чтобы добавить списания.';
      live.textContent = msg;
    });
    const exp = el('button', { type: 'button', class: 'btn', text: 'Скачать копию (JSON)' });
    exp.addEventListener('click', () => {
      download(`podpiski-backup-${todayYmd()}.json`, 'application/json', JSON.stringify(toBackup(all()), null, 2));
      live.textContent = 'Копия содержит суммы в открытом виде: храни её осторожно.';
    });
    const input = el('input', { class: 'sr-only', type: 'file', accept: 'application/json,.json', 'aria-label': 'Импорт подписок из копии' });
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const { items, skipped } = convertBackup(JSON.parse(await file.text()));
        for (const it of items) {
          const { id, ...fields } = it;
          await store.upsert('subs', id || crypto.randomUUID(), fields);
        }
        live.textContent = `Импортировано подписок: ${items.length}.${skipped.length ? ` Пропущено: ${skipped.join('; ')}.` : ''}`;
      } catch (ex) {
        live.textContent = ex instanceof SyntaxError ? 'Файл повреждён: это не JSON.' : ex.message || 'Не удалось прочитать файл.';
      }
      input.value = '';
    });
    box.append(el('div', { class: 'row' }, [ics, exp, el('label', { class: 'btn' }, [el('span', { text: 'Импорт из копии' }), input])]), live);
    return box;
  }

  function statsPanel() {
    const today = todayYmd();
    const active = all().filter((s) => s.status === 'active');
    const wrap = el('div', { class: 'stack' });
    if (!active.length) return el('div', { class: 'empty' }, [el('strong', { text: 'Статистики пока нет' }), el('span', { text: 'Добавь подписки на вкладке «Список».' })]);
    wrap.append(el('div', { class: 'card sub-sum' }, [
      el('div', {}, [el('span', { class: 'muted', text: 'В месяц' }), el('strong', { class: 'sub-sum__v', text: moneyMap(totalsByCurrency(active)) })]),
      el('div', {}, [el('span', { class: 'muted', text: 'В год' }), el('strong', { class: 'sub-sum__v', text: moneyMap(totalsByCurrency(active, (s) => monthlyCost(s) * 12)) })]),
    ]));
    const cats = byCategory(active);
    const rows = [];
    Object.entries(cats).forEach(([c, m]) => Object.entries(m).forEach(([cur, v]) => rows.push({ c, cur, v })));
    const sumBy = {};
    rows.forEach((r) => { sumBy[r.cur] = (sumBy[r.cur] || 0) + r.v; });
    const catList = el('ul', { class: 'tasks' });
    rows.sort((a, b) => b.v - a.v).forEach((r) => catList.append(el('li', { class: 'goal goal--compact' }, [
      el('span', { class: 'task__text' }, [el('span', { class: 'task__title', text: r.c }), el('span', { class: 'task__meta', text: `${money(r.v, r.cur)} в месяц` })]),
      el('span', { class: 'goal__pct', text: `${Math.round((r.v / sumBy[r.cur]) * 100)}%` }),
      el('progress', { class: 'bar', max: '100', value: String(Math.round((r.v / sumBy[r.cur]) * 100)), 'aria-label': `Доля: ${r.c}` }),
    ])));
    wrap.append(el('section', { class: 'card tile' }, [el('h2', { text: 'По категориям' }), catList]));
    const top = [...active].sort((a, b) => monthlyCost(b) - monthlyCost(a)).slice(0, 3);
    wrap.append(el('section', { class: 'card tile' }, [el('h2', { text: 'Самые дорогие (в пересчёте на месяц)' }), el('ul', { class: 'tasks' }, top.map((s) => el('li', {}, [el('span', { text: `${s.name}: ${money(monthlyCost(s), s.currency)} в месяц` })])))]));
    const mrows = [];
    const d0 = fromYmd(today);
    for (let i = 0; i < 12; i += 1) {
      const y = d0.getFullYear() + Math.floor((d0.getMonth() + i) / 12);
      const m = (d0.getMonth() + i) % 12;
      const g = monthGrid(active, y, m, today);
      const sums = {};
      Object.values(g.days).flat().forEach((c) => { sums[c.currency] = (sums[c.currency] || 0) + c.amount; });
      mrows.push(el('li', {}, [el('span', { text: `${monthName(m)} ${y}: ` }), el('strong', { text: moneyMap(sums) })]));
    }
    wrap.append(el('section', { class: 'card tile' }, [el('h2', { text: 'Ближайшие 12 месяцев' }), el('p', { class: 'sched-note', text: 'Списания по расчёту от даты и периодичности.' }), el('ul', { class: 'tasks' }, mrows)]));
    return wrap;
  }

  function calendarPanel() {
    const today = todayYmd();
    const subs = all();
    const g = monthGrid(subs, cal.y, cal.m, today);
    const wrap = el('div', { class: 'stack' });
    const prev = el('button', { type: 'button', class: 'btn btn--ghost btn--s', 'aria-label': 'Предыдущий месяц', text: '‹' });
    const next = el('button', { type: 'button', class: 'btn btn--ghost btn--s', 'aria-label': 'Следующий месяц', text: '›' });
    const step = (d) => { const x = new Date(cal.y, cal.m + d, 1); cal = { y: x.getFullYear(), m: x.getMonth() }; render(); };
    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    wrap.append(el('div', { class: 'week-nav' }, [prev, el('h2', { class: 'week-nav__title', text: `${monthName(cal.m)} ${cal.y}` }), next]));
    const grid = el('div', { class: 'cal', role: 'grid' });
    ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].forEach((d) => grid.append(el('span', { class: 'cal__wd', text: d })));
    const first = new Date(cal.y, cal.m, 1);
    const offset = (first.getDay() + 6) % 7;
    for (let i = 0; i < offset; i += 1) grid.append(el('span', { class: 'cal__cell cal__cell--empty' }));
    const dim = new Date(cal.y, cal.m + 1, 0).getDate();
    for (let d = 1; d <= dim; d += 1) {
      const date = `${cal.y}-${String(cal.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const items = g.days[date] || [];
      grid.append(el('span', { class: `cal__cell${items.length ? ' cal__cell--has' : ''}${date === today ? ' cal__cell--today' : ''}`, 'data-date': date }, [
        el('span', { class: 'cal__d', text: String(d) }),
        items.length ? el('span', { class: 'cal__n', text: String(items.length) }) : '',
      ]));
    }
    wrap.append(grid);
    const dates = Object.keys(g.days).sort();
    if (!dates.length) wrap.append(el('p', { class: 'muted', text: 'В этом месяце списаний нет.' }));
    else {
      const ul = el('ul', { class: 'tasks' });
      dates.forEach((d) => g.days[d].forEach((c) => ul.append(el('li', { class: 'task' }, [el('span'), el('span', { class: 'task__text' }, [el('span', { class: 'task__title', text: c.name }), el('span', { class: 'task__meta', text: `${dueLabel(d, today)} · ${money(c.amount, c.currency)}${c.paid ? ' · оплачено' : ''}` })]), el('span')]))));
      wrap.append(ul);
    }
    return wrap;
  }

  function render() {
    tabs.replaceChildren(...[['list', 'Список'], ['stats', 'Статистика'], ['calendar', 'Календарь']].map(([id, label]) => {
      const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(tab === id), text: label });
      b.addEventListener('click', () => setTab(id));
      return b;
    }));
    body.replaceChildren(tab === 'stats' ? statsPanel() : tab === 'calendar' ? calendarPanel() : listPanel());
  }

  let sig = '';
  const signature = () => store.list('subs').map((s) => `${s.id}:${s.updatedAt}`).join(',');
  subscribe(() => {
    const n = signature();
    if (n !== sig && !editing) {
      sig = n;
      render();
    }
  });
  sig = signature();
  render();
  root.append(tabs, body);
  return root;
}
