import assert from 'node:assert/strict';
import { parsePost } from '../js/rupor-parse.js';
import { counters, outgoing, botLink, tagsPlain, tagWarnings, recOf, publishedCount, canCheck, filterPosts, stock, botCounter, repeatedTopics } from '../js/rupor-calc.js';
let passed = 0;
const ok = (n, f) => { f(); passed += 1; console.log('ok', n); };
const SRC = `---
дата: 2026-10-12
тип: статья
рубрика: Разборы
тема: экскаватор-погрузчик
хэштеги: "#ИмпульсГрупп #спецтехника #Разборы"
призыв: да
---
## Мастер-текст
Заголовок: Как выбрать экскаватор-погрузчик
Текст для Дзена.

## Версия для ВК
Текст для ВК.

## Версия для Telegram
Текст для Telegram.

## Источники
- Обзор рынка (https://example.com/a) 2026-10-01

## Фото
Погрузчик в карьере

## Заметка для проверки
Проверь цифру про цену.
`;
const P = parsePost('rupor/2026-10-12-pogruzchik.md', SRC);
ok('parse fields', () => {
  assert.equal(P.id, '2026-10-12-pogruzchik');
  assert.equal(P.type, 'article');
  assert.equal(P.title, 'Как выбрать экскаватор-погрузчик');
  assert.equal(P.texts.vk.text, 'Текст для ВК.');
  assert.equal(P.texts.tg.text, 'Текст для Telegram.');
  assert.equal(P.botCall, true);
  assert.deepEqual(P.hashtags, ['#ИмпульсГрупп', '#спецтехника', '#Разборы']);
  assert.deepEqual(P.sources, [{ title: 'Обзор рынка', url: 'https://example.com/a', date: '2026-10-01' }]);
  assert.equal(P.review, 'Проверь цифру про цену.');
  assert.equal(P.photo, 'Погрузчик в карьере');
});
ok('parse rejects junk', () => {
  assert.equal(parsePost('rupor/x.md', 'просто текст'), null);
  assert.equal(parsePost('rupor/x.md', '---\ndate: вчера\n---\n# a'), null);
  assert.equal(parsePost('rupor/x.md', '---\ndate: 2026-10-01\n---\nбез заголовка'), null);
});
ok('outgoing: text + bot link + tags, counted', () => {
  const o = outgoing(P, 'vk');
  assert.ok(o.includes('Текст для ВК.') && o.includes('start=src_vk') && o.includes('#ИмпульсГрупп'));
  assert.ok(!outgoing(P, 'vk').includes('src_dzen'));
  assert.equal(botLink('tg'), 'https://t.me/Applicationl_lbot?start=src_channel');
});
ok('counters: limits per platform', () => {
  const d = counters(P, 'dzen');
  assert.deepEqual(d.map((c) => c.label), ['Заголовок', 'Текст']);
  assert.equal(d[0].max, 140);
  const t = counters(P, 'tg');
  assert.deepEqual(t.map((c) => [c.label, c.max]), [['Без фото', 4096], ['С фото', 1024]]);
  const post = { ...P, type: 'post' };
  assert.equal(counters(post, 'dzen')[0].max, 4096);
  const long = { ...P, texts: { ...P.texts, tg: { title: '', text: 'я'.repeat(1100) } } };
  const c = counters(long, 'tg');
  assert.equal(c[0].over, false); assert.equal(c[1].over, true);
});
ok('tags: plain view and warnings', () => {
  assert.equal(tagsPlain(P), 'ИмпульсГрупп, спецтехника, Разборы');
  assert.deepEqual(tagWarnings(P), []);
  assert.equal(tagWarnings({ ...P, hashtags: ['#a', '#b', '#c', '#d', '#e', '#f', '#g'] }).length, 1);
});
ok('status record and check gate', () => {
  const r = recOf([], P.id);
  assert.equal(publishedCount(r), 0);
  assert.equal(canCheck(P, r), false);
  assert.equal(canCheck(P, { ...r, noteRead: true }), true);
  assert.equal(canCheck({ ...P, review: '' }, r), true);
  const r2 = recOf([{ postId: P.id, status: { dzen: 'published' } }], P.id);
  assert.equal(publishedCount(r2), 1);
  assert.equal(r2.status.vk, 'new');
});
const mk = (date, extra = {}) => ({ ...P, id: date, date, title: date, botCall: false, topic: '', sources: [], ...extra });
ok('filter and stock', () => {
  const posts = [mk('2026-10-10'), mk('2026-10-11'), mk('2026-10-12'), mk('2026-10-13'), mk('2026-10-15')];
  const recs = [{ postId: '2026-10-12', status: { dzen: 'published', vk: 'published', tg: 'published' } }];
  const s = stock(posts, recs, '2026-10-11');
  assert.equal(s.count, 3);
  assert.equal(s.days, 3);
  assert.equal(filterPosts(posts, recs, { status: 'done' }).length, 1);
  assert.equal(filterPosts(posts, recs, { type: 'article' }).length, 5);
});
ok('bot counter: every third', () => {
  assert.equal(botCounter([mk('2026-10-01', { botCall: true }), mk('2026-10-02'), mk('2026-10-03')]).next, 1);
  assert.equal(botCounter([mk('2026-10-01'), mk('2026-10-02', { botCall: true })]).next, 3);
});
ok('repeats by topic and source', () => {
  const a = mk('2026-10-01', { topic: 'Кран' });
  const b = mk('2026-10-02', { topic: 'кран' });
  const c = mk('2026-10-03', { sources: [{ url: 'u' }] });
  const d = mk('2026-10-04', { sources: [{ url: 'u' }] });
  assert.equal(repeatedTopics([a, b, c, d], a).length, 1);
  assert.equal(repeatedTopics([a, b, c, d], c).length, 1);
});
console.log(passed, 'passed');
import { pendingPost, pendingPosts, dayNeed, settingsOf } from '../js/rupor-calc.js';
ok('pending post for Today', () => {
  const posts = [mk('2026-10-09'), mk('2026-10-10'), mk('2026-10-12')];
  assert.equal(pendingPost(posts, [], '2026-10-11').date, '2026-10-10');
  assert.equal(pendingPost(posts, [], '2026-10-12').date, '2026-10-12');
  const done = { status: { dzen: 'published', vk: 'published', tg: 'published' } };
  assert.equal(pendingPosts(posts, [{ postId: '2026-10-10', ...done }], '2026-10-11').length, 1);
  assert.equal(pendingPost([], [], '2026-10-11'), null);
});
ok('day need: article on Wed and Sat', () => {
  assert.equal(dayNeed('2026-10-14'), 'article');
  assert.equal(dayNeed('2026-10-17'), 'article');
  assert.equal(dayNeed('2026-10-11'), 'post');
});
ok('settings defaults', () => {
  const s = settingsOf([]);
  assert.equal(s.siteReady, false);
  assert.equal(s.dzenTags, 'unknown');
  assert.equal(settingsOf([{ postId: '__settings', status: {}, siteReady: true }]).siteReady, true);
});
console.log(passed, 'passed (всего)');
