/* ---------- АВРОРА ---------- */
TSN.aurora = ["Ленты сияния", "Озеро", "Изморозь", "Снег в соснах"];

function auSky(E) {
  zBg(E, [[0, "#020b14"], [.6, "#06202c"], [1, "#0b3340"]]);
  zStars(E, 90, .8, 23, .6);
}
/* лента сияния: колышется по x, вертикальные лучи разной яркости */
function auRibbon(c, w, h, t, y0, hgt, hue, seed, a) {
  var N = 70, i, step = w / N;
  for (i = 0; i < N; i++) {
    var x = i * step, wv = Math.sin(i * .17 + t * .5 + seed) * hgt * .35 + Math.sin(i * .07 - t * .3 + seed * 2) * hgt * .3;
    var top = y0 + wv - hgt * (.5 + .5 * zN(i * .2 + t * .3 + seed, 5)), bot = y0 + wv + hgt * .35;
    var g = c.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, "hsla(" + (hue + 50) + ",90%,65%,0)"); g.addColorStop(.35, "hsla(" + hue + ",90%,60%," + (.5 * a) + ")"); g.addColorStop(1, "hsla(" + (hue - 20) + ",90%,55%,0)");
    c.fillStyle = g; c.fillRect(x, top, step + 1, bot - top);
  }
}
function auMountains(c, w, h, base, col, amp, seed, snow) {
  var i, n = 36;
  c.fillStyle = col; c.beginPath(); c.moveTo(0, h);
  for (i = 0; i <= n; i++) c.lineTo(i / n * w, base - Math.pow(zN(i * .45 + seed, seed + 3), 1.4) * amp);
  c.lineTo(w, h); c.closePath(); c.fill();
  if (snow) {
    c.strokeStyle = "rgba(220,245,255,.5)"; c.lineWidth = 1.2; c.beginPath();
    for (i = 0; i <= n; i++) { var y = base - Math.pow(zN(i * .45 + seed, seed + 3), 1.4) * amp; i ? c.lineTo(i / n * w, y) : c.moveTo(i / n * w, y); }
    c.stroke();
  }
}
function auPine(c, x, yb, s, col) {
  c.fillStyle = col;
  for (var k = 0; k < 4; k++) {
    var y = yb - s * (.2 + k * .22), ww = s * (.34 - k * .06);
    c.beginPath(); c.moveTo(x - ww, y); c.lineTo(x, y - s * .3); c.lineTo(x + ww, y); c.closePath(); c.fill();
  }
  c.fillRect(x - s * .03, yb - s * .2, s * .06, s * .2);
}

