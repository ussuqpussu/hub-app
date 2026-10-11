// Привычки: серии и отметки за последние дни. Чистые функции без DOM.
import { addDays } from './dates.js';

export const logId = (habitId, date) => `${habitId}_${date}`;

// Множество дат, отмеченных выполненными, для одной привычки.
export function doneDates(logs, habitId) {
  return new Set(logs.filter((l) => l.habit === habitId && l.done).map((l) => l.date));
}

// Серия подряд идущих дней. Если сегодня ещё не отмечено, серия считается до вчера и не обрывается.
export function streak(done, today) {
  let day = done.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (done.has(day)) {
    n += 1;
    day = addDays(day, -1);
  }
  return n;
}

// Последние n дней, последний элемент это сегодня.
export function lastDays(today, n = 7) {
  const out = [];
  for (let i = n - 1; i >= 0; i -= 1) out.push(addDays(today, -i));
  return out;
}
