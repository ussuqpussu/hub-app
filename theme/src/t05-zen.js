/* ---------- ДЗЕН ---------- */
TSN.zen = ["Сад камней", "Энсо", "Бамбук", "Пруд с карпами"];

function znPaper(E, tone) {
  var c = E.ctx, w = E.w, h = E.h, i;
  zBg(E, [[0, tone || "#f4eddc"], [1, "#e9dfc6"]]);
  c.globalAlpha = .06; c.fillStyle = "#6b5a3a";
  for (i = 0; i < 160; i++) c.fillRect(hsh(i, 51) * w, hsh(i, 52) * h, 1 + hsh(i, 53) * 2, 1);
  c.globalAlpha = 1;
}
/* мазок кисти вдоль кривой: толщина меняется, края шершавые */
function znBrush(c, pts, wmax, col) {
  var n = pts.length, i;
  c.fillStyle = col;
  c.beginPath();
  for (i = 0; i < n; i++) { var p = pts[i], q = pts[Math.min(n - 1, i + 1)], o = pts[Math.max(0, i - 1)], an = Math.atan2(q[1] - o[1], q[0] - o[0]) + Math.PI / 2, wd = wmax * Math.sin(i / (n - 1) * Math.PI) * (.6 + .4 * hsh(i, 61)); c.lineTo(p[0] + Math.cos(an) * wd, p[1] + Math.sin(an) * wd); }
  for (i = n - 1; i >= 0; i--) { p = pts[i]; q = pts[Math.min(n - 1, i + 1)]; o = pts[Math.max(0, i - 1)]; an = Math.atan2(q[1] - o[1], q[0] - o[0]) + Math.PI / 2; wd = wmax * Math.sin(i / (n - 1) * Math.PI) * (.6 + .4 * hsh(i, 62)); c.lineTo(p[0] - Math.cos(an) * wd, p[1] - Math.sin(an) * wd); }
  c.closePath(); c.fill();
}
function znStone(c, x, y, r, sq, col) {
  var g = zRG(c, x - r * .3, y - r * .4, r * .1, r * 1.2, [[0, "#8d8a84"], [.6, col || "#5f5d59"], [1, "#3b3a37"]]);
  c.fillStyle = "rgba(60,45,20,.18)"; c.beginPath(); c.ellipse(x + r * .15, y + r * .5 * sq, r * 1.15, r * .3 * sq, 0, 0, 6.2832); c.fill();
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * sq, 0, 0, 6.2832); c.fill();
}

