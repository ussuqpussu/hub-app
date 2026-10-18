// Расчёты доски задач и подсчёт закрытых задач по дням (без браузера).
import assert from 'node:assert/strict';
import { boardColumns, patchFor } from '../js/tasks-board.js';
import { summarizeWeek } from '../js/weekly-calc.js';

// tasks-board импортирует ui.js (document нужен только при вызове el); для расчётов достаточно заглушки не требуется
let n = 0;
const ok = (name, fn) => { fn(); n += 1; console.log('ok', name); };

ok('board columns split by main and done', () => {
  const t = [
    { id: 'a', done: false, main: false, created: 2 },
    { id: 'b', done: false, main: true, created: 1 },
    { id: 'c', done: true, main: false, doneAt: 5, created: 0 },
  ];
  const c = boardColumns(t);
  assert.deepEqual(c.queue.map((x) => x.id), ['a']);
  assert.deepEqual(c.main.map((x) => x.id), ['b']);
  assert.deepEqual(c.done.map((x) => x.id), ['c']);
});
ok('patchFor sets the fields of each column', () => {
  assert.deepEqual(patchFor({}, 'main'), { main: true, done: false, doneAt: null });
  assert.deepEqual(patchFor({}, 'queue'), { main: false, done: false, doneAt: null });
  assert.deepEqual(patchFor({}, 'done', 7), { done: true, doneAt: 7, main: false });
  assert.equal(patchFor({}, 'x'), null);
});
ok('weekly byDay counts closed tasks per weekday', () => {
  // понедельник 2026-10-12 и среда 2026-10-14, местное время
  const ms = (s) => new Date(`${s}T12:00:00`).getTime();
  const s = summarizeWeek({ day: '2026-10-14', tasks: [
    { title: 'A', done: true, doneAt: ms('2026-10-12') }, { title: 'B', done: true, doneAt: ms('2026-10-12') }, { title: 'C', done: true, doneAt: ms('2026-10-14') }, { title: 'D', done: true, doneAt: ms('2026-10-20') },
  ] });
  assert.deepEqual(s.tasks.byDay, [2, 0, 1, 0, 0, 0, 0]);
});
console.log(`${n} passed`);
