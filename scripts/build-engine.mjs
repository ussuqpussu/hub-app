// Сборка движка тем и данных тем хаба.
//  - theme/engine.html: база (theme/src/base.html, взята из previews/theme-previews.html),
//    затем ядро t00-core.js, регистрация тем из theme/src/themes-def.mjs, файлы сцен t01-*.js …,
//    затем addon-hub.js. Всё дописывается перед последним </script>.
//  - js/theme-data.js: те же темы в виде, который читают хаб и scripts/gen-themes.mjs.
// Запуск: node scripts/build-engine.mjs && node scripts/gen-themes.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { NEW_THEMES } from '../theme/src/themes-def.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'theme', 'src');
const base = readFileSync(join(src, 'base.html'), 'utf8');
const files = readdirSync(src).filter((f) => /^t\d.*\.js$/.test(f)).sort();
const body = (f) => `\n/* ---- ${f} ---- */\n${readFileSync(join(src, f), 'utf8')}`;
const reg = NEW_THEMES.map((d) => `hubAddTheme(${JSON.stringify({ n: d.name, g: d.group, ts: d.id, lo: d.layout, b: d.bg, s: d.surface, t: d.text, a: d.accent, ba: d.onAccent, dim: d.dim, dk: d.dark, pal: d.pal, tf: d.font, cr: d.card, brr: d.btn, d: d.desc })});`).join('\n');
const parts = [body('t00-core.js'), `\n/* ---- themes-def ---- */\n${reg}`, ...files.filter((f) => f !== 't00-core.js').map(body), body('addon-hub.js')];
const i = base.lastIndexOf('</script>');
if (i < 0) throw new Error('в base.html нет </script>');
writeFileSync(join(here, '..', 'theme', 'engine.html'), base.slice(0, i) + parts.join('\n') + '\n' + base.slice(i));

const data = NEW_THEMES.map(({ id, name, group, note, dark, bg, surface, text, accent, onAccent, dim, font, card, btn, layout, pal }) => ({ id, name, group, note, dark, bg, surface, text, accent, onAccent, dim, font, card, btn, layout, pal }));
writeFileSync(join(here, '..', 'js', 'theme-data.js'), `// Данные тем для css/themes.css (его собирает scripts/gen-themes.mjs) и для хаба.\n// Файл собирается скриптом scripts/build-engine.mjs из theme/src/themes-def.mjs, руками не правим.\n// «Сотворение» описано прямо в css/tokens.css.\nexport const THEME_DEFS = ${JSON.stringify(data, null, 1)};\n`);
console.log('engine.html собран, частей:', parts.length, '; тем:', data.length);
