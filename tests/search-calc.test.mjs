import assert from 'node:assert/strict';
import { norm, stem, tokens, wordScore, buildIndex, search, matchCompanies } from '../js/search-calc.js';
let passed = 0;
const ok = (n, f) => { f(); passed += 1; console.log('ok', n); };
ok('normalize', () => { assert.equal(norm('  Ёлка, Impulse-Group!! '), 'елка impulse group'); });
ok('stem russian endings', () => {
  assert.equal(stem('проекты'), stem('проекта'));
  assert.equal(stem('задачами'), stem('задачи'));
  assert.equal(stem('сайт'), 'сайт');
  assert.equal(stem('бот'), 'бот');
});
ok('word score: exact, prefix, typo', () => {
  assert.equal(wordScore('сайт', 'сайт'), 3);
  assert.equal(wordScore('сай', 'сайт'), 2);
  assert.equal(wordScore('экскаватр', 'экскаватор'), 1);
  assert.equal(wordScore('бот', 'бут'), 0);
});
const docs = [
  { id: 1, kind: 'project', title: 'Impulse Group сайт', text: 'Сайт компании. Заявки приходят на почту.', tags: ['сайт'] },
  { id: 2, kind: 'task', title: 'Купить хлеб', text: '', tags: [] },
  { id: 3, kind: 'note', title: 'Идеи по экскаваторам', text: 'Какие экскаваторы покупают чаще', tags: ['техника'] },
  { id: 4, kind: 'project', title: 'Бот Спецтех', text: 'Бот ищет заявки на спецтехнику', tags: ['спецтехника'] },
];
const idx = buildIndex(docs);
ok('finds by words in any order and endings', () => {
  assert.deepEqual(search(idx, 'group impulse').map((d) => d.id), [1]);
  assert.deepEqual(search(idx, 'экскаватор').map((d) => d.id), [3]);
  assert.deepEqual(search(idx, 'заявка').map((d) => d.id).sort(), [1, 4]);
});
ok('prefix while typing and typos', () => {
  assert.deepEqual(search(idx, 'хле').map((d) => d.id), [2]);
  assert.deepEqual(search(idx, 'экскаватр').map((d) => d.id), [3]);
});
ok('all words must match', () => {
  assert.deepEqual(search(idx, 'хлеб сайт'), []);
  assert.deepEqual(search(idx, ''), []);
});
ok('title ranks higher than text', () => {
  const r = search(buildIndex([{ id: 'a', title: 'Прочее', text: 'бот', tags: [] }, { id: 'b', title: 'Бот', text: '', tags: [] }]), 'бот');
  assert.equal(r[0].id, 'b');
});
ok('cyrillic query finds latin names', () => {
  assert.deepEqual(search(idx, 'импульс групп').map((d) => d.id), [1]);
  assert.deepEqual(matchCompanies(['Impulse Group', 'Vector Group'], 'Импульс Групп'), ['Impulse Group']);
});
ok('company match', () => {
  assert.deepEqual(matchCompanies(['Impulse Group', 'Vector Group'], 'импульс'), ['Impulse Group']);
  assert.deepEqual(matchCompanies(['Impulse Group', 'Vector Group'], 'impulse gr'), ['Impulse Group']);
  assert.deepEqual(matchCompanies(['Impulse Group', 'Vector Group'], 'group'), ['Impulse Group', 'Vector Group']);
});
console.log(passed, 'passed');
