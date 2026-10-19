// Вкладка «Дневник»: записи по дням, форма с шкалой настроения, чувствами и факторами, статистика и наблюдения.
// Вид временный и простой: оформление и анимацию шкалы подключит сессия дизайна (хуки в css/diary.css).
// Данные: модуль 'diary' в hub-data (шифруется ключом, как остальные), офлайн через общую очередь хранилища.
import { el, ICONS } from './ui.js';
import { load, save } from './storage.js';
import { openSheet, confirmSheet } from './subs-form.js';
import { SCALE, scaleOf, KINDS, feelingsFor, feelingOf, FACTORS, FACTOR_GROUPS, factorLabel } from './diary-data.js';
import {
  ymd, addDays, dayTitle, cleanEntry, dayMap, daysSorted, summary, observations, extras, respond, promptFor, nudge,
  filterEntries, searchDoc, levelName, signed1, plural, WEEKDAYS, validEntry,
} from './diary-calc.js';
import { buildIndex, search } from './search-calc.js';

const UI_KEY = 'hub.diaryUi';
const RECENT_KEY = 'hub.diaryRecent';
const M = 'diary';
const today = () => ymd(new Date());
const nowTime = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
export const dayId = (date) => `day-${date}`;

function recentSet() { return new Set(load(RECENT_KEY, []) || []); }
function remember(lines) { const r = [...(load(RECENT_KEY, []) || []), ...lines].slice(-60); save(RECENT_KEY, r); }

// ---------- ответ хаба после записи ----------
function replySheet(res) {
  openSheet((close) => {
    const ok = el('button', { type: 'button', class: 'btn btn--primary', text: 'Спасибо' });
    ok.addEventListener('click', close);
    const body = [el('h2', { text: res.title }), ...res.lines.map((t) => el('p', { text: t }))];
    if (res.crisis) body.push(el('ul', { class: 'diary-help' }, res.help.map((h) => el('li', { class: 'card' }, [el('span', { class: 'muted', text: h.name }), el('a', { href: `tel:${h.tel}`, text: h.show })]))));
    return el('div', { class: 'sheet__form diary-reply', role: 'status' }, [...body, ok]);
  }, { tall: false });
}

