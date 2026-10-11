// Подписки: расчёт дат списаний, итоги, выгрузка .ics, разбор резервной копии старого приложения.
// Чистые функции без доступа к браузеру: проверяются в Node.
import { ymd, fromYmd, addDays, todayYmd, isYmd } from './dates.js';

export const PERIOD_LABEL = { weekly: 'каждую неделю', monthly: 'каждый месяц', yearly: 'каждый год', custom: 'каждые N дней' };
const p2 = (n) => String(n).padStart(2, '0');

// Дата k-го списания, считая от первого (startDate). Конец месяца: 31-е в коротком месяце становится последним днём.
export function occurrence(sub, k) {
  const start = fromYmd(sub.startDate);
  if (sub.period === 'weekly') return addDays(sub.startDate, 7 * k);
  if (sub.period === 'custom') return addDays(sub.startDate, Math.max(1, Number(sub.customDays) || 1) * k);
  const months = sub.period === 'yearly' ? 12 * k : k;
  const y = start.getFullYear() + Math.floor((start.getMonth() + months) / 12);
  const m = (start.getMonth() + months) % 12;
  const last = new Date(y, m + 1, 0).getDate();
  return ymd(new Date(y, m, Math.min(start.getDate(), last)));
}

// Номер ближайшего неоплаченного списания: после paidThrough, а без отметок оплаты первое, не раньше сегодня.
function firstIndex(sub, today) {
  const after = sub.paidThrough && isYmd(sub.paidThrough) ? sub.paidThrough : null;
  let k = 0;
  // быстрый подход к нужной дате, потом точная проверка
  const limit = 5000;
  while (k < limit) {
    const d = occurrence(sub, k);
    if (after ? d > after : d >= today) return k;
    k += 1;
  }
  return limit;
}

export function nextDue(sub, today = todayYmd()) {
  if (!isYmd(sub.startDate)) return null;
  return occurrence(sub, firstIndex(sub, today));
}

export function daysUntil(date, today = todayYmd()) {
  return Math.round((fromYmd(date) - fromYmd(today)) / 86400000);
}

// Уровень срочности: overdue, soon (в пределах напоминания), near (до 7 дней), later.
export function dueLevel(sub, today = todayYmd()) {
  const d = nextDue(sub, today);
  if (!d) return 'later';
  const n = daysUntil(d, today);
  const remind = Array.isArray(sub.reminders) && sub.reminders.length ? Math.max(...sub.reminders) : 3;
  if (n < 0) return 'overdue';
  if (n <= remind) return 'soon';
  if (n <= 7) return 'near';
  return 'later';
}

// Оплата: запись в историю и сдвиг paidThrough на ближайшее списание.
export function markPaid(sub, today = todayYmd()) {
  const due = nextDue(sub, today);
  if (!due) return null;
  const payments = [...(sub.payments || []), { date: due, currency: sub.currency, amount: sub.price }];
  return { payments, paidThrough: due };
}

// Стоимость в месяц (среднее). Валюты не пересчитываем: курсов в хабе нет.
export function monthlyCost(sub) {
  const p = Number(sub.price) || 0;
  if (sub.period === 'weekly') return (p * 52) / 12;
  if (sub.period === 'yearly') return p / 12;
  if (sub.period === 'custom') return (p * 365.25) / 12 / Math.max(1, Number(sub.customDays) || 1);
  return p;
}

export function totalsByCurrency(subs, fn = monthlyCost) {
  const out = {};
  subs.forEach((s) => {
    out[s.currency] = (out[s.currency] || 0) + fn(s);
  });
  return out;
}

export function byCategory(subs) {
  const out = {};
  subs.forEach((s) => {
    const c = s.category || 'без категории';
    out[c] = out[c] || {};
    out[c][s.currency] = (out[c][s.currency] || 0) + monthlyCost(s);
  });
  return out;
}

