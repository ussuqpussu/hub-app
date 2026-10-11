// События: повторы и экспорт в .ics. Чистые функции без доступа к DOM, их проверяют отдельно.
import { addDays, fromYmd, ymd, isYmd, isHm } from './dates.js';

export const REPEATS = [
  { id: 'none', name: 'Не повторять' },
  { id: 'daily', name: 'Каждый день' },
  { id: 'weekly', name: 'Каждую неделю' },
  { id: 'monthly', name: 'Каждый месяц' },
  { id: 'yearly', name: 'Каждый год' },
];

const dim = (y, m) => new Date(y, m + 1, 0).getDate(); // дней в месяце, m от 0

// Попадает ли событие на день. Повтор по числу месяца в коротком месяце переносится на последний день.
export function occursOn(ev, day) {
  if (ev.deleted || !isYmd(ev.date) || day < ev.date) return false;
  if (ev.until && day > ev.until) return false;
  if (!ev.repeat || ev.repeat === 'none') return day === ev.date;
  const s = fromYmd(ev.date);
  const d = fromYmd(day);
  if (ev.repeat === 'daily') return true;
  if (ev.repeat === 'weekly') return s.getDay() === d.getDay();
  if (ev.repeat === 'monthly') return d.getDate() === Math.min(s.getDate(), dim(d.getFullYear(), d.getMonth()));
  if (ev.repeat === 'yearly') return s.getMonth() === d.getMonth() && d.getDate() === Math.min(s.getDate(), dim(d.getFullYear(), d.getMonth()));
  return false;
}

// События в диапазоне дней [from, to] включительно. Возвращает [{ date, ev }] по дате и времени.
export function expand(events, from, to) {
  const out = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    events.forEach((ev) => {
      if (occursOn(ev, day)) out.push({ date: day, ev });
    });
  }
  return out.sort((a, b) => (a.date === b.date ? (a.ev.time || '').localeCompare(b.ev.time || '') : a.date < b.date ? -1 : 1));
}

export function eventsOn(events, day) {
  return expand(events, day, day).map((o) => o.ev);
}

// ---------- .ics ----------
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Строки в .ics не длиннее 75 байт: длинные переносятся с пробелом в начале продолжения.
function fold(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts = [];
  let cur = '';
  let curLen = 0;
  for (const ch of line) {
    const l = enc.encode(ch).length;
    if (curLen + l > (parts.length ? 74 : 75)) {
      parts.push(cur);
      cur = '';
      curLen = 0;
    }
    cur += ch;
    curLen += l;
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

const compact = (s) => s.replace(/-/g, '');
const hm = (t) => t.replace(':', '') + '00';

export function toIcs(events, now = new Date()) {
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hub//RU', 'CALSCALE:GREGORIAN'];
  events
    .filter((ev) => !ev.deleted && isYmd(ev.date))
    .forEach((ev) => {
      lines.push('BEGIN:VEVENT', `UID:${ev.id}@hub`, `DTSTAMP:${stamp}`);
      if (ev.time && isHm(ev.time)) {
        // время «плавающее»: календарь показывает его по часам устройства
        lines.push(`DTSTART:${compact(ev.date)}T${hm(ev.time)}`);
        if (ev.endTime && isHm(ev.endTime) && ev.endTime > ev.time) lines.push(`DTEND:${compact(ev.date)}T${hm(ev.endTime)}`);
      } else {
        lines.push(`DTSTART;VALUE=DATE:${compact(ev.date)}`, `DTEND;VALUE=DATE:${compact(addDays(ev.date, 1))}`);
      }
      const freq = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' }[ev.repeat];
      if (freq) lines.push(`RRULE:FREQ=${freq}${ev.until && isYmd(ev.until) ? `;UNTIL=${compact(ev.until)}${ev.time ? 'T235900' : ''}` : ''}`);
      lines.push(`SUMMARY:${esc(ev.title)}`);
      if (ev.place) lines.push(`LOCATION:${esc(ev.place)}`);
      lines.push('END:VEVENT');
    });
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export { ymd };
