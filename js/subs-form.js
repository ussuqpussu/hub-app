// Окна подписок: форма, фильтры, подтверждение удаления. Всё собирается в <dialog class="sheet">.
import { el, ICONS } from './ui.js';
import { todayYmd, isYmd } from './dates.js';
import { PERIOD_LABEL, STATUS_LABEL, CURRENCY_SYMBOL, categoryShares, filterSubs, toRub, NO_CATEGORY } from './subs-calc.js';
import { logoNode, money, rubMoney } from './subs-parts.js';

export function openSheet(build, { tall = true } = {}) {
  const dlg = el('dialog', { class: `sheet${tall ? ' sheet--tall' : ''}` });
  const close = () => {
    if (dlg.open) dlg.close();
  };
  dlg.append(build(close));
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) close();
  });
  document.body.append(dlg);
  if (typeof dlg.showModal === 'function') dlg.showModal();
  else dlg.setAttribute('open', '');
  return close;
}

const head = (title, close) => {
  const x = el('button', { type: 'button', class: 'iconbtn2', 'aria-label': 'Закрыть', html: ICONS.close });
  x.addEventListener('click', close);
  return el('div', { class: 'sheet__head' }, [el('h2', { text: title }), x]);
};

export function confirmSheet({ title, text, action, onConfirm }) {
  openSheet((close) => {
    const ok = el('button', { type: 'button', class: 'btn btn--primary', text: action });
    ok.addEventListener('click', async () => {
      close();
      await onConfirm();
    });
    const no = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Отмена' });
    no.addEventListener('click', close);
    return el('div', { class: 'sheet__form' }, [head(title, close), el('p', { class: 'muted', text }), ok, no]);
  }, { tall: false });
}

// Картинка из файла → квадрат 128×128 data URL (центральная часть).
export async function readLogoFile(file) {
  if (!file.type.startsWith('image/')) throw new Error('Выбери файл с картинкой.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Не получилось открыть картинку.'));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw new Error('Не получилось открыть картинку.');
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 128, 128);
    let out = c.toDataURL('image/webp', 0.9);
    if (out.length > 60000) out = c.toDataURL('image/jpeg', 0.85);
    if (out.length > 60000) throw new Error('Картинка слишком большая даже после сжатия.');
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const REMINDER_CHOICES = [0, 1, 3, 7, 14];

