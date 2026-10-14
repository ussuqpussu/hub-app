/* ---------- ПИКСЕЛЬ ---------- */
TSN.pixel = ["День и ночь", "Дождливый город", "Закат у моря", "Звёздный полёт"];

/* Все сцены рисуются в маленький холст (низкое разрешение), потом увеличиваются без сглаживания. */
var PXC = null;
function pxRun(E, W, H, fn) {
  var c = E.ctx, k = Math.max(1, Math.round(E.h / H)), Wp = Math.max(40, Math.round(E.w / k)), Hp = Math.round(E.h / k);
  if (!PXC) PXC = document.createElement("canvas");
  if (PXC.width !== Wp || PXC.height !== Hp) { PXC.width = Wp; PXC.height = Hp; }
  var g = PXC.getContext("2d"); g.clearRect(0, 0, Wp, Hp); g.imageSmoothingEnabled = false;
  fn(g, Wp, Hp, E.t);
  c.imageSmoothingEnabled = false; c.drawImage(PXC, 0, 0, Wp, Hp, 0, 0, Wp * k, Hp * k);
}
function pxR(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function pxSky(g, W, H, cols, y1) { var n = cols.length, i; for (i = 0; i < n; i++) pxR(g, 0, y1 * i / n, W, y1 / n + 1, cols[i]); }
function pxHills(g, W, H, base, amp, col, sp, t, seed) { var x; g.fillStyle = col; for (x = 0; x < W; x++) { var y = base - (Math.sin((x + t * sp) * .05 + seed) * .5 + Math.sin((x + t * sp) * .13 + seed * 2) * .3 + 1) * amp; g.fillRect(x, Math.round(y), 1, H); } }

TSC.pixel = [
  /* 0. День сменяется ночью: солнце/луна идут по дуге, три слоя холмов с параллаксом */
  function (E) {
    pxRun(E, 0, 112, function (g, W, H, t) {
      var ph = (t * .05 + (HP.on ? (HP.x - .5) * .3 : 0)) % 1, ang = ph * 6.2832, sun = Math.sin(ang), night = sun < -.1;
      var day = [["#2a1d5a", "#3b2a7a", "#5b3f9a", "#8a5ab0", "#e87a8c"], ["#4aa8e8", "#6cbcf0", "#8ccaf4", "#aadcf8", "#d8f0fa"]];
      var k = Math.max(0, Math.min(1, sun * 2 + .5)), cols = k > .5 ? day[1] : day[0];
      pxSky(g, W, H, cols, H * .7);
      if (k < .5) for (var i = 0; i < 40; i++) if ((Math.floor(t * 2 + i) % 5)) pxR(g, hsh(i, 111) * W, hsh(i, 112) * H * .55, 1, 1, i % 4 ? "#cfd6ff" : "#ffe6a0");
      var bx = W * (.1 + (1 - ((ph * 2) % 1)) * 0 + (ph < .5 ? ph * 2 : (ph - .5) * 2) * .8), by = H * (.62 - Math.sin(((ph < .5 ? ph : ph - .5) * 2) * Math.PI) * .5);
      if (ph < .5) { g.fillStyle = "#ffe27a"; g.beginPath(); g.arc(bx, by, 7, 0, 6.2832); g.fill(); pxR(g, bx - 9, by - 1, 18, 2, "rgba(255,226,122,.5)"); }
      else { g.fillStyle = "#f4f0dc"; g.beginPath(); g.arc(bx, by, 6, 0, 6.2832); g.fill(); g.fillStyle = "#cdc8b0"; g.fillRect(Math.round(bx) - 2, Math.round(by) - 1, 2, 2); }
      for (i = 0; i < 4; i++) { var cx = ((i * 55 - t * (2 + i)) % (W + 40) + W + 40) % (W + 40) - 20, cy = H * (.1 + i * .08); pxR(g, cx, cy, 18, 4, k > .5 ? "#ffffff" : "#5b4a8a"); pxR(g, cx + 4, cy - 3, 10, 3, k > .5 ? "#ffffff" : "#5b4a8a"); }
      pxHills(g, W, H, H * .7, H * .1, k > .5 ? "#7bb86a" : "#2c3a6a", 1.2, t, 1);
      pxHills(g, W, H, H * .8, H * .1, k > .5 ? "#4f9a50" : "#1f2a52", 3, t, 2);
      pxHills(g, W, H, H * .92, H * .06, k > .5 ? "#2f7a3c" : "#141c3a", 6, t, 3);
      for (i = 0; i < 6; i++) { var tx = ((i * 38 - t * 6) % (W + 30) + W + 30) % (W + 30) - 10, ty = H * .9; pxR(g, tx, ty - 8, 2, 8, "#3b2a1a"); pxR(g, tx - 3, ty - 14, 8, 7, k > .5 ? "#2f7a3c" : "#14301f"); }
    });
  },
  /* 1. Дождливый город: окна, дождь, лужи, вывеска мигает */
  function (E) {
    pxRun(E, 0, 112, function (g, W, H, t) {
      pxSky(g, W, H, ["#0a0818", "#150f2c", "#201742", "#2e2058"], H * .7);
      var i, j;
      for (var L = 0; L < 2; L++) {
        var base = H * .86, x = 0;
        for (i = 0; x < W + 20; i++) {
          var bw = 14 + Math.floor(hsh(i + L * 40, 121) * 16), bh = H * (.22 + hsh(i + L * 40, 122) * .3) * (L ? .7 : 1.1);
          pxR(g, x, base - bh, bw, bh + 4, L ? "#161230" : "#0c0a1e");
          for (j = 0; j < bh - 4; j += 5) for (var q = 2; q < bw - 2; q += 4) if (hsh(i * 31 + j + q + L * 9, 123) > (L ? .55 : .5)) pxR(g, x + q, base - bh + j + 2, 2, 3, (Math.floor(t * .3 + i + j) % 17 === 0) ? "#7a5a3a" : (hsh(i + j, 124) > .6 ? "#ffd27a" : "#b6e0ff"));
          x += bw + (L ? 2 : 1);
        }
      }
      var sx = W * .62, sy = H * .34, bl = Math.sin(t * 7) > -.3 || Math.sin(t * .7) > .85;
      pxR(g, sx, sy, 34, 12, "#1a0f2e"); pxR(g, sx + 1, sy + 1, 32, 10, bl ? "#ff4fa0" : "#6a2a50");
      pxR(g, sx + 4, sy + 4, 6, 4, "#ffd0e8"); pxR(g, sx + 14, sy + 4, 6, 4, "#ffd0e8"); pxR(g, sx + 24, sy + 4, 6, 4, "#ffd0e8");
      pxR(g, 0, H * .86, W, H * .14, "#0a0818");
      for (i = 0; i < 6; i++) pxR(g, hsh(i, 125) * W, H * .9 + hsh(i, 126) * H * .08, 10 + hsh(i, 127) * 14, 1, "rgba(160,200,255," + (.3 + .3 * Math.sin(t * 3 + i)) + ")");
      pxR(g, sx + 4, H * .9, 24, 1, bl ? "rgba(255,79,160,.5)" : "rgba(255,79,160,.15)");
      var wind = HP.on ? (HP.x - .5) * 3 : 1;
      for (i = 0; i < 90; i++) { var sp = 90 + hsh(i, 128) * 60, y = ((t * sp + hsh(i, 129) * H * 2) % (H * 1.1)), x2 = ((hsh(i, 130) * W + y * wind * .3) % W + W) % W; pxR(g, x2, y, 1, 3, "rgba(170,200,255,.55)"); }
      if (Math.sin(t * .35) > .985 || (t % 11) < .12) pxR(g, 0, 0, W, H, "rgba(220,230,255,.25)");
    });
  },
  /* 2. Закат у моря: солнце тонет, блики, чайки */
  function (E) {
    pxRun(E, 0, 112, function (g, W, H, t) {
      var hz = H * .56, i;
      pxSky(g, W, H, ["#2a1a5a", "#5a2a7a", "#a43a7a", "#e8587a", "#ff8f5a", "#ffc46a"], hz);
      var ph = (Math.sin(t * .12) * .5 + .5), sy = hz - H * .22 + ph * H * .2, sx = W * .5;
      g.fillStyle = "#fff0b0"; g.beginPath(); g.arc(sx, sy, 15, 0, 6.2832); g.fill();
      g.fillStyle = "#ffc46a"; g.beginPath(); g.arc(sx, sy, 11, 0, 6.2832); g.fill();
      for (i = 0; i < 4; i++) pxR(g, sx - 24, sy - 8 + i * 5, 48, 1, i % 2 ? "rgba(255,143,90,.9)" : "rgba(232,88,122,.9)");
      pxR(g, 0, hz, W, H - hz, "#2a2a6a");
      for (i = 0; i < 14; i++) { var y = hz + i * (H - hz) / 14, c1 = ["#3a3478", "#32306a", "#2a2a5c"][i % 3]; pxR(g, 0, y, W, (H - hz) / 14 + 1, c1); }
      for (i = 0; i < 40; i++) { var yy = hz + 2 + hsh(i, 141) * (H - hz - 2), wob = Math.sin(t * 2 + i * 1.7); if (wob > 0) pxR(g, sx + (hsh(i, 142) - .5) * (30 + (yy - hz) * 1.2) + wob * 2, yy, 3 + (yy - hz) * .12, 1, "rgba(255,196,106," + (.9 - (yy - hz) / (H - hz) * .5) + ")"); }
      for (i = 0; i < 3; i++) { var bx = ((t * (8 + i * 3) + i * 70) % (W + 30)) - 15, by = H * (.2 + i * .07) + Math.sin(t * 2 + i) * 3, f = Math.sin(t * 6 + i) > 0; pxR(g, bx, by + (f ? 0 : 1), 4, 1, "#2a1a3a"); pxR(g, bx + 4, by + (f ? 1 : 0), 4, 1, "#2a1a3a"); }
      pxR(g, W * .12, hz - 3, 10, 3, "#1a1230"); pxR(g, W * .12 + 4, hz - 12, 1, 10, "#1a1230"); pxR(g, W * .12 + 5, hz - 11, 5, 6, "#fff0d0");
      var bob = Math.round(Math.sin(t * 1.5));
      pxR(g, W * .8, H * .8 + bob, 20, 5, "#1a1230"); pxR(g, W * .8 + 2, H * .8 + 5 + bob, 16, 2, "#1a1230");
    });
  },
  /* 3. Звёздный полёт: корабль, звёзды летят на зрителя, указатель поворачивает курс */
  function (E) {
    pxRun(E, 0, 112, function (g, W, H, t) {
      pxR(g, 0, 0, W, H, "#06041a");
      var i, cx = W / 2 + (HP.on ? (HP.x - .5) * W * .5 : Math.sin(t * .4) * W * .1), cy = H / 2 + (HP.on ? (HP.y - .5) * H * .4 : 0);
      for (i = 0; i < 120; i++) {
        var z = (hsh(i, 151) + t * (.22 + hsh(i, 152) * .1)) % 1, a = hsh(i, 153) * 6.2832, r = z * z * W * .8;
        var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * .8, sz = z > .75 ? 2 : 1;
        pxR(g, x, y, sz, sz, z > .6 ? "#ffffff" : (i % 3 ? "#8a8aff" : "#ff8ad0"));
        if (z > .85) pxR(g, x - Math.cos(a) * 3, y - Math.sin(a) * 2.4, 1, 1, "#8a8aff");
      }
      var px = cx + Math.sin(t * .8) * 4, py = H * .72 + Math.sin(t * 1.3) * 2;
      g.fillStyle = "#e8e8f8"; g.beginPath(); g.moveTo(px, py - 12); g.lineTo(px + 10, py + 6); g.lineTo(px + 4, py + 4); g.lineTo(px, py + 8); g.lineTo(px - 4, py + 4); g.lineTo(px - 10, py + 6); g.closePath(); g.fill();
      pxR(g, px - 1, py - 6, 2, 5, "#5ac8ff"); pxR(g, px - 8, py + 3, 3, 3, "#ff5a8a"); pxR(g, px + 5, py + 3, 3, 3, "#ff5a8a");
      var f = Math.floor(t * 12) % 2; pxR(g, px - 2, py + 8, 4, 4 + f * 2, "#ffd27a"); pxR(g, px - 1, py + 8, 2, 3 + f * 3, "#fff6c8");
      for (i = 0; i < 2; i++) { var z2 = (t * .08 + i * .5) % 1, r2 = 4 + z2 * 26, ax = W * (.2 + i * .6) + (z2 * 20) * (i ? 1 : -1), ay = H * (.15 + z2 * .5); g.fillStyle = i ? "#5a4a7a" : "#7a5a4a"; g.beginPath(); g.arc(ax, ay, r2 / 2, 0, 6.2832); g.fill(); g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.arc(ax + r2 * .15, ay + r2 * .1, r2 / 4, 0, 6.2832); g.fill(); }
    });
  }
];
