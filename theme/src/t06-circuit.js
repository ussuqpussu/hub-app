/* ---------- КОНТУР ---------- */
TSN.circuit = ["Дорожки", "Кристалл", "Осциллограф", "Радар"];

var CK_G = "#b6ff5a", CK_D = "rgba(182,255,90,.28)";
function ckBg(E) {
  var c = E.ctx, w = E.w, h = E.h, i;
  zBg(E, [[0, "#0c110e"], [1, "#121a15"]]);
  c.fillStyle = "rgba(182,255,90,.05)";
  for (i = 0; i < w; i += 24) for (var j = 0; j < h; j += 24) c.fillRect(i, j, 1.5, 1.5);
}
/* ломаная дорожка 45° от точки (x,y): ходы [направление 0..7, длина] */
function ckPath(x, y, steps) {
  var dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]], pts = [[x, y]], i;
  for (i = 0; i < steps.length; i++) { var d = dirs[steps[i][0]]; x += d[0] * steps[i][1]; y += d[1] * steps[i][1]; pts.push([x, y]); }
  return pts;
}
function ckLen(pts) { var L = 0, i; for (i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
function ckAt(pts, d) {
  var i, a, L;
  for (i = 1; i < pts.length; i++) { L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (d <= L) { a = d / L; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * a, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * a]; } d -= L; }
  return pts[pts.length - 1];
}

TSC.circuit = [
  /* 0. Дорожки платы: импульсы бегут по трассам, указатель запускает вспышку */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i, k = m / 300;
    ckBg(E);
    var tr = [];
    for (i = 0; i < 14; i++) {
      var sx = (i % 2 ? .06 : .94) * w, sy = h * (.1 + (i / 14) * .8), s = i % 2 ? 1 : 3;
      tr.push(ckPath(sx, sy, [[i % 2 ? 0 : 4, 40 * k + hsh(i, 91) * 90 * k], [i % 2 ? 1 : 3, 20 * k + hsh(i, 92) * 50 * k], [i % 2 ? 0 : 4, 30 * k + hsh(i, 93) * 120 * k], [(i % 3) ? 1 : 7, 16 * k], [i % 2 ? 0 : 4, 40 * k]]));
    }
    c.lineCap = "round"; c.lineJoin = "round";
    tr.forEach(function (p, j) {
      c.strokeStyle = CK_D; c.lineWidth = 2 * Math.max(.7, k); c.beginPath(); p.forEach(function (q, n) { n ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.stroke();
      var L = ckLen(p), ph = ((t * (.12 + hsh(j, 94) * .1) + hsh(j, 95)) % 1) * (L + 60 * k);
      var a = ckAt(p, Math.max(0, ph - 50 * k)), b = ckAt(p, Math.min(L, ph));
      c.strokeStyle = CK_G; c.lineWidth = 2.6 * Math.max(.7, k); c.beginPath(); c.moveTo(a[0], a[1]);
      for (var n = 1; n < p.length; n++) { if (ckLen(p.slice(0, n + 1)) >= ph - 50 * k && ckLen(p.slice(0, n)) <= ph) c.lineTo(p[n][0], p[n][1]); } c.lineTo(b[0], b[1]); c.stroke();
      zGlow(c, b[0], b[1], 14 * k + 6, "rgba(182,255,90,.55)"); zDot(c, b[0], b[1], 3, "#efffd0");
      [p[0], p[p.length - 1]].forEach(function (e) { c.strokeStyle = CK_G; c.lineWidth = 1.5; c.beginPath(); c.arc(e[0], e[1], 4 * Math.max(.8, k), 0, 6.2832); c.stroke(); });
    });
    /* микросхема по центру */
    var cw = m * .26, cx = w / 2 - cw / 2, cy = h / 2 - cw / 2;
    c.fillStyle = "#0a0f0c"; c.strokeStyle = CK_G; c.lineWidth = 1.6; c.fillRect(cx, cy, cw, cw); c.strokeRect(cx, cy, cw, cw);
    for (i = 0; i < 8; i++) { var pp = cx + cw * (i + .5) / 8; c.fillStyle = CK_G; c.fillRect(pp - 1.5, cy - 6, 3, 6); c.fillRect(pp - 1.5, cy + cw, 3, 6); c.fillRect(cx - 6, cy + cw * (i + .5) / 8 - 1.5, 6, 3); c.fillRect(cx + cw, cy + cw * (i + .5) / 8 - 1.5, 6, 3); }
    c.fillStyle = "rgba(182,255,90," + (.5 + .4 * Math.sin(t * 3)) + ")"; c.beginPath(); c.arc(cx + 10, cy + 10, 3, 0, 6.2832); c.fill();
    c.fillStyle = CK_G; c.font = "bold " + Math.max(9, cw * .1) + "px ui-monospace,Consolas,monospace"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("HUB-1", cx + cw / 2, cy + cw / 2);
    if (HP.on && hubTapAge() < 1.2) { zGlow(c, HP.x * w, HP.y * h, m * .3 * (hubTapAge() + .2), "rgba(182,255,90,.35)"); }
  },
  /* 1. Кристалл процессора: сетка ядер, скан-линия, нагрев */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i, j, n = 6;
    ckBg(E);
    var s = m * .6, x0 = w / 2 - s / 2, y0 = h / 2 - s / 2, cs = s / n;
    c.strokeStyle = CK_G; c.lineWidth = 2; c.strokeRect(x0 - 6, y0 - 6, s + 12, s + 12);
    var scan = ((t * .22) % 1.2) * s;
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
      var cx = x0 + i * cs, cy = y0 + j * cs, heat = Math.max(0, 1 - Math.abs(cy + cs / 2 - y0 - scan) / (cs * 1.8)), base = .4 + .3 * Math.sin(t * 1.2 + i * 1.3 + j * .9), act = Math.max(heat, base * .5);
      c.fillStyle = "rgba(182,255,90," + (.05 + act * .35) + ")"; c.fillRect(cx + 3, cy + 3, cs - 6, cs - 6);
      c.strokeStyle = "rgba(182,255,90," + (.25 + act * .5) + ")"; c.lineWidth = 1; c.strokeRect(cx + 3.5, cy + 3.5, cs - 7, cs - 7);
      for (var q = 0; q < 3; q++) { c.fillStyle = "rgba(182,255,90," + (.2 + act * .5) + ")"; c.fillRect(cx + 8, cy + 8 + q * (cs - 16) / 3, (cs - 16) * (.3 + .7 * Math.abs(Math.sin(t * (1 + q) + i * j))), 2); }
    }
    c.fillStyle = zLG(c, 0, y0 + scan - 20, 0, y0 + scan + 4, [[0, "rgba(182,255,90,0)"], [1, "rgba(182,255,90,.4)"]]); c.fillRect(x0 - 6, y0 + scan - 20, s + 12, 24);
    c.fillStyle = CK_G; for (i = 0; i < 16; i++) { var pp = x0 + s * (i + .5) / 16; c.fillRect(pp - 1.5, y0 - 16, 3, 10); c.fillRect(pp - 1.5, y0 + s + 6, 3, 10); }
    for (i = 0; i < 16; i++) { var qq = y0 + s * (i + .5) / 16; c.fillRect(x0 - 16, qq - 1.5, 10, 3); c.fillRect(x0 + s + 6, qq - 1.5, 10, 3); }
    c.font = "11px ui-monospace,Consolas,monospace"; c.textAlign = "left"; c.fillStyle = CK_G; c.fillText("CORE " + (38 + Math.round(Math.sin(t) * 6 + 6)) + "°C", w * .04, h * .08);
  },
  /* 2. Осциллограф: сетка, синус + шум, курсоры */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    zBg(E, [[0, "#06140c"], [1, "#0b1f13"]]);
    var gx = w * .06, gy = h * .1, gw = w * .88, gh = h * .8;
    c.strokeStyle = "rgba(182,255,90,.16)"; c.lineWidth = 1;
    for (i = 0; i <= 10; i++) { c.beginPath(); c.moveTo(gx + gw * i / 10, gy); c.lineTo(gx + gw * i / 10, gy + gh); c.stroke(); }
    for (i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(gx, gy + gh * i / 8); c.lineTo(gx + gw, gy + gh * i / 8); c.stroke(); }
    c.strokeStyle = "rgba(182,255,90,.4)"; c.strokeRect(gx, gy, gw, gh); c.beginPath(); c.moveTo(gx, gy + gh / 2); c.lineTo(gx + gw, gy + gh / 2); c.moveTo(gx + gw / 2, gy); c.lineTo(gx + gw / 2, gy + gh); c.stroke();
    var freq = HP.on ? 2 + HP.x * 6 : 3.5, amp = HP.on ? .15 + (1 - HP.y) * .3 : .3;
    [[CK_G, 0, 1], ["#7be7ff", 1.1, .6]].forEach(function (ch, k) {
      c.strokeStyle = ch[0]; c.lineWidth = 2; c.shadowColor = ch[0]; c.shadowBlur = 8; c.beginPath();
      for (i = 0; i <= 200; i++) {
        var x = i / 200, y = Math.sin(x * freq * 6.2832 + t * 3 + ch[1]) * amp * ch[2] + (k ? Math.sin(x * 19 + t * 5) * .03 : Math.sin(x * 61 + t * 9) * .012);
        if (k === 0) y = (y > .22 ? .22 : y < -.22 ? -.22 : y) * 1.25 + Math.sin(x * freq * 12.56 + t * 6) * .03;
        var px = gx + gw * x, py = gy + gh * (.5 - y);
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke(); c.shadowBlur = 0;
    });
    var cur = gx + gw * (.3 + .2 * Math.sin(t * .4));
    c.strokeStyle = "rgba(255,223,122,.7)"; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(cur, gy); c.lineTo(cur, gy + gh); c.stroke(); c.setLineDash([]);
    c.fillStyle = CK_G; c.font = "11px ui-monospace,Consolas,monospace"; c.textAlign = "left";
    c.fillText("CH1 2V/дел   CH2 1V/дел   f=" + (freq * 120).toFixed(0) + " Гц", gx + 6, gy + gh + 14);
  },
  /* 3. Радар: луч и цели с затуханием следа */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i, cx = w / 2, cy = h / 2, R = m * .45;
    ckBg(E);
    c.strokeStyle = "rgba(182,255,90,.35)"; c.lineWidth = 1;
    for (i = 1; i <= 4; i++) { c.beginPath(); c.arc(cx, cy, R * i / 4, 0, 6.2832); c.stroke(); }
    for (i = 0; i < 12; i++) { c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(i / 12 * 6.2832) * R, cy + Math.sin(i / 12 * 6.2832) * R); c.stroke(); }
    var sw = t * 1.1;
    for (i = 0; i < 40; i++) {
      var a = sw - i * .04;
      c.strokeStyle = "rgba(182,255,90," + (.5 * (1 - i / 40)) + ")"; c.lineWidth = 3; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.stroke();
    }
    for (i = 0; i < 9; i++) {
      var ta = hsh(i, 101) * 6.2832 + t * (hsh(i, 102) - .5) * .08, td = (.25 + hsh(i, 103) * .7) * R, tx = cx + Math.cos(ta) * td, ty = cy + Math.sin(ta) * td;
      var d = ((sw - ta) % 6.2832 + 6.2832) % 6.2832, br = Math.max(0, 1 - d / 4.5);
      zGlow(c, tx, ty, 12, "rgba(182,255,90," + (br * .6) + ")"); zDot(c, tx, ty, 2.5, "rgba(230,255,200," + (br) + ")");
    }
    if (HP.on) { var dx = HP.x * w - cx, dy = HP.y * h - cy; c.strokeStyle = "#7be7ff"; c.beginPath(); c.arc(HP.x * w, HP.y * h, 9, 0, 6.2832); c.stroke(); c.fillStyle = "#7be7ff"; c.font = "10px ui-monospace,Consolas,monospace"; c.fillText("R " + Math.round(Math.hypot(dx, dy)), HP.x * w + 12, HP.y * h); }
    c.fillStyle = CK_G; c.font = "11px ui-monospace,Consolas,monospace"; c.textAlign = "left"; c.fillText("BRG " + ((sw * 57.3) % 360).toFixed(0).padStart(3, "0"), w * .04, h * .08);
  }
];
