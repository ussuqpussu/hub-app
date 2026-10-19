// Запись в дневник: экран с текстом, снизу выезжает карточка «Как бы ты описал свои ощущения?» с живой фигурой и ползунком;
// «›» открывает страницу с чувствами и тем, что повлияло; «Развернуть» — полный список слов.
// Тема этих экранов всегда тёмная (фигура светится на тёмном), цвет подложки следует за уровнем.
import { el, ICONS } from './ui.js';
import { confirmSheet } from './subs-form.js';
import { scaleOf, KINDS, FEELINGS, feelingsFor, feelingOf, FACTORS, FACTOR_GROUPS } from './diary-data.js';
import { promptFor, ymd } from './diary-calc.js';
import { createBloom, staticBloom, tintVars } from './diary-bloom.js';

const ico = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  back: ico('<path d="M15 5l-7 7 7 7"/>'),
  next: ico('<path d="M9 5l7 7-7 7"/>'),
  close: ico('<path d="M6 6l12 12M18 6L6 18"/>'),
  ok: ico('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  info: ico('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
};
const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const today = () => ymd(new Date());
const nowTime = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const roundBtn = (cls, icon, label) => el('button', { type: 'button', class: `dbtn ${cls}`, 'aria-label': label, html: icon });
const swap = (node, text) => { if (node.textContent === text) return; node.textContent = text; if (reduced()) return; node.classList.remove('is-swap'); void node.offsetWidth; node.classList.add('is-swap'); };

