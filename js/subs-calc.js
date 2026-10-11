// Подписки: расчёт дат списаний, итоги, выгрузка .ics, разбор резервной копии старого приложения.
// Чистые функции без доступа к браузеру: проверяются в Node.
import { ymd, fromYmd, addDays, todayYmd, isYmd } from './dates.js';

export const PERIOD_LABEL = {
  weekly: 'Каждую неделю',
  monthly: 'Каждый месяц',
  quarterly: 'Раз в квартал',
  biannual: 'Раз в полгода',
  yearly: 'Каждый год',
  custom: 'Свой интервал',
};
export const STATUS_LABEL = { active: 'Активна', paused: 'Пауза', cancelled: 'Отменена' };
export const CURRENCY_SYMBOL = { RUB: '₽', USD: '$', EUR: '€', KZT: '₸' };
export const SOON_DAYS = 3;
export const NO_CATEGORY = 'Без категории';
const MONTHS_PER = { monthly: 1, quarterly: 3, biannual: 6, yearly: 12 };
const p2 = (n) => String(n).padStart(2, '0');
const daysPer = (sub) => (sub.period === 'weekly' ? 7 : Math.max(1, Math.round(Number(sub.customDays) || 1)));

// Запись из хранилища → вид, с которым работает экран (старые статусы приводятся к текущим).
export function normalizeSub(s) {
  const status = ['active', 'paused', 'cancelled'].includes(s.status) ? s.status : 'cancelled';
  return { ...s, status, reminders: Array.isArray(s.reminders) && s.reminders.length ? s.reminders : [3] };
}

// Дата k-го платежа от первого (startDate). Месяцы и годы считаются от исходной даты: 31-е не «уползает».
export function occurrence(sub, k) {
  const months = MONTHS_PER[sub.period];
  if (!months) return addDays(sub.startDate, daysPer(sub) * k);
  const start = fromYmd(sub.startDate);
  const total = start.getMonth() + months * k;
  const y = start.getFullYear() + Math.floor(total / 12);
  const m = total % 12;
  const last = new Date(y, m + 1, 0).getDate();
  return ymd(new Date(y, m, Math.min(start.getDate(), last)));
}

// Номер первого платежа, который приходится на date или позже.
export function indexOnOrAfter(sub, date) {
  if (sub.startDate >= date) return 0;
  const start = fromYmd(sub.startDate);
  const d = fromYmd(date);
  const months = MONTHS_PER[sub.period];
  let k = months
    ? Math.max(0, Math.floor(((d.getFullYear() - start.getFullYear()) * 12 + d.getMonth() - start.getMonth()) / months) - 1)
    : Math.max(0, Math.floor((d - start) / 86400000 / daysPer(sub)) - 1);
  while (occurrence(sub, k) < date) k += 1;
  return k;
}

// Платёж, который ещё не отмечен оплаченным. Может быть в прошлом: тогда подписка просрочена.
export function nextDue(sub, today = todayYmd()) {
  if (!isYmd(sub.startDate)) return null;
  if (sub.paidThrough && isYmd(sub.paidThrough)) return occurrence(sub, indexOnOrAfter(sub, addDays(sub.paidThrough, 1)));
  return sub.startDate;
}

// Прошлые платежи считаются оплаченными: при создании и смене расписания.
export function withInitialPaidThrough(sub, today = todayYmd()) {
  const idx = indexOnOrAfter(sub, today);
  const next = { ...sub };
  if (idx > 0) next.paidThrough = occurrence(sub, idx - 1);
  else delete next.paidThrough;
  return next;
}

export function daysUntil(date, today = todayYmd()) {
  return Math.round((fromYmd(date) - fromYmd(today)) / 86400000);
}

// Лампочка срока: green, yellow (в пределах 3 дней), red (просрочено), off (не активна).
export function lamp(sub, today = todayYmd()) {
  if (sub.status !== 'active') return 'off';
  const d = nextDue(sub, today);
  if (!d) return 'green';
  const n = daysUntil(d, today);
  return n < 0 ? 'red' : n <= SOON_DAYS ? 'yellow' : 'green';
}
export const dueLevel = lamp;

// Оплата: запись в историю и сдвиг paidThrough на ближайший платёж.
export function markPaid(sub, today = todayYmd()) {
  const due = nextDue(sub, today);
  if (!due) return null;
  const payments = [...(sub.payments || []), { date: due, currency: sub.currency, amount: sub.price }].slice(-120);
  return { payments, paidThrough: due };
}

