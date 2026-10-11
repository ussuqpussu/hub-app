import assert from 'node:assert/strict';
import { normalizeArch, computeLayout, layers, removeNode, newId, schemaPath, NODE_W, NODE_H } from '../js/arch-calc.js';
let passed = 0;
const ok = (n, f) => { f(); passed += 1; console.log('ok', n); };
const raw = {
  nodes: [{ id: 'form', type: 'site', name: 'Сайт' }, { id: 'bot', type: 'bot', name: 'Бот', status: 'ok' }, { id: 'subs', type: 'service', name: 'Подписчики' }, { id: 'srv', type: 'server', name: 'Хостинг' }, { id: 'dup', type: 'x' }, { id: 'dup' }, { name: 'без id' }],
  edges: [{ from: 'form', to: 'bot', label: 'заявка' }, { from: 'bot', to: 'subs', label: 'рассылка' }, { from: 'bot', to: 'zzz' }, { from: 'form', to: 'form' }, { from: 'subs', to: 'form', label: 'обратно' }],
  groups: [{ id: 'g1', name: 'Сервер', nodes: ['form', 'bot', 'nope'] }],
};
const a = normalizeArch(raw);
ok('normalize drops dup/empty nodes, bad edges, self loops', () => { assert.equal(a.nodes.length, 5); assert.equal(a.edges.length, 3); assert.deepEqual(a.groups[0].nodes, ['form', 'bot']); });
ok('defaults: unknown type -> other, status unknown', () => { assert.equal(a.nodes.find((n) => n.id === 'dup').type, 'other'); assert.equal(a.nodes[0].status, 'unknown'); });
ok('garbage input gives empty arch', () => { assert.deepEqual(normalizeArch(null), { schema: 1, nodes: [], edges: [], groups: [] }); assert.deepEqual(normalizeArch('x').nodes, []); });
ok('layers: chain left to right, cycle edge is back edge', () => {
  const { level, back } = layers(a);
  assert.equal(level.get('form'), 0); assert.equal(level.get('bot'), 1); assert.equal(level.get('subs'), 2); assert.ok(back.has('subs>form'));
});
const lay = computeLayout(a);
ok('layout: no node overlaps', () => {
  for (let i = 0; i < lay.nodes.length; i += 1) for (let j = i + 1; j < lay.nodes.length; j += 1) {
    const p = lay.nodes[i]; const q = lay.nodes[j];
    assert.ok(p.x + p.w <= q.x || q.x + q.w <= p.x || p.y + p.h <= q.y || q.y + q.h <= p.y, `${p.id} overlaps ${q.id}`);
  }
});
ok('layout: everything inside canvas', () => lay.nodes.forEach((n) => { assert.ok(n.x >= 0 && n.y >= 0 && n.x + n.w <= lay.width && n.y + n.h <= lay.height); }));
ok('layout: group box contains its nodes', () => {
  const g = lay.groups[0];
  ['form', 'bot'].forEach((id) => { const n = lay.nodes.find((x) => x.id === id); assert.ok(n.x >= g.x && n.y >= g.y && n.x + n.w <= g.x + g.w && n.y + n.h <= g.y + g.h); });
});
ok('layout: one path per edge, labels kept', () => { assert.equal(lay.edges.length, 3); assert.ok(lay.edges.every((e) => e.d.startsWith('M'))); assert.equal(lay.edges[0].label, 'заявка'); });
ok('layout: empty arch', () => { const l = computeLayout(normalizeArch({})); assert.equal(l.nodes.length, 0); assert.ok(l.width > 0 && l.height > 0); });
ok('layout: same group nodes adjacent in a column', () => {
  const g = normalizeArch({ nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }], edges: [], groups: [{ id: 'g', name: 'G', nodes: ['a', 'c'] }] });
  const l = computeLayout(g); const ys = (id) => l.nodes.find((n) => n.id === id).y;
  assert.ok(Math.abs(ys('a') - ys('c')) < NODE_H * 3);
});
ok('removeNode cleans edges and groups', () => { const r = removeNode(a, 'bot'); assert.ok(!r.nodes.some((n) => n.id === 'bot')); assert.ok(!r.edges.some((e) => e.from === 'bot' || e.to === 'bot')); assert.deepEqual(r.groups[0].nodes, ['form']); });
ok('newId unique', () => { assert.equal(newId(a, 'Бот'), 'бот'); assert.equal(newId(a, 'bot'), 'bot-2'); });
ok('schemaPath', () => assert.equal(schemaPath('Проекты/Impulse Group сайт.md'), 'architecture/Impulse Group сайт.json'));