// open: { entry, kind, date, existingDay, onSubmit(fields) -> Promise<string|null> (текст ошибки или null) }
export function openDiaryFlow({ entry, kind = 'day', date: date0 = today(), existingDay = null, onSubmit }) {
  const isEdit = !!entry;
  const src = entry || existingDay;
  const st = {
    kind: entry ? entry.kind : kind,
    date: entry ? entry.date : date0,
    time: entry ? entry.time || '' : nowTime(),
    mood: src ? src.mood : 0,
    feelings: new Set(src ? src.feelings || [] : []),
    factors: new Set(src ? src.factors || [] : []),
    touched: !!src,
  };
  const prefill = src ? src.text || '' : '';
  let startSig = '';

  const bloom = createBloom();
  bloom.set(st.mood, 0);

  // ----- каркас -----
  const root = el('div', { class: 'dflow', role: 'dialog', 'aria-modal': 'true', 'aria-label': isEdit ? 'Изменить запись' : 'Новая запись' });
  const shade = el('div', { class: 'dflow__shade' });
  const main = el('section', { class: 'dflow__main' });
  root.append(shade, main);
  const setTint = (c) => { const v = tintVars(c); Object.entries(v).forEach(([k, x]) => root.style.setProperty(k, x)); };
  bloom.onPaint((v, c) => setTint(c));

  // ----- верхняя панель и поле записи -----
  const backBtn = roundBtn('dbtn--glass', I.back, 'Закрыть без сохранения');
  const saveBtn = roundBtn('dbtn--accent', I.ok, isEdit ? 'Сохранить запись' : 'Записать');
  const kindSeg = el('div', { class: 'dseg', role: 'group', 'aria-label': 'Вид записи' });
  const bar = el('header', { class: 'dflow__bar' }, [backBtn, kindSeg, saveBtn]);
  const dateIn = el('input', { class: 'dfield', type: 'date', 'aria-label': 'Дата', value: st.date, max: today() });
  const time = el('input', { class: 'dfield', type: 'time', 'aria-label': 'Время', value: st.time });
  const meta = el('div', { class: 'dflow__meta' }, [dateIn, time]);
  const miniFig = el('span', { class: 'dchip__fig' });
  const chipLabel = el('span', { class: 'dchip__t' });
  const chipSub = el('span', { class: 'dchip__s' });
  const moodChip = el('button', { type: 'button', class: 'dchip' }, [miniFig, el('span', { class: 'dchip__txt' }, [chipLabel, chipSub]), el('span', { class: 'dchip__go', html: I.next })]);
  const text = el('textarea', { class: 'dtext', rows: '6', maxlength: '20000', 'aria-label': 'Заметка' });
  text.value = prefill;
  const err = el('p', { class: 'dflow__err', role: 'alert' });
  main.append(bar, meta, moodChip, text, err);

  // ----- карточка настроения -----
  const card = el('section', { class: 'dcard', 'aria-label': 'Настроение', hidden: '' });
  const cardClose = roundBtn('dbtn--glass', I.close, 'Закрыть карточку');
  const cardNext = roundBtn('dbtn--glass', I.next, 'Дальше: чувства и влияние');
  const grab = el('div', { class: 'dgrab', 'aria-hidden': 'true' });
  const q = el('h2', { class: 'dcard__q' });
  const figBox = el('div', { class: 'dcard__fig' });
  const label = el('div', { class: 'dcard__label', 'aria-live': 'polite' });
  const thumb = el('div', { class: 'dslider__thumb' });
  const slider = el('div', { class: 'dslider', role: 'slider', tabindex: '0', 'aria-label': 'Настроение', 'aria-valuemin': '-3', 'aria-valuemax': '3' }, [thumb]);
  const ends = el('div', { class: 'dcard__ends' }, [el('span', { text: 'Очень неприятно' }), el('span', { text: 'Очень приятно' })]);
  card.append(grab, cardClose, cardNext, q, figBox, label, slider, ends);
  figBox.append(bloom.el);
  main.append(card);

  // ----- страница «чувства и влияние» -----
  const page = el('section', { class: 'dpage', 'aria-label': 'Чувства и влияние', hidden: '' });
  const pgBack = roundBtn('dbtn--glass', I.back, 'Назад к карточке');
  const pgOk = roundBtn('dbtn--glass dbtn--light', I.ok, 'Готово');
  const pgFig = el('div', { class: 'dpage__fig' });
  const pgLabel = el('h2', { class: 'dpage__label' });
  const pgBody = el('div', { class: 'dpage__body' });
  page.append(el('div', { class: 'dgrab', 'aria-hidden': 'true' }), pgBack, pgOk, pgFig, pgLabel, pgBody);
  main.append(page);

  // ----- полный список слов -----
  const list = el('section', { class: 'dlist', 'aria-label': 'Все чувства', hidden: '' });
  const lsClose = roundBtn('dbtn--glass', I.close, 'Закрыть список');
  const lsOk = roundBtn('dbtn--accent', I.ok, 'Готово');
  const lsTitle = el('h2', { class: 'dlist__q', text: 'Каким словом можно описать это чувство?' });
  const lsBox = el('ul', { class: 'dlist__box' });
  list.append(lsClose, lsOk, lsTitle, lsBox);
  main.append(list);

  // ----- рендер частей -----
  const paintKind = () => {
    kindSeg.replaceChildren(...KINDS.map((k) => {
      const b = el('button', { type: 'button', text: k.label, title: k.about, 'aria-pressed': String(st.kind === k.id), ...(isEdit ? { disabled: '' } : {}) });
      b.addEventListener('click', () => { st.kind = k.id; paintKind(); paintQuestion(); });
      return b;
    }));
    time.hidden = st.kind !== 'moment';
  };
  const paintQuestion = () => { q.textContent = st.kind === 'moment' ? 'Как бы ты сейчас описал свои ощущения?' : 'Как бы ты описал этот день?'; };
  const feelNames = () => [...st.feelings].map((id) => (feelingOf(id) || { label: id }).label);
  const paintChip = () => {
    const sc = scaleOf(st.mood);
    const names = feelNames();
    swap(chipLabel, sc.label);
    miniFig.replaceChildren(staticBloom(st.mood));
    chipSub.textContent = names.length ? `${names.slice(0, 2).join(', ')}${names.length > 2 ? ` и ещё ${names.length - 2}` : ''}` : 'Нажми, чтобы выбрать чувства';
    text.placeholder = promptFor(st.mood, `${st.date}${st.mood}`) || 'Что произошло?';
  };
  const paintLabel = () => { const sc = scaleOf(st.mood); swap(label, sc.label); swap(pgLabel, sc.label); slider.setAttribute('aria-valuenow', String(st.mood)); slider.setAttribute('aria-valuetext', sc.label); };

  const chip = (on, txt, toggle) => {
    const b = el('button', { type: 'button', class: 'dpill', 'aria-pressed': String(on), text: txt });
    b.addEventListener('click', () => { toggle(); b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); paintChip(); });
    return b;
  };
  const paintPage = () => {
    const own = st.mood <= -1 ? 'neg' : st.mood >= 1 ? 'pos' : 'mid';
    const rel = [...feelingsFor(st.mood)].sort((a, b) => (b.band === own) - (a.band === own));
    const first = rel.slice(0, 5);
    const shown = [...first];
    [...st.feelings].forEach((id) => { const f = feelingOf(id); if (f && !shown.some((x) => x.id === id)) shown.push(f); });
    const more = el('button', { type: 'button', class: 'dmore', 'aria-label': 'Показать все слова', html: `<span>Развернуть</span>${I.next}` });
    more.addEventListener('click', openList);
    const hint = el('span', { class: 'dinfo', title: 'Можно выбрать несколько слов', html: I.info });
    pgBody.replaceChildren(
      el('div', { class: 'dsec' }, [el('div', { class: 'dsec__h' }, [el('h3', { text: 'Каким словом можно описать это чувство?' }), hint]), el('div', { class: 'dpills', role: 'group', 'aria-label': 'Чувства' }, shown.map((f) => chip(st.feelings.has(f.id), f.label, () => (st.feelings.has(f.id) ? st.feelings.delete(f.id) : st.feelings.add(f.id))))), more]),
      el('div', { class: 'dsec' }, [el('div', { class: 'dsec__h' }, [el('h3', { text: 'Что оказывает наибольшее влияние?' }), el('span', { class: 'dinfo', title: 'Можно выбрать несколько', html: I.info })]),
        ...FACTOR_GROUPS.map((g) => el('div', { class: 'dpills dpills--g', role: 'group', 'aria-label': g.label }, FACTORS.filter((f) => f.group === g.id).map((f) => chip(st.factors.has(f.id), f.label, () => (st.factors.has(f.id) ? st.factors.delete(f.id) : st.factors.add(f.id))))))]),
    );
  };
  const paintList = () => {
    const all = [...FEELINGS].sort((a, b) => a.label.localeCompare(b.label, 'ru'));
    lsBox.replaceChildren(...all.map((f) => {
      const on = st.feelings.has(f.id);
      const li = el('li', {}, [el('button', { type: 'button', class: 'drow', role: 'checkbox', 'aria-checked': String(on) }, [el('span', { class: 'drow__c' }), el('span', { class: 'drow__t', text: f.label })])]);
      li.firstChild.addEventListener('click', () => {
        if (st.feelings.has(f.id)) st.feelings.delete(f.id); else st.feelings.add(f.id);
        li.firstChild.setAttribute('aria-checked', String(st.feelings.has(f.id)));
      });
      return li;
    }));
  };

  // ----- ползунок -----
  const fromX = (clientX) => {
    const r = slider.getBoundingClientRect();
    const th = thumb.offsetWidth || 36;
    const p = Math.max(0, Math.min(1, (clientX - r.left - th / 2) / Math.max(1, r.width - th)));
    return p * 6 - 3;
  };
  const place = (v) => { slider.style.setProperty('--p', String((v + 3) / 6)); };
  bloom.onPaint((v) => place(v));
  let dragging = false;
  const commit = (v) => { const r = Math.round(v); if (r !== st.mood) { st.mood = r; paintLabel(); paintChip(); if (!page.hidden) { paintPage(); } } };
  slider.addEventListener('pointerdown', (e) => {
    dragging = true; st.touched = true; slider.setPointerCapture(e.pointerId); slider.classList.add('is-drag');
    const v = fromX(e.clientX); bloom.set(v, 0); commit(v); e.preventDefault();
  });
  slider.addEventListener('pointermove', (e) => { if (!dragging) return; const v = fromX(e.clientX); bloom.set(v, 0); commit(v); });
  const end = () => { if (!dragging) return; dragging = false; slider.classList.remove('is-drag'); bloom.set(st.mood, 260); };
  slider.addEventListener('pointerup', end);
  slider.addEventListener('pointercancel', end);
  slider.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (e.key === 'Home') st.mood = -3; else if (e.key === 'End') st.mood = 3; else if (d) st.mood = Math.max(-3, Math.min(3, st.mood + d)); else return;
    e.preventDefault(); st.touched = true; bloom.set(st.mood, 320); paintLabel(); paintChip(); if (!page.hidden) paintPage();
  });

  // ----- показ и скрытие слоёв -----
  const show = (node) => { node.hidden = false; void node.offsetWidth; node.classList.add('is-in'); };
  const hide = (node, then) => {
    node.classList.remove('is-in');
    const done = () => { node.hidden = true; if (then) then(); };
    if (reduced()) done(); else setTimeout(done, 360);
  };
  const openCard = () => { moodChip.hidden = true; show(card); setTimeout(() => slider.focus({ preventScroll: true }), 80); };
  const closeCard = () => { hide(card, () => { moodChip.hidden = false; paintChip(); text.focus({ preventScroll: true }); }); };
  const openPage = () => {
    paintPage(); pgFig.append(bloom.el); paintLabel(); show(page);
  };
  const closePage = () => { hide(page, () => { figBox.append(bloom.el); }); };
  function openList() { paintList(); show(list); }
  const closeList = () => { hide(list, () => { if (!page.hidden) paintPage(); }); };

  moodChip.addEventListener('click', openCard);
  cardClose.addEventListener('click', closeCard);
  cardNext.addEventListener('click', () => { st.touched = true; openPage(); });
  pgBack.addEventListener('click', closePage);
  pgOk.addEventListener('click', () => { closePage(); hide(card, () => { moodChip.hidden = false; paintChip(); text.focus({ preventScroll: true }); }); });
  lsClose.addEventListener('click', closeList);
  lsOk.addEventListener('click', closeList);

  // смахнуть карточку вниз
  let sy = null;
  const drag = (node, onClose) => {
    node.addEventListener('pointerdown', (e) => { if (e.target.closest('.dslider, button, .dpill, .dpage__body')) return; sy = e.clientY; node.setPointerCapture(e.pointerId); });
    node.addEventListener('pointerup', (e) => { if (sy != null && e.clientY - sy > 70) onClose(); sy = null; });
    node.addEventListener('pointercancel', () => { sy = null; });
  };
  drag(card, closeCard); drag(page, closePage);

  // ----- закрытие и сохранение -----
  let gone = false;
  const sig = () => JSON.stringify([st.kind, st.date, st.time, st.mood, [...st.feelings].sort(), [...st.factors].sort(), text.value]);
  const finish = () => {
    if (gone) return; gone = true; bloom.destroy();
    document.removeEventListener('keydown', onKey, true);
    document.documentElement.classList.remove('dflow-open');
    root.classList.remove('is-in');
    if (reduced()) root.remove(); else setTimeout(() => root.remove(), 300);
  };
  const tryClose = () => {
    if (sig() === startSig) { finish(); return; }
    confirmSheet({ title: 'Закрыть без сохранения?', text: 'Написанное в этой записи пропадёт.', action: 'Закрыть', onConfirm: finish });
  };
  backBtn.addEventListener('click', tryClose);
  shade.addEventListener('click', tryClose);
  const onKey = (e) => {
    if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
    e.preventDefault(); e.stopPropagation();
    if (!list.hidden) closeList(); else if (!page.hidden) closePage(); else if (!card.hidden) closeCard(); else tryClose();
  };
  document.addEventListener('keydown', onKey, true);

  saveBtn.addEventListener('click', async () => {
    err.textContent = '';
    if (!st.touched) { err.textContent = 'Сначала выбери настроение.'; if (card.hidden) openCard(); else { card.classList.remove('is-shake'); void card.offsetWidth; card.classList.add('is-shake'); } return; }
    st.date = dateIn.value || st.date; st.time = time.value || st.time;
    if (st.date > today()) { err.textContent = 'Дата не может быть в будущем.'; return; }
    saveBtn.disabled = true;
    const bad = await onSubmit({ kind: st.kind, date: st.date, time: st.kind === 'moment' ? st.time : '', mood: st.mood, feelings: [...st.feelings], factors: [...st.factors], text: text.value });
    if (bad) { saveBtn.disabled = false; err.textContent = bad; return; }
    finish();
  });
  dateIn.addEventListener('change', () => { st.date = dateIn.value || st.date; paintChip(); });

  // ----- запуск -----
  paintKind(); paintQuestion(); paintLabel(); paintChip(); place(st.mood);
  startSig = sig();
  document.body.append(root);
  document.documentElement.classList.add('dflow-open');
  void root.offsetWidth; root.classList.add('is-in');
  if (isEdit || src) { moodChip.hidden = false; text.focus({ preventScroll: true }); } else { moodChip.hidden = true; setTimeout(openCard, reduced() ? 0 : 280); }
  bloom.start();
  return finish;
}

