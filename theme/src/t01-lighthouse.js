/* ---------- МАЯК ---------- */
TSN.lighthouse = ["Луч", "Лодка с фонарём", "Прибой", "Глубина"];

/* вода: полосы волн с перспективой; amp — размах, k — скорость, col — цвет линии */
function lhSea(c, w, h, t, y0, top, bot, lineCol, glints) {
  c.fillStyle = zLG(c, 0, y0, 0, h, [[0, top], [1, bot]]);
  c.fillRect(0, y0, w, h - y0);
  var rows = 16, i, x;
  for (i = 0; i < rows; i++) {
    var p = i / rows, y = y0 + (h - y0) * (p * p * .9 + .02), amp = 1 + p * h * .012, sp = .5 + p * 1.1;
    c.strokeStyle = lineCol; c.globalAlpha = .12 + p * .32; c.lineWidth = 1 + p * 1.4;
    c.beginPath();
    for (x = 0; x <= w; x += 8) {
      var yy = y + Math.sin(x * (.03 - p * .014) + t * sp + i * 1.7) * amp + Math.sin(x * .011 - t * .6 * sp + i) * amp * .6;
      x ? c.lineTo(x, yy) : c.moveTo(x, yy);
    }
    c.stroke();
  }
  c.globalAlpha = 1;
  if (glints) {
    for (i = 0; i < glints; i++) {
      var gx = hsh(i, 21) * w, gp = hsh(i, 22), gy = y0 + (h - y0) * (gp * gp * .9 + .03);
      var a = Math.max(0, Math.sin(t * (.8 + hsh(i, 23) * 1.4) + i * 2.3));
      c.fillStyle = "rgba(255,240,200," + (a * .55) + ")";
      c.fillRect(gx, gy, 2 + gp * 6, 1);
    }
  }
}

/* маяк: основание в (x, yb), высота hh. Возвращает точку фонаря */
function lhTower(c, x, yb, hh, t, lit) {
  var wb = hh * .2, wt = hh * .12, y1 = yb - hh;
  /* скала */
  c.fillStyle = "#04090f";
  c.beginPath(); c.moveTo(x - hh * .5, yb + hh * .12); c.quadraticCurveTo(x - hh * .3, yb - hh * .05, x - wb, yb);
  c.lineTo(x + wb, yb); c.quadraticCurveTo(x + hh * .34, yb - hh * .04, x + hh * .56, yb + hh * .12); c.closePath(); c.fill();
  /* башня с полосами */
  var g = c.createLinearGradient(x - wb, 0, x + wb, 0);
  g.addColorStop(0, "#9aa7b2"); g.addColorStop(.45, "#e9eef2"); g.addColorStop(1, "#6f7c88");
  c.save();
  c.beginPath(); c.moveTo(x - wb, yb); c.lineTo(x - wt, y1); c.lineTo(x + wt, y1); c.lineTo(x + wb, yb); c.closePath(); c.clip();
  c.fillStyle = g; c.fillRect(x - wb, y1, wb * 2, hh);
  for (var i = 0; i < 4; i++) {
    c.fillStyle = "rgba(168,40,34,.92)";
    c.fillRect(x - wb, y1 + hh * (.16 + i * .22), wb * 2, hh * .09);
  }
  c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect(x + wt * .2, y1, wb, hh);
  c.restore();
  /* галерея и фонарная комната */
  c.fillStyle = "#1b2630"; c.fillRect(x - wt * 1.25, y1 - hh * .02, wt * 2.5, hh * .035);
  c.strokeStyle = "#1b2630"; c.lineWidth = Math.max(1, hh * .008);
  for (i = 0; i < 6; i++) { var rx = x - wt * 1.2 + i * wt * .48; c.beginPath(); c.moveTo(rx, y1 - hh * .02); c.lineTo(rx, y1 - hh * .06); c.stroke(); }
  c.beginPath(); c.moveTo(x - wt * 1.2, y1 - hh * .06); c.lineTo(x + wt * 1.2, y1 - hh * .06); c.stroke();
  var ly = y1 - hh * .12, lw = wt * .9, lh = hh * .1;
  c.fillStyle = lit ? "rgba(255,214,130,1)" : "#41505c";
  c.fillRect(x - lw, ly, lw * 2, lh);
  c.strokeStyle = "#1b2630"; c.lineWidth = Math.max(1, hh * .01);
  c.strokeRect(x - lw, ly, lw * 2, lh);
  c.beginPath(); c.moveTo(x, ly); c.lineTo(x, ly + lh); c.stroke();
  c.fillStyle = "#a82822";
  c.beginPath(); c.moveTo(x - lw * 1.25, ly); c.lineTo(x, ly - hh * .1); c.lineTo(x + lw * 1.25, ly); c.closePath(); c.fill();
  c.fillStyle = "#1b2630"; c.fillRect(x - hh * .006, ly - hh * .15, hh * .012, hh * .06);
  return [x, ly + lh * .5];
}

