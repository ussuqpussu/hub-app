/* ---------- БУМАЖНЫЙ ТЕАТР ---------- */
TSN.papercut = ["Холмы и солнце", "Лесной театр", "Бумажное море", "Город"];

/* слой вырезанной бумаги: контур задаёт fn(x) -> y, снизу тень на слой ниже */
function pcLayer(c, w, h, col, fn, shadowY) {
  var x, step = Math.max(4, w / 90);
  c.save(); c.shadowColor = "rgba(60,40,20,.35)"; c.shadowBlur = shadowY || 10; c.shadowOffsetY = (shadowY || 10) * .5;
  c.fillStyle = col; c.beginPath(); c.moveTo(0, h + 10);
  for (x = 0; x <= w + step; x += step) c.lineTo(x, fn(x));
  c.lineTo(w + step, h + 10); c.closePath(); c.fill(); c.restore();
  c.save(); c.globalAlpha = .1; c.strokeStyle = "#fff"; c.lineWidth = 1.2; c.beginPath();
  for (x = 0; x <= w + step; x += step) { var y = fn(x) + 1; x ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.stroke(); c.restore();
}
function pcBg(E, a, b) { zBg(E, [[0, a || "#f9e7c8"], [1, b || "#f3d3a4"]]); var c = E.ctx, i; c.globalAlpha = .05; c.fillStyle = "#7a5a30"; for (i = 0; i < 200; i++) c.fillRect(hsh(i, 161) * E.w, hsh(i, 162) * E.h, 1, 1 + hsh(i, 163) * 3); c.globalAlpha = 1; }
function pcSway(E, depth) { return (HP.on ? (HP.x - .5) * 2 : Math.sin(E.t * .35)) * depth; }

TSC.papercut = [
  /* 0. Холмы, солнце и облака — слои качаются с глубиной */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    pcBg(E, "#fbe9c6", "#f6d29e");
    var sx = w * .68 + pcSway(E, 6), sy = h * .3;
    for (i = 5; i >= 0; i--) { c.fillStyle = ["#f4a259", "#f6b26c", "#f8c07c", "#fad08e", "#fbdea4", "#fcebc0"][i]; c.beginPath(); c.arc(sx, sy, m * (.07 + i * .035), 0, 6.2832); c.fill(); }
    c.fillStyle = "#e8683a"; c.beginPath(); c.arc(sx, sy, m * .065, 0, 6.2832); c.fill();
    for (i = 0; i < 3; i++) {
      var cx = ((t * (6 + i * 3) + i * w * .4) % (w + 160)) - 80 + pcSway(E, 10), cy = h * (.14 + i * .09);
      c.save(); c.shadowColor = "rgba(60,40,20,.25)"; c.shadowBlur = 8; c.shadowOffsetY = 4; c.fillStyle = "#fffaf0";
      c.beginPath(); c.arc(cx, cy, m * .035, 0, 6.2832); c.arc(cx + m * .04, cy - m * .015, m * .045, 0, 6.2832); c.arc(cx + m * .09, cy, m * .035, 0, 6.2832); c.fillRect(cx, cy, m * .09, m * .035); c.fill(); c.restore();
    }
    var cols = ["#f2b66a", "#e59a5a", "#c97f4e", "#a8644a", "#7f4c43"];
    cols.forEach(function (col, k) {
      var sw = pcSway(E, 4 + k * 5), base = h * (.5 + k * .1);
      pcLayer(c, w, h, col, function (x) { return base - (Math.sin((x + sw) * .008 + k * 1.7) * .5 + Math.sin((x + sw) * .021 + k) * .25 + .6) * h * .16 + Math.sin(t * .4 + k) * 1.5; }, 8 + k * 2);
    });
    for (i = 0; i < 5; i++) { var bx = ((t * (10 + i) + i * 90) % (w + 40)) - 20, by = h * (.2 + hsh(i, 164) * .1) + Math.sin(t * 3 + i) * 3; c.strokeStyle = "#5a3a2a"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(bx - 6, by); c.quadraticCurveTo(bx - 3, by - 5 + Math.sin(t * 8 + i) * 2, bx, by); c.quadraticCurveTo(bx + 3, by - 5 + Math.sin(t * 8 + i) * 2, bx + 6, by); c.stroke(); }
  },
  /* 1. Лесной театр: ёлки на нескольких планах, луна, лисица пробегает */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    pcBg(E, "#cfe0d6", "#a9c8b6");
    c.fillStyle = "#fff6dc"; c.beginPath(); c.arc(w * .25 + pcSway(E, 5), h * .22, m * .09, 0, 6.2832); c.fill();
    c.fillStyle = "rgba(255,246,220,.4)"; c.beginPath(); c.arc(w * .25 + pcSway(E, 5), h * .22, m * .13, 0, 6.2832); c.fill();
    var pal = [["#9cc2ab", .5, 5], ["#6fa58a", .62, 11], ["#3f7f68", .75, 18], ["#245a4c", .9, 26]];
    pal.forEach(function (L, k) {
      pcLayer(c, w, h, L[0], function (x) { return h * (L[1] + .12) - Math.sin(x * .012 + k) * h * .02; }, 8);
      var n = 7 + k * 2, sw = pcSway(E, L[2]);
      for (i = 0; i < n; i++) {
        var tx = (i + .5 + (hsh(i + k * 10, 171) - .5) * .6) / n * w + sw, ty = h * (L[1] + .12), th = m * (.18 + k * .06 + hsh(i + k, 172) * .1);
        c.save(); c.shadowColor = "rgba(30,50,40,.3)"; c.shadowBlur = 6; c.shadowOffsetY = 3; c.fillStyle = L[0] === "#245a4c" ? "#1b4439" : L[0];
        for (var q = 0; q < 4; q++) { var qy = ty - th * (.1 + q * .23), qw = th * (.3 - q * .06); c.beginPath(); c.moveTo(tx - qw, qy); c.lineTo(tx, qy - th * .34); c.lineTo(tx + qw, qy); c.closePath(); c.fill(); }
        c.fillRect(tx - 2, ty - th * .12, 4, th * .12); c.restore();
      }
    });
    var fp = ((t * .05) % 1.4) - .2, fx = w * fp, fy = h * .9 + Math.sin(t * 10) * 2, dir = 1;
    c.save(); c.translate(fx, fy); c.fillStyle = "#e6783a";
    c.beginPath(); c.ellipse(0, 0, m * .05, m * .022, 0, 0, 6.2832); c.fill();
    c.beginPath(); c.moveTo(m * .04, -m * .01); c.lineTo(m * .075, -m * .03); c.lineTo(m * .08, 0); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-m * .045, 0); c.quadraticCurveTo(-m * .1, -m * .03 + Math.sin(t * 6) * 3, -m * .12, m * .01); c.quadraticCurveTo(-m * .08, m * .01, -m * .045, m * .02); c.fill();
    c.fillStyle = "#fff"; c.beginPath(); c.arc(-m * .118, m * .01, m * .008, 0, 6.2832); c.fill(); c.restore();
  },
  /* 2. Бумажное море: волны из полос, кораблик */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    pcBg(E, "#fde9c8", "#f6d2a2");
    c.fillStyle = "#f0a35a"; c.beginPath(); c.arc(w * .5, h * .42, m * .12, 0, 6.2832); c.fill();
    var cols = ["#9ccfe0", "#7fbdd6", "#5fa6c6", "#4690b6", "#2f78a0", "#1f628a"];
    cols.forEach(function (col, k) {
      var base = h * (.5 + k * .09), amp = h * (.014 + k * .005), sp = .6 + k * .12;
      pcLayer(c, w, h, col, function (x) { return base + Math.sin(x * (.02 - k * .002) + t * sp + k) * amp + Math.sin(x * .007 - t * .3 + k * 2) * amp; }, 7);
      if (k === 2) {
        var bx = w * .38 + Math.sin(t * .3) * w * .05, by = base + Math.sin(bx * .018 + t * sp + k) * amp - 2, rot = Math.cos(bx * .018 + t * sp + k) * .1;
        c.save(); c.translate(bx, by); c.rotate(rot);
        c.save(); c.shadowColor = "rgba(40,30,20,.3)"; c.shadowBlur = 6; c.shadowOffsetY = 3;
        c.fillStyle = "#c4573a"; c.beginPath(); c.moveTo(-m * .08, -m * .02); c.lineTo(m * .08, -m * .02); c.lineTo(m * .055, m * .02); c.lineTo(-m * .055, m * .02); c.closePath(); c.fill();
        c.fillStyle = "#fffaf0"; c.beginPath(); c.moveTo(0, -m * .02); c.lineTo(0, -m * .14); c.lineTo(m * .07, -m * .03); c.closePath(); c.fill();
        c.fillStyle = "#f6e2b8"; c.beginPath(); c.moveTo(-.004 * m, -m * .02); c.lineTo(-.004 * m, -m * .1); c.lineTo(-m * .055, -m * .03); c.closePath(); c.fill();
        c.restore(); c.restore();
      }
    });
    for (i = 0; i < 4; i++) { var gx = ((t * (14 + i * 3) + i * 120) % (w + 60)) - 30; c.strokeStyle = "#fff"; c.lineWidth = 1.8; c.beginPath(); c.moveTo(gx - 6, h * (.18 + i * .05)); c.quadraticCurveTo(gx - 3, h * (.18 + i * .05) - 4, gx, h * (.18 + i * .05)); c.quadraticCurveTo(gx + 3, h * (.18 + i * .05) - 4, gx + 6, h * (.18 + i * .05)); c.stroke(); }
  },
  /* 3. Город: силуэты домов на планах, окна зажигаются */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i, j;
    pcBg(E, "#f7d9c4", "#eab0a0");
    c.fillStyle = "#fff0d8"; c.beginPath(); c.arc(w * .78 + pcSway(E, 4), h * .26, m * .06, 0, 6.2832); c.fill();
    [["#d68f8c", .72, 8, 5], ["#b96b78", .82, 14, 4], ["#8d4a63", .93, 22, 3]].forEach(function (L, k) {
      var sw = pcSway(E, L[2]), x = -20 + sw, n = 0;
      while (x < w + 30) {
        var bw = m * (.08 + hsh(n + k * 20, 181) * .08), bh = h * (.14 + hsh(n + k * 20, 182) * (.18 + k * .06)), by = h * L[1];
        c.save(); c.shadowColor = "rgba(60,20,40,.35)"; c.shadowBlur = 8; c.shadowOffsetY = 4; c.fillStyle = L[0];
        c.fillRect(x, by - bh, bw, bh + h);
        if (hsh(n + k, 183) > .5) { c.beginPath(); c.moveTo(x - 3, by - bh); c.lineTo(x + bw / 2, by - bh - bw * .35); c.lineTo(x + bw + 3, by - bh); c.fill(); }
        c.restore();
        for (j = 0; j < bh - 8; j += 11) for (var q = 4; q < bw - 6; q += 9) { var lit = hsh(n * 7 + j + q + k, 184) > .45 && Math.sin(t * .4 + n + j * .1 + q) > -.6; c.fillStyle = lit ? "#ffe9a8" : "rgba(60,20,40,.25)"; c.fillRect(x + q, by - bh + j + 4, 5, 6); }
        x += bw + m * .01; n++;
      }
    });
    var lx = w * .2 + pcSway(E, 20); c.fillStyle = "#3a1f33"; c.fillRect(lx, h * .8, 3, h * .2); c.fillStyle = "#ffe9a8"; c.beginPath(); c.arc(lx + 1.5, h * .8, 5, 0, 6.2832); c.fill(); zGlow(c, lx + 1.5, h * .8, m * .08, "rgba(255,233,168,.5)");
  }
];
