/* ---------- УГЛИ ---------- */
TSN.embers = ["Искры", "Камин", "Свечи", "Лавовая лампа"];

function emBg(E, a, b) { zBg(E, [[0, a || "#0d0605"], [1, b || "#1d0e08"]]); }
/* язык пламени: контур от основания (x,y) вверх на высоту hh */
function emFlame(c, x, y, ww, hh, t, seed, inner) {
  var i, n = 14, L = [], R = [];
  for (i = 0; i <= n; i++) {
    var p = i / n, wob = (Math.sin(t * 5 + p * 5 + seed) * .5 + Math.sin(t * 9 + p * 9 + seed * 2) * .3) * ww * .25 * p;
    var half = ww * .5 * Math.pow(Math.sin((1 - p) * Math.PI * .5 + .001), 1.3) * (1 - p * .15);
    L.push([x - half + wob, y - hh * p]); R.push([x + half + wob, y - hh * p]);
  }
  var g = c.createLinearGradient(0, y, 0, y - hh);
  g.addColorStop(0, inner ? "#fff4c0" : "#ff6a1a"); g.addColorStop(.5, inner ? "#ffd070" : "#ff9a2a"); g.addColorStop(1, inner ? "rgba(255,200,100,0)" : "rgba(255,120,30,0)");
  c.fillStyle = g; c.beginPath(); L.forEach(function (p, k) { k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); });
  for (i = n; i >= 0; i--) c.lineTo(R[i][0], R[i][1]); c.closePath(); c.fill();
}