// ---------- форма записи ----------
function entryForm(store, entry, { kind: kind0 = 'day', date: date0 = today() } = {}, close) {
  const isEdit = !!entry;
  const st = {
    kind: entry ? entry.kind : kind0,
    date: entry ? entry.date : date0,
    time: entry ? entry.time || '' : nowTime(),
    mood: entry ? entry.mood : 0,
    feelings: new Set(entry ? entry.feelings || [] : []),
    factors: new Set(entry ? entry.factors || [] : []),
  };
  // Для «весь день» без явной записи подставим существующую запись этой даты (одна на день).
  let prefill = entry ? entry.text || '' : '';
  if (!isEdit && st.kind === 'day') {
    const ex = store.list(M).find((e) => e.id === dayId(st.date));
    if (ex) { Object.assign(st, { mood: ex.mood, feelings: new Set(ex.feelings || []), factors: new Set(ex.factors || []) }); prefill = ex.text || ''; }
  }
  const root = el('form', { class: 'sheet__form stack', 'data-mood': String(st.mood) });
  const kindSeg = el('div', { class: 'seg seg--s', role: 'group', 'aria-label': 'Вид записи' });
  const date = el('input', { class: 'field', type: 'date', 'aria-label': 'Дата', value: st.date, max: today() });
  const time = el('input', { class: 'field', type: 'time', 'aria-label': 'Время', value: st.time });
  const face = el('div', { class: 'diary-face', 'aria-hidden': 'true' });
  const label = el('div', { class: 'diary-scale__label', 'aria-live': 'polite' });
  const range = el('input', { type: 'range', min: '-3', max: '3', step: '1', value: String(st.mood), 'aria-label': 'Настроение', 'aria-valuetext': scaleOf(st.mood).label });
  const scale = el('div', { class: 'diary-scale' }, [face, label, range, el('div', { class: 'diary-scale__ends' }, [el('span', { text: 'Очень неприятно' }), el('span', { text: 'Очень приятно' })])]);
  const feelBox = el('div', { class: 'diary-group' });
  const factBox = el('div', { class: 'diary-group' });
  const text = el('textarea', { class: 'field field--area', rows: '5', maxlength: '20000', 'aria-label': 'Заметка о дне' });
  text.value = prefill;
  const err = el('p', { class: 'err', role: 'alert' });
  const submit = el('button', { type: 'submit', class: 'btn btn--primary', text: isEdit ? 'Сохранить' : 'Записать' });

  const paintKind = () => {
    kindSeg.replaceChildren(...KINDS.map((k) => {
      const b = el('button', { type: 'button', 'aria-pressed': String(st.kind === k.id), text: k.label, title: k.about, ...(isEdit ? { disabled: '' } : {}) });
      b.addEventListener('click', () => { st.kind = k.id; paintKind(); });
      return b;
    }));
    time.hidden = st.kind !== 'moment';
  };
  const chip = (on, txt, toggle) => { const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(on), text: txt }); b.addEventListener('click', () => { toggle(); b.setAttribute('aria-pressed', String(!(b.getAttribute('aria-pressed') === 'true'))); }); return b; };
  const paintFeel = () => {
    const list = feelingsFor(st.mood);
    const shown = new Set(list.map((f) => f.id));
    [...st.feelings].forEach((f) => { if (!shown.has(f)) list.push(feelingOf(f)); });
    feelBox.replaceChildren(el('h3', { text: 'Что чувствовал' }), el('div', { class: 'chips', role: 'group', 'aria-label': 'Чувства' }, list.filter(Boolean).map((f) => chip(st.feelings.has(f.id), f.label, () => (st.feelings.has(f.id) ? st.feelings.delete(f.id) : st.feelings.add(f.id))))));
  };
  const paintFactors = () => {
    factBox.replaceChildren(el('h3', { text: 'Что влияло' }), ...FACTOR_GROUPS.map((g) => el('div', { class: 'chips', role: 'group', 'aria-label': g.label }, FACTORS.filter((f) => f.group === g.id).map((f) => chip(st.factors.has(f.id), f.label, () => (st.factors.has(f.id) ? st.factors.delete(f.id) : st.factors.add(f.id)))))));
  };
  const paintMood = () => {
    const s = scaleOf(st.mood);
    label.textContent = s.label;
    range.setAttribute('aria-valuetext', s.label);
    root.dataset.mood = String(st.mood);
    text.placeholder = promptFor(st.mood, `${st.date}${st.mood}`) || 'Что произошло за день?';
  };
  range.addEventListener('input', () => { const v = Number(range.value); if (v !== st.mood) { st.mood = v; paintMood(); paintFeel(); } });
  paintKind(); paintMood(); paintFeel(); paintFactors();

  const head = el('div', { class: 'task-form__row' }, [date, time]);
  root.append(el('h2', { text: isEdit ? 'Изменить запись' : 'Новая запись' }), kindSeg, head, scale, feelBox, factBox, text, err, submit);
  root.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fields = cleanEntry({ kind: st.kind, date: date.value, time: st.kind === 'moment' ? time.value : '', mood: st.mood, feelings: [...st.feelings], factors: [...st.factors], text: text.value });
    if (fields.date > today()) { err.textContent = 'Дата не может быть в будущем.'; return; }
    submit.disabled = true;
    let saved;
    try {
      if (fields.kind === 'day') {
        // Одна запись «весь день» на дату: стабильный id, чтобы с телефона и компьютера не появилось двух.
        if (entry && entry.kind === 'day' && entry.id !== dayId(fields.date)) await store.remove(M, entry.id);
        saved = await store.upsert(M, dayId(fields.date), fields);
      } else if (isEdit) saved = (await store.update(M, entry.id, fields)) || { ...entry, ...fields, updatedAt: Date.now() };
      else saved = await store.add(M, fields);
    } catch (x) {
      submit.disabled = false;
      err.textContent = x && x.message === 'locked' ? 'Хаб заблокирован: открой его PIN-кодом и попробуй снова.' : 'Не получилось сохранить. Попробуй ещё раз.';
      return;
    }
    if (close) close();
    const res = respond(saved, store.list(M), today(), recentSet());
    remember(res.lines);
    replySheet(res);
  });
  return root;
}
export function openEntryForm(store, entry, opts) {
  openSheet((close) => entryForm(store, entry, opts || {}, close));
}

