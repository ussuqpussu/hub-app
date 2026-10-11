// Общие куски подписок: деньги, значок, лампочка, строки сроков. Используются на «Подписки» и «Сегодня».
import { el } from './ui.js';
import { fromYmd, todayYmd } from './dates.js';
import { CURRENCY_SYMBOL, PERIOD_LABEL, daysUntil, daysWord, nextDue } from './subs-calc.js';

const fmtCache = new Map();
function fmt(currency, digits) {
  const k = `${currency}:${digits}`;
  if (!fmtCache.has(k)) {
    let f;
    try {
      f = new Intl.NumberFormat('ru-RU', { style: 'currency', currency, currencyDisplay: 'narrowSymbol', minimumFractionDigits: digits, maximumFractionDigits: digits });
    } catch (_) {
      f = { format: (n) => `${n.toFixed(digits)} ${CURRENCY_SYMBOL[currency] || currency}` };
    }
    fmtCache.set(k, f);
  }
  return fmtCache.get(k);
}
export function money(amount, currency) {
  const cents = Math.round((Number(amount) || 0) * 100);
  return fmt(currency, cents % 100 === 0 ? 0 : 2).format(cents / 100);
}
export const rubMoney = (n) => money(n, 'RUB');

export function periodText(s) {
  if (s.period === 'custom') {
    const d = Math.max(1, Math.round(Number(s.customDays) || 1));
    return `${d % 10 === 1 && d % 100 !== 11 ? 'Каждый' : 'Каждые'} ${daysWord(d)}`;
  }
  return PERIOD_LABEL[s.period] || s.period;
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export function dateText(ymd, today = todayYmd()) {
  const d = fromYmd(ymd);
  const y = d.getFullYear() === fromYmd(today).getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${y}`;
}

export function dueWords(days) {
  if (days < 0) return `просрочено на ${daysWord(-days)}`;
  if (days === 0) return 'сегодня';
  if (days === 1) return 'завтра';
  return `через ${daysWord(days)}`;
}

export function dueText(s, today = todayYmd()) {
  const d = nextDue(s, today);
  return d ? dueWords(daysUntil(d, today)) : 'дата не задана';
}

export function lampNode(l) {
  return el('span', { class: 'lamp', 'data-lamp': l, 'aria-hidden': 'true' });
}

// Значок: свой логотип, иначе значок сайта по ссылке, иначе первая буква.
export function logoNode(s) {
  const box = el('span', { class: 'logo', 'aria-hidden': 'true' });
  const letter = () => box.replaceChildren(el('span', { text: Array.from((s.name || '?').trim())[0]?.toLocaleUpperCase('ru') || '?' }));
  let src = s.logo || '';
  if (!src && s.url) {
    try {
      src = `${new URL(s.url).origin}/favicon.ico`;
    } catch (_) {
      src = '';
    }
  }
  if (!src) {
    letter();
    return box;
  }
  const img = el('img', { src, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
  img.addEventListener('error', letter);
  box.append(img);
  return box;
}
