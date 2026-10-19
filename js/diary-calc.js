// «Дневник»: расчёты без ИИ. Статистика, серии, наблюдения и подбор текстов поддержки.
// Все функции чистые: на вход записи и «сегодня», на выход данные. Тесты: tests/diary-calc.test.mjs.
import { SCALE, MOOD_MIN, MOOD_MAX, FACTORS, FEELINGS, factorLabel, feelingOf, bandOf } from './diary-data.js';
import * as T from './diary-texts.js';

// ---------- даты ----------
const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
const isYmd = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
export const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
export const WEEKDAYS_IN = ['по понедельникам', 'по вторникам', 'по средам', 'по четвергам', 'по пятницам', 'по субботам', 'по воскресеньям'];
export const weekdayOf = (s) => (parseYmd(s).getDay() + 6) % 7; // 0 = понедельник
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export function dayTitle(s, today) {
  if (s === today) return 'Сегодня';
  if (s === addDays(today, -1)) return 'Вчера';
  const d = parseYmd(s);
  const base = `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
  return d.getFullYear() === parseYmd(today).getFullYear() ? `${base}, ${WEEKDAYS[weekdayOf(s)].toLowerCase()}` : `${base} ${d.getFullYear()}`;
}
export const TIME_SLOTS = [
  { id: 'night', label: 'Ночь', from: 0, to: 6 },
  { id: 'morning', label: 'Утро', from: 6, to: 12 },
  { id: 'day', label: 'День', from: 12, to: 18 },
  { id: 'evening', label: 'Вечер', from: 18, to: 24 },
];
export const slotOf = (hhmm) => { const h = Number(String(hhmm || '').split(':')[0]); return (TIME_SLOTS.find((s) => h >= s.from && h < s.to) || TIME_SLOTS[2]).id; };

// ---------- запись ----------
const knownFactor = new Set(FACTORS.map((f) => f.id));
const knownFeeling = new Set(FEELINGS.map((f) => f.id));
export function validEntry(e) {
  return !!e && isYmd(e.date) && Number.isInteger(e.mood) && e.mood >= MOOD_MIN && e.mood <= MOOD_MAX && (e.kind === 'day' || e.kind === 'moment');
}
// Приводит поля формы к записи. Неизвестные факторы и чувства отбрасываются, текст обрезается.
export function cleanEntry(f) {
  const mood = Math.max(MOOD_MIN, Math.min(MOOD_MAX, Math.round(Number(f.mood) || 0)));
  return {
    kind: f.kind === 'moment' ? 'moment' : 'day',
    date: isYmd(f.date) ? f.date : ymd(new Date()),
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(f.time || '') ? f.time : '',
    mood,
    feelings: [...new Set((f.feelings || []).filter((x) => knownFeeling.has(x)))].slice(0, 12),
    factors: [...new Set((f.factors || []).filter((x) => knownFactor.has(x)))].slice(0, 12),
    text: String(f.text || '').trim().slice(0, 20000),
  };
}
export const entryLabel = (e) => (SCALE.find((s) => s.v === e.mood) || SCALE[3]).label;

// ---------- дни ----------
// Один день: если есть запись «весь день», настроение дня берётся из неё; иначе среднее по моментам.
export function dayMap(entries) {
  const m = new Map();
  entries.filter(validEntry).forEach((e) => {
    if (!m.has(e.date)) m.set(e.date, { date: e.date, entries: [], factors: new Set(), feelings: new Set(), words: 0 });
    const d = m.get(e.date);
    d.entries.push(e);
    (e.factors || []).forEach((x) => d.factors.add(x));
    (e.feelings || []).forEach((x) => d.feelings.add(x));
    d.words += wordCount(e.text);
  });
  m.forEach((d) => {
    d.entries.sort((a, b) => (a.kind === b.kind ? String(a.time).localeCompare(String(b.time)) || a.created - b.created : a.kind === 'day' ? -1 : 1));
    const day = d.entries.filter((e) => e.kind === 'day').sort((a, b) => b.updatedAt - a.updatedAt)[0];
    d.dayEntry = day || null;
    d.mood = day ? day.mood : round1(avg(d.entries.map((e) => e.mood)));
    d.min = Math.min(...d.entries.map((e) => e.mood));
    d.max = Math.max(...d.entries.map((e) => e.mood));
  });
  return m;
}
export const daysSorted = (map) => [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));

// ---------- числа ----------
export const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
export const round1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
export function stdev(a) { if (a.length < 2) return null; const m = avg(a); return Math.sqrt(avg(a.map((x) => (x - m) ** 2))); }
export const wordCount = (s) => (String(s || '').match(/[A-Za-zА-Яа-яЁё0-9]+/g) || []).length;
const fmt1 = (x) => String(round1(x)).replace('.', ',');
export const signed1 = (x) => (x > 0 ? `+${fmt1(x)}` : x < 0 ? `−${fmt1(Math.abs(x))}` : '0');
export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100; const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
// Подпись «−0,7» → «Слегка неприятно».
export const levelName = (x) => (x == null ? '—' : SCALE.reduce((best, s) => (Math.abs(s.v - x) < Math.abs(best.v - x) ? s : best), SCALE[3]).label);

// Среднее настроение по дням за период [from, to] включительно.
export function periodAvg(map, from, to) {
  const v = [...map.values()].filter((d) => d.date >= from && d.date <= to).map((d) => d.mood);
  return { avg: round1(avg(v)), n: v.length };
}

// ---------- серии ----------
// Серия дней подряд, удовлетворяющих test, заканчивающаяся today или вчера (сегодня ещё можно записать).
export function currentRun(map, today, test) {
  let d = map.has(today) && test(map.get(today)) ? today : addDays(today, -1);
  if (!map.has(d) || !test(map.get(d))) return 0;
  let n = 0;
  while (map.has(d) && test(map.get(d))) { n += 1; d = addDays(d, -1); }
  return n;
}
export function longestRun(map, test) {
  const ds = [...map.keys()].sort();
  let best = 0; let cur = 0; let prev = null;
  ds.forEach((d) => {
    const okd = test(map.get(d));
    if (okd && prev && daysBetween(prev, d) === 1 && cur > 0) cur += 1;
    else cur = okd ? 1 : 0;
    best = Math.max(best, cur);
    prev = d;
  });
  return best;
}
const anyDay = () => true;
const goodDay = (d) => d.mood >= 1;
const hardDay = (d) => d.mood <= -1;
export function streaks(map, today) {
  return {
    entries: currentRun(map, today, anyDay),
    entriesBest: longestRun(map, anyDay),
    good: currentRun(map, today, goodDay),
    goodBest: longestRun(map, goodDay),
    hard: currentRun(map, today, hardDay),
    hardBest: longestRun(map, hardDay),
  };
}

// ---------- статистика ----------
// Факторы: сколько дней встречался, среднее настроение в эти дни, разница с днями без него, доля в плохих и хороших днях.
export function factorStats(map) {
  const days = [...map.values()];
  const bad = days.filter(hardDay);
  const good = days.filter(goodDay);
  return FACTORS.map((f) => {
    const withF = days.filter((d) => d.factors.has(f.id));
    const without = days.filter((d) => !d.factors.has(f.id));
    const a = avg(withF.map((d) => d.mood));
    const b = avg(without.map((d) => d.mood));
    return {
      id: f.id, label: f.label, group: f.group, n: withF.length,
      avg: round1(a), others: round1(b), delta: a != null && b != null ? round1(a - b) : null,
      inBad: bad.length ? withF.filter(hardDay).length / bad.length : 0,
      inGood: good.length ? withF.filter(goodDay).length / good.length : 0,
      badN: withF.filter(hardDay).length, goodN: withF.filter(goodDay).length,
    };
  }).filter((s) => s.n > 0).sort((x, y) => y.n - x.n || x.label.localeCompare(y.label, 'ru'));
}
export function feelingStats(entries) {
  const c = new Map();
  entries.filter(validEntry).forEach((e) => (e.feelings || []).forEach((f) => c.set(f, (c.get(f) || 0) + 1)));
  return [...c.entries()].map(([id, n]) => ({ id, n, label: (feelingOf(id) || { label: id }).label, band: (feelingOf(id) || {}).band })).sort((a, b) => b.n - a.n);
}
export function distribution(map) {
  const out = SCALE.map((s) => ({ v: s.v, label: s.label, n: 0 }));
  map.forEach((d) => { const i = Math.round(d.mood) - MOOD_MIN; if (out[i]) out[i].n += 1; });
  return out;
}
export function weekdayStats(map) {
  const acc = WEEKDAYS.map((name, i) => ({ i, name, v: [] }));
  map.forEach((d) => acc[weekdayOf(d.date)].v.push(d.mood));
  return acc.map((w) => ({ i: w.i, name: w.name, n: w.v.length, avg: round1(avg(w.v)) }));
}
export function slotStats(entries) {
  const acc = TIME_SLOTS.map((s) => ({ ...s, v: [] }));
  entries.filter((e) => validEntry(e) && e.kind === 'moment' && e.time).forEach((e) => acc.find((s) => s.id === slotOf(e.time)).v.push(e.mood));
  return acc.map((s) => ({ id: s.id, label: s.label, n: s.v.length, avg: round1(avg(s.v)) }));
}
// Пары факторов, которые чаще всего встречаются вместе в хорошие (или плохие) дни.
export function pairStats(map, minN = 3) {
  const c = new Map();
  map.forEach((d) => {
    const fs = [...d.factors].sort();
    for (let i = 0; i < fs.length; i += 1) for (let j = i + 1; j < fs.length; j += 1) {
      const k = `${fs[i]}|${fs[j]}`;
      if (!c.has(k)) c.set(k, []);
      c.get(k).push(d.mood);
    }
  });
  return [...c.entries()].filter(([, v]) => v.length >= minN).map(([k, v]) => ({ a: k.split('|')[0], b: k.split('|')[1], n: v.length, avg: round1(avg(v)) })).sort((x, y) => y.avg - x.avg);
}
// Слова, которые чаще встречаются в хорошие и в плохие дни (без коротких и служебных).
const STOP = new Set('этот этого этом эта эти это было была были будет быть очень когда тогда потом просто только сегодня вчера завтра потому чтобы который которая которые всего всех весь вообще ничего никто нибудь тоже также больше меньше после перед между через около снова опять теперь почему зачем сейчас здесь такой такая такие такое какой какая какие какое много немного можно нужно надо хотел хотела хочу день дня дней днем'.split(' '));
export function topWords(map, test, limit = 8) {
  const c = new Map();
  map.forEach((d) => {
    if (!test(d)) return;
    const seen = new Set();
    d.entries.forEach((e) => (String(e.text || '').toLowerCase().replace(/ё/g, 'е').match(/[a-zа-я]{5,}/g) || []).forEach((w) => { if (!STOP.has(w) && !seen.has(w)) { seen.add(w); c.set(w, (c.get(w) || 0) + 1); } }));
  });
  return [...c.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru')).slice(0, limit).map(([w, n]) => ({ w, n }));
}
// По месяцам: среднее и число дней (для графика года).
export function monthStats(map) {
  const acc = new Map();
  map.forEach((d) => { const k = d.date.slice(0, 7); if (!acc.has(k)) acc.set(k, []); acc.get(k).push(d.mood); });
  return [...acc.entries()].sort().map(([m, v]) => ({ month: m, n: v.length, avg: round1(avg(v)) }));
}
// Последние n дней подряд (для полосы настроения): массив { date, mood|null }.
export function lastDays(map, today, n) {
  return Array.from({ length: n }, (_, i) => { const d = addDays(today, i - n + 1); const x = map.get(d); return { date: d, mood: x ? x.mood : null }; });
}

// Сводка целиком.
export function summary(entries, today) {
  const valid = entries.filter(validEntry);
  const map = dayMap(valid);
  const moods = [...map.values()].map((d) => d.mood);
  const w0 = periodAvg(map, addDays(today, -6), today);
  const w1 = periodAvg(map, addDays(today, -13), addDays(today, -7));
  const m0 = periodAvg(map, addDays(today, -29), today);
  const m1 = periodAvg(map, addDays(today, -59), addDays(today, -30));
  const recent = lastDays(map, today, 14).map((d) => d.mood).filter((x) => x != null);
  const days = daysSorted(map);
  const first = days.length ? days[days.length - 1].date : null;
  const best = days.length ? days.reduce((b, d) => (d.mood > b.mood ? d : b)) : null;
  const worst = days.length ? days.reduce((b, d) => (d.mood < b.mood ? d : b)) : null;
  let swings = 0;
  const sortedAsc = [...days].reverse();
  for (let i = 1; i < sortedAsc.length; i += 1) if (daysBetween(sortedAsc[i - 1].date, sortedAsc[i].date) === 1 && Math.abs(sortedAsc[i].mood - sortedAsc[i - 1].mood) >= 3) swings += 1;
  return {
    map, days,
    total: valid.length,
    dayCount: map.size,
    moments: valid.filter((e) => e.kind === 'moment').length,
    words: valid.reduce((s, e) => s + wordCount(e.text), 0),
    first,
    coverage30: [...map.keys()].filter((d) => d > addDays(today, -30) && d <= today).length,
    avgAll: round1(avg(moods)),
    week: w0, prevWeek: w1, month: m0, prevMonth: m1,
    goodShare: moods.length ? moods.filter((x) => x >= 1).length / moods.length : 0,
    hardShare: moods.length ? moods.filter((x) => x <= -1).length / moods.length : 0,
    volatility: round1(stdev(recent)),
    swings,
    best, worst,
    streaks: streaks(map, today),
    distribution: distribution(map),
    weekdays: weekdayStats(map),
    slots: slotStats(valid),
    factors: factorStats(map),
    feelings: feelingStats(valid),
    pairs: pairStats(map),
    months: monthStats(map),
    goodWords: topWords(map, goodDay),
    hardWords: topWords(map, hardDay),
    last30: lastDays(map, today, 30),
  };
}

// ---------- наблюдения ----------
// Возвращает список { id, kind: 'praise'|'insight'|'tip'|'care', w (важность), text }. Пороги выбраны так,
// чтобы не делать выводов по одному-двум дням: факторам нужно минимум 4 дня, дням недели минимум 3 записи.
export const MIN_FACTOR_DAYS = 4;
export function observations(s, today) {
  const out = [];
  const push = (id, kind, w, text) => out.push({ id, kind, w, text });
  const st = s.streaks;
  if (!s.total) return out;
  if (st.good >= 3) push('good-streak', 'praise', 90, `${st.good} ${plural(st.good, 'хороший день', 'хороших дня', 'хороших дней')} подряд. Так держать!`);
  if (st.goodBest >= 3 && st.good === st.goodBest && st.good >= 4) push('good-record', 'praise', 85, `Это твоя самая длинная серия хороших дней: ${st.good}.`);
  if (st.entries >= 3) push('entry-streak', 'praise', 60, `Записи ${st.entries} ${plural(st.entries, 'день', 'дня', 'дней')} подряд. Привычка складывается.`);
  if (st.hard >= 3) push('hard-streak', 'care', 95, `${st.hard} ${plural(st.hard, 'тяжёлый день', 'тяжёлых дня', 'тяжёлых дней')} подряд. Это много: позаботься о себе и не держи всё в себе.`);
  if (s.week.n >= 3 && s.prevWeek.n >= 3) {
    const d = round1(s.week.avg - s.prevWeek.avg);
    if (d >= 0.5) push('week-up', 'praise', 70, `Неделя лучше прошлой на ${fmt1(d)}: в среднем «${levelName(s.week.avg)}».`);
    if (d <= -0.5) push('week-down', 'care', 75, `Неделя ниже прошлой на ${fmt1(-d)}. Стоит чуть больше отдыхать и меньше нагружать себя.`);
  }
  if (s.month.n >= 10 && s.prevMonth.n >= 10) {
    const d = round1(s.month.avg - s.prevMonth.avg);
    if (Math.abs(d) >= 0.4) push('month-trend', d > 0 ? 'praise' : 'care', 55, d > 0 ? `За 30 дней настроение выше, чем месяцем раньше (${signed1(d)}).` : `За 30 дней настроение ниже, чем месяцем раньше (${signed1(d)}).`);
  }
  s.factors.filter((f) => f.n >= MIN_FACTOR_DAYS && f.delta != null && f.others != null).forEach((f) => {
    if (f.delta <= -0.8) push(`f-neg-${f.id}`, 'insight', 65 + Math.min(20, Math.round(-f.delta * 10)), `Когда влияет «${f.label}», настроение в среднем на ${fmt1(-f.delta)} ниже, чем в другие дни.`);
    if (f.delta >= 0.8) push(`f-pos-${f.id}`, 'insight', 60 + Math.min(20, Math.round(f.delta * 10)), `«${f.label}» поднимает настроение: в такие дни оно в среднем на ${fmt1(f.delta)} выше.`);
  });
  const hardDays = s.days.filter(hardDay).length;
  if (hardDays >= 4) {
    const top = s.factors.filter((f) => f.badN >= 3).sort((a, b) => b.inBad - a.inBad)[0];
    if (top && top.inBad >= 0.4) push(`bad-top-${top.id}`, 'insight', 72, `В плохие дни чаще всего влияет «${top.label}»: ${Math.round(top.inBad * 100)}% таких дней.`);
  }
  const goodDays = s.days.filter(goodDay).length;
  if (goodDays >= 4) {
    const top = s.factors.filter((f) => f.goodN >= 3).sort((a, b) => b.inGood - a.inGood)[0];
    if (top && top.inGood >= 0.4) push(`good-top-${top.id}`, 'insight', 66, `В хорошие дни чаще всего присутствует «${top.label}»: ${Math.round(top.inGood * 100)}% таких дней.`);
  }
  const wd = s.weekdays.filter((w) => w.n >= 3);
  if (wd.length >= 4) {
    const hi = wd.reduce((a, b) => (b.avg > a.avg ? b : a));
    const lo = wd.reduce((a, b) => (b.avg < a.avg ? b : a));
    if (hi.avg - lo.avg >= 0.8) {
      push('wd-best', 'insight', 50, `Лучшее настроение ${T_WEEK(hi.i)}, в среднем «${levelName(hi.avg)}».`);
      push('wd-worst', 'insight', 52, `Тяжелее всего ${T_WEEK(lo.i)}. Можно заранее оставить на этот день меньше дел.`);
    }
  }
  const sl = s.slots.filter((x) => x.n >= 3);
  if (sl.length >= 2) {
    const hi = sl.reduce((a, b) => (b.avg > a.avg ? b : a));
    const lo = sl.reduce((a, b) => (b.avg < a.avg ? b : a));
    if (hi.avg - lo.avg >= 1) push('slot', 'insight', 45, `Время суток важно: лучше всего ${hi.label.toLowerCase()}, хуже всего ${lo.label.toLowerCase()}.`);
  }
  const bestPair = s.pairs.find((p) => p.avg >= 1.5);
  if (bestPair) push('pair-good', 'insight', 48, `Лучшее сочетание: «${factorLabel(bestPair.a)}» и «${factorLabel(bestPair.b)}» вместе, в среднем «${levelName(bestPair.avg)}».`);
  const worstPair = [...s.pairs].reverse().find((p) => p.avg <= -1.5);
  if (worstPair) push('pair-bad', 'insight', 50, `Тяжёлое сочетание: «${factorLabel(worstPair.a)}» и «${factorLabel(worstPair.b)}» в один день.`);
  if (s.volatility != null && s.volatility >= 1.6 && s.days.length >= 7) push('volatile', 'care', 58, 'Последние две недели настроение сильно скачет. Ровный режим сна и еды обычно сглаживает такие качели.');
  if (s.volatility != null && s.volatility <= 0.6 && s.days.length >= 10 && s.avgAll >= 0.5) push('stable', 'praise', 40, 'Настроение стабильно хорошее уже две недели. Это отличный баланс.');
  const topFeel = s.feelings[0];
  if (topFeel && topFeel.n >= 5) push(`feel-${topFeel.id}`, topFeel.band === 'neg' ? 'care' : 'insight', 42, `Чаще всего ты отмечаешь чувство «${topFeel.label}» (${topFeel.n} ${plural(topFeel.n, 'раз', 'раза', 'раз')}).`);
  if (s.coverage30 >= 25) push('coverage', 'praise', 35, `За последние 30 дней записей ${s.coverage30} из 30. Отличная регулярность.`);
  if (s.goodShare >= 0.6 && s.days.length >= 10) push('good-share', 'praise', 44, `${Math.round(s.goodShare * 100)}% дней с хорошим настроением. Это много!`);
  const lastDate = s.days[0] && s.days[0].date;
  if (lastDate && daysBetween(lastDate, today) >= 3) push('gap', 'tip', 30, `Последняя запись была ${daysBetween(lastDate, today)} ${plural(daysBetween(lastDate, today), 'день', 'дня', 'дней')} назад. Как ты сейчас?`);
  // Совет по самому «тяжёлому» фактору из набора текстов.
  const heavy = s.factors.filter((f) => f.n >= MIN_FACTOR_DAYS && f.delta != null && f.delta <= -0.8).sort((a, b) => a.delta - b.delta)[0];
  if (heavy && T.FACTOR[heavy.id]) push(`tip-${heavy.id}`, 'tip', 62, T.FACTOR[heavy.id].bad[hash(`${today}${heavy.id}`) % T.FACTOR[heavy.id].bad.length]);
  const ex = extras(s, today);
  if (ex.sinceHard != null && ex.sinceHard >= 7 && s.days.length >= 10) push('since-hard', 'praise', 56, `${ex.sinceHard} ${plural(ex.sinceHard, 'день', 'дня', 'дней')} без тяжёлых дней. Хорошая полоса.`);
  if (ex.recoveries >= 3 && ex.recoveryDays != null) push('recovery', 'insight', 46, `Обычно после тяжёлого дня ты приходишь в норму за ${fmt1(ex.recoveryDays)} дн. Это твоя устойчивость.`);
  if (ex.memories.length) { const m = ex.memories[0]; push('memory', 'tip', 38, `${m.label} у тебя было «${levelName(m.day.mood)}».`); }
  return out.sort((a, b) => b.w - a.w);
}
const T_WEEK = (i) => WEEKDAYS_IN[i];

// ---------- дополнительная статистика ----------
// Воспоминания «в этот день», дни с последнего тяжёлого, скорость восстановления, лучший и худший день, самый долгий перерыв.
export function extras(s, today) {
  const asc = s.days.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const memories = [[365, 'Год назад в этот день'], [182, 'Полгода назад в этот день'], [30, 'Месяц назад в этот день'], [7, 'Неделю назад']]
    .map(([n, label]) => ({ label, day: s.map.get(addDays(today, -n)) })).filter((m) => m.day);
  const lastHard = s.days.find(hardDay);
  const sinceHard = lastHard ? daysBetween(lastHard.date, today) : null;
  // Восстановление: сколько дней проходит от тяжёлого дня до первого не тяжёлого (только по подряд идущим датам).
  const rec = [];
  for (let i = 0; i < asc.length; i += 1) {
    if (!hardDay(asc[i]) || (i > 0 && hardDay(asc[i - 1]) && daysBetween(asc[i - 1].date, asc[i].date) === 1)) continue;
    let j = i; while (j + 1 < asc.length && hardDay(asc[j + 1]) && daysBetween(asc[j].date, asc[j + 1].date) === 1) j += 1;
    if (j + 1 < asc.length) rec.push(daysBetween(asc[i].date, asc[j + 1].date));
  }
  const best = asc.length ? asc.reduce((a, b) => (b.mood > a.mood ? b : a)) : null;
  const worst = asc.length ? asc.reduce((a, b) => (b.mood < a.mood ? b : a)) : null;
  let gap = 0; for (let i = 1; i < asc.length; i += 1) gap = Math.max(gap, daysBetween(asc[i - 1].date, asc[i].date) - 1);
  // Что было в день перед подъёмом: факторы, которые чаще встречаются накануне «отскока».
  return { memories, sinceHard, recoveryDays: rec.length ? round1(avg(rec)) : null, recoveries: rec.length, best, worst, longestGap: gap };
}


// Вехи по числу записей: возвращает текст, если только что достигнута.
export function milestoneFor(total) { return T.MILESTONE[total] || null; }

// ---------- подбор текстов ----------
export function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// Выбор из списка по «зерну», пропуская недавно показанные (recent: множество строк).
export function pick(list, seed, recent = new Set()) {
  if (!list || !list.length) return null;
  const start = hash(String(seed)) % list.length;
  for (let k = 0; k < list.length; k += 1) { const t = list[(start + k) % list.length]; if (!recent.has(t)) return t; }
  return list[start];
}
export const pluralRu = (n, forms) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? forms[2] : b > 1 && b < 5 ? forms[1] : b === 1 ? forms[0] : forms[2]; };
export const fill = (t, vars) => String(t)
  .replace(/\{p:([^|}]+)\|([^|}]+)\|([^}]+)\}/g, (_, a, b, c) => pluralRu(Number(vars.n) || 0, [a, b, c]))
  .replace(/\{(\w)\}/g, (_, k) => (vars[k] != null ? vars[k] : ''));
const normText = (s) => ` ${String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ')} `;
export function detectCrisis(text) { const t = normText(text); return T.CRISIS_WORDS.some((w) => t.includes(` ${normText(w).trim()}`)); }
export function hasJoy(text) { const t = normText(text); return T.JOY_WORDS.some((w) => t.includes(` ${w}`)); }
export function hasGratitude(text) { const t = normText(text); return T.GRATITUDE_WORDS.some((w) => t.includes(` ${w}`)); }

// Ответ хаба на запись: { crisis, title, lines[] } — 1 главная фраза и до 3 дополнительных.
// entries: все записи (с этой), entry: только что сохранённая, recent: недавно показанные фразы.
export function respond(entry, entries, today, recent = new Set()) {
  const seed = `${entry.id || ''}${entry.updatedAt || ''}`;
  if (detectCrisis(entry.text)) return { crisis: true, title: T.CRISIS.title, lines: [T.CRISIS.text], help: T.CRISIS.lines };
  const s = summary(entries, today);
  const lines = [];
  const add = (t) => { if (t && !lines.includes(t)) lines.push(t); };
  const level = String(entry.mood);
  // Главное по уровню
  add(pick(T.MOOD[level], seed, recent));
  // Радость и благодарность
  if (entry.mood >= 0 && hasJoy(entry.text)) add(pick(T.JOY, `${seed}j`, recent));
  if (hasGratitude(entry.text)) add(pick(T.GRATITUDE, `${seed}g`, recent));
  // Чувства (неприятные): совет по первому из отмеченных
  {
    const fe = (entry.feelings || []).find((f) => T.FEELING[f]);
    if (fe) add(pick(T.FEELING[fe], `${seed}${fe}`, recent));
  }
  // Факторы: при плохом настроении совет, при хорошем похвала, по самому «весомому» фактору
  const fs = (entry.factors || []).filter((f) => T.FACTOR[f]);
  if (fs.length) {
    const stats = new Map(s.factors.map((f) => [f.id, f]));
    const key = entry.mood < 0 ? fs.slice().sort((a, b) => ((stats.get(a) || {}).delta ?? 0) - ((stats.get(b) || {}).delta ?? 0))[0] : entry.mood > 0 ? fs.slice().sort((a, b) => ((stats.get(b) || {}).delta ?? 0) - ((stats.get(a) || {}).delta ?? 0))[0] : null;
    if (key) add(pick(entry.mood < 0 ? T.FACTOR[key].bad : T.FACTOR[key].good, `${seed}${key}`, recent));
  }
  // Серии, отскок, рекорд, вехи, возвращение
  const st = s.streaks;
  const prevDay = s.map.get(addDays(entry.date, -1));
  const prevDates = s.days.map((d) => d.date).filter((d) => d < entry.date);
  if (entry.date === today && prevDates.length && daysBetween(prevDates[0], entry.date) >= 4) add(fill(pick(T.RETURN, `${seed}r`, recent), { n: daysBetween(prevDates[0], entry.date) }));
  if (entry.mood >= 1 && prevDay && prevDay.mood <= -1) add(pick(T.BOUNCE, `${seed}b`, recent));
  if (entry.mood >= 1 && st.good >= 3) add(fill(pick(T.GOOD_STREAK, `${seed}s`, recent), { n: st.good }));
  if (entry.mood <= -1 && st.hard >= 3) add(fill(pick(T.HARD_STREAK, `${seed}h`, recent), { n: st.hard }));
  if ([7, 14, 30, 60, 100, 200, 365].includes(st.entries)) add(fill(pick(T.ENTRY_STREAK, `${seed}e`, recent), { n: st.entries }));
  const monthMax = Math.max(...s.days.filter((d) => d.date > addDays(today, -30) && d.date !== entry.date).map((d) => d.mood), -99);
  if (entry.mood >= 2 && s.days.length >= 10 && entry.mood > monthMax) add(pick(T.RECORD, `${seed}m`, recent));
  if (entry.mood >= 0 && entry.mood <= 1 && prevDay && prevDay.mood <= -2 && !lines.includes(T.BOUNCE[0])) add(pick(T.AFTER_HARD, `${seed}a`, recent));
  const ms = milestoneFor(s.total);
  if (ms) add(ms);
  return { crisis: false, title: entry.mood >= 1 ? 'Здорово' : entry.mood <= -1 ? 'Я рядом' : 'Записано', lines: lines.slice(0, 4) };
}

// Подсказка-вопрос для поля текста (меняется по уровню).
export function promptFor(mood, seed) {
  const b = bandOf(mood);
  const list = b === 'neg' ? [...T.PROMPTS.neg, ...T.PROMPTS.any] : b === 'pos' ? [...T.PROMPTS.pos, ...T.PROMPTS.any] : T.PROMPTS.any;
  return pick(list, seed);
}
export const nudge = (seed) => pick(T.NUDGE, seed);

// ---------- фильтры и поиск ----------
export function filterEntries(entries, { mood = 'all', factor = null, period = 'all', today }) {
  const from = period === 'week' ? addDays(today, -6) : period === 'month' ? addDays(today, -29) : period === 'year' ? addDays(today, -364) : '0000-00-00';
  return entries.filter((e) => validEntry(e) && e.date >= from && (mood === 'all' || (mood === 'good' && e.mood >= 1) || (mood === 'mid' && e.mood === 0) || (mood === 'bad' && e.mood <= -1)) && (!factor || (e.factors || []).includes(factor)));
}
// Документ для общего поиска.
export function searchDoc(e) {
  const feel = (e.feelings || []).map((f) => (feelingOf(f) || { label: f }).label);
  const fac = (e.factors || []).map(factorLabel);
  const first = String(e.text || '').split('\n')[0].slice(0, 80);
  return { title: first || `${entryLabel(e)}`, text: `${e.text || ''} ${entryLabel(e)}`, tags: [...feel, ...fac] };
}