// ---------- карточки ----------
function entryCard(store, e) {
  const s = scaleOf(e.mood);
  const edit = el('button', { type: 'button', class: 'iconbtn', 'aria-label': `Изменить запись: ${s.label}`, html: ICONS.edit });
  edit.addEventListener('click', () => openEntryForm(store, e));
  const del = el('button', { type: 'button', class: 'iconbtn', 'aria-label': `Удалить запись: ${s.label}`, html: ICONS.close });
  del.addEventListener('click', () => confirmSheet({ title: 'Удалить запись?', text: `${dayTitle(e.date, today())}: ${s.label}`, action: 'Удалить', onConfirm: () => store.remove(M, e.id) }));
  const kind = e.kind === 'day' ? 'Весь день' : `Момент${e.time ? `, ${e.time}` : ''}`;
  const pills = [...(e.feelings || []).map((f) => (feelingOf(f) || { label: f }).label), ...(e.factors || []).map(factorLabel)];
  return el('li', { class: 'card diary-entry', 'data-mood': String(e.mood), 'data-kind': e.kind, 'data-id': e.id }, [
    el('div', { class: 'diary-entry__head' }, [el('span', {}, [el('span', { class: 'diary-entry__mood', text: s.label }), el('span', { class: 'muted', text: ` · ${kind}` })]), el('span', { class: 'task__tools' }, [edit, del])]),
    pills.length ? el('div', { class: 'pillrow' }, pills.map((p) => el('span', { class: 'pill', text: p }))) : '',
    e.text ? el('p', { class: 'diary-entry__text', text: e.text }) : '',
  ]);
}

// ---------- статистика ----------
const pct = (x) => `${Math.round(x * 100)}%`;
const moodNum = (x) => (x == null ? '—' : signed1(x));
function bar(labelText, value, max, right, mood) {
  const w = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  const fill = el('div', { class: 'diary-bar__fill' });
  fill.style.setProperty('--w', `${w}%`);
  const attrs = mood != null ? { 'data-mood': String(Math.round(mood)) } : {};
  return el('div', { class: 'diary-bar', ...attrs }, [el('span', { text: labelText }), el('div', { class: 'diary-bar__track' }, [fill]), el('span', { class: 'muted', text: right })]);
}
function kpi(big, small) { return el('div', { class: 'card diary-kpi' }, [el('b', { text: big }), el('span', { text: small })]); }
function section(title, ...children) { return el('section', { class: 'stack stack--tight' }, [el('h2', { text: title }), ...children]); }