import { freezeLayout, addNode, setGroup, groupNameOf } from '../js/arch-calc.js';
const base = normalizeArch({ nodes: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], edges: [{ from: 'a', to: 'b', label: 'x' }] });
ok('x,y kept only as a pair, clamped', () => {
  const r = normalizeArch({ nodes: [{ id: 'a', x: 10.4, y: 20 }, { id: 'b', x: 5 }, { id: 'c', x: -9, y: 99999 }, { id: 'd', x: null, y: null }] });
  assert.deepEqual([r.nodes[0].x, r.nodes[0].y], [10, 20]);
  assert.equal(r.nodes[1].x, undefined); assert.deepEqual([r.nodes[2].x, r.nodes[2].y], [0, 5000]); assert.equal(r.nodes[3].x, undefined);
});
ok('freezeLayout keeps positions and is stable', () => {
  const f = freezeLayout(base);
  const L0 = computeLayout(base); const L1 = computeLayout(f);
  assert.deepEqual(L0.nodes.map((p) => [p.x, p.y]), L1.nodes.map((p) => [p.x, p.y]));
  assert.deepEqual(freezeLayout(f), f);
});
ok('manual node moves and arrow follows', () => {
  const f = freezeLayout(base);
  const m = { ...f, nodes: f.nodes.map((n) => (n.id === 'b' ? { ...n, x: 40, y: 400 } : n)) };
  const L = computeLayout(m);
  const b = L.nodes.find((p) => p.id === 'b');
  assert.deepEqual([b.x, b.y], [40, 400]);
  assert.match(L.edges[0].d, /^M[\d.]+,[\d.]+ C/);
  assert.ok(L.height >= 400 + 64);
  const end = L.edges[0].d.split(' ').pop().split(',').map(Number);
  assert.ok(end[1] >= 400 && end[1] <= 464);
});
ok('arrow goes to the left side when target is left', () => {
  const m = normalizeArch({ nodes: [{ id: 'a', x: 600, y: 20 }, { id: 'b', x: 20, y: 20 }], edges: [{ from: 'a', to: 'b' }] });
  const d = computeLayout(m).edges[0].d;
  assert.ok(d.startsWith('M600,52'), d);
});
ok('addNode places below, ids unique', () => {
  const r = addNode(base, 'A'); const r2 = addNode(r.arch, 'A');
  assert.equal(r.arch.nodes.length, 3); assert.notEqual(r.node.id, 'a'); assert.notEqual(r2.node.id, r.node.id);
  assert.ok(r.node.y >= 64 + 20);
});
ok('setGroup create, move, remove', () => {
  let a = setGroup(base, 'a', 'Сервер'); assert.equal(groupNameOf(a, 'a'), 'Сервер');
  a = setGroup(a, 'b', 'сервер'); assert.equal(a.groups.length, 1); assert.equal(a.groups[0].nodes.length, 2);
  a = setGroup(a, 'a', ''); assert.equal(groupNameOf(a, 'a'), ''); assert.equal(a.groups[0].nodes.length, 1);
  a = setGroup(a, 'b', ''); assert.equal(a.groups.length, 0);
});
console.log(`${passed} passed`);
