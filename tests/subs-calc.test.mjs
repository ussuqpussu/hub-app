import assert from 'node:assert/strict';
import fs from 'node:fs';
import { occurrence, nextDue, lamp, markPaid, withInitialPaidThrough, editFields, monthlyCost, monthlyTotalRub, categoryShares, spent, tips, parseCbrRates, normalizeRates, toRub, filterSubs, sortSubs, monthEvents, monthTotalRub, buildIcs, convertBackup, toBackup, normalizeSub, categories } from '../js/subs-calc.js';

let n = 0;
const t = (name, fn) => { fn(); n += 1; console.log('ok', name); };
const m = (o) => ({ id: 'x', name: 'N', price: 100, currency: 'RUB', period: 'monthly', startDate: '2026-01-31', status: 'active', ...o });
const rates = { date: '2026-10-09', fetchedAt: 1, rub: { USD: 80, EUR: 90, KZT: 0.16 } };

t('month-end clamp from anchor', () => {
  assert.equal(occurrence(m({}), 1), '2026-02-28');
  assert.equal(occurrence(m({}), 2), '2026-03-31');
  assert.equal(occurrence(m({}), 13), '2027-02-28');
});
t('quarterly and biannual', () => {
  assert.equal(occurrence(m({ period: 'quarterly', startDate: '2026-11-30' }), 1), '2027-02-28');
  assert.equal(occurrence(m({ period: 'biannual', startDate: '2026-08-31' }), 1), '2027-02-28');
});
t('leap year yearly, year rollover, weekly, custom', () => {
  const s = m({ period: 'yearly', startDate: '2024-02-29' });
  assert.equal(occurrence(s, 1), '2025-02-28'); assert.equal(occurrence(s, 4), '2028-02-29');
  assert.equal(occurrence(m({ startDate: '2026-11-15' }), 2), '2027-01-15');
  assert.equal(occurrence(m({ period: 'weekly', startDate: '2026-10-11' }), 2), '2026-10-25');
  assert.equal(occurrence(m({ period: 'custom', customDays: 90, startDate: '2026-10-10' }), 1), '2027-01-08');
});
t('nextDue like the old app', () => {
  assert.equal(nextDue(m({ startDate: '2025-04-08', paidThrough: '2026-10-08' })), '2026-11-08');
  assert.equal(nextDue(m({ startDate: '2026-01-15' })), '2026-01-15'); // без отметок: первая дата, может быть просрочена
  assert.equal(nextDue(m({ startDate: '2026-01-10', paidThrough: '2026-08-10' })), '2026-09-10');
  assert.equal(nextDue(m({ period: 'yearly', startDate: '2026-09-15', paidThrough: '2027-09-15' })), '2028-09-15');
});
t('withInitialPaidThrough', () => {
  const s = withInitialPaidThrough(m({ startDate: '2026-01-15' }), '2026-10-11');
  assert.equal(s.paidThrough, '2026-09-15');
  assert.equal(nextDue(s), '2026-10-15');
  assert.equal(withInitialPaidThrough(m({ startDate: '2026-12-01' }), '2026-10-11').paidThrough, undefined);
});
t('lamp', () => {
  assert.equal(lamp(m({ startDate: '2026-10-14' }), '2026-10-11'), 'yellow');
  assert.equal(lamp(m({ startDate: '2026-10-15' }), '2026-10-11'), 'green');
  assert.equal(lamp(m({ startDate: '2026-10-10' }), '2026-10-11'), 'red');
  assert.equal(lamp(m({ status: 'paused' }), '2026-10-11'), 'off');
});
t('markPaid shifts', () => {
  const s = m({ startDate: '2026-10-12' });
  const r = markPaid(s, '2026-10-11');
  assert.equal(r.paidThrough, '2026-10-12'); assert.equal(nextDue({ ...s, ...r }), '2026-11-12');
});
t('editFields', () => {
  const prev = m({ startDate: '2026-01-15', paidThrough: '2026-10-15', price: 100 });
  assert.equal(editFields(prev, { ...prev, price: 120 }, '2026-10-11').paidThrough, prev.paidThrough);
  assert.equal(editFields(prev, { ...prev, price: 120 }, '2026-10-11').priceHistory.length, 1);
  assert.equal(editFields(prev, { ...prev, startDate: '2026-02-01' }, '2026-10-11').paidThrough, '2026-10-01');
  const paused = { ...prev, status: 'paused' };
  assert.equal(editFields(paused, { ...paused, status: 'active' }, '2026-10-11').paidThrough, '2026-09-15');
});
t('costs and rates', () => {
  assert.equal(monthlyCost(m({ period: 'yearly', price: 1200 })), 100);
  assert.equal(monthlyCost(m({ period: 'quarterly', price: 300 })), 100);
  assert.equal(monthlyCost(m({ period: 'biannual', price: 600 })), 100);
  const r = parseCbrRates({ Date: '2026-10-09T11:30:00+03:00', Valute: { USD: { Value: 80, Nominal: 1 }, EUR: { Value: 90, Nominal: 1 }, KZT: { Value: 16, Nominal: 100 } } }, 5);
  assert.equal(r.date, '2026-10-09'); assert.equal(r.rub.KZT, 0.16);
  assert.equal(parseCbrRates({ Date: 'x', Valute: {} }, 1), null);
  assert.deepEqual(normalizeRates(r), r); assert.equal(normalizeRates({ date: 'x' }), null);
  assert.equal(toRub(10, 'USD', rates), 800); assert.equal(toRub(10, 'USD', null), null); assert.equal(toRub(10, 'RUB', null), 10);
  const subs = [m({}), m({ currency: 'USD', price: 20 }), m({ status: 'paused', price: 999 })];
  assert.deepEqual(monthlyTotalRub(subs, rates), { amount: 1700, converted: true, missing: [] });
  assert.deepEqual(monthlyTotalRub(subs, null), { amount: 100, converted: true, missing: ['USD'] });
});
t('shares, spent, tips', () => {
  const subs = [m({ category: 'А', price: 300 }), m({ category: 'Б', price: 100 }), m({ price: 100 })];
  const sh = categoryShares(subs, null);
  assert.equal(sh[0].category, 'А'); assert.equal(Math.round(sh[0].share * 100), 60);
  assert.equal(sh[2].category, 'Без категории');
  const p = [m({ payments: [{ date: '2026-10-01', amount: 10, currency: 'USD' }, { date: '2026-09-01', amount: 5, currency: 'RUB' }] })];
  assert.equal(spent(p, rates, '2026-10-01', '2026-10-31'), 800);
  const tp = tips([m({ startDate: '2026-10-01' }), m({ status: 'paused' }), m({ trialUntil: '2026-10-13' })], '2026-10-11', null);
  assert.ok(tp.some((x) => x.id === 'overdue') && tp.some((x) => x.id.startsWith('trial:')) && tp.some((x) => x.id === 'inactive'));
});
t('filter, sort, categories', () => {
  const subs = [m({ id: 'a', name: 'Яндекс плюс', category: 'Яндекс', startDate: '2026-11-08' }), m({ id: 'b', name: 'Claude', category: 'ИИ', notes: 'Apple pay', startDate: '2026-10-19' }), m({ id: 'c', name: 'Старое', status: 'cancelled', startDate: '2026-10-12' })];
  assert.deepEqual(filterSubs(subs, { query: 'apple' }).map((s) => s.id), ['b']);
  assert.deepEqual(filterSubs(subs, { status: 'cancelled' }).map((s) => s.id), ['c']);
  assert.deepEqual(filterSubs(subs, { category: 'яндекс' }).map((s) => s.id), ['a']);
  assert.deepEqual(sortSubs(subs, '2026-10-11').map((s) => s.id), ['b', 'a', 'c']);
  assert.deepEqual(categories(subs), ['ИИ', 'Яндекс']);
});
t('month events', () => {
  const s = m({ id: 's', startDate: '2026-09-12', paidThrough: '2026-09-12', trialUntil: '2026-10-20' });
  const ev = monthEvents([s, m({ id: 'p', status: 'paused' })], 2026, 9);
  assert.deepEqual(Object.keys(ev).sort(), ['2026-10-12', '2026-10-20']);
  assert.equal(ev['2026-10-12'][0].paid, false);
  assert.equal(monthEvents([s], 2026, 8)['2026-09-12'][0].paid, true);
  assert.deepEqual(monthTotalRub(ev, null), { amount: 100, payments: 1 });
});
t('ics', () => {
  const ics = buildIcs([m({ startDate: '2026-10-12', reminders: [3], name: 'А, Б' })], '2026-10-11', new Date('2026-10-11T00:00:00Z'));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 13);
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261012') && ics.includes('TRIGGER:-P3D') && ics.includes('А\\, Б'));
});
t('normalizeSub', () => {
  assert.equal(normalizeSub({ status: 'archived' }).status, 'cancelled');
  assert.deepEqual(normalizeSub({ status: 'active', reminders: [] }).reminders, [3]);
});
t('real backup and roundtrip', () => {
  const p = '/root/.claude/uploads/ce1bd404-60de-5dae-a9f2-d4255ac1a92e/bea6f3cf-podpiski-backup-2026-10-11.json';
  if (!fs.existsSync(p)) return console.log('skip (no file)');
  const { items, skipped } = convertBackup(JSON.parse(fs.readFileSync(p, 'utf8')));
  assert.equal(items.length, 8); assert.deepEqual(skipped, []);
  const by = Object.fromEntries(items.map((i) => [i.name, i]));
  assert.equal(by.VPN.period, 'custom'); assert.equal(by.VPN.customDays, 90); assert.ok(by.VPN.logo);
  assert.equal(by.Claude.currency, 'USD');
  assert.equal(nextDue(by['Яндекс плюс']), '2026-11-08'); assert.equal(nextDue(by.Uphost), '2026-10-12'); assert.equal(nextDue(by['Хостинг']), '2028-09-15');
  const back = convertBackup(toBackup(items.map((i) => ({ ...i, id: i.id })))).items;
  assert.deepEqual(back.map((i) => i.name), items.map((i) => i.name));
  assert.deepEqual(back.find((i) => i.name === 'VPN').priceHistory, by.VPN.priceHistory);
});
t('bad backup rejected', () => {
  assert.throws(() => convertBackup({ app: 'other' }));
  assert.equal(convertBackup({ app: 'subscription-tracker', subscriptions: [{ name: '' }] }).skipped.length, 1);
});
console.log(`${n} passed`);