TSC.embers = [
  /* 0. Искры над углями: поднимаются, гаснут; указатель раздувает жар */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    emBg(E);
    var bx = HP.on ? HP.x : .5;
    zGlow(c, w * .5, h, m * .8, "rgba(255,110,30,.35)");
    c.fillStyle = "#1a0b06"; c.beginPath(); c.moveTo(0, h);
    for (i = 0; i <= 40; i++) c.lineTo(i / 40 * w, h * .86 + zN(i * .5, 3) * h * .1);
    c.lineTo(w, h); c.fill();
    for (i = 0; i < 46; i++) {
      var x = w * (.04 + hsh(i, 191) * .92), y = h * (.89 + hsh(i, 192) * .1), r = m * (.012 + hsh(i, 193) * .025), pu = .5 + .5 * Math.sin(t * (1 + hsh(i, 194)) + i);
      c.fillStyle = "rgb(" + Math.round(90 + pu * 150) + "," + Math.round(20 + pu * 60) + ",10)"; c.beginPath(); c.ellipse(x, y, r * 1.3, r, 0, 0, 6.2832); c.fill();
      if (pu > .6) zGlow(c, x, y, r * 5, "rgba(255,120,30," + ((pu - .5) * .5) + ")");
    }
    c.save(); c.globalCompositeOperation = "lighter";
    var N = HP.on ? 90 : 60;
    for (i = 0; i < N; i++) {
      var sp = .1 + hsh(i, 195) * .16, p = (t * sp + hsh(i, 196)) % 1, sx = w * (.1 + hsh(i, 197) * .8) + (bx - .5) * w * .2 * p + Math.sin(t * 1.3 + i * 2.4 + p * 6) * 22 * p, sy = h * (.92 - p * .95);
      c.fillStyle = p < .5 ? "rgba(255," + Math.round(210 - p * 200) + ",90," + (1 - p) + ")" : "rgba(255,110,40," + (1 - p) * .9 + ")";
      c.beginPath(); c.arc(sx, sy, m * (.004 + hsh(i, 198) * .006) * (1 - p * .6), 0, 6.2832); c.fill();
    }
    c.restore();
  },
  /* 1. Камин: кирпичная кладка, поленья, пламя с отсветом на стенах */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i, j;
    emBg(E, "#120807", "#1d0d08");
    var bw = m * .12, bh = m * .06;
    for (j = 0; j * bh < h; j++) for (i = -1; i * bw < w; i++) {
      var ox = (j % 2) * bw * .5, fl = .55 + .45 * Math.sin(t * 7 + j) * Math.sin(t * 3.7);
      c.fillStyle = "rgb(" + Math.round(58 + 20 * fl) + "," + Math.round(26 + 8 * fl) + ",18)"; c.fillRect(i * bw + ox + 1, j * bh + 1, bw - 2, bh - 2);
    }
    var fx = w * .5, fy = h * .88, fw = Math.min(w * .5, m * .8);
    zGlow(c, fx, fy - m * .2, m * .9, "rgba(255,120,30," + (.4 + .08 * Math.sin(t * 8)) + ")");
    c.fillStyle = "#07030a"; c.beginPath(); c.moveTo(fx - fw * .6, h); c.lineTo(fx - fw * .6, fy - m * .45); c.quadraticCurveTo(fx, fy - m * .75, fx + fw * .6, fy - m * .45); c.lineTo(fx + fw * .6, h); c.closePath(); c.fill();
    var g = zRG(c, fx, fy, 0, fw * .6, [[0, "rgba(255,130,40,.45)"], [1, "rgba(255,130,40,0)"]]); c.fillStyle = g; c.fillRect(fx - fw, fy - m * .8, fw * 2, m);
    c.save(); c.globalCompositeOperation = "lighter";
    for (i = 0; i < 5; i++) emFlame(c, fx + (i - 2) * fw * .12, fy - m * .02, fw * .26, m * (.34 + hsh(i, 201) * .12) * (HP.on ? 1 + (.5 - HP.y) * .5 : 1), t + i * .3, i * 3, false);
    for (i = 0; i < 3; i++) emFlame(c, fx + (i - 1) * fw * .1, fy - m * .02, fw * .14, m * (.2 + hsh(i, 202) * .08), t * 1.2 + i, i * 5 + 1, true);
    c.restore();
    for (i = 0; i < 3; i++) { c.save(); c.translate(fx + (i - 1) * fw * .22, fy); c.rotate((i - 1) * .35); c.fillStyle = "#2a150c"; c.fillRect(-fw * .22, -m * .03, fw * .44, m * .06); c.fillStyle = "rgba(255,110,30,.6)"; c.fillRect(-fw * .2, m * .01, fw * .4, m * .012); c.restore(); }
    c.fillStyle = "#2b1a14"; c.fillRect(0, h * .95, w, h * .05);
  },
  /* 2. Свечи: три свечи разной высоты, стекающий воск, дрожание от указателя */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    emBg(E, "#0a0605", "#180c07");
    var sh = HP.on ? (HP.x - .5) * 3 : 0;
    [[.3, .5, .1], [.5, .38, .13], [.7, .56, .09]].forEach(function (C, k) {
      var cx = w * C[0], ty = h * (C[1] + .12), cw = m * C[2] * .6, flick = Math.sin(t * 9 + k * 2) * .5 + Math.sin(t * 15 + k) * .3;
      zGlow(c, cx, ty - m * .12, m * (.55 + flick * .03), "rgba(255,170,70," + (.28 + flick * .04) + ")");
      var g = c.createLinearGradient(cx - cw, 0, cx + cw, 0); g.addColorStop(0, "#d8c7a6"); g.addColorStop(.4, "#fff4d8"); g.addColorStop(1, "#b8a07a");
      c.fillStyle = g; c.fillRect(cx - cw, ty, cw * 2, h - ty);
      c.fillStyle = "#fff4d8"; c.beginPath(); c.ellipse(cx, ty, cw, cw * .25, 0, 0, 6.2832); c.fill();
      c.fillStyle = "#e8d8b8"; for (i = 0; i < 3; i++) { var dx = cx - cw + cw * .5 + i * cw * .6, ln = m * (.03 + hsh(i + k * 4, 211) * .05) + Math.max(0, Math.sin(t * .1 + i + k)) * 2; c.beginPath(); c.moveTo(dx - 3, ty); c.lineTo(dx + 3, ty); c.lineTo(dx + 2, ty + ln); c.arc(dx, ty + ln, 2, 0, Math.PI); c.closePath(); c.fill(); }
      c.strokeStyle = "#2a1a10"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(cx, ty); c.lineTo(cx + sh * 2, ty - m * .025); c.stroke();
      c.save(); c.globalCompositeOperation = "lighter"; c.translate(sh * 3, 0);
      emFlame(c, cx, ty - m * .02, m * .05, m * (.12 + flick * .01), t + k, k * 4, false); emFlame(c, cx, ty - m * .02, m * .028, m * .07, t * 1.1 + k, k * 4 + 2, true); c.restore();
    });
    c.fillStyle = "#1c0f09"; c.fillRect(0, h * .94, w, h * .06);
    for (i = 0; i < 18; i++) { var p = (t * .03 + hsh(i, 212)) % 1; c.fillStyle = "rgba(255,200,120," + (.4 * Math.sin(p * Math.PI)) + ")"; c.beginPath(); c.arc(hsh(i, 213) * w + Math.sin(t + i) * 10, h * (1 - p), 1.2, 0, 6.2832); c.fill(); }
  },
  /* 3. Лавовая лампа: капли воска сливаются и расходятся; лампа в разрезе */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    emBg(E, "#0b0508", "#1a0a0e");
    var lw = Math.min(w * .5, m * .5), lh = Math.min(h * .92, lw * 2.2), lx = w / 2, ly = h / 2 - lh / 2;
    c.save(); c.beginPath();
    c.moveTo(lx - lw * .28, ly); c.lineTo(lx + lw * .28, ly); c.quadraticCurveTo(lx + lw * .5, ly + lh * .5, lx + lw * .32, ly + lh * .92); c.lineTo(lx - lw * .32, ly + lh * .92); c.quadraticCurveTo(lx - lw * .5, ly + lh * .5, lx - lw * .28, ly); c.closePath(); c.clip();
    c.fillStyle = zLG(c, 0, ly, 0, ly + lh, [[0, "#521338"], [.6, "#7a1a40"], [1, "#a82a38"]]); c.fillRect(lx - lw, ly, lw * 2, lh);
    c.globalCompositeOperation = "lighter";
    var B = [];
    for (i = 0; i < 7; i++) { var ph = t * (.12 + hsh(i, 221) * .1) + hsh(i, 222) * 6.2832, yy = ly + lh * (.5 - Math.cos(ph) * .4), xx = lx + Math.sin(ph * 1.3 + i) * lw * .16; B.push([xx, yy, lw * (.1 + hsh(i, 223) * .08)]); }
    if (HP.on) B.push([lx + (HP.x - .5) * lw * .5, ly + lh * HP.y, lw * .1]);
    var step = Math.max(3, Math.round(lw / 40)), x, y;
    for (y = ly; y < ly + lh * .92; y += step) for (x = lx - lw * .5; x < lx + lw * .5; x += step) {
      var f = 0; for (i = 0; i < B.length; i++) { var dx = x - B[i][0], dy = y - B[i][1]; f += B[i][2] * B[i][2] / (dx * dx + dy * dy + 1); }
      if (f > 1) { var a = Math.min(1, (f - 1) * 1.4); c.fillStyle = "rgba(255," + Math.round(120 + a * 60) + ",50," + (.6 + a * .35) + ")"; c.fillRect(x, y, step + .6, step + .6); }
    }
    c.restore();
    c.strokeStyle = "rgba(255,200,170,.35)"; c.lineWidth = 2; c.beginPath(); c.moveTo(lx - lw * .2, ly + lh * .1); c.quadraticCurveTo(lx - lw * .38, ly + lh * .5, lx - lw * .26, ly + lh * .8); c.stroke();
    c.fillStyle = "#b8b0a0"; c.beginPath(); c.moveTo(lx - lw * .3, ly + lh * .92); c.lineTo(lx + lw * .3, ly + lh * .92); c.lineTo(lx + lw * .46, ly + lh); c.lineTo(lx - lw * .46, ly + lh); c.closePath(); c.fill();
    c.fillStyle = "#8a8478"; c.beginPath(); c.moveTo(lx - lw * .26, ly); c.lineTo(lx + lw * .26, ly); c.lineTo(lx + lw * .1, ly - lh * .05); c.lineTo(lx - lw * .1, ly - lh * .05); c.closePath(); c.fill();
    zGlow(c, lx, ly + lh * .92, lw * 1.4, "rgba(255,90,60,.3)");
  }
];
