// Собирает knowledge/index.json из файлов папки knowledge (хроника, скиллы, промпты). Обычный код, без ИИ.
// Запуск: node scripts/build-knowledge.mjs <путь к папке knowledge>
// Его вызывает GitHub Actions в hub-projects после каждого изменения папки knowledge.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { buildKnowledge } from '../js/knowledge-calc.js';

const dir = process.argv[2] || 'knowledge';
if (!existsSync(dir)) { console.error(`Нет папки ${dir}`); process.exit(1); }
const read = (p) => readFileSync(p, 'utf8');
const ls = (p) => (existsSync(p) ? readdirSync(p).filter((n) => !n.startsWith('.')) : []);
const isDir = (p) => statSync(p).isDirectory();

function walk(root, base = root) {
  const out = [];
  for (const n of ls(root)) {
    const p = join(root, n);
    if (isDir(p)) out.push(...walk(p, base));
    else out.push([relative(base, p).split('\\').join('/'), statSync(p).size]);
  }
  return out;
}

const chronicle = ls(join(dir, 'chronicle')).filter((n) => /\.md$/i.test(n)).map((n) => ({ path: `chronicle/${n}`, text: read(join(dir, 'chronicle', n)) }));
const skills = ls(join(dir, 'skills')).filter((n) => isDir(join(dir, 'skills', n)) && existsSync(join(dir, 'skills', n, 'SKILL.md')))
  .map((n) => ({ name: n, text: read(join(dir, 'skills', n, 'SKILL.md')), files: walk(join(dir, 'skills', n)) }));
const prompts = ls(join(dir, 'prompts')).filter((n) => /\.md$/i.test(n) && !/^readme\.md$/i.test(n)).map((n) => ({ path: `prompts/${n}`, text: read(join(dir, 'prompts', n)) }));
let tags = {};
try { tags = JSON.parse(read(join(dir, 'skills', '_tags.json'))); } catch (_) { tags = {}; }

const idx = buildKnowledge({ chronicle, skills, prompts, tags });

// GitHub отдаёт хабу файл целиком только до 1 МБ: длинные тексты скиллов укорачиваем, полный текст остаётся в SKILL.md.
const LIMIT = 900 * 1024;
let json = JSON.stringify(idx);
if (Buffer.byteLength(json) > LIMIT) {
  for (const k of [...idx.skills].sort((a, b) => b.body.length - a.body.length)) {
    if (Buffer.byteLength(json) <= LIMIT) break;
    k.body = `${k.body.slice(0, 20000)}\n\n[Текст длиннее, полностью: knowledge/skills/${k.id}/SKILL.md]`;
    json = JSON.stringify(idx);
  }
}

const out = join(dir, 'index.json');
const strip = (s) => { try { const o = JSON.parse(s); delete o.builtAt; return JSON.stringify(o); } catch (_) { return ''; } };
const prev = existsSync(out) ? read(out) : '';
if (prev && strip(prev) === strip(json)) {
  console.log('index.json не изменился');
} else {
  writeFileSync(out, `${JSON.stringify(idx, null, 1)}\n`);
  console.log(`index.json: хроника ${idx.chronicle.length}, скиллы ${idx.skills.length}, промпты ${idx.prompts.length}, ${Math.round(Buffer.byteLength(json) / 1024)} КБ`);
}
