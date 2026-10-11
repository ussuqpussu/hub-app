import assert from 'node:assert/strict';
import { wmo, normalize, buildWeather, CITIES } from '../bot/weather.js';
import { weatherState, cityLine, dayLine, signed } from '../js/weather-calc.js';
import { runWeather } from '../bot/worker.js';

let n = 0;
const sample = { current: { temperature_2m: -3.4, apparent_temperature: -8.1, weather_code: 71, wind_speed_10m: 4.2 }, daily: { temperature_2m_min: [-6.2], temperature_2m_max: [-1.1], precipitation_probability_max: [60] } };
assert.equal(wmo(0).kind, 'clear'); assert.equal(wmo(63).text, 'Дождь'); assert.equal(wmo(95).kind, 'storm'); assert.equal(wmo(999).text, 'Нет данных'); n += 4;
const rec = normalize(CITIES[0], sample);
assert.deepEqual([rec.temp, rec.feels, rec.min, rec.max, rec.pop, rec.kind], [-3, -8, -6, -1, 60, 'snow']); n += 1;
assert.equal(normalize(CITIES[0], {}), null); assert.equal(normalize(CITIES[0], { current: {}, daily: {} }), null); n += 2;
assert.equal(signed(-3), '−3°'); assert.equal(signed(5), '+5°'); assert.equal(signed(0), '0°'); n += 3;
const st = weatherState({ fetchedAt: new Date(Date.now() - 3600e3).toISOString(), cities: [rec] });
assert.equal(st.stale, false); assert.equal(weatherState({ fetchedAt: new Date(Date.now() - 5 * 3600e3).toISOString(), cities: [rec] }).stale, true); assert.equal(weatherState(null), null); n += 3;
assert.match(cityLine(rec), /−3°, снег, ощущается как −8°/); assert.match(dayLine(rec), /от −6° до −1°, осадки до 60%, ветер 4 м\/с/); n += 2;

// один город ответил, другой нет: берём старую запись
const prev = { fetchedAt: '2026-10-11T00:00:00.000Z', cities: [{ name: 'Домодедово', temp: 1 }] };
const f = async (u) => (String(u).includes('latitude=55.7558') ? new Response(JSON.stringify(sample)) : new Response('', { status: 500 }));
const out = await buildWeather(prev, f, Date.parse('2026-10-11T12:00:00Z'));
assert.equal(out.fresh, 1); assert.deepEqual(out.data.cities.map((c) => c.name), ['Москва', 'Домодедово']); assert.equal(out.data.cities[1].temp, 1); n += 3;
// ничего не ответило: файл не перезаписывается
const files = new Map([['weather.json', { sha: 's0', text: JSON.stringify(prev) }]]);
const puts = [];
const f2 = async (u, init = {}) => {
  const s = String(u);
  if (s.includes('open-meteo')) return new Response('', { status: 503 });
  if ((init.method || 'GET') === 'GET') { const x = files.get(decodeURIComponent(s.split('/contents/')[1])); return x ? new Response(JSON.stringify({ sha: x.sha, content: Buffer.from(x.text).toString('base64') })) : new Response('{}', { status: 404 }); }
  puts.push(s); return new Response('{"content":{}}');
};
const env = { GH_TOKEN: 'x', DATA_REPO: 'a/b' };
assert.equal((await runWeather(env, f2)).fresh, 0); assert.equal(puts.length, 0); n += 2;
const f3 = async (u, init) => (String(u).includes('open-meteo') ? new Response(JSON.stringify(sample)) : f2(u, init));
assert.equal((await runWeather(env, f3)).fresh, 2); assert.equal(puts.length, 1); n += 2;
console.log(`${n} passed`);
