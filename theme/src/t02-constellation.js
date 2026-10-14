/* ---------- СОЗВЕЗДИЕ ---------- */
TSN.constellation = ["Небесный свод", "Звёздная карта", "Фазы Луны", "Комета"];

/* фон ночного неба с лёгкой млечной полосой */
function cnSky(E, a, b) {
  var c = E.ctx, w = E.w, h = E.h, t = E.t, i;
  zBg(E, [[0, a || "#05061a"], [1, b || "#171a45"]]);
  c.save(); c.translate(w * .5, h * .5); c.rotate(-.5);
  for (i = 0; i < 40; i++) {
    var x = (hsh(i, 41) - .5) * w * 1.3, y = (hsh(i, 42) - .5) * h * .22;
    zGlow(c, x, y, E.m * (.12 + hsh(i, 43) * .16), "rgba(170,160,255," + (.05 + hsh(i, 44) * .05) + ")");
  }
  c.restore();
  zStars(E, 110, .9, 17, 1);
}
/* созвездие из точек: pts — [x,y] в долях, линии рисуются по порядку */
function cnLines(c, w, h, pts, t, col, k) {
  var i, n = pts.length;
  c.strokeStyle = col; c.lineWidth = 1; c.globalAlpha = .55;
  c.beginPath();
  for (i = 0; i < n; i++) { var x = pts[i][0] * w, y = pts[i][1] * h; i ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.stroke();
  for (i = 0; i < n; i++) {
    var tw = .6 + .4 * Math.sin(t * 2 + i * 1.7 + (k || 0));
    c.globalAlpha = tw; zGlow(c, pts[i][0] * w, pts[i][1] * h, 9, "rgba(255,236,200,.8)");
    zDot(c, pts[i][0] * w, pts[i][1] * h, 1.8, "#fff4dc");
  }
  c.globalAlpha = 1;
}
var CN_SIGNS = [
  [[.12, .3], [.2, .24], [.3, .27], [.36, .38], [.3, .5], [.22, .46]],
  [[.58, .2], [.66, .28], [.74, .22], [.82, .3], [.78, .42], [.68, .46]],
  [[.4, .62], [.48, .7], [.56, .66], [.62, .78], [.52, .84]],
  [[.1, .68], [.18, .76], [.14, .86], [.26, .82]]
];

TSC.constellation = [
  /* 0. Небесный свод: метеоры и созвездия, указатель задаёт центр вращения */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    cnSky(E);
    var ox = w * (.5 + (HP.on ? (HP.x - .5) * .12 : 0)), oy = h * 1.05;
    c.save(); c.translate(ox, oy); c.rotate(t * .015);
    c.strokeStyle = "rgba(183,166,255,.14)"; c.lineWidth = 1;
    for (i = 1; i < 6; i++) { c.beginPath(); c.arc(0, 0, i * m * .3, Math.PI, 0); c.stroke(); }
    c.restore();
    CN_SIGNS.forEach(function (p, k) { cnLines(c, w, h, p, t, "rgba(183,166,255,.7)", k); });
    /* метеоры */
    for (i = 0; i < 3; i++) {
      var ph = (t * .22 + i * .37) % 1, a = Math.sin(ph * Math.PI);
      if (ph > .5) continue;
      var sx = w * (.15 + hsh(i + Math.floor(t * .22 + i * .37), 51) * .7), sy = h * (.05 + hsh(i, 52) * .3);
      var k2 = ph * 2, x = sx + k2 * m * .5, y = sy + k2 * m * .25;
      var g = c.createLinearGradient(x, y, x - m * .25, y - m * .125);
      g.addColorStop(0, "rgba(255,244,220," + (a) + ")"); g.addColorStop(1, "rgba(255,244,220,0)");
      c.strokeStyle = g; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x, y); c.lineTo(x - m * .25, y - m * .125); c.stroke();
    }
    /* силуэт холма */
    c.fillStyle = "#04051a"; c.beginPath(); c.moveTo(0, h);
    for (i = 0; i <= 30; i++) c.lineTo(i / 30 * w, h * .93 - zN(i * .3, 8) * h * .08);
    c.lineTo(w, h); c.fill();
  },
  /* 1. Звёздная карта: круг с градусной сеткой, вращающийся диск */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i, cx = w / 2, cy = h / 2, R = m * .46;
    zBg(E, [[0, "#0b0d24"], [1, "#12153a"]]);
    c.strokeStyle = "rgba(183,166,255,.5)"; c.lineWidth = 1.2;
    c.beginPath(); c.arc(cx, cy, R, 0, 6.2832); c.stroke();
    c.beginPath(); c.arc(cx, cy, R * 1.04, 0, 6.2832); c.stroke();
    for (i = 0; i < 72; i++) {
      var an = i / 72 * 6.2832, l = i % 6 === 0 ? .06 : .028;
      c.beginPath(); c.moveTo(cx + Math.cos(an) * R * 1.04, cy + Math.sin(an) * R * 1.04);
      c.lineTo(cx + Math.cos(an) * R * (1.04 + l), cy + Math.sin(an) * R * (1.04 + l)); c.stroke();
    }
    c.save(); c.beginPath(); c.arc(cx, cy, R, 0, 6.2832); c.clip();
    c.translate(cx, cy); c.rotate(t * .05);
    c.strokeStyle = "rgba(183,166,255,.2)";
    for (i = 1; i < 5; i++) { c.beginPath(); c.arc(0, 0, R * i / 5, 0, 6.2832); c.stroke(); }
    for (i = 0; i < 12; i++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(i / 12 * 6.2832) * R, Math.sin(i / 12 * 6.2832) * R); c.stroke(); }
    for (i = 0; i < 90; i++) {
      var r = Math.sqrt(hsh(i, 61)) * R, a2 = hsh(i, 62) * 6.2832, tw = .5 + .5 * Math.sin(t * 1.4 + i);
      zDot(c, Math.cos(a2) * r, Math.sin(a2) * r, .8 + hsh(i, 63) * 1.5, "rgba(255,240,215," + (.4 + tw * .5) + ")");
    }
    var cons = [[[-.5, -.3], [-.3, -.45], [-.1, -.35], [-.15, -.1], [-.4, -.05]], [[.2, .1], [.4, .25], [.55, .1], [.5, -.15]], [[-.2, .4], [0, .55], [.2, .45]]];
    cons.forEach(function (p, k) {
      c.strokeStyle = "rgba(255,217,160,.75)"; c.beginPath();
      p.forEach(function (q, j) { j ? c.lineTo(q[0] * R, q[1] * R) : c.moveTo(q[0] * R, q[1] * R); }); c.stroke();
      p.forEach(function (q, j) { zGlow(c, q[0] * R, q[1] * R, 8, "rgba(255,217,160,.55)"); zDot(c, q[0] * R, q[1] * R, 2 + (j % 2), "#ffd9a0"); });
    });
    c.restore();
    /* неподвижная стрелка-указатель по краю */
    var ga = -Math.PI / 2 + Math.sin(t * .3) * .08;
    c.strokeStyle = "#b7a6ff"; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(ga) * R * 1.12, cy + Math.sin(ga) * R * 1.12); c.stroke();
    zDot(c, cx, cy, 3, "#b7a6ff");
  },
  /* 2. Фазы Луны: диск с терминатором, подписи фаз */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    cnSky(E, "#070820", "#1a1c4a");
    var n = 5, r = Math.min(m * .16, w / (n * 2.6)), ph0 = (t * .08) % 1;
    for (i = 0; i < n; i++) {
      var cx = w * (.12 + .76 * i / (n - 1)), cy = h * (.5 + Math.sin(t * .6 + i) * .02), ph = (ph0 + i / n) % 1;
      zGlow(c, cx, cy, r * 2.4, "rgba(220,215,255,.22)");
      c.fillStyle = "#1c1f48"; c.beginPath(); c.arc(cx, cy, r, 0, 6.2832); c.fill();
      c.save(); c.beginPath(); c.arc(cx, cy, r, 0, 6.2832); c.clip();
      var k = Math.cos(ph * 6.2832), lit = ph < .5;
      c.fillStyle = "#f1eee6";
      c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, !lit);
      c.ellipse(cx, cy, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, k > 0 ? lit : !lit); c.fill();
      c.fillStyle = "rgba(90,90,120,.22)";
      [[-.3, -.25, .2], [.25, .1, .26], [-.1, .4, .15], [.4, -.4, .12]].forEach(function (q) { c.beginPath(); c.arc(cx + q[0] * r, cy + q[1] * r, q[2] * r, 0, 6.2832); c.fill(); });
      c.restore();
      c.strokeStyle = "rgba(183,166,255,.45)"; c.beginPath(); c.arc(cx, cy, r * 1.14, 0, 6.2832); c.stroke();
      c.strokeStyle = "rgba(183,166,255,.25)"; c.beginPath(); c.moveTo(cx, cy + r * 1.3); c.lineTo(cx, h * .86); c.stroke();
      zDot(c, cx, h * .86, 2.4, "#b7a6ff");
    }
  },
  /* 3. Комета над горизонтом */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    cnSky(E, "#050619", "#2a2358");
    var ph = (t * .05) % 1, hx = w * (1.05 - ph * 1.1), hy = h * (.12 + ph * .38) + (HP.on ? (HP.y - .5) * h * .1 : 0);
    var ang = Math.atan2(h * .38, -w * 1.1) + Math.PI;
    c.save(); c.globalCompositeOperation = "lighter"; c.translate(hx, hy); c.rotate(ang);
    for (i = 0; i < 3; i++) {
      var L = m * (.55 - i * .12), g = c.createLinearGradient(0, 0, L, 0);
      g.addColorStop(0, i ? "rgba(183,166,255,.45)" : "rgba(255,230,190,.55)"); g.addColorStop(1, "rgba(183,166,255,0)");
      c.fillStyle = g; c.beginPath(); c.moveTo(0, -m * (.022 - i * .005));
      c.quadraticCurveTo(L * .5, -m * (.07 - i * .015) + Math.sin(t + i) * 3, L, 0);
      c.quadraticCurveTo(L * .5, m * (.07 - i * .015) + Math.sin(t + i) * 3, 0, m * (.022 - i * .005)); c.fill();
    }
    for (i = 0; i < 24; i++) {
      var d = hsh(i, 71) * m * .5, o = (hsh(i, 72) - .5) * d * .25;
      zDot(c, d + Math.sin(t * 2 + i) * 2, o, 1 + hsh(i, 73) * 1.4, "rgba(255,244,220," + (.7 - d / m) + ")");
    }
    c.restore();
    zGlow(c, hx, hy, m * .12, "rgba(255,240,210,.8)"); zDot(c, hx, hy, m * .012, "#fffaf0");
    /* горизонт и огни */
    var hz = h * .82;
    c.fillStyle = zLG(c, 0, hz - h * .1, 0, hz, [[0, "rgba(120,90,200,0)"], [1, "rgba(255,170,150,.28)"]]); c.fillRect(0, hz - h * .1, w, h * .1);
    c.fillStyle = "#04051a"; c.beginPath(); c.moveTo(0, h);
    for (i = 0; i <= 40; i++) c.lineTo(i / 40 * w, hz + 4 - zN(i * .4, 9) * h * .06 + (i % 7 === 3 ? -h * .03 : 0));
    c.lineTo(w, h); c.fill();
    for (i = 0; i < 12; i++) if (hsh(i, 75) > .3) zDot(c, hsh(i, 76) * w, hz + h * (.05 + hsh(i, 77) * .1), 1.2, "rgba(255,214,140," + (.5 + .4 * Math.sin(t * 2 + i)) + ")");
  }
];
