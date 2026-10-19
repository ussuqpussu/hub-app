import assert from 'node:assert/strict';
import * as C from '../js/diary-calc.js';
import * as D from '../js/diary-data.js';
import * as T from '../js/diary-texts.js';

let passed = 0;
const ok = (n, f) => { f(); passed += 1; console.log('ok', n); };
const TODAY = '2026-10-19';
let uid = 0;
const E = (date, mood, extra = {}) => { uid += 1; return { id: extra.id || `e${uid}`, kind: 'day', date, mood, feelings: [], factors: [], text: '', created: uid, updatedAt: uid, ...extra }; };

ok('даты и дни недели', () => {
  assert.equal(C.addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(C.addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(C.daysBetween('2026-10-01', '2026-10-19'), 18);
  assert.equal(C.weekdayOf('2026-10-19'), 0); // понедельник
  assert.equal(C.dayTitle(TODAY, TODAY), 'Сегодня');
  assert.equal(C.dayTitle('2026-10-18', TODAY), 'Вчера');
  assert.equal(C.dayTitle('2026-10-05', TODAY), '5 октября, понедельник');
  assert.equal(C.dayTitle('2025-10-05', TODAY), '5 октября 2025');
});
ok('склонение', () => {
  assert.equal(C.plural(1, 'день', 'дня', 'дней'), 'день');
  assert.equal(C.plural(3, 'день', 'дня', 'дней'), 'дня');
  assert.equal(C.plural(11, 'день', 'дня', 'дней'), 'дней');
  assert.equal(C.plural(21, 'день', 'дня', 'дней'), 'день');
});
ok('справочники целы', () => {
  assert.equal(D.SCALE.length, 7);
  assert.deepEqual(D.SCALE.map((s) => s.v), [-3, -2, -1, 0, 1, 2, 3]);
  const ids = (a) => a.map((x) => x.id);
  assert.equal(new Set(ids(D.FACTORS)).size, D.FACTORS.length);
  assert.equal(new Set(ids(D.FEELINGS)).size, D.FEELINGS.length);
  D.FACTORS.forEach((f) => { assert.ok(D.FACTOR_GROUPS.some((g) => g.id === f.group), f.id); assert.ok(T.FACTOR[f.id] && T.FACTOR[f.id].bad.length && T.FACTOR[f.id].good.length, `тексты для ${f.id}`); });
  D.FEELINGS.filter((f) => f.band === 'neg').forEach((f) => assert.ok(T.FEELING[f.id], `совет для чувства ${f.id}`));
  for (const v of [-3, -2, -1, 0, 1, 2, 3]) assert.ok(T.MOOD[String(v)].length >= 10, `фраз для уровня ${v}`);
  assert.ok(D.feelingsFor(-2).every((f) => f.band !== 'pos'));
  assert.ok(D.feelingsFor(2).every((f) => f.band !== 'neg'));
  assert.equal(D.feelingsFor(0)[0].band, 'mid');
});
ok('все тексты непустые, без дублей и латинских подстановок, мужской род к владельцу', () => {
  const all = [];
  const walk = (o) => (Array.isArray(o) ? o.forEach((x) => (typeof x === 'string' ? all.push(x) : walk(x))) : o && typeof o === 'object' && Object.values(o).forEach((x) => (typeof x === 'string' ? all.push(x) : walk(x))));
  [T.MOOD, T.FACTOR, T.FEELING, T.JOY, T.GRATITUDE, T.GOOD_STREAK, T.ENTRY_STREAK, T.HARD_STREAK, T.RETURN, T.BOUNCE, T.RECORD, T.TREND_UP, T.TREND_DOWN, T.PROMPTS, T.NUDGE, T.AFTER_HARD, T.WEEK_GOOD, T.WEEK_HARD, T.SAFETY_NOTE].forEach(walk);
  assert.ok(all.length > 400, `фраз: ${all.length}`);
  all.forEach((t) => { assert.ok(t.trim().length > 10, t); assert.ok(!/[{][^nfdwp}]/.test(t), t); assert.ok(!/\s{2,}/.test(t), t); assert.ok(!/—/.test(t), `тире в тексте: ${t}`); });
  assert.equal(new Set(all).size, all.length, 'дубли фраз');
});
ok('запись: очистка и проверка', () => {
  const c = C.cleanEntry({ kind: 'x', date: '2026-10-19', mood: 9, feelings: ['joy', 'joy', 'нет'], factors: ['work', 'zzz'], text: '  привет  ', time: '25:00' });
  assert.equal(c.kind, 'day'); assert.equal(c.mood, 3); assert.deepEqual(c.feelings, ['joy']); assert.deepEqual(c.factors, ['work']); assert.equal(c.text, 'привет'); assert.equal(c.time, '');
  assert.equal(C.cleanEntry({ mood: -9, date: 'ерунда' }).mood, -3);
  assert.ok(C.validEntry(E(TODAY, 0)));
  assert.ok(!C.validEntry({ date: TODAY, mood: 1.5, kind: 'day' }));
  assert.ok(!C.validEntry({ date: 'x', mood: 1, kind: 'day' }));
  assert.ok(!C.validEntry({ date: TODAY, mood: 1, kind: 'other' }));
});
ok('день: «весь день» главнее моментов, иначе среднее', () => {
  const m = C.dayMap([E(TODAY, 2, { kind: 'moment', time: '10:00' }), E(TODAY, -2, { kind: 'moment', time: '18:00' }), E('2026-10-18', 1, { kind: 'moment' }), E('2026-10-18', 3, { kind: 'day' })]);
  assert.equal(m.get(TODAY).mood, 0);
  assert.equal(m.get('2026-10-18').mood, 3);
  assert.equal(m.get(TODAY).entries.length, 2);
  assert.equal(m.get(TODAY).min, -2); assert.equal(m.get(TODAY).max, 2);
});
ok('серии: сегодня ещё можно записать', () => {
  const es = [E('2026-10-18', 2), E('2026-10-17', 3), E('2026-10-16', 1), E('2026-10-14', 2)];
  const s = C.streaks(C.dayMap(es), TODAY);
  assert.equal(s.entries, 3); assert.equal(s.good, 3); assert.equal(s.hard, 0);
  const es2 = [E(TODAY, -2), E('2026-10-18', -1), E('2026-10-17', 2)];
  assert.equal(C.streaks(C.dayMap(es2), TODAY).hard, 2);
  assert.equal(C.streaks(C.dayMap([E('2026-10-10', 3)]), TODAY).entries, 0);
  const es3 = [E('2026-10-01', 2), E('2026-10-02', 2), E('2026-10-03', 2), E('2026-10-04', -1), E('2026-10-06', 2)];
  assert.equal(C.streaks(C.dayMap(es3), TODAY).goodBest, 3);
});
ok('статистика факторов: среднее, разница, доля в плохие дни', () => {
  const es = [];
  for (let i = 1; i <= 6; i += 1) es.push(E(C.addDays(TODAY, -i), -2, { factors: ['education'] }));
  for (let i = 7; i <= 12; i += 1) es.push(E(C.addDays(TODAY, -i), 2, { factors: ['friends'] }));
  const f = C.factorStats(C.dayMap(es));
  const edu = f.find((x) => x.id === 'education');
  assert.equal(edu.n, 6); assert.equal(edu.avg, -2); assert.equal(edu.others, 2); assert.equal(edu.delta, -4); assert.equal(edu.inBad, 1);
  assert.equal(f.find((x) => x.id === 'friends').delta, 4);
  assert.ok(!f.find((x) => x.id === 'money'));
});
ok('наблюдения: нет выводов по малому числу данных', () => {
  const es = [E('2026-10-18', -3, { factors: ['work'] }), E('2026-10-17', -3, { factors: ['work'] })];
  const o = C.observations(C.summary(es, TODAY), TODAY);
  assert.ok(!o.some((x) => x.id.startsWith('f-')), 'фактор по двум дням');
  assert.deepEqual(C.observations(C.summary([], TODAY), TODAY), []);
});
ok('наблюдения: фактор, серия, неделя', () => {
  const es = [];
  for (let i = 1; i <= 5; i += 1) es.push(E(C.addDays(TODAY, -i), 2));
  for (let i = 6; i <= 12; i += 1) es.push(E(C.addDays(TODAY, -i), -2, { factors: ['sleep'] }));
  const s = C.summary(es, TODAY);
  const o = C.observations(s, TODAY);
  assert.ok(o.some((x) => x.id === 'good-streak' && /5 хороших дней подряд/.test(x.text)), JSON.stringify(o.map((x) => x.id)));
  assert.ok(o.some((x) => x.id === 'f-neg-sleep'));
  assert.ok(o.some((x) => x.id === 'tip-sleep'));
  assert.ok(o.some((x) => x.id === 'week-up'));
  assert.ok(o.every((x, i, a) => i === 0 || a[i - 1].w >= x.w), 'порядок по важности');
});
ok('дни недели и время суток', () => {
  const es = [];
  for (let k = 0; k < 4; k += 1) { es.push(E(C.addDays('2026-10-19', -7 * k), -2)); es.push(E(C.addDays('2026-10-20', -7 * k), 2)); es.push(E(C.addDays('2026-10-21', -7 * k), 1)); es.push(E(C.addDays('2026-10-22', -7 * k), 0)); }
  const w = C.weekdayStats(C.dayMap(es));
  assert.equal(w[0].avg, -2); assert.equal(w[1].avg, 2);
  assert.equal(C.slotOf('07:30'), 'morning'); assert.equal(C.slotOf('23:00'), 'evening'); assert.equal(C.slotOf('03:00'), 'night');
});
ok('кризисные слова', () => {
  assert.ok(C.detectCrisis('Я не хочу жить, всё надоело'));
  assert.ok(C.detectCrisis('думаю про суицид'));
  assert.ok(C.detectCrisis('ХОЧУ УМЕРЕТЬ'));
  assert.ok(!C.detectCrisis('умер дедушка, очень грустно'));
  assert.ok(!C.detectCrisis('жить в Москве непросто'));
  assert.ok(!C.detectCrisis('Сдал экзамен, супер день'));
});
ok('радость и благодарность', () => {
  assert.ok(C.hasJoy('Наконец-то получилось, ура!'));
  assert.ok(!C.hasJoy('Обычный день на работе'));
  assert.ok(C.hasGratitude('Спасибо маме за помощь'));
});
ok('ответ: кризис вместо советов, контакты есть', () => {
  const e = E(TODAY, -3, { text: 'не хочу жить' });
  const r = C.respond(e, [e], TODAY);
  assert.ok(r.crisis); assert.equal(r.lines.length, 1); assert.ok(r.help.some((h) => h.tel === '88003334434'));
  assert.ok(!JSON.stringify(r).includes('Попробуй'), 'без советов');
});
ok('ответ: плохой день с фактором и чувством даёт совет, не повторяется', () => {
  const e = E(TODAY, -2, { factors: ['education'], feelings: ['anxious'], text: 'завал' });
  const r1 = C.respond(e, [e], TODAY);
  assert.ok(!r1.crisis); assert.ok(r1.lines.length >= 3 && r1.lines.length <= 4);
  assert.equal(new Set(r1.lines).size, r1.lines.length);
  assert.ok(r1.lines.some((l) => T.FACTOR.education.bad.includes(l)));
  assert.ok(r1.lines.some((l) => T.FEELING.anxious.includes(l)));
  const recent = new Set(r1.lines);
  const e2 = { ...e, id: 'other' };
  const r2 = C.respond(e2, [e2], TODAY, recent);
  assert.ok(!r2.lines.some((l) => T.MOOD['-2'].includes(l) && recent.has(l)), 'фраза уровня не повторилась');
});
ok('ответ: хороший день с радостью, серия, отскок, веха', () => {
  const es = [E('2026-10-17', -2), E('2026-10-18', 2)];
  const cur = E(TODAY, 3, { text: 'Наконец-то получилось! Спасибо всем', factors: ['projects'] });
  const r = C.respond(cur, [...es, cur], TODAY);
  assert.equal(r.title, 'Здорово');
  assert.ok(r.lines.some((l) => T.JOY.includes(l)));
  assert.ok(r.lines.some((l) => T.GRATITUDE.includes(l)));
  assert.ok(r.lines.some((l) => T.FACTOR.projects.good.includes(l)));
  const only = E(TODAY, 1);
  assert.ok(C.respond(only, [only], TODAY).lines.includes(T.MILESTONE[1]));
});
ok('фильтры и поиск', () => {
  const es = [E(TODAY, 2, { factors: ['work'], text: 'Закончил сайт' }), E('2026-09-01', -2, { factors: ['money'] })];
  assert.equal(C.filterEntries(es, { today: TODAY }).length, 2);
  assert.equal(C.filterEntries(es, { today: TODAY, period: 'week' }).length, 1);
  assert.equal(C.filterEntries(es, { today: TODAY, mood: 'bad' }).length, 1);
  assert.equal(C.filterEntries(es, { today: TODAY, factor: 'work' }).length, 1);
  const d = C.searchDoc(es[0]);
  assert.equal(d.title, 'Закончил сайт'); assert.ok(d.tags.includes('Работа'));
});
ok('pick: стабильно и обходит недавнее', () => {
  const l = ['a', 'b', 'c'];
  assert.equal(C.pick(l, 'x'), C.pick(l, 'x'));
  assert.notEqual(C.pick(l, 'x', new Set([C.pick(l, 'x')])), C.pick(l, 'x'));
  assert.equal(C.pick([], 'x'), null);
  assert.equal(C.pick(l, 'x', new Set(l)), C.pick(l, 'x'));
});
console.log(passed, 'passed');
ok('доп. статистика: восстановление, дни без тяжёлых, воспоминания', () => {
  const mk = (d, m) => C.cleanEntry({ id: `day-${d}`, created: 1, kind: 'day', date: d, mood: m });
  const es = [mk('2026-09-19', 2), mk('2026-10-01', -2), mk('2026-10-02', 1), mk('2026-10-05', -1), mk('2026-10-06', -1), mk('2026-10-07', 0), mk('2026-10-08', 1), mk('2026-10-10', -3), mk('2026-10-11', 2), mk('2026-10-12', 1)];
  const s = C.summary(es, '2026-10-19');
  const x = C.extras(s, '2026-10-19');
  assert.equal(x.recoveries, 3);
  assert.equal(x.recoveryDays, 1.3);
  assert.equal(x.sinceHard, 9);
  assert.equal(x.memories.length, 2);
  assert.equal(x.longestGap, 11);
  assert.ok(C.observations(s, '2026-10-19').some((o) => o.id === 'since-hard'));
});
ok('склонение в тексте {p:…}', () => {
  assert.equal(C.fill('{n} {p:день|дня|дней}', { n: 21 }), '21 день');
  assert.equal(C.fill('{n} {p:день|дня|дней}', { n: 3 }), '3 дня');
  assert.equal(C.fill('{n} {p:день|дня|дней}', { n: 12 }), '12 дней');
});
