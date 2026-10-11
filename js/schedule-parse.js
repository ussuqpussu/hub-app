// Разбор таблицы расписания колледжа (Google Таблица, выгрузка CSV).
// Один и тот же файл работает в браузере (кнопка «Обновить сейчас») и в Node (GitHub Actions).
// Столбцы ищутся по названиям, а не по номерам: блок группы определяется по подписи группы.
// Правила проекта: ничего не выдумываем, нераспознанное показываем как есть.

const DAYS = [
  ['ПОНЕДЕЛЬНИК', 'Пн'],
  ['ВТОРНИК', 'Вт'],
  ['СРЕДА', 'Ср'],
  ['ЧЕТВЕРГ', 'Чт'],
  ['ПЯТНИЦА', 'Пт'],
  ['СУББОТА', 'Сб'],
];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const p2 = (n) => String(n).padStart(2, '0');

export const clean = (s) => String(s == null ? '' : s).replace(/[ \s]+/g, ' ').trim();
const normGroup = (s) => clean(s).toUpperCase().replace(/[‐-―−]/g, '-');

// CSV по RFC 4180: кавычки, удвоенные кавычки, переносы строк внутри ячейки.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const src = String(text).replace(/^﻿/, '');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

// «1. 09.20 - 10.50» → { n: 1, start: '09:20', end: '10:50' }
export function parsePeriod(s) {
  const m = clean(s).match(/^(\d+)\s*[.)]?\s*(\d{1,2})[.:](\d{2})\s*[-–—]\s*(\d{1,2})[.:](\d{2})/);
  if (!m) return null;
  return { n: Number(m[1]), start: `${p2(m[2])}:${m[3]}`, end: `${p2(m[4])}:${m[5]}` };
}

// «ПОНЕДЕЛЬНИК 12 октября 2026 г.» → { day: 1, date: '2026-10-12' | null }
export function parseDayCell(s) {
  const t = clean(s).toUpperCase();
  const idx = DAYS.findIndex(([name]) => t.startsWith(name));
  if (idx < 0) return null;
  const m = clean(s).match(/(\d{1,2})\s+([А-Яа-яЁё]+)\s+(\d{4})/);
  let date = null;
  if (m) {
    const mon = MONTHS.indexOf(m[2].toLowerCase());
    if (mon >= 0) date = `${m[3]}-${p2(mon + 1)}-${p2(m[1])}`;
  }
  return { day: idx + 1, date };
}

// «Предмет (тип) преп. Фамилия И.О., ауд. 409» → части. Если не разобралось, остаётся raw.
export function parseDiscipline(s) {
  const raw = clean(s);
  const out = { raw, subject: raw, kind: '', teacher: '', room: '', parsed: false };
  if (!raw) return out;
  const t = raw.match(/^(.*?)\s+преп\.\s*(.*)$/i);
  const head = t ? t[1] : raw;
  const tail = t ? t[2] : '';
  const k = head.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  out.subject = clean(k ? k[1] : head);
  out.kind = clean(k ? k[2] : '');
  if (tail) {
    const tm = tail.match(/^([А-ЯЁ][А-Яа-яЁё-]+(?:\s+[А-ЯЁ]\.\s?[А-ЯЁ]\.)?)\s*,?\s*(.*)$/);
    if (tm) {
      out.teacher = clean(tm[1]);
      out.room = clean(tm[2].replace(/^ауд\.?\s*/i, ''));
    } else out.room = clean(tail);
  }
  out.parsed = !!out.subject && (!!t || !!k);
  return out;
}

// Находит блок группы: возвращает { header, label, col } или null.
function findBlock(rows, group) {
  const want = normGroup(group);
  for (let r = 0; r < Math.min(rows.length, 6); r += 1) {
    for (let c = 0; c < rows[r].length; c += 1) {
      const cell = normGroup(rows[r][c]);
      if (cell && (cell === want || cell.split(/[\s+,;]+/).includes(want))) {
        // заголовок «Дни недели» ищем рядом: в строке подписи и в двух строках ниже или выше
        for (const h of [r, r + 1, r + 2, r - 1]) {
          if (!rows[h]) continue;
          for (let j = c; j >= Math.max(0, c - 2); j -= 1) {
            if (/^дни недели/i.test(clean(rows[h][j]))) return { start: j, labelRow: h };
          }
        }
        return { start: null, labelRow: r, col: c };
      }
    }
  }
  return null;
}

