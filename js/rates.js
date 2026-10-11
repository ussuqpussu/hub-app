// Курсы ЦБ для сводки в рублях: зеркало cbr-xml-daily.ru, кэш на устройстве. Без сети считается по последнему курсу.
import { load, save } from './storage.js';
import { normalizeRates, parseCbrRates, RATES_URL } from './subs-calc.js';

const KEY = 'hub.rates';
const MAX_AGE = 12 * 3600 * 1000;
let inflight = false;

export function cachedRates() {
  return normalizeRates(load(KEY, null));
}

// Возвращает кэш сразу; если он старше 12 часов, запрашивает новый и сообщает через onChange.
export function ensureRates(onChange) {
  const cur = cachedRates();
  if ((cur && Date.now() - cur.fetchedAt < MAX_AGE) || inflight) return cur;
  inflight = true;
  const base = load('hub.ratesUrl', RATES_URL);
  fetch(base, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      const next = parseCbrRates(json, Date.now());
      if (next) {
        save(KEY, next);
        onChange(next);
      }
    })
    .catch(() => undefined)
    .finally(() => {
      inflight = false;
    });
  return cur;
}