// Списания в диапазоне дат (включительно): будущие по расчёту. Оплаченные прошлые берутся из истории платежей.
export function chargesBetween(sub, from, to, today = todayYmd()) {
  const out = [];
  (sub.payments || []).forEach((p) => {
    if (p.date >= from && p.date <= to) out.push({ date: p.date, amount: p.amount, currency: p.currency, paid: true });
  });
  if (isYmd(sub.startDate)) {
    for (let k = firstIndex(sub, today); k < 5000; k += 1) {
      const d = occurrence(sub, k);
      if (d > to) break;
      if (d >= from) out.push({ date: d, amount: sub.price, currency: sub.currency, paid: false });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function monthGrid(subs, year, month, today = todayYmd()) {
  const from = `${year}-${p2(month + 1)}-01`;
  const to = ymd(new Date(year, month + 1, 0));
  const days = {};
  subs
    .filter((s) => s.status === 'active')
    .forEach((s) => {
      chargesBetween(s, from, to, today).forEach((c) => {
        (days[c.date] = days[c.date] || []).push({ name: s.name, ...c });
      });
    });
  return { from, to, days };
}

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Календарь .ics: отдельное событие на каждое списание на ближайшие 12 месяцев.
export function buildIcs(subs, today = todayYmd(), now = new Date()) {
  const to = addDays(today, 366);
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hub//Subscriptions//RU', 'CALSCALE:GREGORIAN'];
  subs
    .filter((s) => s.status === 'active')
    .forEach((s) => {
      const remind = Array.isArray(s.reminders) && s.reminders.length ? Math.max(...s.reminders) : 0;
      chargesBetween(s, today, to, today)
        .filter((c) => !c.paid)
        .forEach((c) => {
          lines.push(
            'BEGIN:VEVENT',
            `UID:${s.id}-${c.date}@hub`,
            `DTSTAMP:${stamp}`,
            `DTSTART;VALUE=DATE:${c.date.replace(/-/g, '')}`,
            `DTEND;VALUE=DATE:${addDays(c.date, 1).replace(/-/g, '')}`,
            `SUMMARY:${esc(`Списание: ${s.name}, ${c.amount} ${c.currency}`)}`,
          );
          if (remind) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(s.name)}`, `TRIGGER:-P${remind}D`, 'END:VALARM');
          lines.push('END:VEVENT');
        });
    });
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

const STATUS_MAP = { active: 'active', paused: 'paused', pause: 'paused' };

// Резервная копия старого приложения (app: subscription-tracker, version 1) → записи хаба.
export function convertBackup(obj) {
  if (!obj || obj.app !== 'subscription-tracker' || !Array.isArray(obj.subscriptions)) throw new Error('Это не резервная копия приложения подписок');
  const items = [];
  const skipped = [];
  obj.subscriptions.forEach((s, i) => {
    const name = typeof s.name === 'string' ? s.name.trim() : '';
    const price = Number(s.price);
    const period = ['weekly', 'monthly', 'yearly', 'custom'].includes(s.billingPeriod) ? s.billingPeriod : null;
    if (!name || !Number.isFinite(price) || !isYmd(s.startDate) || !period) {
      skipped.push(`${name || `запись ${i + 1}`}: не хватает данных`);
      return;
    }
    const f = {
      id: typeof s.id === 'string' && s.id ? s.id : undefined,
      name,
      price,
      currency: typeof s.currency === 'string' && s.currency ? s.currency : 'RUB',
      startDate: s.startDate,
      period,
      category: typeof s.category === 'string' ? s.category : '',
      status: STATUS_MAP[s.status] || 'archived',
      reminders: Array.isArray(s.reminders) ? s.reminders.filter((n) => Number.isFinite(n) && n >= 0) : [],
    };
    if (period === 'custom') f.customDays = Math.max(1, Math.round(Number(s.customDays) || 1));
    if (typeof s.url === 'string' && /^https?:\/\//i.test(s.url)) f.url = s.url;
    if (typeof s.notes === 'string' && s.notes) f.notes = s.notes;
    if (typeof s.logo === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,/.test(s.logo) && s.logo.length < 200000) f.logo = s.logo;
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
      ['customDays', 'url', 'notes', 'logo', 'payments', 'priceHistory', 'paidThrough'].forEach((k) => {
        if (s[k] !== undefined && s[k] !== '') o[k] = s[k];
      });
      return o;
    }),
  };
}
