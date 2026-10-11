import assert from 'node:assert/strict';
import { parseDocPosts, parseDateText } from '../js/rupor-import.js';
let passed = 0;
const ok = (n, f) => { f(); passed += 1; console.log('ok', n); };
ok('date formats', () => {
  assert.equal(parseDateText('12 октября', '2026'), '2026-10-12');
  assert.equal(parseDateText('3 октября 2026', '2025'), '2026-10-03');
  assert.equal(parseDateText('12.10.2026', '2026'), '2026-10-12');
  assert.equal(parseDateText('2026-10-12', '2026'), '2026-10-12');
  assert.equal(parseDateText('вчера', '2026'), '');
});
const DOC = `Что-то до
### Пост на 12 октября: Как читать объявление об аренде

Основной текст для Дзена.
Вторая строка.

#### Версия для ВК

Текст для ВК.

#### Версия для Telegram

Текст для Telegram с https://t.me/Applicationl_lbot?start=src_channel

*Источники:* [78.ru, 30.09.2026](https://78.ru/a), [zr.ru, 29.09.2026](https://zr.ru/b).
*Фото:* погрузчик 1080×1080.
*Тема:* аренда, объявление
*Метки:* src_dzen
*Заметка для проверки:* проверь цифру.

### Пост на послезавтра: без даты
текст

## Пост на 13 октября: Короткий
Только текст.
`;
const r = parseDocPosts(DOC, { today: '2026-10-11' });
ok('splits posts and skips undated', () => {
  assert.equal(r.posts.length, 2);
  assert.equal(r.skipped, 1);
});
ok('fields', () => {
  const p = r.posts[0];
  assert.equal(p.date, '2026-10-12');
  assert.equal(p.title, 'Как читать объявление об аренде');
  assert.equal(p.texts.dzen.text, 'Основной текст для Дзена.\nВторая строка.');
  assert.equal(p.texts.vk.text, 'Текст для ВК.');
  assert.ok(p.texts.tg.text.startsWith('Текст для Telegram'));
  assert.equal(p.botCall, true);
  assert.equal(p.photo, 'погрузчик 1080×1080.');
  assert.equal(p.topic, 'аренда, объявление');
  assert.equal(p.review, 'проверь цифру.');
  assert.deepEqual(p.sources.map((s) => [s.title, s.url, s.date]), [['78.ru', 'https://78.ru/a', '2026-09-30'], ['zr.ru', 'https://zr.ru/b', '2026-09-29']]);
});
ok('no versions: all platforms use main text', () => {
  const p = r.posts[1];
  assert.equal(p.texts.vk.text, 'Только текст.');
  assert.equal(p.texts.tg.text, 'Только текст.');
  assert.equal(p.botCall, false);
  assert.equal(p.type, 'post');
});
ok('stable id', () => assert.equal(parseDocPosts(DOC, { today: '2026-10-11' }).posts[0].id, r.posts[0].id));
console.log(passed, 'passed');