// Правка: если поменялось расписание или подписку вернули в активные, прошлое снова считается оплаченным.
export function editFields(prev, fields, today = todayYmd()) {
  const scheduleChanged = prev.startDate !== fields.startDate || prev.period !== fields.period || (fields.period === 'custom' && prev.customDays !== fields.customDays);
  const reactivated = prev.status !== 'active' && fields.status === 'active';
  const out = { ...fields };
  if (scheduleChanged || reactivated) out.paidThrough = withInitialPaidThrough({ ...prev, ...fields }, today).paidThrough;
  if (prev.price !== fields.price || prev.currency !== fields.currency) {
    out.priceHistory = [...(prev.priceHistory || []), { date: today, price: prev.price, currency: prev.currency }].slice(-20);
  }
  return out;
}

// Стоимость в месяц (среднее).
export function monthlyCost(sub) {
  const p = Number(sub.price) || 0;
  if (sub.period === 'weekly') return (p * 52) / 12;
  if (sub.period === 'quarterly') return p / 3;
  if (sub.period === 'biannual') return p / 6;
  if (sub.period === 'yearly') return p / 12;
  if (sub.period === 'custom') return (p * 365.25) / 12 / daysPer(sub);
  return p;
}

// Курсы ЦБ: зеркало cbr-xml-daily.ru. Номинал учитывается (тенге за 100).
export const RATES_URL = 'https://www.cbr-xml-daily.ru/daily_json.js';
const FOREIGN = ['USD', 'EUR', 'KZT'];
const positive = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
export function parseCbrRates(json, fetchedAt) {
  if (!json || typeof json.Date !== 'string' || !json.Valute) return null;
  const rub = {};
  for (const c of FOREIGN) {
    const e = json.Valute[c];
    if (!e || !positive(e.Value) || !positive(e.Nominal)) return null;
    rub[c] = e.Value / e.Nominal;
  }
  return { date: json.Date.slice(0, 10), fetchedAt, rub };
}
export function normalizeRates(v) {
  if (!v || typeof v.date !== 'string' || !positive(v.fetchedAt) || !v.rub) return null;
  for (const c of FOREIGN) if (!positive(v.rub[c])) return null;
  return { date: v.date, fetchedAt: v.fetchedAt, rub: { USD: v.rub.USD, EUR: v.rub.EUR, KZT: v.rub.KZT } };
}
// null: валюта не рублёвая, а курса ещё нет
export function toRub(amount, currency, rates) {
  if (currency === 'RUB') return amount;
  return rates && rates.rub[currency] ? amount * rates.rub[currency] : null;
}
export function monthlyTotalRub(subs, rates) {
  let amount = 0;
  let converted = false;
  const missing = new Set();
  subs.filter((s) => s.status === 'active').forEach((s) => {
    const m = monthlyCost(s);
    if (s.currency === 'RUB') amount += m;
    else {
      converted = true;
      const r = toRub(m, s.currency, rates);
      if (r === null) missing.add(s.currency);
      else amount += r;
    }
  });
  return { amount, converted, missing: FOREIGN.filter((c) => missing.has(c)) };
}

// Доли категорий: траты в месяц в рублях, от крупной к мелкой.
export function categoryShares(subs, rates) {
  const by = new Map();
  let total = 0;
  subs.filter((s) => s.status === 'active').forEach((s) => {
    const a = toRub(monthlyCost(s), s.currency, rates);
    if (a === null) return;
    const c = (s.category || '').trim() || NO_CATEGORY;
    by.set(c, (by.get(c) || 0) + a);
    total += a;
  });
  return [...by].map(([category, amount]) => ({ category, amount, share: total > 0 ? amount / total : 0 })).sort((a, b) => b.amount - a.amount);
}

// Сколько реально оплачено за период по отметкам «Оплачено» (даты включительно).
export function spent(subs, rates, from, to) {
  let total = 0;
  subs.forEach((s) => (s.payments || []).forEach((p) => {
    if (p.date >= from && p.date <= to) total += toRub(p.amount, p.currency, rates) || 0;
  }));
  return total;
}

const rubFmt = (n) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: Math.abs(n - Math.round(n)) < 0.005 ? 0 : 2, minimumFractionDigits: Math.abs(n - Math.round(n)) < 0.005 ? 0 : 2 }).format(n);
const plural = (n, [one, few, many]) => {
  const r = new Intl.PluralRules('ru-RU').select(n);
  return r === 'one' ? one : r === 'few' ? few : many;
};
export const daysWord = (n) => `${n} ${plural(n, ['день', 'дня', 'дней'])}`;

