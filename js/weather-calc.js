// Погода на «Сегодня»: подготовка текста из weather.json (его кладёт облачная функция). Чистые функции.
export const STALE_MS = 3 * 3600 * 1000;

export const signed = (n) => (n == null ? '—' : n > 0 ? `+${n}°` : n < 0 ? `−${Math.abs(n)}°` : '0°');

// weather: содержимое weather.json или null. Возвращает { cities, stale, fetchedAt } либо null, если данных нет.
export function weatherState(weather, now = Date.now()) {
  if (!weather || !Array.isArray(weather.cities) || !weather.cities.length) return null;
  const t = Date.parse(weather.fetchedAt || '');
  return { cities: weather.cities, fetchedAt: Number.isFinite(t) ? t : null, stale: !Number.isFinite(t) || now - t > STALE_MS };
}

export function cityLine(c) {
  const parts = [`${signed(c.temp)}, ${String(c.text || '').toLowerCase()}`];
  if (c.feels != null && c.feels !== c.temp) parts.push(`ощущается как ${signed(c.feels)}`);
  return parts.join(', ');
}
export function dayLine(c) {
  const parts = [];
  if (c.min != null && c.max != null) parts.push(`днём от ${signed(c.min)} до ${signed(c.max)}`);
  if (c.pop != null) parts.push(`осадки до ${c.pop}%`);
  if (c.wind != null) parts.push(`ветер ${c.wind} м/с`);
  return parts.join(', ');
}
