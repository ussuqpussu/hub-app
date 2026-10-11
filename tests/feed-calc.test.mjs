import assert from 'node:assert/strict';
import { buildFeed, dayLabel, groupFeed } from '../js/feed-calc.js';
let passed = 0;
const ok = (n, f) => { f(); passed += 1; console.log('ok', n); };
const P = [
  { id: 'a', name: 'Сайт', events: [{ date: '2026-10-11', text: 'Выложили', at: 2 }, { date: '2026-10-10', text: 'Макет' }, { date: '2026-10-10', text: 'Макет' }, { date: '2026-10-09', text: '   ' }, { text: 'без даты' }] },
  { id: 'b', name: 'Бот', events: [{ date: '2026-10-11', text: 'Оплата', at: 5 }, { date: '2025-12-31', text: 'Старое' }] },
  { id: 'c', name: 'Пусто' },
];
ok('feed: newest first, dedup, junk dropped', () => {
  const f = buildFeed(P);
  assert.deepEqual(f.map((x) => x.text), ['Оплата', 'Выложили', 'Макет', 'Старое']);
  assert.ok(f[0].color >= 1 && f[0].color <= 7);
});
ok('dayLabel: today, yesterday, date, other year', () => {
  assert.equal(dayLabel('2026-10-11', '2026-10-11'), 'Сегодня'); assert.equal(dayLabel('2026-10-10', '2026-10-11'), 'Вчера');
  assert.equal(dayLabel('2026-09-28', '2026-10-11'), '28 сентября'); assert.equal(dayLabel('2025-12-31', '2026-10-11'), '31 декабря 2025');
  assert.equal(dayLabel('2026-03-01', '2026-03-02'), 'Вчера');
});
ok('groupFeed: by day, filter by project, limit', () => {
  const f = buildFeed(P);
  assert.deepEqual(groupFeed(f, '2026-10-11').map((g) => [g.label, g.items.length]), [['Сегодня', 2], ['Вчера', 1], ['31 декабря 2025', 1]]);
  assert.equal(groupFeed(f, '2026-10-11', { projectId: 'a' }).length, 2);
  assert.equal(groupFeed(f, '2026-10-11', { limit: 3 }).reduce((n, g) => n + g.items.length, 0), 3);
  assert.deepEqual(groupFeed([], '2026-10-11'), []);
});
console.log(`${passed} passed`);
