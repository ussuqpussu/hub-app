import assert from 'node:assert/strict';
import { weekId, weekRange, summarizeWeek, shouldSnapshot, prevWeekDay } from '../js/weekly-calc.js';
let passed = 0;
const ok = (n, f) => { f(); passed += 1; console.log('ok', n); };
ok('ISO week ids', () => {
  assert.equal(weekId('2026-10-11'), '2026-W41');
  assert.equal(weekId('2026-10-12'), '2026-W42');
  assert.equal(weekId('2026-01-01'), '2026-W01');
  assert.equal(weekId('2025-12-29'), '2026-W01');
  assert.equal(weekId('2027-01-03'), '2026-W53');
});
ok('range is Mon-Sun', () => {
  assert.deepEqual(weekRange('2026-10-11'), { from: '2026-10-05', to: '2026-10-11' });
  assert.equal(prevWeekDay('2026-10-11'), '2026-09-28');
});
const ts = (s, h = 12) => new Date(`${s}T${String(h).padStart(2, '0')}:00:00`).getTime();
const tasks = [
  { title: 'A', done: true, doneAt: ts('2026-10-06') },
  { title: 'B', done: true, doneAt: ts('2026-10-11', 23) },
  { title: 'Old', done: true, doneAt: ts('2026-10-04') },
  { title: 'C', done: false, due: '2026-10-14', project: 'Сайт' },
  { title: 'D', done: false, due: '2026-10-20' },
  { title: 'E', done: false, due: '2026-10-01' },
  { title: 'F', done: false },
];
const posts = [{ id: 'p1', title: 'Пост 1', date: '2026-10-09' }, { id: 'p2', title: 'Пост 2', date: '2026-10-10' }];
const records = [
  { postId: 'p1', at: { dzen: ts('2026-10-09'), vk: ts('2026-10-10') } },
  { postId: 'p2', at: { dzen: ts('2026-10-03') } },
  { postId: 'zzz', at: { dzen: ts('2026-10-09') } },
  { postId: 'p2' },
];
const events = [{ date: '2026-10-08', project: 'Бот', text: 'Релиз' }, { date: '2026-10-01', project: 'Бот', text: 'Старое' }];
const s = summarizeWeek({ day: '2026-10-11', tasks, posts, records, events });
ok('tasks closed within week only', () => {
  assert.deepEqual(s.tasks.closed.map((t) => t.title), ['A', 'B']);
  assert.equal(s.tasks.openCount, 4);
  assert.equal(s.tasks.overdue, 1);
});
ok('rupor published by platform', () => {
  assert.deepEqual(s.rupor.counts, { dzen: 1, vk: 1, tg: 0 });
  assert.equal(s.rupor.total, 2);
  assert.equal(s.rupor.published.length, 1);
});
ok('events and deadlines', () => {
  assert.deepEqual(s.events.map((e) => e.text), ['Релиз']);
  assert.deepEqual(s.deadlines.map((d) => d.title), ['C']);
  assert.equal(s.hasData, true);
});
ok('empty week says no data', () => {
  const e = summarizeWeek({ day: '2026-09-01', tasks: [], posts: [], records: [], events: [] });
  assert.equal(e.hasData, false);
});
ok('snapshot rules', () => {
  const none = new Set();
  assert.equal(shouldSnapshot('2026-10-11', new Date('2026-10-11T17:59:00'), none), false);
  assert.equal(shouldSnapshot('2026-10-11', new Date('2026-10-11T18:00:00'), none), true);
  assert.equal(shouldSnapshot('2026-10-11', new Date('2026-10-13T09:00:00'), none), true);
  assert.equal(shouldSnapshot('2026-10-11', new Date('2026-10-13T09:00:00'), new Set(['2026-W41'])), false);
  assert.equal(shouldSnapshot('2026-10-12', new Date('2026-10-13T09:00:00'), none), false);
});
console.log(passed, 'passed');
