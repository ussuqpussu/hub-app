import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseFront, parseChronicle, parseSkill, parsePrompt, buildKnowledge, normalizeKnowledge, chronicleProjects, groupByDay, dayLabel, chronicleText, doneHeading } from '../js/knowledge-calc.js';

let n = 0;
const md = `---
date: 2026-10-19
project: Хаб
title: Знания и автосборка
source: сессия Claude
---
По проекту Хаб было сделано:
- «Знания» читают hub-projects/knowledge
- убран питомец
  и его стили
## Решено
- бот не нужен
`;

const f = parseFront(md);
assert.equal(f.meta.project, 'Хаб'); assert.equal(f.meta.source, 'сессия Claude'); n += 2;
assert.deepEqual(parseFront('---\ntags: [код, "ревью"]\n---\nx').meta.tags, ['код', 'ревью']); n += 1;
assert.equal(parseFront('без шапки').body, 'без шапки'); n += 1;

const e = parseChronicle('chronicle/2026-10-19--hub.md', md);
assert.equal(e.date, '2026-10-19'); assert.equal(e.project, 'Хаб'); assert.equal(e.title, 'Знания и автосборка'); n += 3;
assert.deepEqual(e.sections.map((s) => s.name), ['Сделано', 'Решено']); n += 1;
assert.equal(e.sections[0].items[1], 'убран питомец и его стили'); n += 1;
assert.equal(doneHeading(e), 'По проекту Хаб было сделано'); n += 1;
assert.match(chronicleText(e), /бот не нужен/); n += 1;
// дата и проект из имени файла, если шапки нет
const e2 = parseChronicle('chronicle/2026-10-18--Рупор.md', '- пост про трал\n');
assert.equal(e2.date, '2026-10-18'); assert.equal(e2.project, 'Рупор'); n += 2;
// пустая или битая запись не попадает в хронику
assert.equal(parseChronicle('chronicle/x.md', '- пункт'), null); assert.equal(parseChronicle('chronicle/2026-10-18--a.md', 'просто текст'), null); n += 2;

const sk = parseSkill('code-review', '---\nname: "code-review"\ndescription: Строгая проверка\n---\n\n# Проверка\n\nВерсия 1.4 — 2026-10-06\n', [['SKILL.md', 4000], ['references/a.md', 10]]);
assert.equal(sk.version, '1.4'); assert.equal(sk.date, '2026-10-06'); assert.equal(sk.about, 'Строгая проверка'); assert.equal(sk.files.length, 2); n += 4;

const pr = parsePrompt('prompts/landing.md', '---\ntitle: Лендинг\nabout: сайт за вечер\ntags: [сайты]\n---\n# Лендинг\nСделай лендинг…');
assert.equal(pr.name, 'Лендинг'); assert.deepEqual(pr.tags, ['сайты']); assert.equal(parsePrompt('prompts/empty.md', '---\ntitle: x\n---\n'), null); n += 3;

const idx = buildKnowledge({
  chronicle: [{ path: 'chronicle/2026-10-18--Рупор.md', text: '- пост' }, { path: 'chronicle/2026-10-19--hub.md', text: md }, { path: 'chronicle/2026-10-19--Импульс.md', text: '---\nproject: Импульс Групп\n---\n- правки сайта' }],
  skills: [{ name: 'b', text: '---\nname: b\n---\nx' }, { name: 'a', text: '---\nname: a\n---\ny' }],
  prompts: [],
  tags: { a: ['тег'] },
}, '2026-10-19T20:00:00Z');
assert.deepEqual(idx.chronicle.map((x) => x.project), ['Импульс Групп', 'Хаб', 'Рупор']); n += 1;
assert.deepEqual(idx.skills.map((x) => x.name), ['a', 'b']); assert.deepEqual(idx.skills[0].tags, ['тег']); n += 2;

const norm = normalizeKnowledge({ chronicle: [{ date: 'плохо', project: 'x', sections: [{ items: ['a'] }] }, { date: '2026-10-19', project: 'Хаб', sections: [{ name: '', items: ['ok', ''] }] }], skills: [{ name: '' }, { name: 's', files: [['a', 1], 'bad'] }], prompts: [{ name: 'p' }] });
assert.equal(norm.chronicle.length, 1); assert.equal(norm.chronicle[0].sections[0].name, 'Сделано'); assert.deepEqual(norm.chronicle[0].sections[0].items, ['ok']); n += 3;
assert.equal(norm.skills.length, 1); assert.equal(norm.skills[0].files.length, 1); assert.equal(norm.prompts.length, 0); n += 3;
assert.equal(normalizeKnowledge(null), null); n += 1;

const pj = chronicleProjects(idx.chronicle);
assert.equal(pj[0].last, '2026-10-19'); assert.equal(pj.find((p) => p.name === 'Рупор').count, 1); n += 2;
const g = groupByDay(idx.chronicle);
assert.deepEqual(g.map((x) => [x.date, x.entries.length]), [['2026-10-19', 2], ['2026-10-18', 1]]); n += 1;

const now = new Date(2026, 9, 19, 12);
assert.equal(dayLabel('2026-10-19', now), 'Сегодня, 19 октября'); assert.equal(dayLabel('2026-10-18', now), 'Вчера, 18 октября'); n += 2;
assert.equal(dayLabel('2026-10-14', now), '14 октября, среда'); assert.equal(dayLabel('2025-12-31', now), '31 декабря 2025, среда'); n += 2;

// сборка index.json скриптом из настоящих файлов
const dir = mkdtempSync(join(tmpdir(), 'kn-'));
mkdirSync(join(dir, 'chronicle')); mkdirSync(join(dir, 'skills', 'code-review', 'references'), { recursive: true }); mkdirSync(join(dir, 'prompts'));
writeFileSync(join(dir, 'chronicle', '2026-10-19--hub.md'), md);
writeFileSync(join(dir, 'skills', 'code-review', 'SKILL.md'), '---\nname: code-review\ndescription: d\n---\nВерсия 1.4 — 2026-10-06\n');
writeFileSync(join(dir, 'skills', 'code-review', 'references', 'a.md'), 'abc');
writeFileSync(join(dir, 'prompts', 'p.md'), '---\ntitle: Промпт\n---\nтекст');
const script = new URL('../scripts/build-knowledge.mjs', import.meta.url).pathname;
execFileSync(process.execPath, [script, dir]);
const built = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
assert.equal(built.chronicle.length, 1); assert.deepEqual(built.skills[0].files.map((x) => x[0]), ['SKILL.md', 'references/a.md']); assert.equal(built.prompts[0].name, 'Промпт'); n += 3;
const again = execFileSync(process.execPath, [script, dir]).toString();
assert.match(again, /не изменился/); n += 1;

console.log(`${n} passed`);
