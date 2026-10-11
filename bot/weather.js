// Погода: запрос к Open-Meteo (бесплатно, без ключа) выполняет облачная функция и кладёт weather.json в репозиторий данных.
// Страница хаба сама в интернет за погодой не ходит. Доступность Open-Meteo из России: не проверено.
export const CITIES = [
  { name: 'Москва', lat: 55.7558, lon: 37.6173 },
  { name: 'Домодедово', lat: 55.4408, lon: 37.7539 }, // координаты приблизительные
];

export const weatherUrl = (c) => `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FMoscow&forecast_days=1&wind_speed_unit=ms`;

export function wmo(code) {
  if (code === 0) return { text: 'Ясно', kind: 'clear' };
  if (code === 1) return { text: 'Преимущественно ясно', kind: 'clear' };
  if (code === 2) return { text: 'Переменная облачность', kind: 'cloud' };
  if (code === 3) return { text: 'Пасмурно', kind: 'cloud' };
  if (code === 45 || code === 48) return { text: 'Туман', kind: 'fog' };
  if (code >= 51 && code <= 57) return { text: 'Морось', kind: 'rain' };
  if (code >= 61 && code <= 67) return { text: 'Дождь', kind: 'rain' };
  if (code >= 71 && code <= 77) return { text: 'Снег', kind: 'snow' };
  if (code >= 80 && code <= 82) return { text: 'Ливень', kind: 'rain' };
  if (code === 85 || code === 86) return { text: 'Снегопад', kind: 'snow' };
  if (code >= 95 && code <= 99) return { text: 'Гроза', kind: 'storm' };
  return { text: 'Нет данных', kind: 'cloud' };
}

const r = (v) => (Number.isFinite(v) ? Math.round(v) : null);

// Ответ Open-Meteo -> короткая запись или null, если ответ не тот.
export function normalize(city, j) {
  const c = j && j.current;
  const d = j && j.daily;
  if (!c || !d || !Number.isFinite(c.temperature_2m)) return null;
  const w = wmo(c.weather_code);
  return { name: city.name, temp: r(c.temperature_2m), feels: r(c.apparent_temperature), wind: r(c.wind_speed_10m), code: c.weather_code, text: w.text, kind: w.kind, min: r(d.temperature_2m_min && d.temperature_2m_min[0]), max: r(d.temperature_2m_max && d.temperature_2m_max[0]), pop: r(d.precipitation_probability_max && d.precipitation_probability_max[0]) };
}

// Собирает weather.json. Города, которые не ответили, берутся из прошлого файла (если он есть).
export async function buildWeather(prev, fetchImpl = fetch, now = Date.now()) {
  const old = new Map(((prev && prev.cities) || []).map((c) => [c.name, c]));
  const cities = [];
  let fresh = 0;
  for (const city of CITIES) {
    let rec = null;
    try {
      const res = await fetchImpl(weatherUrl(city));
      if (res.ok) rec = normalize(city, await res.json());
    } catch (_) { rec = null; }
    if (rec) { cities.push({ ...rec, at: new Date(now).toISOString() }); fresh += 1; } else if (old.has(city.name)) cities.push(old.get(city.name));
  }
  return { fresh, data: { v: 1, source: 'open-meteo.com', fetchedAt: fresh ? new Date(now).toISOString() : (prev && prev.fetchedAt) || null, cities } };
}
