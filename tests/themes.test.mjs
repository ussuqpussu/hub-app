import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THEME_DEFS } from '../js/theme-data.js';
import { css } from '../scripts/gen-themes.mjs';
import { skyColors, bodyPos } from '../js/sky.js';
import { pickEngine, THEME_FX } from '../js/fx.js';

let n = 0;
const lum = (h) => { const v = parseInt(h.slice(1), 16); const c = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

assert.equal(readFileSync(new URL('../css/themes.css', import.meta.url), 'utf8'), css(), 'themes.css не совпадает с theme-data.js: запусти node scripts/gen-themes.mjs'); n += 1;
assert.equal(THEME_DEFS.length, 14); n += 1;
const engine = readFileSync(new URL('../theme/engine.html', import.meta.url), 'utf8');
for (const t of THEME_DEFS) {
  assert.ok(engine.includes(`hubAddTheme({"n":"${t.name}"`), `${t.id}: нет в движке`);
  if (/^myth/.test(t.id)) { assert.ok(engine.includes('var MYP=[') && engine.includes('MYS.vase=') && engine.includes('th.L="adam"'), 'myth: нет кода темы Мифы'); n += 1; continue; }
  assert.ok(new RegExp(`TSC\\.${t.id}\\s*=\\s*\\[`).test(engine) && new RegExp(`TSN\\.${t.id}\\s*=\\s*\\[("[^"]+",?\\s*){4}\\]`).test(engine), `${t.id}: нет четырёх сцен`);
  n += 2;
}
for (const t of THEME_DEFS) {
  const surf = t.surface.startsWith('#') ? t.surface : t.bg;
  assert.ok(cr(t.text, t.bg) >= 7 && cr(t.text, surf) >= 7, `${t.id}: текст`);
  assert.ok(cr(t.dim, t.bg) >= 4.5 && cr(t.dim, surf) >= 4.5, `${t.id}: серый текст`);
  assert.ok(cr(t.onAccent, t.accent) >= 4.5, `${t.id}: текст на кнопке`);
  n += 3;
}
// небо
assert.ok(skyColors(12).stars === 0 && skyColors(0).stars === 1); n += 1;
assert.equal(bodyPos(13).day, true); assert.equal(bodyPos(23).day, false); n += 2;
assert.ok(bodyPos(13).y < 0.1); n += 1; // в полдень солнце наверху
// живые обои
assert.equal(pickEngine('creation', 'auto'), 'stars');
assert.equal(pickEngine('minimal', 'auto'), null);
assert.equal(pickEngine('minimal', 'stars'), 'stars');
assert.equal(pickEngine('creation', 'off'), null); n += 4;
console.log(`${n} passed`);