// Одна вкладка → { days: [{ day, label, pairs }], monday, warnings }
export function parseTab(csvText, group) {
  const warnings = [];
  const rows = parseCsv(csvText);
  if (!rows.length) return { ok: false, days: [], monday: null, warnings: [{ code: 'empty', text: 'Таблица пустая' }] };
  const block = findBlock(rows, group);
  if (!block) return { ok: false, days: [], monday: null, warnings: [{ code: 'group-not-found', text: `Группа ${group} не найдена в таблице` }] };
  if (block.start === null) return { ok: false, days: [], monday: null, warnings: [{ code: 'columns-not-found', text: 'Не нашла столбцы «Дни недели», «Пара» у группы' }] };
  const j = block.start;
  const days = DAYS.map(([, label], i) => ({ day: i + 1, label, pairs: [] }));
  let cur = null;
  let monday = null;
  for (let r = block.labelRow + 1; r < rows.length; r += 1) {
    const row = rows[r];
    const dc = parseDayCell(row[j]);
    if (dc) {
      cur = dc.day;
      if (dc.date && !monday) {
        const d = new Date(`${dc.date}T00:00:00`);
        d.setDate(d.getDate() - (dc.day - 1));
        monday = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
      }
    }
    const period = parsePeriod(row[j + 1]);
    const disc = clean(row[j + 2]);
    if (!cur) continue;
    if (!disc) continue; // свободная пара
    if (!period) {
      warnings.push({ code: 'period-unreadable', text: `Не распознано время пары: «${clean(row[j + 1])}»` });
    }
    days[cur - 1].pairs.push({ n: period ? period.n : null, start: period ? period.start : '', end: period ? period.end : '', ...parseDiscipline(disc) });
  }
  const total = days.reduce((n, d) => n + d.pairs.length, 0);
  if (!total) warnings.push({ code: 'no-pairs', text: 'В таблице не найдено ни одной пары' });
  return { ok: total > 0, days, monday, warnings };
}

// Две вкладки → готовый schedule.json. previous используется, если вкладку разобрать не удалось.
export function buildSchedule({ csv, config, previous = null, now = new Date(), errors = {}, weekTypeOf }) {
  const out = {
    schema: 1,
    fetchedAt: now.toISOString(),
    group: config.group,
    weeks: {},
    warnings: [],
  };
  ['upper', 'lower'].forEach((key) => {
    const label = key === 'upper' ? 'верхняя' : 'нижняя';
    const prev = previous && previous.weeks && previous.weeks[key];
    let res = null;
    if (csv[key] === undefined && !errors[key] && prev) {
      out.weeks[key] = prev; // вкладку не обновляли: оставляем как было, без замечаний
      return;
    }
    if (errors[key]) res = { ok: false, warnings: [{ code: 'fetch', text: errors[key] }] };
    else if (typeof csv[key] === 'string') res = parseTab(csv[key], config.group);
    else res = { ok: false, warnings: [{ code: 'fetch', text: 'Нет данных' }] };
    if (res.ok) {
      out.weeks[key] = { status: 'ok', monday: res.monday, days: res.days };
      if (res.monday && weekTypeOf && weekTypeOf(res.monday) !== label) {
        out.warnings.push({ tab: key, code: 'week-type-mismatch', text: `Дата понедельника ${res.monday} на вкладке «${label}» не совпадает с правилом верхней и нижней недели` });
      }
    } else if (prev) {
      out.weeks[key] = { ...prev, status: 'kept' };
    } else {
      out.weeks[key] = { status: 'missing', monday: null, days: [] };
    }
    res.warnings.forEach((w) => out.warnings.push({ tab: key, ...w }));
    if (!res.ok && prev) out.warnings.push({ tab: key, code: 'kept-previous', text: `Вкладка «${label}» не распознана, показана прошлая версия` });
  });
  return out;
}

export function sheetCsvUrl(sheetId, tab) {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
}
