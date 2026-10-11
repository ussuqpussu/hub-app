// «Небо за окном»: рисуется по времени суток на этом устройстве. Погоды здесь нет (она появится на этапе 17).
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));

// Часы суток -> (верх неба, низ неба, свет звёзд 0..1)
const KEYS = [
  [0, [10, 14, 38], [22, 28, 62], 1],
  [5, [24, 30, 66], [120, 96, 120], 0.7],
  [7, [90, 150, 215], [250, 200, 160], 0.1],
  [12, [70, 140, 225], [170, 215, 245], 0],
  [17, [86, 140, 210], [250, 214, 168], 0],
  [19, [60, 70, 140], [240, 140, 110], 0.3],
  [21, [18, 22, 52], [50, 44, 86], 0.9],
  [24, [10, 14, 38], [22, 28, 62], 1],
];

export function skyColors(hour) {
  for (let i = 0; i < KEYS.length - 1; i += 1) {
    const [h0, t0, b0, s0] = KEYS[i];
    const [h1, t1, b1, s1] = KEYS[i + 1];
    if (hour >= h0 && hour <= h1) {
      const k = (hour - h0) / (h1 - h0);
      return { top: mix(t0, t1, k), bottom: mix(b0, b1, k), stars: s0 + (s1 - s0) * k };
    }
  }
  return { top: KEYS[0][1], bottom: KEYS[0][2], stars: 1 };
}

// Положение светила: день 6:30-19:30 солнце, иначе луна; x слева направо, y по дуге.
export function bodyPos(hour) {
  const day = hour >= 6.5 && hour <= 19.5;
  const k = day ? (hour - 6.5) / 13 : ((hour >= 19.5 ? hour - 19.5 : hour + 4.5) / 11);
  return { day, x: clamp(k, 0, 1), y: 1 - Math.sin(clamp(k, 0, 1) * Math.PI) };
}

export function drawSky(canvas, date = new Date()) {
  const c = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const hour = date.getHours() + date.getMinutes() / 60;
  const s = skyColors(hour);
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, `rgb(${s.top})`);
  g.addColorStop(1, `rgb(${s.bottom})`);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  if (s.stars > 0.05) {
    let seed = 7;
    const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    c.fillStyle = '#fff';
    for (let i = 0; i < 40; i += 1) { c.globalAlpha = s.stars * (0.3 + 0.7 * r()); c.fillRect(r() * w, r() * h * 0.7, 1.3, 1.3); }
    c.globalAlpha = 1;
  }
  const b = bodyPos(hour);
  const x = 0.1 * w + b.x * 0.8 * w;
  const y = h * (0.15 + b.y * 0.55);
  const rad = Math.min(w, h) * 0.09;
  const glow = c.createRadialGradient(x, y, 0, x, y, rad * 3.2);
  glow.addColorStop(0, b.day ? 'rgba(255,230,160,.85)' : 'rgba(220,230,255,.5)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = glow;
  c.fillRect(0, 0, w, h);
  c.fillStyle = b.day ? '#ffe9a8' : '#e9efff';
  c.beginPath();
  c.arc(x, y, rad, 0, 6.3);
  c.fill();
  if (!b.day) { c.fillStyle = `rgb(${s.top})`; c.beginPath(); c.arc(x + rad * 0.45, y - rad * 0.2, rad * 0.9, 0, 6.3); c.fill(); }
  // холмы
  c.fillStyle = `rgba(${mix(s.top, [20, 40, 30], 0.7)},.9)`;
  c.beginPath();
  c.moveTo(0, h);
  for (let i = 0; i <= 12; i += 1) c.lineTo((i / 12) * w, h * (0.82 - 0.08 * Math.sin(i * 0.9 + 1)));
  c.lineTo(w, h);
  c.fill();
}
