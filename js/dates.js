// Даты без библиотек. Дата хранится строкой «ГГГГ-ММ-ДД», время «ЧЧ:ММ», по часам устройства.
// Часовой пояс отдельно не задаём: хаб использует часы устройства (Москва, если телефон и ПК настроены так).

const p2 = (n) => String(n).padStart(2, '0');

export function ymd(d) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

export function todayYmd(now = new Date()) {
  return ymd(now);
}

export function fromYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s, n) {
  const d = fromYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

export function isYmd(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && ymd(fromYmd(s)) === s;
}

export function isHm(s) {
  return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WD_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

export const monthName = (m) => MONTHS[m];
export const weekdayShort = (i) => WD_SHORT[i];

// «11 октября, вс»
export function fmtDay(s) {
  const d = fromYmd(s);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}, ${WD_SHORT[d.getDay()]}`;
}

// Подпись срока: «сегодня», «завтра», «вчера» или дата.
export function dueLabel(s, today = todayYmd()) {
  if (!s) return '';
  if (s === today) return 'сегодня';
  if (s === addDays(today, 1)) return 'завтра';
  if (s === addDays(today, -1)) return 'вчера';
  return fmtDay(s);
}

// Корни дней недели: «в пятницу», «пт», «к понедельнику».
const WD_ROOTS = [
  ['воскресен', 'вс'],
  ['понедельник', 'пн'],
  ['вторник', 'вт'],
  ['сред', 'ср'],
  ['четверг', 'чт'],
  ['пятниц', 'пт'],
  ['суббот', 'сб'],
];

// Разбор быстрой записи: «з завтра 15:00 сдать лабу».
// Возвращает { title, due, time }. Если срок в тексте не найден, due и time = null, текст остаётся как есть.
export function parseQuick(raw, now = new Date()) {
  let text = String(raw).trim().replace(/^з(?:адача)?[\s:]+/i, '');
  const today = todayYmd(now);
  let due = null;
  let time = null;

  const cut = (re) => {
    const m = text.match(re);
    if (!m) return null;
    text = (text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length)).replace(/\s{2,}/g, ' ').trim();
    return m;
  };

  // время: 15:00, 9.30 не трогаем (это может быть дата), «в 15»
  let m = cut(/(?:^|\s)(?:в\s+|к\s+)?([01]?\d|2[0-3]):([0-5]\d)(?=\s|$|[.,;!?])/i);
  if (m) time = `${p2(m[1])}:${m[2]}`;
  else {
    m = cut(/(?:^|\s)в\s+([01]?\d|2[0-3])\s*(?:ч|час|часов)?(?=\s|$|[.,;!?])/i);
    if (m) time = `${p2(m[1])}:00`;
  }

  // дата
  if ((m = cut(/(?:^|\s)послезавтра(?=\s|$|[.,;!?])/i))) due = addDays(today, 2);
  else if ((m = cut(/(?:^|\s)завтра(?=\s|$|[.,;!?])/i))) due = addDays(today, 1);
  else if ((m = cut(/(?:^|\s)сегодня(?=\s|$|[.,;!?])/i))) due = today;
  else if ((m = cut(/(?:^|\s)(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?(?=\s|$|[.,;!?])/))) {
    const day = Number(m[1]);
    const mon = Number(m[2]);
    let year = m[3] ? Number(m[3]) : now.getFullYear();
    let cand = `${year}-${p2(mon)}-${p2(day)}`;
    if (!isYmd(cand)) {
      // невозможная дата (31.02): возвращаем текст как был
      text = String(raw).trim().replace(/^з(?:адача)?[\s:]+/i, '');
      return { title: text, due: null, time: null };
    }
    if (!m[3] && cand < today) {
      year += 1;
      cand = `${year}-${p2(mon)}-${p2(day)}`;
    }
    due = cand;
  } else {
    for (let i = 0; i < 7 && !due; i += 1) {
      const [root, short] = WD_ROOTS[i];
      const re = new RegExp(`(?:^|\\s)(?:в|во|к)?\\s*(?:${root}[а-яё]*|${short})(?=\\s|$|[.,;!?])`, 'i');
      if ((m = cut(re))) {
        let diff = (i - now.getDay() + 7) % 7;
        if (diff === 0) diff = 7;
        due = addDays(today, diff);
      }
    }
  }

  // время без даты: считаем, что это сегодня
  if (time && !due) due = today;
  return { title: text || String(raw).trim(), due, time };
}

// Неделя начинается с понедельника.
export function weekStart(s) {
  const d = fromYmd(s);
  return addDays(s, -((d.getDay() + 6) % 7));
}

// Верхняя или нижняя неделя: якорь по решению Артёма, 12.10.2026 (понедельник) = верхняя, дальше чередование.
const WEEK_ANCHOR = '2026-10-12';
export function weekType(s) {
  const diff = Math.round((fromYmd(weekStart(s)) - fromYmd(WEEK_ANCHOR)) / (7 * 24 * 3600 * 1000));
  return Math.abs(diff) % 2 === 0 ? 'верхняя' : 'нижняя';
}

export { WEEKDAYS };
