// Вкладка «Подписки»: Главная, Статистика, Календарь. Устройство и поведение перенесены из старого приложения.
import { el, ICONS } from './ui.js';
import { todayYmd, fromYmd, addDays, monthName, ymd } from './dates.js';
import { load, save } from './storage.js';
import { ensureRates } from './rates.js';
import { lamp, nextDue, daysUntil, markPaid, editFields, withInitialPaidThrough, monthlyTotalRub, categoryShares, spent, tips, categories, sortSubs, filterSubs, monthEvents, monthTotalRub, buildIcs, convertBackup, toBackup, normalizeSub, toRub, CURRENCY_SYMBOL } from './subs-calc.js';
import { money, rubMoney, periodText, dateText, dueWords, dueText, lampNode, logoNode } from './subs-parts.js';
import { subscriptionSheet, filtersSheet, confirmSheet } from './subs-form.js';

const KEY_TAB = 'hub.subsTab';
const KEY_HIDE = 'hub.subsHide';
const REVEAL = 80; // px, совпадает с --reveal
const SEARCH_FROM = 6;

function download(name, type, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const seg = (options, value, onChange, label, small) =>
  el('div', { class: `seg${small ? ' seg--s' : ''}`, role: 'group', 'aria-label': label }, options.map(([v, t]) => {
    const b = el('button', { type: 'button', 'aria-pressed': String(value === v), text: t });
    b.addEventListener('click', () => onChange(v));
    return b;
  }));

export function subsView({ store, subscribe }) {
  const root = el('section', { class: 'view' }, [
    el('div', { class: 'view__head' }, [el('h1', { text: 'Подписки' }), el('p', { class: 'muted', text: 'Регулярные платежи и ближайшие списания.' })]),
  ]);
  let tab = load(KEY_TAB, 'home');
  if (!['home', 'stats', 'calendar'].includes(tab)) tab = 'home';
  let hidden = !!load(KEY_HIDE, false);
  let query = '';
  let filters = { status: 'all', category: null };
  let calMode = 'month';
  const t0 = fromYmd(todayYmd());
  let cal = { y: t0.getFullYear(), m: t0.getMonth(), selected: todayYmd() };
  let rates = ensureRates((r) => {
    rates = r;
    if (root.isConnected) render();
  });
  const live = el('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });
  const body = el('div', { class: 'stack' });
  const tabsEl = el('div', {});
  const all = () => store.list('subs').map(normalizeSub).sort((a, b) => a.created - b.created);
  const hide = (text) => (hidden ? '•••• ₽' : text);

  const save1 = async (fields, prev) => {
    const today = todayYmd();
    if (prev) await store.update('subs', prev.id, editFields(prev, fields, today));
    else await store.add('subs', { ...withInitialPaidThrough({ ...fields, payments: [] }, today) });
  };
  const askDelete = (s) => confirmSheet({ title: 'Удалить подписку?', text: `«${s.name}» исчезнет из списка и календаря. Это нельзя отменить.`, action: 'Удалить', onConfirm: () => store.remove('subs', s.id) });
  const openEdit = (s) => subscriptionSheet({ sub: s, categories: categories(all()), onSave: save1, onDelete: askDelete });
  const openAdd = () => subscriptionSheet({ sub: null, categories: categories(all()), onSave: save1, onDelete: askDelete });
  const pay = (s) => store.update('subs', s.id, markPaid(s, todayYmd()));
  const exportOne = (s) => download(`${s.name.replace(/[^\p{L}\p{N}]+/gu, '-')}.ics`, 'text/calendar', buildIcs([s]));

  // ---------- Главная ----------
  function summaryCard(subs, today) {
    const active = subs.filter((s) => s.status === 'active');
    const total = monthlyTotalRub(subs, rates);
    const overdue = subs.filter((s) => lamp(s, today) === 'red').length;
    const eye = el('button', { type: 'button', class: 'iconbtn2', 'aria-label': 'Скрыть суммы', 'aria-pressed': String(hidden), html: hidden ? ICONS.eyeoff : ICONS.eye });
    eye.addEventListener('click', () => { hidden = !hidden; save(KEY_HIDE, hidden); render(); });
    const card = el('section', { class: 'card sum', 'aria-labelledby': 'sum-title' }, [el('div', { class: 'sum__head' }, [el('h2', { id: 'sum-title', text: 'Траты в месяц' }), eye])]);
    if (active.length) {
      card.append(el('p', { class: 'sum__total', text: hide(rubMoney(total.amount)) }), el('p', { class: 'sum__year', text: `${hide(rubMoney(total.amount * 12))} в год` }));
    } else card.append(el('p', { class: 'muted', text: 'Нет активных подписок' }));
    const pills = el('div', { class: 'pills' }, [el('span', { class: 'pill', text: `${active.length} активных` })]);
    if (overdue) pills.append(el('span', { class: 'pill pill--bad' }, [lampNode('red'), `Просрочено: ${overdue}`]));
    card.append(pills);
    const foreign = [...new Set(active.filter((s) => s.currency !== 'RUB').map((s) => CURRENCY_SYMBOL[s.currency]))].join(' и ');
    if (total.missing.length) card.append(el('p', { class: 'sched-note', text: `Без ${total.missing.map((c) => CURRENCY_SYMBOL[c]).join(' и ')}: курс загрузится, когда появится интернет.` }));
    else if (total.converted && rates) card.append(el('p', { class: 'sched-note', text: `${foreign} пересчитаны по курсу ЦБ на ${dateText(rates.date, today)}.` }));
    return card;
  }

  function nextCard(subs, today) {
    const next = sortSubs(subs.filter((s) => s.status === 'active'), today)[0];
    if (!next) return null;
    const d = nextDue(next, today);
    const dt = dueWords(daysUntil(d, today));
    const b = el('button', { type: 'button', class: 'next', 'aria-label': `Ближайший платёж: ${next.name}, ${hidden ? 'сумма скрыта' : money(next.price, next.currency)}, ${dt}, ${dateText(d, today)}. Открыть` }, [
      el('span', { class: 'next__head' }, [el('span', { text: 'Ближайший платёж' }), el('span', { text: dateText(d, today) })]),
      el('span', { class: 'next__body' }, [
        logoNode(next),
        el('span', {}, [el('span', { class: 'next__name', text: next.name }), el('span', { class: 'next__due' }, [lampNode(lamp(next, today)), el('span', { text: dt })])]),
        el('span', { class: 'next__amount', text: hidden ? '••••' : money(next.price, next.currency) }),
      ]),
    ]);
    b.addEventListener('click', () => openEdit(next));
    return b;
  }

  function row(s, today) {
    const l = lamp(s, today);
    const active = s.status === 'active';
    const d = nextDue(s, today);
    const dt = active ? dueWords(daysUntil(d, today)) : s.status === 'paused' ? 'на паузе' : 'отменена';
    const needs = l === 'yellow' || l === 'red';
    const trial = s.trialUntil && daysUntil(s.trialUntil, today) >= 0;
    const li = el('li', { class: 'subrow', 'data-lamp': l, 'data-id': s.id });
    const content = el('div', { class: 'subrow__content' });
    const price = hidden ? '••••' : money(s.price, s.currency);
    const meta = [active ? dateText(d, today) : '', trial ? 'пробный период' : '', s.category].filter(Boolean).join(' · ');
    const main = el('button', { type: 'button', class: 'subrow__main', 'aria-label': [s.name, s.category, `${price}, ${periodText(s).toLowerCase()}`, active ? `${dt}, ${dateText(d, today)}` : dt, 'изменить'].filter(Boolean).join('. ') }, [
      logoNode(s),
      el('span', { class: 'subrow__text' }, [
        el('span', { class: 'subrow__name', text: s.name }),
        el('span', { class: 'subrow__due' }, [lampNode(l), el('span', { text: dt })]),
        meta ? el('span', { class: 'subrow__meta', text: meta }) : '',
      ]),
      el('span', { class: 'subrow__money' }, [el('span', { class: 'subrow__price', text: price }), el('span', { class: 'subrow__period', text: periodText(s).toLowerCase() })]),
    ]);
    main.addEventListener('click', () => openEdit(s));
    const exp = el('button', { type: 'button', class: 'iconbtn2', 'aria-label': `Добавить «${s.name}» в календарь`, html: ICONS.calplus });
    exp.addEventListener('click', () => exportOne(s));
    content.append(main, exp);
    if (needs) {
      const b = el('button', { type: 'button', class: 'btn btn--s', text: 'Оплачено' });
      b.addEventListener('click', () => pay(s));
      content.append(el('div', { class: 'subrow__pay' }, [b]));
    }
    const delAct = el('button', { type: 'button', class: 'subrow__act subrow__act--del', 'aria-label': `Удалить «${s.name}»`, tabindex: '-1', html: ICONS.trash });
    delAct.addEventListener('click', () => { reset(); askDelete(s); });
    const payAct = needs ? el('button', { type: 'button', class: 'subrow__act subrow__act--pay', 'aria-label': `Отметить «${s.name}» оплаченной`, tabindex: '-1', html: ICONS.check }) : null;
    if (payAct) payAct.addEventListener('click', () => { reset(); pay(s); });

    // Свайп: влево удаление, вправо отметка оплаты (только если платёж пора оплатить)
    let drag = null;
    let revealed = null;
    let suppress = false;
    function reset() {
      revealed = null;
      delete content.dataset.revealed;
      content.style.transform = '';
    }
    content.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      suppress = false;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, base: revealed === 'delete' ? -REVEAL : revealed === 'paid' ? REVEAL : 0, active: false, off: 0 };
    });
    content.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.active) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
        if (Math.abs(dx) < 10) return;
        drag.active = true;
        content.setPointerCapture(e.pointerId);
        content.dataset.dragging = '';
      }
      let off = drag.base + dx;
      if (off > 0 && !needs) off = Math.min(off, 20);
      drag.off = off;
      content.dataset.direction = off < 0 ? 'delete' : 'paid';
      content.style.transform = `translateX(${off}px)`;
    });
    const end = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const d0 = drag;
      drag = null;
      if (!d0.active) return;
      suppress = true;
      delete content.dataset.direction;
      delete content.dataset.dragging;
      content.style.transform = '';
      const dist = Math.abs(d0.off);
      const action = d0.off < 0 ? 'delete' : 'paid';
      if (action === 'paid' && !needs) return reset();
      if (e.type === 'pointerup' && dist > content.offsetWidth * 0.6) {
        reset();
        if (action === 'delete') askDelete(s);
        else pay(s);
        return;
      }
      if (dist > REVEAL / 2) {
        revealed = action;
        content.dataset.revealed = action;
        (action === 'delete' ? delAct : payAct).tabIndex = 0;
      } else reset();
    };
    content.addEventListener('pointerup', end);
    content.addEventListener('pointercancel', end);
    content.addEventListener('click', (e) => {
      if (suppress) { e.preventDefault(); e.stopPropagation(); suppress = false; }
      else if (revealed) { e.preventDefault(); e.stopPropagation(); reset(); }
    }, true);
    if (payAct) li.append(payAct);
    li.append(delAct, content);
    return li;
  }

  function dataPanel() {
    const box = el('div', { class: 'settings-group' }, [el('h2', { text: 'Календарь и копия' })]);
    const ics = el('button', { type: 'button', class: 'btn', text: 'Скачать .ics (календарь)' });
    ics.addEventListener('click', () => {
      download('subscriptions.ics', 'text/calendar', buildIcs(all()));
      live.textContent = 'Календарь на 12 месяцев сохранён. Открой файл на телефоне, чтобы добавить платежи.';
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
    box.append(el('div', { class: 'row row--start' }, [ics, exp, el('label', { class: 'btn' }, [el('span', { text: 'Импорт из копии' }), input])]), live);
    return box;
  }

  function homePanel() {
    const today = todayYmd();
    const subs = all();
    const wrap = el('div', { class: 'stack' });
    wrap.append(summaryCard(subs, today));
    const nc = nextCard(subs, today);
    if (nc) wrap.append(nc);
    if (subs.length >= SEARCH_FROM) {
      const input = el('input', { class: 'field', type: 'search', 'aria-label': 'Поиск по подпискам', placeholder: 'Поиск', autocomplete: 'off', value: query });
      input.addEventListener('input', () => {
        query = input.value;
        const pos = input.selectionStart;
        render();
        const again = root.querySelector('input[type="search"]');
        if (again) { again.focus(); again.setSelectionRange(pos, pos); }
      });
      wrap.append(el('div', { class: 'searchf' }, [el('span', { html: ICONS.search }), input]));
    }
    const shown = sortSubs(filterSubs(subs, { ...filters, query }), today);
    const fActive = filters.status !== 'all' || filters.category !== null;
    const fb = el('button', { type: 'button', class: 'iconbtn2', 'aria-label': 'Фильтры списка', 'data-active': String(fActive), html: ICONS.sliders });
    fb.addEventListener('click', () => filtersSheet({ subs, rates, status: filters.status, category: filters.category, categories: categories(subs), onApply: (f) => { filters = f; render(); } }));
    const add = el('button', { type: 'button', class: 'btn btn--primary btn--s', text: 'Добавить' });
    add.addEventListener('click', openAdd);
    wrap.append(el('div', { class: 'listhead' }, [el('h2', { text: 'Подписки' }), el('span', { class: 'listhead__count', text: String(shown.length) }), fb, add]));
    if (!subs.length) wrap.append(el('div', { class: 'empty' }, [el('strong', { text: 'Подписок пока нет' }), el('span', { text: 'Добавь первую или загрузи копию из старого приложения (внизу страницы).' })]));
    else if (!shown.length) wrap.append(el('div', { class: 'empty' }, [el('strong', { text: 'Ничего не найдено' }), el('span', { text: 'Измени поиск или сбрось фильтры.' })]));
    else wrap.append(el('ul', { class: 'card sublist' }, shown.map((s) => row(s, today))));
    wrap.append(dataPanel());
    return wrap;
  }

  // ---------- Статистика ----------
  function statsPanel() {
    const today = todayYmd();
    const subs = all();
    const wrap = el('div', { class: 'stack' });
    if (!subs.length) return el('div', { class: 'empty' }, [el('strong', { text: 'Статистики пока нет' }), el('span', { text: 'Добавь подписки на вкладке «Главная».' })]);
    const d = fromYmd(today);
    const monthStart = ymd(new Date(d.getFullYear(), d.getMonth(), 1));
    const yearStart = `${d.getFullYear()}-01-01`;
    wrap.append(el('section', { class: 'card stack' }, [
      el('h3', { text: 'Оплачено' }),
      el('div', { class: 'stat2' }, [
        el('div', {}, [el('span', { class: 'muted', text: 'В этом месяце' }), el('strong', { text: hide(rubMoney(spent(subs, rates, monthStart, today))) })]),
        el('div', {}, [el('span', { class: 'muted', text: 'С начала года' }), el('strong', { text: hide(rubMoney(spent(subs, rates, yearStart, today))) })]),
      ]),
      el('p', { class: 'sched-note', text: 'Считается по нажатиям «Оплачено», поэтому учитывает только отмеченные платежи.' }),
    ]));
    const shares = categoryShares(subs, rates);
    if (shares.length) {
      const ul = el('ul', { class: 'legend' });
      shares.forEach((s, i) => {
        const color = `var(--chart-${(i % 7) + 1})`;
        ul.append(el('li', {}, [
          el('span', { class: 'legend__dot', style: `background:${color}` }),
          el('span', { text: s.category }),
          el('span', { text: `${hide(rubMoney(s.amount))} · ${Math.round(s.share * 100)}%` }),
          el('span', { class: 'legend__bar' }, [el('i', { style: `width:${Math.round(s.share * 100)}%;background:${color}` })]),
        ]));
      });
      wrap.append(el('section', { class: 'card stack' }, [el('h3', { text: 'На что уходит в месяц' }), ul]));
    }
    const tp = tips(subs, today, rates);
    if (tp.length) wrap.append(el('section', { class: 'stack' }, [el('h3', { text: 'Стоит проверить' }), ...tp.map((t) => el('div', { class: 'card tipcard', 'data-tone': t.tone, text: t.text }))]));
    return wrap;
  }

  // ---------- Календарь ----------
  function eventRow(e, date, today) {
    const s = e.sub;
    const l = lamp(s, today);
    const kids = [logoNode(s), el('span', { class: 'task__text' }, [el('span', { class: 'task__title', text: s.name }), el('span', { class: 'task__meta', text: e.type === 'trial' ? 'заканчивается пробный период' : e.paid ? 'оплачено' : dueWords(daysUntil(date, today)) })])];
    const right = el('span', { class: 'subrow__money' }, [el('span', { class: 'subrow__price', text: hidden ? '••••' : money(e.amount, e.currency) })]);
    if (e.type === 'payment' && !e.paid && date <= today) {
      const b = el('button', { type: 'button', class: 'btn btn--s', text: 'Оплачено' });
      b.addEventListener('click', () => pay(s));
      right.append(b);
    } else right.append(lampNode(e.type === 'trial' ? 'yellow' : l));
    const li = el('li', { class: 'evrow' }, [...kids, right]);
    return li;
  }

  function calendarPanel() {
    const today = todayYmd();
    const subs = all();
    const wrap = el('div', { class: 'stack' });
    wrap.append(seg([['month', 'Месяц'], ['list', 'Список']], calMode, (v) => { calMode = v; render(); }, 'Вид календаря', true));
    if (calMode === 'list') {
      const days = [];
      let cursor = new Date(t0.getFullYear(), t0.getMonth(), 1);
      const last = addDays(today, 60);
      const evs = {};
      while (ymd(cursor) <= last) {
        Object.entries(monthEvents(subs, cursor.getFullYear(), cursor.getMonth())).forEach(([d, e]) => { if (d >= today && d <= last) evs[d] = e; });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
      Object.keys(evs).sort().forEach((d) => days.push([d, evs[d]]));
      const tot = monthTotalRub(evs, rates);
      wrap.append(el('p', { class: 'muted', text: tot.payments ? `${tot.payments} платежей · ${hide(rubMoney(tot.amount))} за 60 дней` : 'В ближайшие 60 дней платежей нет' }));
      days.forEach(([d, es]) => wrap.append(el('section', { class: 'stack stack--tight' }, [el('h3', { class: 'dayt', text: dateText(d, today) }), el('ul', { class: 'card sublist' }, es.map((e) => eventRow(e, d, today)))])));
      return wrap;
    }
    const events = monthEvents(subs, cal.y, cal.m);
    const prev = el('button', { type: 'button', class: 'iconbtn2', 'aria-label': 'Предыдущий месяц', html: ICONS.left });
    const next = el('button', { type: 'button', class: 'iconbtn2', 'aria-label': 'Следующий месяц', html: ICONS.right });
    const go = (n) => {
      const x = new Date(cal.y, cal.m + n, 1);
      cal = { y: x.getFullYear(), m: x.getMonth(), selected: x.getFullYear() === t0.getFullYear() && x.getMonth() === t0.getMonth() ? today : ymd(x) };
      render();
    };
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    wrap.append(el('div', { class: 'week-nav' }, [prev, el('h2', { class: 'week-nav__title', text: `${monthName(cal.m)} ${cal.y}` }), next]));
    const grid = el('div', { class: 'cal', role: 'grid' });
    ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].forEach((d) => grid.append(el('span', { class: 'cal__wd', text: d })));
    const offset = (new Date(cal.y, cal.m, 1).getDay() + 6) % 7;
    for (let i = 0; i < offset; i += 1) grid.append(el('span', { class: 'cal__cell cal__cell--empty' }));
    const dim = new Date(cal.y, cal.m + 1, 0).getDate();
    for (let n = 1; n <= dim; n += 1) {
      const date = ymd(new Date(cal.y, cal.m, n));
      const es = events[date] || [];
      const dots = el('span', { class: 'cal__dots' }, es.slice(0, 3).map((e) => el('span', { class: `cal__dot${e.type === 'trial' ? ' cal__dot--trial' : ''}`, 'data-lamp': lamp(e.sub, today) })));
      if (es.length > 3) dots.append(el('span', { class: 'cal__more', text: `+${es.length - 3}` }));
      const b = el('button', { type: 'button', class: `cal__cell${date === today ? ' cal__cell--today' : ''}`, 'aria-pressed': String(cal.selected === date), 'data-date': date, 'aria-label': `${dateText(date, today)}${es.length ? `, событий: ${es.length}` : ''}` }, [el('span', { text: String(n) }), dots]);
      b.addEventListener('click', () => { cal.selected = date; render(); });
      grid.append(b);
    }
    let sx = null;
    grid.addEventListener('pointerdown', (e) => { sx = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
    grid.addEventListener('pointerup', (e) => {
      if (!sx || sx.id !== e.pointerId) return;
      const dx = e.clientX - sx.x;
      const dy = e.clientY - sx.y;
      sx = null;
      if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    });
    wrap.append(grid);
    const tot = monthTotalRub(events, rates);
    wrap.append(el('p', { class: 'muted', text: tot.payments ? `${tot.payments} платежей · ${hide(rubMoney(tot.amount))} за месяц` : 'В этом месяце платежей нет' }));
    const sel = events[cal.selected] || [];
    wrap.append(el('section', { class: 'stack stack--tight' }, [el('h3', { class: 'dayt', text: dateText(cal.selected, today) }), sel.length ? el('ul', { class: 'card sublist' }, sel.map((e) => eventRow(e, cal.selected, today))) : el('p', { class: 'muted', text: 'В этот день платежей нет.' })]));
    return wrap;
  }

  function render() {
    tabsEl.replaceChildren(seg([['home', 'Главная'], ['stats', 'Статистика'], ['calendar', 'Календарь']], tab, (v) => { tab = v; save(KEY_TAB, v); render(); }, 'Раздел'));
    body.replaceChildren(tab === 'stats' ? statsPanel() : tab === 'calendar' ? calendarPanel() : homePanel());
  }

  let sig = '';
  let dirty = false;
  const signature = () => store.list('subs').map((s) => `${s.id}:${s.updatedAt}`).join(',');
  subscribe(() => {
    const n = signature();
    if (n !== sig) { sig = n; if (!document.querySelector('dialog[open]')) render(); else dirty = true; }
  });
  document.addEventListener('close', () => { if (dirty && root.isConnected) { dirty = false; setTimeout(render, 0); } }, true);
  sig = signature();
  render();
  root.append(tabsEl, body);
  return root;
}
