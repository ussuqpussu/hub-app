// Копирует личные скиллы владельца в hub-projects/knowledge/skills. Встроенные скиллы Anthropic пропускает.
// Запуск: node scripts/sync-skills.mjs <папка со скиллами> <knowledge/skills>
// Папка со скиллами в облачной сессии Claude: /root/.claude/skills/synced/<id>/ (копия скиллов аккаунта, только чтение).
// Удалённые из аккаунта скиллы в хабе остаются: история не теряется. Печатает, что добавлено и что изменилось.
import { readdirSync, statSync, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';

const [src, dest] = process.argv.slice(2);
if (!src || !dest || !existsSync(src)) { console.error('Нужно: node scripts/sync-skills.mjs <папка со скиллами> <knowledge/skills>'); process.exit(1); }

// Встроенные скиллы Anthropic: их в хаб не кладём.
const BUILTIN = new Set(['built-in-browser', 'chrome-browser', 'computer-use', 'deep-research', 'docs', 'docx', 'google-workspace', 'pdf', 'pptx', 'xlsx', 'file-reading', 'pdf-reading', 'frontend-design', 'product-self-knowledge', 'session-start-hook', 'skill-creator']);
for (const d of ['/mnt/skills/public', '/mnt/skills/examples']) if (existsSync(d)) readdirSync(d).forEach((n) => BUILTIN.add(n));

const files = (root) => {
  const out = [];
  const walk = (p) => readdirSync(p).filter((n) => !n.startsWith('.')).forEach((n) => { const q = join(p, n); if (statSync(q).isDirectory()) walk(q); else out.push(relative(root, q)); });
  walk(root);
  return out.sort();
};
const same = (a, b) => {
  const fa = files(a);
  const fb = existsSync(b) ? files(b) : [];
  return fa.length === fb.length && fa.every((f, i) => f === fb[i] && readFileSync(join(a, f)).equals(readFileSync(join(b, f))));
};

mkdirSync(dest, { recursive: true });
const added = [];
const changed = [];
for (const name of readdirSync(src).sort()) {
  const from = join(src, name);
  if (!statSync(from).isDirectory() || BUILTIN.has(name) || !existsSync(join(from, 'SKILL.md'))) continue;
  const to = join(dest, name);
  if (same(from, to)) continue;
  (existsSync(to) ? changed : added).push(name);
  rmSync(to, { recursive: true, force: true });
  for (const f of files(from)) {
    mkdirSync(join(to, f, '..'), { recursive: true });
    writeFileSync(join(to, f), readFileSync(join(from, f)));
  }
}
console.log(JSON.stringify({ added, changed }));
