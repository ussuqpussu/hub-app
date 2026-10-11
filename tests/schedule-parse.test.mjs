import assert from 'node:assert/strict';
import { parseCsv, parsePeriod, parseDayCell, parseDiscipline, parseTab, buildSchedule } from '../js/schedule-parse.js';

let n = 0;
const t = (name, fn) => { fn(); n += 1; console.log('ok', name); };

t('csv quotes and newlines', () => {
  const r = parseCsv('a,"b,1","c ""q""\nline"\r\nx,,y\n');
  assert.deepEqual(r, [['a', 'b,1', 'c "q"\nline'], ['x', '', 'y']]);
});
t('period', () => {
  assert.deepEqual(parsePeriod('1. 09.20 - 10.50'), { n: 1, start: '09:20', end: '10:50' });
  assert.deepEqual(parsePeriod('2.11:00–12:30'), { n: 2, start: '11:00', end: '12:30' });
  assert.equal(parsePeriod('Классный час'), null);
});
t('day cell', () => {
  assert.deepEqual(parseDayCell('ПОНЕДЕЛЬНИК 12 октября 2026 г.'), { day: 1, date: '2026-10-12' });
  assert.deepEqual(parseDayCell('Вторник'), { day: 2, date: null });
  assert.equal(parseDayCell('Дни недели'), null);
});
t('discipline', () => {
  const d = parseDiscipline('Математика (лек.) преп. Иванова И.И., ауд. 409');
  assert.equal(d.subject, 'Математика'); assert.equal(d.kind, 'лек.');
  assert.equal(d.teacher, 'Иванова И.И.'); assert.equal(d.room, '409'); assert.equal(d.parsed, true);
  const u = parseDiscipline('Что-то непонятное (н/к)');
  assert.equal(u.kind, 'н/к'); assert.equal(u.raw, 'Что-то непонятное (н/к)');
  const e = parseDiscipline('Физкультура');
  assert.equal(e.subject, 'Физкультура'); assert.equal(e.parsed, false);
});

const fixture = [
  ['', '', 'ИК-32/9', '', 'ИК-31/9'],
  ['Дни недели', 'Пара', 'Дисциплина', 'Дни недели', 'Пара', 'Дисциплина'],
].map((r) => r.join(','));
// Две группы рядом; наша группа второй по порядку, чтобы проверить поиск не по номеру столбца.
const csv = [
  ',,ИК-31/9,,,ИК-32/9',
  'Дни недели,Пара,Дисциплина,Дни недели,Пара,Дисциплина',
  'ПОНЕДЕЛЬНИК 12 октября 2026 г.,1. 09.20 - 10.50,Чужое (пр.),ПОНЕДЕЛЬНИК 12 октября 2026 г.,1. 09.20 - 10.50,"Математика (лек.) преп. Иванова И.И., ауд. 409"',
  ',2. 11.00 - 12.30,,,2. 11.00 - 12.30,',
  ',3. 13.00 - 14.30,,,3. 13.00 - 14.30,Физкультура',
  'ВТОРНИК,1. 09.20 - 10.50,,ВТОРНИК,1. 09.20 - 10.50,Информатика (пр.) преп. Петров П.П.; ауд. 12 (н/к)',
].join('\n');

t('parseTab by label', () => {
  const r = parseTab(csv, 'ИК-32/9');
  assert.equal(r.ok, true);
  assert.equal(r.monday, '2026-10-12');
  assert.equal(r.days[0].pairs.length, 2);
  assert.equal(r.days[0].pairs[0].subject, 'Математика');
  assert.equal(r.days[0].pairs[1].raw, 'Физкультура');
  assert.equal(r.days[1].pairs.length, 1);
  const c = parseTab(csv, 'ИК-31/9');
  assert.equal(c.days[0].pairs[0].subject, 'Чужое');
});
t('group missing', () => {
  const r = parseTab(csv, 'ХХ-1');
  assert.equal(r.ok, false); assert.equal(r.warnings[0].code, 'group-not-found');
});
t('keep previous when unrecognized', () => {
  const first = buildSchedule({ csv: { upper: csv, lower: csv }, config: { group: 'ИК-32/9' }, weekTypeOf: () => 'верхняя' });
  assert.equal(first.weeks.upper.status, 'ok');
  const second = buildSchedule({ csv: { upper: 'мусор', lower: csv }, config: { group: 'ИК-32/9' }, previous: first });
  assert.equal(second.weeks.upper.status, 'kept');
  assert.equal(second.weeks.upper.days[0].pairs.length, 2);
  assert.ok(second.warnings.some((w) => w.code === 'kept-previous'));
  const none = buildSchedule({ csv: {}, config: { group: 'ИК-32/9' }, errors: { upper: 'x', lower: 'y' } });
  assert.equal(none.weeks.upper.status, 'missing');
});
console.log(`${n} passed`);