TSC.aurora = [
  /* 0. Ленты сияния над горами */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m;
    auSky(E);
    c.save(); c.globalCompositeOperation = "lighter";
    auRibbon(c, w, h, t, h * .32, h * .3, 150, 1, .9);
    auRibbon(c, w, h, t * .8, h * .26, h * .22, 190, 4, .55);
    auRibbon(c, w, h, t * 1.2, h * .38, h * .18, 280, 8, .35);
    if (HP.on) zGlow(c, HP.x * w, HP.y * h * .6, m * .3, "rgba(120,255,200,.14)");
    c.restore();
    auMountains(c, w, h, h * .78, "#0a1e2a", h * .32, 2, true);
    auMountains(c, w, h, h * .9, "#04101a", h * .22, 9, false);
    for (var i = 0; i < 9; i++) auPine(c, w * (.05 + i * .115 + hsh(i, 31) * .04), h * 1.01, m * (.16 + hsh(i, 32) * .1), "#020a10");
  },
  /* 1. Озеро: небо и перевёрнутое отражение с рябью */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, hz = h * .55, i;
    auSky(E);
    c.save(); c.globalCompositeOperation = "lighter";
    auRibbon(c, w, hz * 2, t, hz * .45, hz * .45, 150, 3, .9);
    auRibbon(c, w, hz * 2, t * .9, hz * .38, hz * .3, 200, 6, .5);
    c.restore();
    auMountains(c, w, hz, hz, "#0a1e2a", hz * .5, 5, true);
    c.fillStyle = "#04101a"; c.fillRect(0, hz - 1, w, 2);
    /* отражение: зеркало верхней половины с колебанием строк */
    var off = document.createElement("canvas");
    var k = Math.min(2, window.devicePixelRatio || 1);
    off.width = Math.round(w * k); off.height = Math.round(hz * k);
    var og = off.getContext("2d"); var kk = c.canvas.width / w; og.drawImage(c.canvas, 0, 0, c.canvas.width, Math.round(hz * kk), 0, 0, off.width, off.height);
    c.fillStyle = "#031018"; c.fillRect(0, hz, w, h - hz);
    var rows = Math.floor(h - hz);
    for (i = 0; i < rows; i += 2) {
      var sy = hz * (1 - i / (h - hz)) , dx = Math.sin(i * .25 + t * 1.6) * (1 + i * .04) * (HP.on ? 1 + Math.abs(HP.x - .5) * 3 : 1);
      c.globalAlpha = .55 * (1 - i / rows * .6);
      c.drawImage(off, 0, Math.max(0, Math.min(hz * k - 1, sy * k - 1)), w * k, 2, dx, hz + i, w, 2);
    }
    c.globalAlpha = 1;
    c.strokeStyle = "rgba(160,230,230,.25)";
    for (i = 0; i < 12; i++) { var yy = hz + (h - hz) * (hsh(i, 33) * hsh(i, 33)) + 3; c.beginPath(); c.moveTo(w * hsh(i, 34) * .8, yy); c.lineTo(w * hsh(i, 34) * .8 + 20 + hsh(i, 35) * 60, yy); c.stroke(); }
  },
  /* 2. Изморозь на стекле: кристаллы растут от краёв, тёплый след от указателя */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i, j;
    auSky(E);
    c.save(); c.globalCompositeOperation = "lighter"; auRibbon(c, w, h, t, h * .45, h * .4, 160, 2, .55); c.restore();
    c.fillStyle = "rgba(210,238,248,.1)"; c.fillRect(0, 0, w, h);
    var grow = Math.min(1, .35 + (t % 40) / 40 * .65);
    var seeds = [[0, 0], [w, 0], [0, h], [w, h], [w * .5, h], [w * .5, 0], [0, h * .5], [w, h * .5]];
    c.strokeStyle = "rgba(230,248,255,.7)"; c.lineCap = "round";
    seeds.forEach(function (s, k) {
      var branches = 7;
      for (i = 0; i < branches; i++) {
        var an = (s[0] === w ? Math.PI : 0) + (s[1] === h ? -Math.PI / 2 : s[1] === 0 ? Math.PI / 2 : 0) + (i / (branches - 1) - .5) * 2.4 + (s[1] === h * .5 ? -Math.PI / 2 + .5 : 0);
        var L = m * (.2 + hsh(i + k * 10, 36) * .22) * grow;
        c.lineWidth = 1.4; c.beginPath(); c.moveTo(s[0], s[1]);
        var ex = s[0] + Math.cos(an) * L, ey = s[1] + Math.sin(an) * L; c.lineTo(ex, ey); c.stroke();
        for (j = 1; j < 6; j++) {
          var px = s[0] + Math.cos(an) * L * j / 6, py = s[1] + Math.sin(an) * L * j / 6, bl = L * .22 * (1 - j / 7);
          c.lineWidth = .9;
          c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(an + .8) * bl, py + Math.sin(an + .8) * bl);
          c.moveTo(px, py); c.lineTo(px + Math.cos(an - .8) * bl, py + Math.sin(an - .8) * bl); c.stroke();
        }
      }
    });
    for (i = 0; i < 30; i++) {
      var tw = Math.max(0, Math.sin(t * 1.4 + i * 2.1));
      var x = hsh(i, 37) * w, y = hsh(i, 38) * h;
      c.strokeStyle = "rgba(255,255,255," + tw * .8 + ")"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x + 4, y); c.moveTo(x, y - 4); c.lineTo(x, y + 4); c.stroke();
    }
    if (HP.on) { var g = zRG(c, HP.x * w, HP.y * h, 0, m * .18, [[0, "rgba(255,214,150,.4)"], [1, "rgba(255,214,150,0)"]]); c.fillStyle = g; c.fillRect(0, 0, w, h); }
  },
  /* 3. Снег в соснах */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    auSky(E);
    c.save(); c.globalCompositeOperation = "lighter"; auRibbon(c, w, h, t, h * .28, h * .26, 150, 7, .55); c.restore();
    auMountains(c, w, h, h * .72, "#0a1e2a", h * .22, 12, true);
    for (i = 0; i < 16; i++) { var d = hsh(i, 41); auPine(c, w * (i / 15) + (d - .5) * 24, h * (.78 + d * .1), m * (.14 + d * .22), d > .5 ? "#031018" : "#06202c"); }
    c.fillStyle = "#cfe9f0"; c.beginPath(); c.moveTo(0, h);
    for (i = 0; i <= 30; i++) c.lineTo(i / 30 * w, h * .94 - zN(i * .3, 14) * h * .05);
    c.lineTo(w, h); c.fill();
    var wind = HP.on ? (HP.x - .5) * 2 : .3;
    for (i = 0; i < 90; i++) {
      var sp = .05 + hsh(i, 42) * .1, p = (t * sp + hsh(i, 43)) % 1, x = (hsh(i, 44) + wind * p * .3 + Math.sin(t * .8 + i) * .01) % 1;
      c.fillStyle = "rgba(255,255,255," + (.4 + hsh(i, 45) * .5) + ")"; c.beginPath(); c.arc(((x + 1) % 1) * w, p * h, .8 + hsh(i, 46) * 1.8, 0, 6.2832); c.fill();
    }
  }
];
