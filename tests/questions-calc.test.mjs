import assert from 'node:assert/strict';
import { collectQuestions, filterQuestions, groupQuestions, countOpen, customerQuestions, customerMessage, keyOf, NO_PROJECT } from '../js/questions-calc.js';
let passed = 0;
const ok = (n, f) => { f(); passed += 1; console.log('ok', n); };
const P = [{ id: 'p1', name: 'Сайт', questions: ['Куда заявки?', 'Номер Метрики'] }, { id: 'p2', name: 'Бот', questions: ['Оплата?'] }, { id: 'p3', name: 'Пусто', questions: [] }];
ok('card questions become open items without records', () => {
  const it = collectQuestions(P, []);
  assert.equal(it.length, 3); assert.ok(it.every((q) => q.status === 'open' && q.who === 'unset' && q.id === null));
  assert.equal(countOpen(it), 3);
});
ok('record sets status and who for card question', () => {
  const rec = [{ id: 'r1', origin: 'card', key: keyOf('p1', 'куда  заявки?'), text: 'Куда заявки?', projectId: 'p1', who: 'customer', status: 'resolved', created: 5 }];
  const it = collectQuestions(P, rec);
  const q = it.find((x) => x.text === 'Куда заявки?');
  assert.equal(q.status, 'resolved'); assert.equal(q.who, 'customer'); assert.equal(q.id, 'r1'); assert.equal(it.length, 3);
});
ok('line gone from note closes the question automatically', () => {
  const rec = [{ id: 'r2', origin: 'card', key: keyOf('p1', 'Старый вопрос'), text: 'Старый вопрос', projectId: 'p1', who: 'me', status: 'open', created: 1 }];
  const it = collectQuestions(P, rec).find((x) => x.text === 'Старый вопрос');
  assert.equal(it.status, 'resolved'); assert.equal(it.auto, true);
});
ok('manual questions with and without project; deleted project keeps name', () => {
  const rec = [{ id: 'm1', origin: 'manual', text: 'Ручной', projectId: 'p2', who: 'me', status: 'open', created: 9 }, { id: 'm2', origin: 'manual', text: 'Общий', projectId: '', who: 'other', status: 'postponed', created: 8 }, { id: 'm3', origin: 'manual', text: 'Из удалённого', projectId: 'gone', projectName: 'Старый проект', who: 'me', status: 'open', created: 7 }];
  const it = collectQuestions(P, rec);
  assert.equal(it.find((x) => x.text === 'Ручной').project, 'Бот');
  assert.equal(it.find((x) => x.text === 'Общий').project, NO_PROJECT);
  assert.equal(it.find((x) => x.text === 'Из удалённого').project, 'Старый проект');
});
ok('filter by status and project', () => {
  const rec = [{ id: 'm2', origin: 'manual', text: 'Общий', projectId: '', who: 'other', status: 'postponed', created: 8 }];
  const it = collectQuestions(P, rec);
  assert.equal(filterQuestions(it).length, 3); assert.equal(filterQuestions(it, { status: 'postponed' }).length, 1);
  assert.equal(filterQuestions(it, { status: 'all' }).length, 4); assert.equal(filterQuestions(it, { projectId: 'p1' }).length, 2);
});
ok('group by project (no-project last) and by who', () => {
  const rec = [{ id: 'm2', origin: 'manual', text: 'Общий', projectId: '', who: 'other', status: 'open', created: 8 }, { id: 'm1', origin: 'manual', text: 'Мой', projectId: 'p2', who: 'me', status: 'open', created: 9 }];
  const it = filterQuestions(collectQuestions(P, rec));
  assert.deepEqual(groupQuestions(it).map((g) => g.label), ['Бот', 'Сайт', NO_PROJECT]);
  assert.deepEqual(groupQuestions(it, 'who').map((g) => g.label), ['Не указано', 'Я сам', 'Кто-то ещё']);
});
ok('customer message: open, not mine, numbered', () => {
  const rec = [{ id: 'r', origin: 'card', key: keyOf('p1', 'Номер Метрики'), text: 'Номер Метрики', projectId: 'p1', who: 'me', status: 'open', created: 1 }, { id: 'm', origin: 'manual', text: 'ОГРН и ИНН;', projectId: 'p1', who: 'customer', status: 'open', created: 2 }];
  const it = collectQuestions(P, rec);
  const qs = customerQuestions(it, 'p1');
  assert.deepEqual(qs.map((q) => q.text).sort(), ['ОГРН и ИНН;', 'Куда заявки?'].sort());
  const msg = customerMessage('Сайт', qs);
  assert.ok(msg.startsWith('Добрый день! По проекту «Сайт» остались вопросы:\n1. ') && msg.includes('2. ') && !msg.includes('Метрики') && !msg.includes(';'), msg);
  assert.equal(customerMessage('Сайт', []), '');
});
console.log(`${passed} passed`);
