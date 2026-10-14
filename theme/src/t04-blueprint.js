/* ---------- ЧЕРТЁЖ ---------- */
TSN.blueprint = ["Циркуль", "Шестерни", "Изометрия", "Ферма"];

var BP_L = "rgba(235,245,255,.9)", BP_D = "rgba(235,245,255,.35)", BP_F = "rgba(235,245,255,.12)";
function bpBg(E) {
  var c = E.ctx, w = E.w, h = E.h, i;
  zBg(E, [[0, "#0d3f7a"], [1, "#0a3166"]]);
  c.lineWidth = 1;
  for (i = 0; i < w; i += 20) { c.strokeStyle = i % 100 === 0 ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.07)"; c.beginPath(); c.moveTo(i + .5, 0); c.lineTo(i + .5, h); c.stroke(); }
  for (i = 0; i < h; i += 20) { c.strokeStyle = i % 100 === 0 ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.07)"; c.beginPath(); c.moveTo(0, i + .5); c.lineTo(w, i + .5); c.stroke(); }
  /* рамка чертежа и штамп */
  c.strokeStyle = BP_D; c.strokeRect(10.5, 10.5, w - 21, h - 21);
  c.strokeStyle = BP_L; c.lineWidth = 1.4; c.strokeRect(w - 148.5, h - 40.5, 138, 30); c.lineWidth = 1;
  c.fillStyle = BP_L; c.font = "10px ui-monospace,Consolas,monospace"; c.textBaseline = "middle";
  c.fillText("ЛИСТ 1 · М 1:1", w - 140, h - 30); c.fillText("ХАБ · ЧЕРТЁЖ", w - 140, h - 18);
}
/* размерная линия со стрелками и подписью */
function bpDim(c, x1, y1, x2, y2, label, off) {
  var an = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(an) * off, ny = Math.cos(an) * off;
  c.strokeStyle = BP_L; c.lineWidth = 1; c.fillStyle = BP_L;
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 + nx * 1.2, y1 + ny * 1.2); c.moveTo(x2, y2); c.lineTo(x2 + nx * 1.2, y2 + ny * 1.2);
  c.moveTo(x1 + nx, y1 + ny); c.lineTo(x2 + nx, y2 + ny); c.stroke();
  [[x1 + nx, y1 + ny, 1], [x2 + nx, y2 + ny, -1]].forEach(function (p) {
    c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0] + p[2] * Math.cos(an - .3) * 8, p[1] + p[2] * Math.sin(an - .3) * 8);
    c.lineTo(p[0] + p[2] * Math.cos(an + .3) * 8, p[1] + p[2] * Math.sin(an + .3) * 8); c.closePath(); c.fill();
  });
  c.save(); c.translate((x1 + x2) / 2 + nx, (y1 + y2) / 2 + ny); c.rotate(Math.abs(an) > 1.2 ? an - Math.PI / 2 * Math.sign(an) : an);
  c.font = "11px ui-monospace,Consolas,monospace"; c.textAlign = "center"; c.textBaseline = "bottom"; c.fillText(label, 0, -2); c.restore();
}
function bpGear(c, x, y, r, teeth, rot, fill) {
  var i, n = teeth * 2, ri = r * .82;
  c.beginPath();
  for (i = 0; i < n; i++) {
    var a0 = rot + i / n * 6.2832, a1 = rot + (i + .5) / n * 6.2832, rr = i % 2 ? ri : r;
    c.lineTo(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr); c.lineTo(x + Math.cos(a1) * rr, y + Math.sin(a1) * rr);
  }
  c.closePath(); c.strokeStyle = BP_L; c.lineWidth = 1.4; if (fill) { c.fillStyle = "rgba(255,255,255,.06)"; c.fill(); } c.stroke();
  c.beginPath(); c.arc(x, y, r * .22, 0, 6.2832); c.stroke();
  c.strokeStyle = BP_D; c.setLineDash([4, 3]); c.beginPath(); c.arc(x, y, r * .91, 0, 6.2832); c.stroke(); c.setLineDash([]);
  for (i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x + Math.cos(rot + i * 1.5708) * r * .3, y + Math.sin(rot + i * 1.5708) * r * .3); c.lineTo(x + Math.cos(rot + i * 1.5708) * r * .7, y + Math.sin(rot + i * 1.5708) * r * .7); c.stroke(); }
}

