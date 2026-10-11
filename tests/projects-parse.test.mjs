import assert from 'node:assert/strict';
import { parseCard, splitFrontmatter, parseEvent } from '../js/projects-parse.js';
let passed = 0;
const ok = (n, f) => { f(); passed += 1; console.log('ok', n); };

const note = `---
company: Impulse Group
type:
  - Сайт
  - Telegram-бот
status: ждёт заказчика
tags: [b2b, "склад"]
next: Согласовать [[Макет]]
---
# Impulse Group

## Сводка
Сайт и бот для склада.
Идёт согласование.

## Последние события
- 2026-10-05: Выложили главную
- 03.10.2026 Отправили макет
- без даты

## Открытые вопросы
- Какой домен?

## Ссылки
- [Сайт](https://example.com)
- Бот: https://t.me/bot
`;

ok('frontmatter lists and inline lists', () => { const { props } = splitFrontmatter(note); assert.deepEqual(props.type, ['Сайт', 'Telegram-бот']); assert.deepEqual(props.tags, ['b2b', 'склад']); });
ok('card fields', () => {
  const c = parseCard('Проекты/Impulse Group.md', note);
  assert.equal(c.name, 'Impulse Group'); assert.equal(c.company, 'Impulse Group'); assert.equal(c.status, 'waiting');
  assert.deepEqual(c.types, ['Сайт', 'Telegram-бот']); assert.equal(c.nextAction, 'Согласовать Макет'); assert.equal(c.id, 'obs:Проекты/Impulse Group.md');
});
ok('summary multi-line', () => assert.equal(parseCard('a.md', note).summary, 'Сайт и бот для склада.\nИдёт согласование.'));
ok('events both date formats, junk skipped', () => { const e = parseCard('a.md', note).events; assert.equal(e.length, 2); assert.deepEqual(e[1], { date: '2026-10-03', text: 'Отправили макет' }); });
ok('questions and links', () => { const c = parseCard('a.md', note); assert.deepEqual(c.questions, ['Какой домен?']); assert.deepEqual(c.links, [{ title: 'Сайт', url: 'https://example.com' }, { title: 'Бот', url: 'https://t.me/bot' }]); });
ok('note without frontmatter is not a card', () => assert.equal(parseCard('тест.md', 'тест'), null));
ok('frontmatter without card keys is not a card', () => assert.equal(parseCard('x.md', '---\naliases: [x]\n---\ntext'), null));
ok('unknown status falls back to active', () => assert.equal(parseCard('x.md', '---\nstatus: ???\n---\n').status, 'active'));
ok('crlf and bom', () => assert.equal(parseCard('x.md', '﻿---\r\ncompany: A\r\n---\r\n# x\r\n').company, 'A'));
ok('title overrides filename', () => assert.equal(parseCard('x.md', '---\ntitle: Имя\nstatus: done\n---\n').name, 'Имя'));
ok('parseEvent null', () => assert.equal(parseEvent('просто текст'), null));
console.log(`${passed} passed`);
