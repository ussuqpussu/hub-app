// Запускается в GitHub Actions (репозиторий hub-data). Скачивает обе вкладки таблицы как CSV,
// разбирает блок группы и пишет data/schedule.json. Секретов не использует: таблица открыта по ссылке.
// Использование: node fetch-schedule.mjs <папка hub-data>
import fs from 'node:fs';
import path from 'node:path';
import { buildSchedule, sheetCsvUrl } from '../js/schedule-parse.js';
import { weekType } from '../js/dates.js';

const dir = process.argv[2] || '.';
const cfgPath = path.join(dir, 'data', 'schedule-config.json');
if (!fs.existsSync(cfgPath)) {
  console.error('Нет data/schedule-config.json');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const outPath = path.join(dir, 'data', 'schedule.json');
let previous = null;
try {
  previous = JSON.parse(fs.readFileSync(outPath, 'utf8'));
} catch {
  /* первого файла ещё нет */
}

const csv = {};
const errors = {};
for (const key of ['upper', 'lower']) {
  try {
    const res = await fetch(sheetCsvUrl(config.sheetId, config.tabs[key]));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    csv[key] = await res.text();
  } catch (e) {
    errors[key] = `Не удалось скачать вкладку: ${e.message}`;
  }
}
const result = buildSchedule({ csv, config, previous, errors, weekTypeOf: weekType });
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ upper: result.weeks.upper.status, lower: result.weeks.lower.status, warnings: result.warnings.length }));
if (result.weeks.upper.status !== 'ok' && result.weeks.lower.status !== 'ok') process.exit(2);