function statsView(entries) {
  const t = today();
  const s = summary(entries, t);
  const obs = observations(s, t);
  if (!s.total) return el('div', { class: 'empty' }, [el('strong', { text: 'Статистики пока нет' }), el('span', { text: 'Она появится после первых записей. Наблюдения про факторы и дни недели появятся через одну-две недели.' })]);
  const out = [];
  out.push(section('Коротко', el('div', { class: 'diary-kpis' }, [
    kpi(moodNum(s.week.avg), `неделя: ${levelName(s.week.avg).toLowerCase()}${s.prevWeek.avg != null && s.week.avg != null ? ` (${signed1(s.week.avg - s.prevWeek.avg)} к прошлой)` : ''}`),
    kpi(moodNum(s.month.avg), `30 дней${s.prevMonth.avg != null && s.month.avg != null ? ` (${signed1(s.month.avg - s.prevMonth.avg)} к прошлым)` : ''}`),
    kpi(String(s.streaks.entries), `${plural(s.streaks.entries, 'день', 'дня', 'дней')} подряд с записью, рекорд ${s.streaks.entriesBest}`),
    kpi(String(s.streaks.good), `хороших подряд, рекорд ${s.streaks.goodBest}`),
    kpi(pct(s.goodShare), 'дней с хорошим настроением'),
    kpi(pct(s.hardShare), 'дней с тяжёлым настроением'),
    kpi(String(s.total), `${plural(s.total, 'запись', 'записи', 'записей')} за ${s.dayCount} ${plural(s.dayCount, 'день', 'дня', 'дней')}`),
    kpi(String(s.words), `${plural(s.words, 'слово', 'слова', 'слов')} написано`),
  ])));
  if (obs.length) out.push(section('Наблюдения', el('ul', { class: 'diary-obs' }, obs.map((o) => el('li', { class: 'card', 'data-kind': o.kind }, [el('span', { text: o.text })])))));
  out.push(section('Последние 30 дней', el('div', { class: 'diary-strip', role: 'img', 'aria-label': 'Настроение по дням за 30 дней' }, s.last30.map((d) => el('span', d.mood == null ? { 'data-empty': '', title: d.date } : { 'data-mood': String(Math.round(d.mood)), title: `${d.date}: ${levelName(d.mood)}` })))));
  const dmax = Math.max(...s.distribution.map((d) => d.n));
  out.push(section('Как распределены дни', el('div', { class: 'diary-bars' }, [...s.distribution].reverse().map((d) => bar(d.label, d.n, dmax, String(d.n), d.v)))));
  const fac = s.factors.slice(0, 24);
  if (fac.length) {
    out.push(section('Что влияет', el('div', { class: 'diary-tablewrap' }, el('table', { class: 'diary-table' }, [
      el('thead', {}, [el('tr', {}, [el('th', { text: 'Фактор' }), el('th', { class: 'num', text: 'Дней' }), el('th', { class: 'num', text: 'Среднее' }), el('th', { class: 'num', text: 'К остальным' }), el('th', { class: 'num', text: 'В плохие' })])]),
      el('tbody', {}, fac.map((f) => el('tr', { 'data-mood': f.avg == null ? '0' : String(Math.round(f.avg)) }, [el('td', { text: f.label }), el('td', { class: 'num', text: String(f.n) }), el('td', { class: 'num', text: moodNum(f.avg) }), el('td', { class: 'num', text: f.delta == null ? '—' : signed1(f.delta) }), el('td', { class: 'num', text: pct(f.inBad) })]))),
    ])), el('p', { class: 'muted', text: 'Выводы в «Наблюдениях» появляются, когда фактор встречался хотя бы 4 дня.' })));
  }
  const wd = s.weekdays.filter((w) => w.n);
  if (wd.length) out.push(section('Дни недели', el('div', { class: 'diary-bars' }, s.weekdays.map((w) => bar(WEEKDAYS[w.i], w.avg == null ? 0 : w.avg + 3, 6, w.n ? `${moodNum(w.avg)} · ${w.n}` : '—', w.avg)))));
  const sl = s.slots.filter((x) => x.n);
  if (sl.length) out.push(section('Время суток (моменты)', el('div', { class: 'diary-bars' }, s.slots.map((x) => bar(x.label, x.avg == null ? 0 : x.avg + 3, 6, x.n ? `${moodNum(x.avg)} · ${x.n}` : '—', x.avg)))));
  if (s.feelings.length) { const fmax = s.feelings[0].n; out.push(section('Чувства', el('div', { class: 'diary-bars' }, s.feelings.slice(0, 12).map((f) => bar(f.label, f.n, fmax, String(f.n), f.band === 'neg' ? -2 : f.band === 'pos' ? 2 : 0))))); }
  if (s.pairs.length) out.push(section('Сочетания факторов', el('div', { class: 'diary-bars' }, s.pairs.slice(0, 5).concat(s.pairs.length > 5 ? s.pairs.slice(-3) : []).map((p) => bar(`${factorLabel(p.a)} + ${factorLabel(p.b)}`, p.avg + 3, 6, `${moodNum(p.avg)} · ${p.n}`, p.avg)))));
  if (s.goodWords.length || s.hardWords.length) out.push(section('Слова из записей', el('p', {}, [el('strong', { text: 'В хорошие дни: ' }), s.goodWords.map((w) => w.w).join(', ') || '—']), el('p', {}, [el('strong', { text: 'В тяжёлые дни: ' }), s.hardWords.map((w) => w.w).join(', ') || '—'])));
  if (s.months.length > 1) { out.push(section('По месяцам', el('div', { class: 'diary-bars' }, s.months.slice(-12).map((m) => bar(m.month.split('-').reverse().join('.'), m.avg + 3, 6, `${moodNum(m.avg)} · ${m.n} дн.`, m.avg))))); }
  const rec = [];
  if (s.best) rec.push(el('li', { text: `Лучший день: ${dayTitle(s.best.date, t)} (${levelName(s.best.mood).toLowerCase()})` }));
  if (s.worst) rec.push(el('li', { text: `Самый тяжёлый: ${dayTitle(s.worst.date, t)} (${levelName(s.worst.mood).toLowerCase()})` }));
  rec.push(el('li', { text: `Самая длинная серия записей: ${s.streaks.entriesBest}, хороших дней: ${s.streaks.goodBest}` }));
  if (s.volatility != null) rec.push(el('li', { text: `Разброс настроения за 2 недели: ${String(s.volatility).replace('.', ',')} (меньше 1 спокойно, больше 1,5 качели)` }));
  if (s.swings) rec.push(el('li', { text: `Резких перепадов между соседними днями: ${s.swings}` }));
  if (s.first) rec.push(el('li', { text: `Дневник ведётся с ${dayTitle(s.first, t).toLowerCase()}` }));
  const ex = extras(s, t);
  if (ex.sinceHard != null) rec.push(el('li', { text: `Дней с последнего тяжёлого: ${ex.sinceHard}` }));
  if (ex.recoveryDays != null) rec.push(el('li', { text: `Средний срок восстановления после тяжёлого дня: ${String(ex.recoveryDays).replace('.', ',')} дн. (случаев: ${ex.recoveries})` }));
  if (ex.longestGap) rec.push(el('li', { text: `Самый долгий перерыв в записях: ${ex.longestGap} ${plural(ex.longestGap, 'день', 'дня', 'дней')}` }));
  ex.memories.forEach((m) => rec.push(el('li', { text: `${m.label}: ${levelName(m.day.mood).toLowerCase()}${m.day.text ? `, «${m.day.text.slice(0, 80)}»` : ''}` })));
  out.push(section('Рекорды и факты', el('ul', {}, rec)));
  return el('div', { class: 'stack' }, out);
}