// Подсказки: просрочка, конец пробного периода, перекос по категории, неактивные.
export function tips(subs, today, rates) {
  const out = [];
  const active = subs.filter((s) => s.status === 'active');
  const overdue = subs.filter((s) => lamp(s, today) === 'red');
  if (overdue.length) {
    const amount = overdue.reduce((n, s) => n + (toRub(s.price, s.currency, rates) || 0), 0);
    out.push({ id: 'overdue', tone: 'warning', text: `Просрочено платежей: ${overdue.length} на ${rubFmt(amount)}. Отметь оплату или отмени подписку.` });
  }
  active.forEach((s) => {
    if (!s.trialUntil) return;
    const d = daysUntil(s.trialUntil, today);
    if (d < 0 || d > 7) return;
    out.push({ id: `trial:${s.id}`, tone: 'warning', text: `Пробный период «${s.name}» заканчивается ${d === 0 ? 'сегодня' : d === 1 ? 'завтра' : `через ${daysWord(d)}`}: дальше спишется ${s.price} ${CURRENCY_SYMBOL[s.currency] || s.currency}.` });
  });
  const shares = categoryShares(subs, rates);
  if (shares.length > 1 && shares[0].share >= 0.4) out.push({ id: 'biggest', tone: 'info', text: `Категория «${shares[0].category}» съедает ${Math.round(shares[0].share * 100)}% трат: ${rubFmt(shares[0].amount)} в месяц.` });
  const inactive = subs.length - active.length;
  if (inactive > 0) out.push({ id: 'inactive', tone: 'info', text: `Не активны: ${inactive}. Удали те, к которым не вернёшься: список станет короче.` });
  return out.slice(0, 4);
}

export function categories(subs) {
  const by = new Map();
  subs.forEach((s) => {
    const t = (s.category || '').trim();
    if (t && !by.has(t.toLocaleLowerCase('ru'))) by.set(t.toLocaleLowerCase('ru'), t);
  });
  return [...by.values()].sort((a, b) => a.localeCompare(b, 'ru'));
}

// Сортировка: активные по сроку (просроченные первыми), остальные в конце по названию.
export function sortSubs(subs, today) {
  const col = new Intl.Collator('ru', { sensitivity: 'base', numeric: true });
  return [...subs].sort((a, b) => {
    const act = Number(b.status === 'active') - Number(a.status === 'active');
    if (act) return act;
    if (a.status === 'active') {
      const d = daysUntil(nextDue(a, today) || today, today) - daysUntil(nextDue(b, today) || today, today);
      if (d) return d;
    }
    return col.compare(a.name, b.name);
  });
}

export function filterSubs(subs, { status = 'all', category = null, query = '' } = {}) {
  const cat = category ? category.trim().toLocaleLowerCase('ru') : '';
  const q = query.trim().toLocaleLowerCase('ru');
  return subs.filter((s) => {
    if (status !== 'all' && s.status !== status) return false;
    if (cat && (s.category || '').trim().toLocaleLowerCase('ru') !== cat) return false;
    if (!q) return true;
    const hay = [s.name, s.category, s.notes || ''].join(' ').toLocaleLowerCase('ru');
    return q.split(/\s+/).every((w) => hay.includes(w));
  });
}

// События месяца по дням: платежи активных подписок по расписанию и конец пробного периода.
export function monthEvents(subs, year, month) {
  const first = `${year}-${p2(month + 1)}-01`;
  const next = ymd(new Date(year, month + 1, 1));
  const events = {};
  const add = (d, e) => (events[d] = events[d] || []).push(e);
  subs.filter((s) => s.status === 'active').forEach((s) => {
    if (isYmd(s.startDate)) {
      for (let k = indexOnOrAfter(s, first); k < 100000; k += 1) {
        const d = occurrence(s, k);
        if (d >= next) break;
        add(d, { type: 'payment', sub: s, amount: s.price, currency: s.currency, paid: !!s.paidThrough && d <= s.paidThrough });
      }
    }
    if (s.trialUntil && s.trialUntil >= first && s.trialUntil < next) add(s.trialUntil, { type: 'trial', sub: s, amount: s.price, currency: s.currency });
  });
  return events;
}

