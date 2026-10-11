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

// ---- обратная запись ----
import { updateCardText } from '../js/projects-parse.js';
let p2 = 0;
const ok2 = (n, f) => { f(); p2 += 1; console.log('ok', n); };
const orig = parseCard('Impulse Group.md', note);
const fields = (c) => ({ company: c.company, types: c.types, status: c.status, tags: c.tags, nextAction: c.nextAction, summary: c.summary, events: c.events, questions: c.questions, links: c.links });
const reparse = (t) => parseCard('Impulse Group.md', t);

ok2('no changes keeps text byte-for-byte (modulo newlines)', () => assert.equal(updateCardText(note, fields(orig), fields(orig)), note));
ok2('status and company change in place, others untouched', () => {
  const out = updateCardText(note, fields(orig), { ...fields(orig), status: 'done', company: 'Новая' });
  const c = reparse(out);
  assert.equal(c.status, 'done'); assert.equal(c.company, 'Новая'); assert.deepEqual(c.types, orig.types); assert.deepEqual(c.tags, orig.tags);
  assert.ok(out.includes('[[Макет]]'), 'wikilink in untouched next kept');
});
ok2('types list rewritten, continuation lines removed', () => {
  const out = updateCardText(note, fields(orig), { ...fields(orig), types: ['Сайт'] });
  assert.deepEqual(reparse(out).types, ['Сайт']); assert.ok(!out.includes('  - Telegram-бот'));
});
ok2('events and summary replaced, other sections kept', () => {
  const out = updateCardText(note, fields(orig), { ...fields(orig), summary: 'Новая сводка', events: [{ date: '2026-10-11', text: 'Новое' }, ...orig.events] });
  const c = reparse(out);
  assert.equal(c.summary, 'Новая сводка'); assert.equal(c.events.length, 3); assert.equal(c.events[0].text, 'Новое'); assert.deepEqual(c.questions, orig.questions); assert.deepEqual(c.links, orig.links);
});
ok2('missing section is appended', () => {
  const n2 = '---\nstatus: active\n---\n# X\n\n## Сводка\nтекст\n';
  const b = parseCard('x.md', n2);
  const out = updateCardText(n2, fields(b), { ...fields(b), questions: ['Что дальше?'] });
  assert.deepEqual(reparse(out).questions, ['Что дальше?']); assert.equal(reparse(out).summary, 'текст');
});
ok2('missing frontmatter key added; unknown keys kept', () => {
  const n3 = '---\naliases: [x]\nstatus: active\n---\n# X\n';
  const b = parseCard('x.md', n3);
  const out = updateCardText(n3, fields(b), { ...fields(b), company: 'Компания', tags: ['a'] });
  assert.ok(out.includes('aliases: [x]')); assert.equal(reparse(out).company, 'Компания'); assert.deepEqual(reparse(out).tags, ['a']);
});
ok2('russian keys reused', () => {
  const n4 = '---\nкомпания: Старая\nстатус: идёт\n---\n';
  const b = parseCard('x.md', n4);
  const out = updateCardText(n4, fields(b), { ...fields(b), company: 'Новая' });
  assert.ok(out.includes('компания: Новая') && !out.includes('company:'));
});
ok2('special chars quoted', () => {
  const out = updateCardText(note, fields(orig), { ...fields(orig), nextAction: 'Сделать: срочно' });
  assert.equal(reparse(out).nextAction, 'Сделать: срочно');
});
console.log(`${p2} write-back passed`);
