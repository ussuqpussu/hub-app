import assert from 'node:assert/strict';
import fs from 'node:fs';
import { occurrence, nextDue, dueLevel, markPaid, monthlyCost, totalsByCurrency, chargesBetween, buildIcs, convertBackup, monthGrid } from '../js/subs-calc.js';

let n = 0;
const t = (name, fn) => { fn(); n += 1; console.log('ok', name); };
const m = (o) => ({ id: 'x', name: 'N', price: 100, currency: 'RUB', period: 'monthly', startDate: '2026-01-31', status: 'active', ...o });

t('month-end clamp from anchor', () => {
  assert.equal(occurrence(m({}), 1), '2026-02-28');
  assert.equal(occurrence(m({}), 2), '2026-03-31');
  assert.equal(occurrence(m({}), 13), '2027-02-28');
});
t('leap year yearly', () => {
  const s = m({ period: 'yearly', startDate: '2024-02-29' });
  assert.equal(occurrence(s, 1), '2025-02-28');
  assert.equal(occurrence(s, 4), '2028-02-29');
});
t('year rollover', () => {
  assert.equal(occurrence(m({ startDate: '2026-11-15' }), 2), '2027-01-15');
});
t('weekly and custom', () => {
  assert.equal(occurrence(m({ period: 'weekly', startDate: '2026-10-11' }), 2), '2026-10-25');
  assert.equal(occurrence(m({ period: 'custom', customDays: 90, startDate: '2026-10-10' }), 1), '2027-01-08');
});
t('nextDue after paidThrough', () => {
  const s = m({ startDate: '2025-04-08', paidThrough: '2026-10-08' });
  assert.equal(nextDue(s, '2026-10-11'), '2026-11-08');
});
t('nextDue without payments: first not before today', () => {
  assert.equal(nextDue(m({ startDate: '2026-01-15' }), '2026-10-11'), '2026-10-15');
  assert.equal(nextDue(m({ startDate: '2026-12-01' }), '2026-10-11'), '2026-12-01');
});
t('overdue when paid long ago', () => {
  const s = m({ startDate: '2026-01-10', paidThrough: '2026-08-10' });
  assert.equal(nextDue(s, '2026-10-11'), '2026-09-10');
  assert.equal(dueLevel(s, '2026-10-11'), 'overdue');
});
t('dueLevel by reminders', () => {
  const s = m({ startDate: '2026-10-14', reminders: [3] });
  assert.equal(dueLevel(s, '2026-10-11'), 'soon');
  assert.equal(dueLevel(m({ startDate: '2026-10-17', reminders: [3] }), '2026-10-11'), 'near');
  assert.equal(dueLevel(m({ startDate: '2026-11-17', reminders: [3] }), '2026-10-11'), 'later');
});
t('markPaid shifts', () => {
  const s = m({ startDate: '2026-10-12' });
  const r = markPaid(s, '2026-10-11');
  assert.equal(r.paidThrough, '2026-10-12'); assert.equal(r.payments.length, 1);
  assert.equal(nextDue({ ...s, ...r }, '2026-10-11'), '2026-11-12');
});
t('monthly cost', () => {
  assert.equal(monthlyCost(m({ period: 'yearly', price: 1200 })), 100);
  assert.ok(Math.abs(monthlyCost(m({ period: 'custom', customDays: 90, price: 350 })) - 350 * 365.25 / 12 / 90) < 1e-9);
  assert.deepEqual(totalsByCurrency([m({}), m({ currency: 'USD', price: 20 })]), { RUB: 100, USD: 20 });
});
t('chargesBetween includes paid and projected', () => {
  const s = m({ startDate: '2026-09-12', paidThrough: '2026-09-12', payments: [{ date: '2026-09-12', currency: 'RUB', amount: 100 }] });
  const c = chargesBetween(s, '2026-09-01', '2026-11-30', '2026-10-11');
  assert.deepEqual(c.map((x) => [x.date, x.paid]), [['2026-09-12', true], ['2026-10-12', false], ['2026-11-12', false]]);
  const g = monthGrid([s], 2026, 9, '2026-10-11');
  assert.deepEqual(Object.keys(g.days), ['2026-10-12']);
});
t('ics', () => {
  const ics = buildIcs([m({ startDate: '2026-10-12', reminders: [3], name: 'А, Б' })], '2026-10-11', new Date('2026-10-11T00:00:00Z'));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 13);
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261012') && ics.includes('TRIGGER:-P3D') && ics.includes('А\\, Б'));
});
t('real backup', () => {
  const p = '/root/.claude/uploads/ce1bd404-60de-5dae-a9f2-d4255ac1a92e/bea6f3cf-podpiski-backup-2026-10-11.json';
  if (!fs.existsSync(p)) return console.log('skip (no file)');
  const { items, skipped } = convertBackup(JSON.parse(fs.readFileSync(p, 'utf8')));
  assert.equal(items.length, 8); assert.deepEqual(skipped, []);
  const by = Object.fromEntries(items.map((i) => [i.name, i]));
  assert.equal(by.VPN.period, 'custom'); assert.equal(by.VPN.customDays, 90); assert.ok(by.VPN.logo);
  assert.equal(by.Claude.currency, 'USD'); assert.equal(by.Claude.notes, 'Оплата через Apple pay');
  assert.equal(nextDue(by['Яндекс плюс'], '2026-10-11'), '2026-11-08');
  assert.equal(nextDue(by.Uphost, '2026-10-11'), '2026-10-12');
});
t('bad backup rejected', () => {
  assert.throws(() => convertBackup({ app: 'other' }));
  const r = convertBackup({ app: 'subscription-tracker', subscriptions: [{ name: '' }] });
  assert.equal(r.items.length, 0); assert.equal(r.skipped.length, 1);
});
console.log(`${n} passed`);