export function subscriptionSheet({ sub, categories, onSave, onDelete }) {
  openSheet((close) => {
    const f = el('form', { class: 'sheet__form sub-form' });
    const inp = (label, attrs) => el('input', { class: 'field', 'aria-label': label, placeholder: label, ...attrs });
    const name = inp('Название', { type: 'text', maxlength: '80', value: sub ? sub.name : '' });
    const price = inp('Сумма', { type: 'text', inputmode: 'decimal', value: sub ? String(sub.price) : '' });
    const cur = el('select', { class: 'field', 'aria-label': 'Валюта' }, Object.entries(CURRENCY_SYMBOL).map(([c, sym]) => el('option', { value: c, text: `${sym} ${c}` })));
    cur.value = sub ? sub.currency : 'RUB';
    const period = el('select', { class: 'field', 'aria-label': 'Периодичность' }, Object.entries(PERIOD_LABEL).map(([v, t]) => el('option', { value: v, text: t })));
    period.value = sub ? sub.period : 'monthly';
    const days = inp('Сколько дней между платежами', { type: 'number', min: '1', step: '1', value: sub && sub.customDays ? String(sub.customDays) : '30' });
    const start = inp('Дата платежа', { type: 'date', value: sub ? sub.startDate : todayYmd() });
    const status = el('select', { class: 'field', 'aria-label': 'Статус' }, Object.entries(STATUS_LABEL).map(([v, t]) => el('option', { value: v, text: t })));
    status.value = sub ? sub.status : 'active';
    const category = inp('Категория', { type: 'text', maxlength: '40', value: sub ? sub.category || '' : '', list: 'sub-cats' });
    const dl = el('datalist', { id: 'sub-cats' }, categories.map((c) => el('option', { value: c })));
    const url = inp('Ссылка на сайт (для значка)', { type: 'url', value: sub ? sub.url || '' : '' });
    const trial = inp('Пробный период до', { type: 'date', value: sub ? sub.trialUntil || '' : '' });
    const notes = inp('Заметка', { type: 'text', maxlength: '200', value: sub ? sub.notes || '' : '' });
    const err = el('p', { class: 'err', role: 'alert' });
    let reminders = new Set(sub ? sub.reminders : [3]);
    let logo = sub ? sub.logo || '' : '';
    const chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Напомнить за' });
    const paintChips = () => chips.replaceChildren(...REMINDER_CHOICES.map((d) => {
      const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(reminders.has(d)), text: d === 0 ? 'в день' : `за ${d} дн.` });
      b.addEventListener('click', () => {
        if (reminders.has(d)) reminders.delete(d);
        else reminders.add(d);
        paintChips();
      });
      return b;
    }));
    paintChips();
    const logoPreview = el('span', { class: 'logo logo--l' });
    const paintLogo = () => logoPreview.replaceChildren(logoNode({ name: name.value || '?', logo, url: url.value }).firstChild || '');
    const logoIn = el('input', { type: 'file', accept: 'image/*', 'aria-label': 'Свой логотип' });
    const logoBtn = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Свой логотип' });
    logoBtn.addEventListener('click', () => logoIn.click());
    const logoClear = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Убрать' });
    logoClear.addEventListener('click', () => { logo = ''; paintLogo(); });
    logoIn.addEventListener('change', async () => {
      try {
        if (logoIn.files[0]) logo = await readLogoFile(logoIn.files[0]);
        err.textContent = '';
      } catch (e) {
        err.textContent = e.message;
      }
      logoIn.value = '';
      paintLogo();
    });
    const syncDays = () => { days.hidden = period.value !== 'custom'; };
    period.addEventListener('change', syncDays);
    syncDays();
    paintLogo();

    const save = el('button', { type: 'submit', class: 'btn btn--primary', text: sub ? 'Сохранить' : 'Добавить подписку' });
    const cancel = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Отмена' });
    cancel.addEventListener('click', close);
    const row = (...k) => el('div', { class: 'task-form__row' }, k);
    f.append(
      head(sub ? 'Подписка' : 'Новая подписка', close),
      name,
      row(price, cur),
      row(period, days),
      el('label', { class: 'stack stack--tight' }, [el('span', { class: 'muted', text: 'Дата платежа (первого или последнего оплаченного)' }), start]),
      row(status, category),
      url,
      el('label', { class: 'stack stack--tight' }, [el('span', { class: 'muted', text: 'Пробный период до (необязательно)' }), trial]),
      notes,
      el('div', { class: 'stack stack--tight' }, [el('span', { class: 'muted', text: 'Напомнить' }), chips]),
      el('div', { class: 'row' }, [logoPreview, el('div', { class: 'task-form__row' }, [logoBtn, logoClear]), logoIn]),
      dl,
      err,
      row(save, cancel),
    );
    if (sub) {
      const hist = [];
      (sub.payments || []).slice(-5).reverse().forEach((p) => hist.push(`Оплачено ${p.date}: ${money(p.amount, p.currency)}`));
      (sub.priceHistory || []).slice(-3).reverse().forEach((p) => hist.push(`Была цена ${money(p.price, p.currency)} до ${p.date}`));
      if (hist.length) f.append(el('div', { class: 'stack stack--tight' }, [el('h3', { text: 'История' }), el('ul', { class: 'hist' }, hist.map((t) => el('li', { text: t })))]));
      const del = el('button', { type: 'button', class: 'btn btn--danger', text: 'Удалить подписку' });
      del.addEventListener('click', () => { close(); onDelete(sub); });
      f.append(del);
    }
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nm = name.value.trim();
      const pr = Number(String(price.value).replace(',', '.').replace(/\s/g, ''));
      if (!nm) return void ((err.textContent = 'Напиши название.'), name.focus());
      if (!Number.isFinite(pr) || pr < 0 || price.value.trim() === '') return void ((err.textContent = 'Укажи сумму числом.'), price.focus());
      if (!isYmd(start.value)) return void ((err.textContent = 'Укажи дату платежа.'), start.focus());
      if (url.value.trim() && !/^https?:\/\//i.test(url.value.trim())) return void ((err.textContent = 'Ссылка должна начинаться с http:// или https://.'), url.focus());
      const fields = {
        name: nm,
        price: pr,
        currency: cur.value,
        period: period.value,
        startDate: start.value,
        status: status.value,
        category: category.value.trim(),
        url: url.value.trim(),
        notes: notes.value.trim(),
        trialUntil: isYmd(trial.value) ? trial.value : '',
        logo,
        reminders: [...reminders].sort((a, b) => a - b),
        customDays: period.value === 'custom' ? Math.max(1, Math.round(Number(days.value) || 1)) : undefined,
      };
      close();
      await onSave(fields, sub);
    });
    return f;
  });
}

export function filtersSheet({ subs, rates, status, category, categories, onApply }) {
  openSheet((close) => {
    let st = status;
    let cat = category;
    const wrap = el('div', { class: 'sheet__form' });
    const amounts = new Map(categoryShares(subs, rates).map((s) => [s.category, s.amount]));
    function paint() {
      const matching = (c) => filterSubs(subs, { status: st, category: c });
      const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Статус' }, [['all', 'Все'], ['active', 'Активные'], ['paused', 'Пауза'], ['cancelled', 'Отменены']].map(([v, t]) => {
        const b = el('button', { type: 'button', 'aria-pressed': String(st === v), text: t });
        b.addEventListener('click', () => { st = v; paint(); });
        return b;
      }));
      const reset = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Сбросить' });
      reset.disabled = st === 'all' && cat === null;
      reset.addEventListener('click', () => { st = 'all'; cat = null; paint(); });
      const done = el('button', { type: 'button', class: 'btn btn--primary', text: 'Готово' });
      done.addEventListener('click', () => { onApply({ status: st, category: cat }); close(); });
      const rowFor = (label, meta, c, list) => {
        const b = el('button', { type: 'button', class: 'fsheet__row', 'aria-pressed': String(cat === c) }, [
          el('span', { class: 'fsheet__logos' }, list.slice(0, 3).map((s) => logoNode(s))),
          el('span', { class: 'task__text' }, [el('span', { class: 'task__title', text: label }), el('span', { class: 'task__meta', text: meta })]),
          cat === c ? el('span', { html: ICONS.check, class: 'iconbtn2' }) : el('span'),
        ]);
        b.addEventListener('click', () => { cat = cat === c ? null : c; paint(); });
        return b;
      };
      const rows = [rowFor('Все категории', `${matching(null).length} в списке`, null, matching(null))];
      categories.forEach((c) => rows.push(rowFor(c, `${matching(c).length} · ${rubMoney(amounts.get(c) || amounts.get(NO_CATEGORY) || 0)} в месяц`, c, matching(c))));
      wrap.replaceChildren(head('Фильтры', close), el('div', {}, [reset]), el('h3', { text: 'Статус' }), seg, el('h3', { text: 'Категория' }), el('div', { class: 'card sublist' }, rows), done);
    }
    paint();
    return wrap;
  });
}