TSC.blueprint = [
  /* 0. Циркуль чертит окружности и вписанный шестиугольник */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    bpBg(E);
    var cx = w * .5, cy = h * .52, R = m * .34, ph = (t * .18) % 1, ang = ph * 6.2832;
    c.strokeStyle = BP_D; c.setLineDash([8, 4, 2, 4]); c.beginPath(); c.moveTo(cx - R * 1.5, cy); c.lineTo(cx + R * 1.5, cy); c.moveTo(cx, cy - R * 1.3); c.lineTo(cx, cy + R * 1.3); c.stroke(); c.setLineDash([]);
    c.strokeStyle = BP_L; c.lineWidth = 1.6; c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + ang); c.stroke();
    c.strokeStyle = BP_D; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2 + ang, -Math.PI / 2 + 6.2832); c.stroke();
    c.beginPath(); c.arc(cx, cy, R * .5, 0, 6.2832); c.stroke();
    c.beginPath(); for (i = 0; i < 6; i++) { var a = i / 6 * 6.2832 - Math.PI / 2; i ? c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R) : c.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); } c.closePath(); c.strokeStyle = BP_L; c.stroke();
    /* циркуль: игла в центре, грифель на окружности */
    var px = cx + Math.cos(ang - Math.PI / 2) * R, py = cy + Math.sin(ang - Math.PI / 2) * R, hx = cx + (px - cx) * .5, hy = cy - R * 1.15 - Math.abs(Math.sin(ang)) * R * .05;
    c.strokeStyle = "#fff"; c.lineWidth = 2.2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(hx, hy); c.lineTo(px, py); c.stroke();
    zDot(c, hx, hy, 4, "#fff"); zDot(c, cx, cy, 2.5, "#fff"); zDot(c, px, py, 2.5, "#ffdf7a");
    bpDim(c, cx, cy + R * 1.1, cx + R, cy + R * 1.1, "R=" + Math.round(R) + "", 14);
    bpDim(c, cx - R, cy - R * 1.2, cx + R, cy - R * 1.2, "Ø" + Math.round(R * 2), -14);
    if (HP.on) { c.strokeStyle = BP_D; c.beginPath(); c.arc(HP.x * w, HP.y * h, 10, 0, 6.2832); c.moveTo(HP.x * w - 16, HP.y * h); c.lineTo(HP.x * w + 16, HP.y * h); c.moveTo(HP.x * w, HP.y * h - 16); c.lineTo(HP.x * w, HP.y * h + 16); c.stroke(); }
  },
  /* 1. Зубчатая передача: три шестерни зацеплены, указатель ускоряет */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m;
    bpBg(E);
    var sp = t * (HP.on ? .5 + HP.x * 1.2 : .7), r1 = m * .24, r2 = r1 * .62, r3 = r1 * .48;
    var x1 = w * .36, y1 = h * .5, x2 = x1 + (r1 + r2) * .96, y2 = y1 - r1 * .1, x3 = x1 - (r1 + r3) * .7, y3 = y1 + (r1 + r3) * .7;
    bpGear(c, x1, y1, r1, 18, sp, true);
    bpGear(c, x2, y2, r2, 11, -sp * 18 / 11 + .15, true);
    bpGear(c, x3, y3, r3, 9, -sp * 2 + .3, true);
    c.strokeStyle = BP_D; c.setLineDash([6, 4]);
    c.beginPath(); c.moveTo(x1, y1 - r1 * 1.25); c.lineTo(x1, y1 + r1 * 1.25); c.moveTo(x1 - r1 * 1.25, y1); c.lineTo(x1 + r1 * 1.25, y1); c.stroke(); c.setLineDash([]);
    bpDim(c, x1 - r1, y1 - r1 * 1.1, x1 + r1, y1 - r1 * 1.1, "z=18", -12);
    bpDim(c, x2 - r2, y2 + r2 * 1.1, x2 + r2, y2 + r2 * 1.1, "z=11", 12);
    c.fillStyle = BP_L; c.font = "11px ui-monospace,Consolas,monospace"; c.textAlign = "left";
    c.fillText("i = " + (18 / 11).toFixed(2), w * .66, h * .3); c.fillText("n = " + Math.round(sp * 9.55 * 10) + " об/мин", w * .66, h * .3 + 16);
  },
  /* 2. Изометрический куб: каркас, штриховка и сечение */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    bpBg(E);
    var s = m * .24, cx = w * .5, cy = h * .56, rot = t * .35 + (HP.on ? (HP.x - .5) * 1.6 : 0);
    function P(x, y, z) { /* повёрнутая изометрия */
      var X = x * Math.cos(rot) - y * Math.sin(rot), Y = x * Math.sin(rot) + y * Math.cos(rot);
      return [cx + (X - Y) * .866 * s, cy + (X + Y) * .5 * s - z * s];
    }
    var v = [[-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0], [-1, -1, 1.6], [1, -1, 1.6], [1, 1, 1.6], [-1, 1, 1.6]].map(function (q) { return P(q[0], q[1], q[2]); });
    var E_ = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    /* верхняя грань с штриховкой */
    c.save(); c.beginPath(); [4, 5, 6, 7].forEach(function (k, j) { j ? c.lineTo(v[k][0], v[k][1]) : c.moveTo(v[k][0], v[k][1]); }); c.closePath(); c.clip();
    c.strokeStyle = "rgba(255,255,255,.28)"; for (i = -40; i < 40; i++) { c.beginPath(); c.moveTo(cx - s * 3 + i * 7, cy - s * 3); c.lineTo(cx + s * 3 + i * 7, cy + s * 3); c.stroke(); } c.restore();
    E_.forEach(function (e) {
      var back = e[0] === 0 || e[1] === 0 ? 0 : 0;
      c.strokeStyle = (e[0] < 4 && e[1] < 4) ? BP_D : BP_L; c.lineWidth = (e[0] < 4 && e[1] < 4) ? 1 : 1.8;
      if (e[0] < 4 && e[1] < 4) c.setLineDash([5, 4]);
      c.beginPath(); c.moveTo(v[e[0]][0], v[e[0]][1]); c.lineTo(v[e[1]][0], v[e[1]][1]); c.stroke(); c.setLineDash([]);
    });
    /* секущая плоскость движется по высоте */
    var zz = .8 + Math.sin(t * .8) * .6, q = [P(-1, -1, zz), P(1, -1, zz), P(1, 1, zz), P(-1, 1, zz)];
    c.fillStyle = "rgba(255,223,122,.18)"; c.strokeStyle = "#ffdf7a"; c.lineWidth = 1.2; c.beginPath(); q.forEach(function (p, j) { j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.closePath(); c.fill(); c.stroke();
    bpDim(c, v[0][0], v[0][1], v[4][0], v[4][1], "h=" + (1.6 * 50).toFixed(0), 18);
    var a1 = P(1, -1, 0), a2 = P(1, 1, 0); bpDim(c, a1[0], a1[1], a2[0], a2[1], "a=100", 16);
    c.fillStyle = "#ffdf7a"; c.font = "11px ui-monospace,Consolas,monospace"; c.textAlign = "left"; c.fillText("сечение А–А  z=" + (zz * 50).toFixed(0), w * .06, h * .16);
  },
  /* 3. Ферма моста: нагрузка идёт по стержням, цвет показывает усилие */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    bpBg(E);
    var x0 = w * .1, x1 = w * .9, yb = h * .62, yt = h * .38, n = 6, dx = (x1 - x0) / n;
    var ld = (Math.sin(t * .9) * .5 + .5) * (n - 1) + .5; /* положение нагрузки */
    function force(k) { return Math.max(0, 1 - Math.abs(k - ld) / 2.2); }
    var bars = [];
    for (i = 0; i < n; i++) { bars.push([x0 + i * dx, yb, x0 + (i + 1) * dx, yb, i + .5]); }
    for (i = 1; i < n - 1; i++) bars.push([x0 + i * dx, yt, x0 + (i + 1) * dx, yt, i + .5]);
    for (i = 0; i < n; i++) { var up = i < n / 2; bars.push([x0 + i * dx, yb, x0 + (i + (up ? 1 : 0)) * dx, yt, i + .5]); bars.push([x0 + (i + 1) * dx, yb, x0 + (i + (up ? 1 : 0)) * dx, yt, i + .5]); }
    c.lineCap = "round";
    bars.forEach(function (b) {
      var f = force(b[4]);
      c.strokeStyle = f > .05 ? "rgba(255," + Math.round(255 - f * 60) + "," + Math.round(255 - f * 150) + ",1)" : BP_D;
      c.lineWidth = 1.2 + f * 2.4; c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(b[2], b[3]); c.stroke();
    });
    for (i = 0; i <= n; i++) { zDot(c, x0 + i * dx, yb, 3, "#fff"); }
    c.strokeStyle = BP_L; c.lineWidth = 1.4;
    [x0, x1].forEach(function (x, k) { c.beginPath(); c.moveTo(x, yb + 4); c.lineTo(x - 12, yb + 24); c.lineTo(x + 12, yb + 24); c.closePath(); c.stroke(); for (var j = -2; j <= 2; j++) { c.beginPath(); c.moveTo(x + j * 6, yb + 24); c.lineTo(x + j * 6 - 5, yb + 30); c.stroke(); } });
    /* нагрузка: груз и стрелка */
    var lx = x0 + ld * dx;
    c.strokeStyle = "#ffdf7a"; c.fillStyle = "#ffdf7a"; c.lineWidth = 2; c.beginPath(); c.moveTo(lx, yb - 60); c.lineTo(lx, yb - 8); c.stroke();
    c.beginPath(); c.moveTo(lx, yb - 4); c.lineTo(lx - 6, yb - 16); c.lineTo(lx + 6, yb - 16); c.closePath(); c.fill();
    c.font = "11px ui-monospace,Consolas,monospace"; c.textAlign = "center"; c.fillText("P=" + (40 + Math.round(Math.sin(t) * 10)) + " кН", lx, yb - 66);
    bpDim(c, x0, yb + 36, x1, yb + 36, "L=" + Math.round((x1 - x0) * 0.1) + "00", 14);
    bpDim(c, x1 + 20, yt, x1 + 20, yb, "H", 12);
  }
];