// ---------- вкладка ----------
export function diaryView({ store, subscribe }) {
  const root = el('section', { class: 'view diary' });
  const ui = { tab: 'list', period: 'all', mood: 'all', factor: '', ...(load(UI_KEY, {}) || {}) };
  let query = '';
  const setUi = (p) => { Object.assign(ui, p); save(UI_KEY, ui); render(); };

  function top(all) {
    const t = today();
    const map = dayMap(all);
    const td = map.get(t);
    const dayBtn = el('button', { type: 'button', class: 'btn btn--primary', text: td && td.dayEntry ? 'Изменить день' : 'Как прошёл день?' });
    dayBtn.addEventListener('click', () => openEntryForm(store, td && td.dayEntry ? td.dayEntry : null, { kind: 'day' }));
    const momBtn = el('button', { type: 'button', class: 'btn', text: 'Что чувствую сейчас' });
    momBtn.addEventListener('click', () => openEntryForm(store, null, { kind: 'moment' }));
    const line = td ? el('p', { 'data-mood': String(Math.round(td.mood)) }, [el('strong', { text: 'Сегодня: ' }), levelName(td.mood).toLowerCase(), td.entries.length > 1 ? el('span', { class: 'muted', text: ` · ${td.entries.length} ${plural(td.entries.length, 'запись', 'записи', 'записей')}` }) : '']) : el('p', { class: 'muted', text: nudge(t) });
    const s = summary(all, t);
    const obs = observations(s, t)[0];
    return el('div', { class: 'card diary-top' }, [line, obs ? el('p', { class: 'muted', text: obs.text }) : '', el('div', { class: 'diary-actions' }, [dayBtn, momBtn])]);
  }

  function listView(all) {
    const t = today();
    let shown = filterEntries(all, { ...ui, factor: ui.factor || null, today: t });
    if (query.trim()) {
      const hit = new Set(search(buildIndex(shown.map((e) => ({ id: e.id, ...searchDoc(e) }))), query).map((d) => d.id));
      shown = shown.filter((e) => hit.has(e.id));
    }
    const q = el('input', { class: 'field', type: 'search', 'aria-label': 'Поиск по дневнику', placeholder: 'Поиск по дневнику', value: query, autocomplete: 'off' });
    q.addEventListener('input', () => { query = q.value; const pos = q.selectionStart; render(); const s2 = root.querySelector('input[type="search"]'); if (s2) { s2.focus(); s2.setSelectionRange(pos, pos); } });
    const seg = (name, opts, key) => el('div', { class: 'seg seg--s', role: 'group', 'aria-label': name }, opts.map(([k, txt]) => { const b = el('button', { type: 'button', 'aria-pressed': String(ui[key] === k), text: txt }); b.addEventListener('click', () => setUi({ [key]: k })); return b; }));
    const used = new Set(all.flatMap((e) => e.factors || []));
    const fsel = el('select', { class: 'field', 'aria-label': 'Фактор' }, [el('option', { value: '', text: 'Все факторы' }), ...FACTORS.filter((f) => used.has(f.id)).map((f) => el('option', { value: f.id, text: f.label, ...(ui.factor === f.id ? { selected: '' } : {}) }))]);
    fsel.addEventListener('change', () => setUi({ factor: fsel.value }));
    const filters = el('div', { class: 'diary-filters' }, [
      seg('Период', [['all', 'Всё'], ['week', 'Неделя'], ['month', 'Месяц'], ['year', 'Год']], 'period'),
      seg('Настроение', [['all', 'Любое'], ['good', 'Хорошее'], ['mid', 'Ровное'], ['bad', 'Тяжёлое']], 'mood'),
      used.size ? fsel : '', q,
    ]);
    if (!shown.length) return [filters, el('div', { class: 'empty' }, [el('strong', { text: 'Ничего не найдено' }), el('span', { text: 'Измени поиск или фильтры.' })])];
    const days = daysSorted(dayMap(shown));
    return [filters, el('ol', { class: 'diary-list' }, days.map((d) => el('li', { class: 'diary-day', 'data-date': d.date, 'data-mood': String(Math.round(d.mood)) }, [
      el('div', { class: 'diary-day__head' }, [el('h2', { text: dayTitle(d.date, t) }), el('span', { class: 'muted', text: levelName(d.mood) })]),
      el('ul', { class: 'stack stack--tight', style: 'list-style:none;margin:0;padding:0' }, d.entries.map((e) => entryCard(store, e))),
    ])))];
  }

  function render() {
    const all = store.list(M).filter(validEntry);
    const tabs = el('div', { class: 'seg', role: 'tablist', 'aria-label': 'Разделы дневника' }, [['list', 'Записи'], ['stats', 'Статистика']].map(([k, txt]) => { const b = el('button', { type: 'button', role: 'tab', 'aria-selected': String(ui.tab === k), 'aria-pressed': String(ui.tab === k), text: txt }); b.addEventListener('click', () => setUi({ tab: k })); return b; }));
    root.replaceChildren(el('div', { class: 'view__head' }, [el('h1', { text: 'Дневник' }), el('p', { class: 'muted', text: 'Как прошёл день, что чувствовал и что на это влияло.' })]), top(all));
    if (!all.length) { root.append(el('div', { class: 'empty' }, [el('strong', { text: 'Пока ни одной записи' }), el('span', { text: 'Начни с кнопки «Как прошёл день?». Чем больше записей, тем точнее статистика и наблюдения.' })])); return; }
    root.append(tabs);
    if (ui.tab === 'stats') root.append(statsView(all));
    else root.append(...listView(all));
  }

  let sig = '';
  const signature = () => store.list(M).map((n) => `${n.id}:${n.updatedAt}`).join(',');
  let dirty = false;
  subscribe(() => { const s = signature(); if (s !== sig && root.isConnected) { if (document.querySelector('dialog[open]')) dirty = true; else { sig = s; render(); } } });
  document.addEventListener('close', () => { if (dirty && root.isConnected) { dirty = false; sig = signature(); setTimeout(render, 0); } }, true);
  sig = signature();
  render();
  return root;
}
