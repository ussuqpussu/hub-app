// Окружение для рисования на холсте (помощники shp/circ/txt/stars) — на нём построено небо погоды (js/sky.js).
// Раньше жило в scenes.js вместе со сценами старых тем; сцены тем теперь рисует движок theme/engine.html.

// Отрисовка одной сцены на холсте cv для темы th (запись из SCENE_THEMES), страница pg (0..8), время t в секундах.
export function renderScene(cv, thId, pg, t, dprMax = 2, custom = null, thObj = null) {
  const th = thObj;
  if (!th || !custom) return false;
  const W = cv.clientWidth, H = cv.clientHeight;
  if (!W || !H) return false;
  const dpr = Math.min(dprMax, window.devicePixelRatio || 1);
  const tw = Math.max(1, Math.round(W * dpr)), thh = Math.max(1, Math.round(H * dpr));
  if (cv.width !== tw || cv.height !== thh) { cv.width = tw; cv.height = thh; }
  const ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, tw, thh);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const st = th.st, pix = false, w = W, h = H, dk = th.dk;
  const LW = Math.max(1.2, Math.min(w, h) / 160), GB = Math.min(w, h) / 22;
  function shp(col, build, o) {
    o = o || {}; ctx.beginPath(); build();
    const s = o.st || st;
    if (o.fill === 'only') { ctx.fillStyle = col; ctx.fill(); return; }
    if (s === 'line') { ctx.lineWidth = (o.lw || 1) * LW; ctx.strokeStyle = col; ctx.stroke(); if (o.solid) { ctx.globalAlpha = .12; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1; } }
    else if (s === 'glow') { ctx.shadowBlur = GB; ctx.shadowColor = col; ctx.lineWidth = (o.lw || 1) * LW * 1.4; ctx.strokeStyle = col; ctx.stroke(); ctx.globalAlpha = o.solid ? .55 : .16; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1; ctx.shadowBlur = 0; }
    else if (s === 'glass') { ctx.globalAlpha = .5; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = .9; ctx.lineWidth = LW; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.globalAlpha = 1; }
    else if (s === 'wc') { ctx.globalAlpha = .55; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1; }
    else {
      if (!o.ns) { ctx.shadowColor = dk ? 'rgba(0,0,0,.45)' : 'rgba(40,30,20,.16)'; ctx.shadowBlur = Math.min(w, h) * .022; ctx.shadowOffsetY = Math.min(w, h) * .006; }
      ctx.fillStyle = col; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      if (!o.ns) { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,.10)'); g.addColorStop(1, 'rgba(0,0,0,.08)'); ctx.fillStyle = g; ctx.fill(); }
    }
  }
  const circ = (x, y, r) => ctx.arc(x, y, Math.max(.5, r), 0, Math.PI * 2);
  const txt = (s, x, y, size, col) => { ctx.font = `600 ${size}px ${th.lf || 'system-ui,sans-serif'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(s, x, y); };
  const stars = (n) => {
    if (!dk) return;
    const fr = (x) => { x = Math.sin(x) * 43758.5453; return x - Math.floor(x); };
    for (let i = 0; i < n * 2; i++) {
      const a1 = fr(i * 12.99 + 3.1), a2 = fr(i * 78.23 + 1.7), a3 = fr(i * 37.7 + 5.3);
      const X = ((a1 * w + t * (2 + a3 * 4)) % w + w) % w, Y = a2 * h * .62;
      const tw2 = .5 + .5 * Math.sin(t * (.9 + a1 * 2) + i * 1.7), al = (.3 + .7 * tw2) * (a3 < .35 && a3 >= .1 ? 1 : .6);
      const R = Math.max(.8, LW * .5) * (a3 < .1 ? 3.2 : a3 < .35 ? 1.8 : 1);
      const gg = ctx.createRadialGradient(X, Y, 0, X, Y, R * 2.2);
      gg.addColorStop(0, th.t); gg.addColorStop(.3, th.t); gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = al; ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(X, Y, R * 2.2, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
    }
  };
  const E = { cv, w, h, m: Math.min(w, h), cx: w / 2, cy: h / 2, pix, LW, GB, shp, circ, txt, stars, ctx, th, t, pg, P: th.pal, dk, st };
  ctx.save();
  try { custom(E); } catch (er) { if (window.console) console.error(er); ctx.restore(); return false; }
  ctx.restore();
  return true;
}