TSC.lighthouse = [
  /* 0. Луч маяка над волнами */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, hor = h * .6, i, cv = E.cv || {};
    zBg(E, [[0, "#040a14"], [.55, "#0b2236"], [1, "#16405a"]]);
    zStars(E, 80, .9, 11, .5);
    /* луна и дорожка на воде */
    var mx = w * .2, my = h * .2, mr = m * .07;
    zGlow(c, mx, my, mr * 5, "rgba(190,215,235,.35)");
    c.fillStyle = "#e6eef4"; c.beginPath(); c.arc(mx, my, mr, 0, 6.2832); c.fill();
    c.fillStyle = "rgba(120,140,160,.35)";
    [[-.3, -.2, .22], [.25, .1, .16], [-.05, .35, .12]].forEach(function (k) { c.beginPath(); c.arc(mx + k[0] * mr, my + k[1] * mr, k[2] * mr, 0, 6.2832); c.fill(); });
    /* далёкий берег */
    c.fillStyle = "#06121d";
    c.beginPath(); c.moveTo(0, hor);
    for (i = 0; i <= 40; i++) c.lineTo(i / 40 * w, hor - (zN(i * .35, 4) * .7 + .15) * h * .06);
    c.lineTo(w, hor); c.closePath(); c.fill();
    lhSea(c, w, h, t, hor, "#0c2d44", "#041019", "rgba(150,200,225,.8)", 40);
    /* лунная дорожка */
    for (i = 0; i < 26; i++) {
      var p = i / 26, y = hor + (h - hor) * (p * p * .9 + .03), ww = (6 + p * 46) * (.5 + .5 * Math.abs(Math.sin(t * 1.2 + i * 1.9)));
      c.fillStyle = "rgba(210,230,245," + (.5 - p * .3) + ")";
      c.fillRect(mx + Math.sin(t * .8 + i) * 4 * p - ww / 2, y, ww, 1.2 + p);
    }
    /* маяк справа, указатель направляет луч */
    var L = lhTower(c, w * .8, hor + h * .02, h * .5, t, true);
    var tgt = HP.on ? (HP.x < .5 ? Math.PI : 0) : null;
    var ang = t * .55;
    var side = Math.cos(ang), front = Math.sin(ang);
    var lx = L[0], ly = L[1];
    c.save(); c.globalCompositeOperation = "lighter";
    /* ореол фонаря: ярче, когда луч смотрит на зрителя */
    var flare = .35 + .65 * Math.max(0, front);
    zGlow(c, lx, ly, m * (.35 + flare * .4), "rgba(255,206,120," + (.35 + flare * .4) + ")");
    /* два встречных луча: длина и яркость зависят от поворота */
    [1, -1].forEach(function (dir) {
      var s = side * dir; if (s <= 0) return;
      var len = w * (.2 + 1.2 * s), spread = m * (.012 + .05 * (1 - s)), a = .1 + .5 * s * s;
      var ex = lx - dir * len, ey = ly + (front * dir) * h * .06 - h * .02;
      var g = c.createLinearGradient(lx, ly, ex, ey);
      g.addColorStop(0, "rgba(255,226,160," + a + ")"); g.addColorStop(.6, "rgba(255,226,160," + (a * .4) + ")"); g.addColorStop(1, "rgba(255,226,160,0)");
      c.fillStyle = g;
      c.beginPath(); c.moveTo(lx, ly - spread * .2); c.lineTo(ex, ey - spread * 2.4); c.lineTo(ex, ey + spread * 2.4); c.lineTo(lx, ly + spread * .2); c.closePath(); c.fill();
      /* блик луча на воде */
      var gx = Math.max(0, Math.min(w, ex)), gy = hor + h * .12;
      c.fillStyle = zRG(c, gx, gy, 0, m * .28, [[0, "rgba(255,226,160," + (a * .6) + ")"], [1, "rgba(255,226,160,0)"]]);
      c.fillRect(gx - m * .3, gy - m * .12, m * .6, m * .24);
    });
    c.restore();
    /* туман, подсвеченный лучом */
    for (i = 0; i < 3; i++) {
      var fx = ((t * m * (.012 + i * .006) + i * w * .45) % (w * 1.5)) - w * .25, fy = hor + h * (.04 + i * .1);
      c.fillStyle = zRG(c, fx, fy, 0, w * .3, [[0, "rgba(150,190,210," + (.08 + .05 * Math.abs(side)) + ")"], [1, "rgba(150,190,210,0)"]]);
      c.fillRect(fx - w * .3, fy - w * .1, w * .6, w * .2);
    }
    /* чайки */
    for (i = 0; i < 3; i++) {
      var gp = (t * .03 + i * .27) % 1, gx2 = w * (1.05 - gp * 1.1), gy2 = h * (.2 + i * .06) + Math.sin(gp * 9 + i) * h * .02, fl = Math.sin(t * 6 + i * 2) * m * .012;
      c.strokeStyle = "rgba(20,30,40,.85)"; c.lineWidth = Math.max(1, m * .006); c.lineCap = "round";
      c.beginPath(); c.moveTo(gx2 - m * .03, gy2 - fl); c.quadraticCurveTo(gx2 - m * .012, gy2 - m * .02 - fl, gx2, gy2);
      c.quadraticCurveTo(gx2 + m * .012, gy2 - m * .02 + fl, gx2 + m * .03, gy2 + fl * .5); c.stroke();
    }
  },
  /* 1. Лодка с фонарём */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, hor = h * .5, i;
    zBg(E, [[0, "#050c18"], [1, "#0f2a40"]]);
    zStars(E, 120, 1, 31, .46);
    c.fillStyle = "#050d16";
    c.beginPath(); c.moveTo(0, hor);
    for (i = 0; i <= 60; i++) { var u = i / 60; c.lineTo(u * w, hor - Math.pow(Math.sin(u * 3.1 + .4), 2) * h * .13 * (.5 + zN(i * .2, 8))); }
    c.lineTo(w, hor); c.closePath(); c.fill();
    lhSea(c, w, h, t, hor, "#0b2a42", "#030b13", "rgba(120,180,210,.7)", 24);
    var bx = w * .38 + Math.sin(t * .35) * w * .015, by = hor + h * .22 + Math.sin(t * .9) * 2, rock = Math.sin(t * .9 + 1) * .05;
    /* свет фонаря на воде и круги */
    var lx = bx + m * .12, ly = by - m * .14;
    c.save(); c.globalCompositeOperation = "lighter";
    c.fillStyle = zRG(c, lx, by + m * .05, 0, m * .8, [[0, "rgba(255,200,110,.38)"], [1, "rgba(255,200,110,0)"]]);
    c.fillRect(lx - m, by - m * .3, m * 2, m * 1.2);
    for (i = 0; i < 4; i++) {
      var rp = ((t * .35 + i * .25) % 1), rr = rp * m * .5;
      c.strokeStyle = "rgba(255,210,140," + (.4 * (1 - rp)) + ")"; c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(bx, by + m * .035, rr * 1.7, rr * .32, 0, 0, 6.2832); c.stroke();
    }
    for (i = 0; i < 14; i++) {
      var q = i / 14, yy = by + m * .04 + q * m * .5, ww2 = m * (.02 + q * .2) * (.4 + .6 * Math.abs(Math.sin(t * 1.3 + i * 1.7)));
      c.fillStyle = "rgba(255,214,150," + (.35 - q * .25) + ")";
      c.fillRect(lx - ww2 / 2 + Math.sin(t + i) * 3, yy, ww2, 1.3);
    }
    c.restore();
    /* лодка */
    c.save(); c.translate(bx, by); c.rotate(rock);
    var s = m * .3;
    c.fillStyle = "#050a10";
    c.beginPath(); c.moveTo(-s * .5, -s * .05); c.quadraticCurveTo(-s * .38, s * .14, 0, s * .15); c.quadraticCurveTo(s * .4, s * .14, s * .55, -s * .09);
    c.lineTo(s * .45, -s * .06); c.quadraticCurveTo(0, -s * .02, -s * .5, -s * .05); c.fill();
    c.strokeStyle = "rgba(255,200,120,.5)"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-s * .48, -s * .045); c.quadraticCurveTo(0, -s * .01, s * .45, -s * .05); c.stroke();
    /* гребец */
    c.fillStyle = "#050a10";
    c.beginPath(); c.arc(-s * .1, -s * .2, s * .05, 0, 6.2832); c.fill();
    c.beginPath(); c.moveTo(-s * .16, -s * .03); c.quadraticCurveTo(-s * .17, -s * .15, -s * .1, -s * .16); c.quadraticCurveTo(-s * .03, -s * .15, -s * .05, -s * .03); c.fill();
    var oar = Math.sin(t * 1.1) * .25;
    c.strokeStyle = "#050a10"; c.lineWidth = Math.max(1.5, m * .007);
    c.beginPath(); c.moveTo(-s * .08, -s * .09); c.lineTo(-s * .08 - Math.cos(oar) * s * .3, s * .02 + Math.sin(oar) * s * .2); c.stroke();
    /* фонарь на шесте */
    c.beginPath(); c.moveTo(s * .38, -s * .06); c.lineTo(s * .38, -s * .44); c.lineTo(s * .24, -s * .44); c.stroke();
    var sw = Math.sin(t * 1.6) * s * .01;
    c.fillStyle = "#ffd890"; c.fillRect(s * .21 + sw, -s * .43, s * .06, s * .08);
    c.restore();
    zGlow(c, lx - m * .03, ly + m * .01, m * .22, "rgba(255,200,110,.7)");
    /* рыба выпрыгивает */
    var cyc = (t * .22) % 1;
    if (cyc < .32) {
      var fp = cyc / .32, fx = w * .72 + fp * w * .12, fy = hor + h * .3 - Math.sin(fp * 3.1416) * h * .2, fa = Math.cos(fp * 3.1416) * -.9;
      c.save(); c.translate(fx, fy); c.rotate(fa); c.fillStyle = "#cfe3ee";
      c.beginPath(); c.ellipse(0, 0, m * .035, m * .012, 0, 0, 6.2832); c.fill();
      c.beginPath(); c.moveTo(-m * .03, 0); c.lineTo(-m * .055, -m * .015); c.lineTo(-m * .055, m * .015); c.fill(); c.restore();
      if (fp > .9 || fp < .08) { c.strokeStyle = "rgba(200,225,240,.6)"; c.beginPath(); c.ellipse(w * .72 + (fp > .5 ? w * .12 : 0), hor + h * .3, m * .04 * (fp > .5 ? fp - .85 : .08 - fp) * 12, m * .01, 0, 0, 6.2832); c.stroke(); }
    }
  },
  /* 2. Прибой */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i, x;
    zBg(E, [[0, "#0a2234"], [.45, "#123a52"], [.45, "#c8b48c"], [1, "#9c8661"]]);
    var sh = h * .45;
    /* небо: звёзды и зеркальные отражения в мокром песке */
    zStars(E, 70, .8, 41, .4);
    c.fillStyle = zLG(c, 0, sh, 0, sh + h * .25, [[0, "rgba(14,40,60,.0)"], [1, "rgba(14,40,60,0)"]]);
    /* накат: три волны с разной фазой */
    for (i = 0; i < 3; i++) {
      var ph = (t * .16 + i / 3) % 1, e = ph < .55 ? zEase(ph / .55) : 1 - zEase((ph - .55) / .45) * .55;
      var y0 = sh + h * (.05 + e * .38) + i * 0;
      /* вода */
      c.fillStyle = "rgba(24,84,112," + (.42 - i * .08) + ")";
      c.beginPath(); c.moveTo(0, sh);
      for (x = 0; x <= w; x += 6) c.lineTo(x, y0 + Math.sin(x * .02 + t * .8 + i * 2) * h * .012 + zN(x * .01 + i * 5 + t * .2, 3) * h * .03);
      c.lineTo(w, sh); c.closePath(); c.fill();
      /* пена по краю */
      c.strokeStyle = "rgba(240,248,252," + (.8 - i * .15) + ")"; c.lineWidth = 1.5 + (2 - i) * .8;
      c.beginPath();
      for (x = 0; x <= w; x += 4) { var yy = y0 + Math.sin(x * .02 + t * .8 + i * 2) * h * .012 + zN(x * .01 + i * 5 + t * .2, 3) * h * .03; x ? c.lineTo(x, yy) : c.moveTo(x, yy); }
      c.stroke();
      for (x = 0; x < w; x += 7) {
        var yb = y0 + Math.sin(x * .02 + t * .8 + i * 2) * h * .012 + zN(x * .01 + i * 5 + t * .2, 3) * h * .03;
        if (hsh(x, i + 60) > .55) zDot(c, x + hsh(x, 4) * 5, yb + hsh(x, 5) * h * .03, 1 + hsh(x, 6) * 1.8, "rgba(240,250,255," + (.6 - i * .12) + ")");
      }
      /* мокрый песок темнее за уходящей водой */
      c.fillStyle = "rgba(60,48,32," + (.25 * (1 - e)) + ")";
      c.fillRect(0, y0, w, h * .06);
    }
    /* ракушки и звезда */
    [[.2, .85, 1], [.66, .78, .8], [.84, .92, 1.2]].forEach(function (s, k) {
      c.fillStyle = k === 1 ? "#d98a62" : "#efe3cc"; c.beginPath(); c.ellipse(w * s[0], h * s[1], m * .03 * s[2], m * .02 * s[2], .5, 0, 6.2832); c.fill();
      c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 1;
      for (var j = -2; j <= 2; j++) { c.beginPath(); c.moveTo(w * s[0], h * s[1] + m * .015 * s[2]); c.lineTo(w * s[0] + j * m * .01 * s[2], h * s[1] - m * .015 * s[2]); c.stroke(); }
    });
    /* полоса лунного света на воде */
    c.save(); c.globalCompositeOperation = "lighter";
    for (i = 0; i < 30; i++) { var gx = w * .5 + (hsh(i, 9) - .5) * w * .3, gy = sh + hsh(i, 10) * h * .3, a = Math.max(0, Math.sin(t * (1 + hsh(i, 11)) + i * 3)); c.fillStyle = "rgba(255,244,210," + (a * .4) + ")"; c.fillRect(gx, gy, 3 + hsh(i, 12) * 8, 1); }
    c.restore();
  },
  /* 3. Глубина */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i, k;
    zBg(E, [[0, "#1b6a8c"], [.35, "#0d3d5c"], [1, "#030f1a"]]);
    /* лучи сверху */
    c.save(); c.globalCompositeOperation = "lighter";
    for (i = 0; i < 6; i++) {
      var x = w * (.1 + i * .17) + Math.sin(t * .25 + i) * w * .03, ww = w * (.05 + .03 * hsh(i, 2));
      c.fillStyle = zLG(c, x, 0, x - w * .15, h, [[0, "rgba(190,235,255," + (.14 + .05 * Math.sin(t * .6 + i)) + ")"], [1, "rgba(190,235,255,0)"]]);
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x + ww, 0); c.lineTo(x + ww - w * .18, h); c.lineTo(x - w * .18, h); c.closePath(); c.fill();
    }
    c.restore();
    /* поверхность */
    c.fillStyle = "rgba(210,240,255,.2)";
    c.beginPath(); c.moveTo(0, 0); for (i = 0; i <= 40; i++) c.lineTo(i / 40 * w, h * .03 + Math.sin(i * .9 + t * 1.2) * h * .012); c.lineTo(w, 0); c.fill();
    /* водоросли */
    for (i = 0; i < 9; i++) {
      var sx = (i + .5) / 9 * w + (hsh(i, 5) - .5) * w * .05, sh2 = h * (.22 + hsh(i, 6) * .22);
      c.strokeStyle = i % 2 ? "#0c5d4a" : "#0a7a5c"; c.lineWidth = Math.max(2, m * .014); c.lineCap = "round";
      c.beginPath(); c.moveTo(sx, h);
      for (k = 1; k <= 10; k++) { var q = k / 10; c.lineTo(sx + Math.sin(t * .9 + i + q * 3) * m * .04 * q + (HP.x - .5) * m * .03 * q, h - sh2 * q); }
      c.stroke();
    }
    c.fillStyle = "#02080e"; c.fillRect(0, h * .96, w, h * .04);
    /* косяк рыб */
    for (i = 0; i < 12; i++) {
      var p = (t * .06 + i * .031) % 1, fx = w * (1.1 - p * 1.3), fy = h * (.45 + Math.sin(p * 7 + i) * .05) + (i % 4) * h * .025;
      c.fillStyle = "rgba(180,225,240," + (.55 + (i % 3) * .1) + ")";
      c.beginPath(); c.ellipse(fx, fy, m * .02, m * .008, 0, 0, 6.2832); c.fill();
      c.beginPath(); c.moveTo(fx + m * .016, fy); c.lineTo(fx + m * .032, fy - m * .008); c.lineTo(fx + m * .032, fy + m * .008); c.fill();
    }
    /* медузы: колокол пульсирует, щупальца волнами */
    [[.28, .5, 1], [.7, .38, .7], [.5, .66, .5]].forEach(function (J, j) {
      var jx = w * J[0] + Math.sin(t * .3 + j * 2) * w * .03, jy = h * J[1] + Math.sin(t * .6 + j) * h * .05, s = m * .17 * J[2], pu = .85 + .15 * Math.sin(t * 1.8 + j * 2);
      c.save(); c.globalCompositeOperation = "lighter";
      zGlow(c, jx, jy, s * 1.7, "rgba(120,230,220,.25)");
      c.fillStyle = zRG(c, jx, jy - s * .1, 0, s, [[0, "rgba(200,255,240,.75)"], [1, "rgba(80,200,210,.25)"]]);
      c.beginPath(); c.moveTo(jx - s * pu, jy); c.quadraticCurveTo(jx - s * pu, jy - s * 1.1 * pu, jx, jy - s * 1.1 * pu); c.quadraticCurveTo(jx + s * pu, jy - s * 1.1 * pu, jx + s * pu, jy);
      c.quadraticCurveTo(jx, jy + s * .22, jx - s * pu, jy); c.fill();
      c.strokeStyle = "rgba(170,245,235,.5)"; c.lineWidth = 1.2;
      for (k = 0; k < 7; k++) {
        var tx = jx + (k - 3) * s * .26 * pu; c.beginPath(); c.moveTo(tx, jy + s * .05);
        for (var q = 1; q <= 9; q++) c.lineTo(tx + Math.sin(t * 1.5 + k + q * .7) * s * .1 * q / 3, jy + s * .05 + q * s * .17);
        c.stroke();
      }
      c.restore();
    });
    /* пузырьки */
    for (i = 0; i < 26; i++) {
      var bp = (t * (.05 + hsh(i, 7) * .06) + hsh(i, 8)) % 1, bx = hsh(i, 9) * w + Math.sin(t + i * 2) * 5, by = h * (1 - bp), br = 1 + hsh(i, 10) * 2.6;
      c.strokeStyle = "rgba(210,240,255," + (.55 * (1 - bp)) + ")"; c.lineWidth = 1; c.beginPath(); c.arc(bx, by, br, 0, 6.2832); c.stroke();
    }
  }
];