TSC.zen = [
  /* 0. Сад: песок с волнистыми бороздами вокруг камней, граблями ведёт указатель */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i, j;
    znPaper(E, "#efe5cd");
    var stones = [[.3, .5, .075, .7], [.52, .42, .045, .7], [.66, .62, .06, .7]];
    c.lineWidth = 1.3;
    for (i = 0; i < 26; i++) {
      var y = h * (.08 + i * .036); c.beginPath();
      for (var x = 0; x <= w; x += 5) {
        var dy = 0;
        stones.forEach(function (s) { var dx = x - s[0] * w, dd = y - s[1] * h, d = Math.sqrt(dx * dx + dd * dd * 1.8), R = s[2] * m * 3.2; if (d < R) dy += (dd >= 0 ? 1 : -1) * (1 - d / R) * m * .1 * Math.cos(d / R * 1.5); });
        var yy = y + dy + Math.sin(x * .02 + t * .4 + i * .3) * .8;
        x ? c.lineTo(x, yy) : c.moveTo(x, yy);
      }
      c.strokeStyle = "rgba(120,100,60,.32)"; c.stroke();
      c.translate(0, 1.2); c.strokeStyle = "rgba(255,255,250,.5)"; c.stroke(); c.translate(0, -1.2);
    }
    stones.forEach(function (s) { znStone(c, s[0] * w, s[1] * h, s[2] * m, s[3]); });
    /* мох на камне */
    c.fillStyle = "rgba(90,120,60,.7)"; c.beginPath(); c.ellipse(.3 * w - .02 * m, .5 * h - .07 * m, .035 * m, .015 * m, -.3, 0, 6.2832); c.fill();
    if (HP.on) { c.strokeStyle = "rgba(200,60,40,.5)"; c.lineWidth = 1.5; c.beginPath(); c.arc(HP.x * w, HP.y * h, 7, 0, 6.2832); c.stroke(); }
    /* лепесток падает */
    for (i = 0; i < 6; i++) { var p = (t * .05 + i * .17) % 1; c.fillStyle = "rgba(235,150,160,.8)"; c.beginPath(); c.ellipse(w * (.1 + i * .16) + Math.sin(t + i) * 20, h * p, 3, 1.6, t + i, 0, 6.2832); c.fill(); }
  },
  /* 1. Энсо: круг чертится кистью, печать-ханко появляется в конце */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    znPaper(E, "#f6efde");
    var cx = w * .5, cy = h * .5, R = m * .3, cyc = (t * .14) % 1.3, prog = Math.min(1, cyc / .8), fade = cyc > 1 ? 1 - (cyc - 1) / .3 : 1;
    var pts = [], n = 90, a0 = -2.2;
    for (i = 0; i <= n * prog; i++) { var a = a0 + i / n * 5.7; pts.push([cx + Math.cos(a) * R * (1 + i / n * .04), cy + Math.sin(a) * R * (1 - i / n * .02)]); }
    c.globalAlpha = Math.max(0, fade);
    if (pts.length > 3) znBrush(c, pts, m * .035, "rgba(24,20,16,.92)");
    c.strokeStyle = "rgba(24,20,16,.25)"; c.lineWidth = 1;
    for (i = 0; i < 14; i++) if (pts.length > 10) { var q = pts[Math.floor(hsh(i, 63) * (pts.length - 1))]; c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(q[0] + (hsh(i, 64) - .5) * 12, q[1] + (hsh(i, 65) - .5) * 12); c.stroke(); }
    c.globalAlpha = 1;
    /* печать киноварь */
    var sa = Math.max(0, Math.min(1, (cyc - .85) / .2)) * fade, sx = cx + R * 1.25, sy = cy + R * .95, ss = m * .07;
    c.globalAlpha = sa; c.fillStyle = "#c2412d"; c.fillRect(sx, sy, ss, ss * 1.2);
    c.fillStyle = "#f6efde"; c.fillRect(sx + ss * .2, sy + ss * .2, ss * .6, ss * .15); c.fillRect(sx + ss * .45, sy + ss * .2, ss * .12, ss * .8); c.fillRect(sx + ss * .2, sy + ss * .6, ss * .6, ss * .12);
    c.globalAlpha = 1;
    c.fillStyle = "rgba(24,20,16,.7)"; for (i = 0; i < 4; i++) c.fillRect(w * .12, h * (.2 + i * .07), 2, h * .05 * (.6 + hsh(i, 66) * .4));
  },
  /* 2. Бамбук на ветру */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i, j;
    znPaper(E, "#f1ecda");
    zGlow(c, w * .78, h * .26, m * .35, "rgba(235,200,120,.5)"); c.fillStyle = "#f3d98a"; c.beginPath(); c.arc(w * .78, h * .26, m * .08, 0, 6.2832); c.fill();
    var wind = HP.on ? (HP.x - .5) * 1.4 : .3;
    for (var k = 0; k < 7; k++) {
      var bx = w * (.06 + k * .15) + (hsh(k, 71) - .5) * 20, dep = k % 2, col = dep ? "#7fa072" : "#3f6b47", lw = m * (dep ? .016 : .024);
      var segs = 9, sh = h * 1.05 / segs, x = bx, y = h;
      c.lineWidth = lw; c.strokeStyle = col;
      for (i = 0; i < segs; i++) {
        var sw = (Math.sin(t * .8 + k + i * .35) * .5 + wind) * (i * i * .09 + i * .3), nx = bx + sw * (1 + dep * -.3), ny = h - (i + 1) * sh;
        c.beginPath(); c.moveTo(x, y); c.lineTo(nx, ny + 3); c.stroke();
        c.fillStyle = dep ? "#5c8a63" : "#254a30"; c.fillRect(nx - lw * .75, ny + 1, lw * 1.5, 3);
        if (i > 2 && i % 2 === 0) {
          for (j = 0; j < 2; j++) {
            var dir = j ? 1 : -1, L = m * (.13 + hsh(i + k, 72) * .05), a = dir * (.9 + Math.sin(t * 1.3 + i + j) * .15) - Math.PI / 2 + wind * .3 * dir;
            c.fillStyle = dep ? "rgba(110,150,100,.85)" : "rgba(40,85,50,.9)";
            c.save(); c.translate(nx, ny); c.rotate(a + Math.PI / 2 * 0); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(L * .5, -L * .12, L, 0); c.quadraticCurveTo(L * .5, L * .1, 0, 0); c.fill(); c.restore();
          }
        }
        x = nx; y = ny;
      }
    }
    c.fillStyle = "rgba(120,100,60,.2)"; c.fillRect(0, h * .94, w, h * .06);
  },
  /* 3. Пруд: карпы кружат, кувшинки, круги от касаний */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    zBg(E, [[0, "#2f5a56"], [1, "#183a3c"]]);
    for (i = 0; i < 24; i++) { c.fillStyle = "rgba(255,255,255,.04)"; c.beginPath(); c.ellipse(hsh(i, 81) * w, hsh(i, 82) * h, 20 + hsh(i, 83) * 40, 6, 0, 0, 6.2832); c.fill(); }
    var ripples = [];
    for (i = 0; i < 4; i++) { var p = (t * .12 + i * .25) % 1; ripples.push([w * (.2 + hsh(i + Math.floor(t * .12 + i * .25), 84) * .6), h * (.25 + hsh(i, 85) * .5), p]); }
    if (hubTapAge() < 2.5) ripples.push([HP.x * w, HP.y * h, hubTapAge() / 2.5]);
    ripples.forEach(function (r) { for (var k = 0; k < 3; k++) { var rr = r[2] * m * .25 - k * 6; if (rr > 0) { c.strokeStyle = "rgba(220,240,235," + ((1 - r[2]) * .35) + ")"; c.lineWidth = 1.2; c.beginPath(); c.ellipse(r[0], r[1], rr * 1.4, rr * .6, 0, 0, 6.2832); c.stroke(); } } });
    [["#e8603a", 0], ["#f4f0e4", 2.1], ["#e8a23a", 4.2]].forEach(function (f, k) {
      var a = t * (.28 + k * .06) + f[1], rx = w * (.28 - k * .03), ry = h * (.25 + k * .02), fx = w * .5 + Math.cos(a) * rx, fy = h * .5 + Math.sin(a * 1.1) * ry, dir = Math.atan2(Math.cos(a * 1.1) * 1.1 * ry, -Math.sin(a) * rx);
      c.save(); c.translate(fx, fy); c.rotate(dir);
      var L = m * .13;
      c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(L * .1, L * .3, L, L * .22, 0, 0, 6.2832); c.fill();
      c.fillStyle = f[0]; c.beginPath(); c.moveTo(L, 0); c.quadraticCurveTo(L * .4, -L * .28, -L * .5, -L * .08);
      var tw = Math.sin(t * 5 + k) * L * .22;
      c.quadraticCurveTo(-L * .85, tw - L * .35, -L * 1.15, tw - L * .1); c.quadraticCurveTo(-L * .8, tw, -L * 1.15, tw + L * .1); c.quadraticCurveTo(-L * .85, tw + L * .35, -L * .5, L * .08);
      c.quadraticCurveTo(L * .4, L * .28, L, 0); c.fill();
      c.fillStyle = "rgba(255,255,255,.3)"; c.beginPath(); c.ellipse(L * .1, -L * .06, L * .35, L * .07, 0, 0, 6.2832); c.fill();
      c.restore();
    });
    [[.15, .3, 1], [.82, .7, 1.2], [.7, .2, .8]].forEach(function (l, k) {
      var lx = w * l[0] + Math.sin(t * .4 + k) * 4, ly = h * l[1], R = m * .07 * l[2];
      c.fillStyle = "#4f8a5a"; c.beginPath(); c.moveTo(lx, ly); c.arc(lx, ly, R, .3, 6.0); c.closePath(); c.fill();
      c.fillStyle = "#f6c8d4"; for (var q = 0; q < 6; q++) { c.beginPath(); c.ellipse(lx + Math.cos(q * 1.05) * R * .2, ly + Math.sin(q * 1.05) * R * .12 - R * .1, R * .22, R * .08, q * 1.05, 0, 6.2832); c.fill(); }
    });
  }
];