export function monthTotalRub(events, rates) {
  let amount = 0;
  let payments = 0;
  Object.values(events).flat().forEach((e) => {
    if (e.type !== 'payment') return;
    payments += 1;
    amount += toRub(e.amount, e.currency, rates) || 0;
  });
  return { amount, payments };
}

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Календарь .ics: отдельное событие на каждый платёж на ближайшие 12 месяцев.
export function buildIcs(subs, today = todayYmd(), now = new Date()) {
  const to = addDays(today, 366);
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hub//Subscriptions//RU', 'CALSCALE:GREGORIAN'];
  subs
    .filter((s) => s.status === 'active' && isYmd(s.startDate))
    .forEach((s) => {
      const remind = Array.isArray(s.reminders) && s.reminders.length ? Math.max(...s.reminders) : 0;
      for (let k = indexOnOrAfter(s, today); k < 100000; k += 1) {
        const d = occurrence(s, k);
        if (d > to) break;
        if (s.paidThrough && d <= s.paidThrough) continue;
        lines.push(
          'BEGIN:VEVENT',
          `UID:${s.id}-${d}@hub`,
          `DTSTAMP:${stamp}`,
          `DTSTART;VALUE=DATE:${d.replace(/-/g, '')}`,
          `DTEND;VALUE=DATE:${addDays(d, 1).replace(/-/g, '')}`,
          `SUMMARY:${esc(`Списание: ${s.name}, ${s.price} ${s.currency}`)}`,
        );
        if (remind) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(s.name)}`, `TRIGGER:-P${remind}D`, 'END:VALARM');
        lines.push('END:VEVENT');
      }
    });
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

const PERIODS = ['weekly', 'monthly', 'quarterly', 'biannual', 'yearly', 'custom'];

// Резервная копия старого приложения (app: subscription-tracker, version 1) → записи хаба.
export function convertBackup(obj) {
  if (!obj || obj.app !== 'subscription-tracker' || !Array.isArray(obj.subscriptions)) throw new Error('Это не резервная копия приложения подписок');
  const items = [];
  const skipped = [];
  obj.subscriptions.forEach((s, i) => {
    const name = typeof s.name === 'string' ? s.name.trim() : '';
    const price = Number(s.price);
    const period = PERIODS.includes(s.billingPeriod) ? s.billingPeriod : null;
    if (!name || !Number.isFinite(price) || !isYmd(s.startDate) || !period) {
      skipped.push(`${name || `запись ${i + 1}`}: не хватает данных`);
      return;
    }
    const f = {
      id: typeof s.id === 'string' && s.id ? s.id : undefined,
      name,
      price,
      currency: ['RUB', 'USD', 'EUR', 'KZT'].includes(s.currency) ? s.currency : 'RUB',
      startDate: s.startDate,
      period,
      category: typeof s.category === 'string' ? s.category : '',
      status: ['active', 'paused', 'cancelled'].includes(s.status) ? s.status : 'cancelled',
      reminders: Array.isArray(s.reminders) ? s.reminders.filter((n) => Number.isFinite(n) && n >= 0) : [],
    };
    if (period === 'custom') f.customDays = Math.max(1, Math.round(Number(s.customDays) || 1));
    if (typeof s.url === 'string' && /^https?:\/\//i.test(s.url)) f.url = s.url;
    if (typeof s.notes === 'string' && s.notes) f.notes = s.notes;
    if (typeof s.logo === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,/.test(s.logo) && s.logo.length < 200000) f.logo = s.logo;
    if (isYmd(s.trialUntil)) f.trialUntil = s.trialUntil;
    if (isYmd(s.paidThrough)) f.paidThrough = s.paidThrough;
    if (Array.isArray(s.payments)) f.payments = s.payments.filter((p) => p && isYmd(p.date) && Number.isFinite(Number(p.amount))).map((p) => ({ date: p.date, currency: p.currency || f.currency, amount: Number(p.amount) }));
    if (Array.isArray(s.priceHistory)) f.priceHistory = s.priceHistory.filter((p) => p && isYmd(p.date) && Number.isFinite(Number(p.price))).map((p) => ({ date: p.date, currency: p.currency || f.currency, price: Number(p.price) }));
    items.push(f);
  });
  return { items, skipped };
}

// Копия подписок в том же формате, что у старого приложения (читается обратно через convertBackup).
export function toBackup(subs, now = new Date()) {
  return {
    app: 'subscription-tracker',
    version: 1,
    exportedAt: now.toISOString(),
    subscriptions: subs.map((s) => {
      const o = { id: s.id, name: s.name, price: s.price, currency: s.currency, startDate: s.startDate, billingPeriod: s.period, category: s.category || '', status: s.status, reminders: s.reminders || [] };
      ['customDays', 'url', 'notes', 'logo', 'trialUntil', 'payments', 'priceHistory', 'paidThrough'].forEach((k) => {
        if (s[k] !== undefined && s[k] !== '') o[k] = s[k];
      });
      return o;
    }),
  };
}
