// Подставляет в index.html список <link rel="modulepreload"> для всех модулей, которые main.js тянет по цепочке импортов.
// Без этого браузер находит модули по одному и загрузка идёт «лесенкой». Запуск: node scripts/gen-preload.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const seen = new Set();
(function walk(file) {
  if (seen.has(file)) return;
  seen.add(file);
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+['"](\.[^'"]+)['"]/gm)) walk(resolve(dirname(file), m[1]));
  for (const m of src.matchAll(/^\s*import\s+['"](\.[^'"]+)['"]/gm)) walk(resolve(dirname(file), m[1]));
})(resolve(root, 'js/main.js'));
const list = [...seen].map((f) => relative(root, f)).filter((f) => f !== 'js/main.js').sort();
const block = `<!-- preload:start -->\n${list.map((f) => `  <link rel="modulepreload" href="${f}">`).join('\n')}\n  <!-- preload:end -->`;
const p = resolve(root, 'index.html');
let h = readFileSync(p, 'utf8');
h = h.replace(/<!-- preload:start -->[\s\S]*?<!-- preload:end -->/, block);
writeFileSync(p, h);
console.log(list.length + ' модулей');
