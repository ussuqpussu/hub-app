import assert from 'node:assert/strict';
import { parseNoteTags, normalizeUrl, hostOf, noteTitle, allTags, filterNotes } from '../js/notes-calc.js';
let passed = 0;
const ok = (n, f) => { f(); passed += 1; console.log('ok', n); };
ok('tags', () => { assert.deepEqual(parseNoteTags('#Работа, идеи; работа\n  '), ['работа', 'идеи']); assert.deepEqual(parseNoteTags(''), []); });
ok('urls', () => {
  assert.equal(normalizeUrl('example.com/a'), 'https://example.com/a');
  assert.equal(normalizeUrl('http://x.ru'), 'http://x.ru/');
  assert.equal(normalizeUrl('javascript:alert(1)'), '');
  assert.equal(normalizeUrl('просто слова'), '');
  assert.equal(normalizeUrl('localhost'), '');
  assert.equal(hostOf('https://www.dzen.ru/a'), 'dzen.ru');
});
ok('titles', () => {
  assert.equal(noteTitle({ kind: 'link', url: 'https://www.dzen.ru/a' }), 'dzen.ru');
  assert.equal(noteTitle({ kind: 'note', text: 'Первая строка\nвторая' }), 'Первая строка');
  assert.equal(noteTitle({ kind: 'note', title: ' Своё ', text: 'x' }), 'Своё');
});
ok('tags list and filter', () => {
  const n = [{ kind: 'note', tags: ['a', 'b'] }, { kind: 'link', tags: ['b'] }, { kind: 'link', tags: [] }];
  assert.deepEqual(allTags(n), ['b', 'a']);
  assert.equal(filterNotes(n, { kind: 'link' }).length, 2);
  assert.equal(filterNotes(n, { tag: 'b' }).length, 2);
  assert.equal(filterNotes(n, { kind: 'link', tag: 'b' }).length, 1);
});
console.log(passed, 'passed');
