import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { skyColors, bodyPos } from '../js/sky.js';
import { pickEngine } from '../js/fx.js';

// storage.js и theme.js работают с localStorage: подставляем простую замену
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const { THEMES, PALETTES, FONTS, OPTIONS, DEFAULT_LOOK, getLook, effectiveColors, contrast } = await import('../js/theme.js');

let n = 0;
// две темы, у каждой есть сцена-имя для движка
assert.deepEqual(THEMES.map((t) => t.id), ['mosaic']); n += 1;
const engine = readFileSync(new URL('../theme/engine.html', import.meta.url), 'utf8');
for (const t of THEMES) { assert.ok(engine.includes(`hubAddTheme({"n":"${t.engine}"`), `${t.id}: в движке нет сцены «${t.engine}»`); n += 1; }
// палитры: читаемость в обоих режимах
for (const p of PALETTES) {
  for (const m of ['dark', 'light']) {
    const c = p[m];
    assert.ok(contrast(c.t, c.b) >= 7 && contrast(c.t, c.s) >= 7, `${p.id}/${m}: текст`);
    assert.ok(contrast(c.d, c.b) >= 4.5 && contrast(c.d, c.s) >= 4.5, `${p.id}/${m}: серый текст`);
    assert.ok(contrast(c.o, c.a) >= 4.5, `${p.id}/${m}: текст на акценте`);
    assert.ok(contrast(c.a, c.s) >= 3, `${p.id}/${m}: акцент на плитке`);
    n += 4;
  }
}
// настройки по умолчанию и защита от мусора в хранилище
assert.deepEqual(getLook(), { ...DEFAULT_LOOK }); n += 1;
mem.set('hub.look', JSON.stringify({ theme: 'x', mode: 'zzz', palette: 'nope', accent: 'red', scale: 9999, font: 1, radius: 'weird' }));
const bad = getLook();
assert.equal(bad.theme, 'mosaic'); assert.equal(bad.mode, 'auto'); assert.equal(bad.palette, 'graphite'); assert.equal(bad.accent, ''); assert.equal(bad.scale, 130); assert.equal(bad.font, 'onest'); assert.equal(bad.radius, 'soft'); n += 7;
// свой акцент: цвет подписи на нём подбирается по контрасту
mem.set('hub.look', JSON.stringify({ mode: 'dark', accent: '#ffff00' }));
let e = effectiveColors(); assert.equal(e.a, '#ffff00'); assert.ok(contrast(e.ba, e.a) >= 4.5); assert.equal(e.dk, true); n += 3;
mem.set('hub.look', JSON.stringify({ mode: 'light', accent: '#102060' }));
e = effectiveColors(); assert.ok(contrast(e.ba, e.a) >= 4.5); assert.equal(e.dk, false); n += 2;
// все переключатели каталога имеют значение по умолчанию из списка
for (const k of Object.keys(OPTIONS)) { if (k in DEFAULT_LOOK) assert.ok(OPTIONS[k].some(([v]) => v === DEFAULT_LOOK[k]), `${k}: нет значения по умолчанию`); n += 1; }
assert.ok(FONTS.some((f) => f.id === DEFAULT_LOOK.font)); n += 1;
// небо
assert.ok(skyColors(12).stars === 0 && skyColors(0).stars === 1); n += 1;
assert.equal(bodyPos(13).day, true); assert.equal(bodyPos(23).day, false); n += 2;
assert.ok(bodyPos(13).y < 0.1); n += 1; // в полдень солнце наверху
// живые обои
assert.equal(pickEngine('mosaic', 'auto'), null);
assert.equal(pickEngine('mosaic', 'stars'), 'stars');
n += 3;
console.log(`${n} passed`);
