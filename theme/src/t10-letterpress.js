/* ---------- ТИПОГРАФ ---------- */
TSN.letterpress = ["Набор", "Оттиск", "Растр", "Листы"];

var LP_INK = "#1d1a17", LP_RED = "#c0392b";
function lpBg(E) { var c = E.ctx, w = E.w, h = E.h, i; zBg(E, [[0, "#f6f0e2"], [1, "#ece3cf"]]); c.globalAlpha = .06; c.fillStyle = "#7a6a48"; for (i = 0; i < 220; i++) c.fillRect(hsh(i, 231) * w, hsh(i, 232) * h, 1 + hsh(i, 233) * 2, 1); c.globalAlpha = 1; }
var LP_TXT = ["ХАБ", "ПЕЧАТЬ", "ЛИТЕРА", "ТИРАЖ", "НАБОР", "КЕГЛЬ", "ШПОНА", "ВЁРСТКА"];
/* литера на свинцовой подставке */
function lpType(c, x, y, s, ch, lift, col) {
  c.save(); c.translate(x, y - lift);
  c.fillStyle = "rgba(60,40,20," + (.2 - lift * .003) + ")"; c.fillRect(2 + lift * .3, 3 + lift * .6, s, s * 1.15);
  c.fillStyle = "#8a8a90"; c.fillRect(0, 0, s, s * 1.15);
  c.fillStyle = "#b4b4bb"; c.fillRect(0, 0, s, s * .12); c.fillStyle = "#6c6c72"; c.fillRect(0, s * 1.03, s, s * .12);
  c.fillStyle = col || LP_INK; c.font = "700 " + (s * .86) + "px Georgia,'Times New Roman',serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(ch, s / 2, s * .6); c.restore();
}

TSC.letterpress = [
  /* 0. Набор: литеры встают в строки по очереди; указатель поднимает ближайшую */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i, j;
    lpBg(E);
    var s = Math.min(m * .1, w / 14), rows = 4, y0 = h * .5 - rows * s * 1.5 / 2;
    c.fillStyle = "rgba(60,40,20,.14)"; c.fillRect(w * .06, y0 - s * .3, w * .88, rows * s * 1.5 + s * .5);
    c.strokeStyle = "rgba(60,40,20,.4)"; c.lineWidth = 1.5; c.strokeRect(w * .06 + .5, y0 - s * .3 + .5, w * .88, rows * s * 1.5 + s * .5);
    for (j = 0; j < rows; j++) {
      var word = LP_TXT[(j * 2 + Math.floor(t / 14)) % LP_TXT.length], n = word.length, x0 = w / 2 - n * s * 1.08 / 2;
      for (i = 0; i < n; i++) {
        var cyc = (t * .5 + j * .7 + i * .22) % 6, drop = cyc < .5 ? (1 - cyc / .5) * s * 2.2 : 0;
        var ox = x0 + i * s * 1.08, oy = y0 + j * s * 1.5, near = HP.on ? Math.max(0, 1 - Math.hypot(HP.x * w - ox - s / 2, HP.y * h - oy - s / 2) / (s * 2)) : 0;
        lpType(c, ox, oy, s, word[i], drop + near * s * .5, j === 1 && i === 0 ? LP_RED : LP_INK);
      }
    }
    c.fillStyle = LP_RED; c.fillRect(w * .06, h * .9, w * .88, 3);
    c.fillStyle = LP_INK; c.fillRect(w * .06, h * .9 + 6, w * .88, 1);
  },
  /* 1. Оттиск: пресс опускается, чернила проступают, остаётся отпечаток штампа */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    lpBg(E);
    var cyc = (t * .25) % 1, press = cyc < .3 ? cyc / .3 : cyc < .45 ? 1 : cyc < .65 ? 1 - (cyc - .45) / .2 : 0, cx = w / 2, cy = h * .55, S = m * .42;
    var imp = Math.max(0, Math.min(1, (cyc - .3) / .1)) * (cyc < .92 ? 1 : (1 - cyc) / .08);
    c.save(); c.translate(cx, cy); c.rotate(-.06); c.globalAlpha = imp;
    c.strokeStyle = LP_RED; c.lineWidth = S * .035; c.strokeRect(-S / 2, -S * .3, S, S * .6);
    c.lineWidth = S * .012; c.strokeRect(-S / 2 + S * .04, -S * .3 + S * .04, S - S * .08, S * .6 - S * .08);
    c.fillStyle = LP_RED; c.font = "700 " + S * .22 + "px Georgia,serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("ОДОБРЕНО", 0, -S * .04);
    c.font = "italic " + S * .09 + "px Georgia,serif"; c.fillText("— в печать —", 0, S * .13);
    c.globalAlpha = imp * .5; for (i = 0; i < 150; i++) { c.fillStyle = "#f2ead8"; c.fillRect((hsh(i, 241) - .5) * S, (hsh(i, 242) - .5) * S * .6, 1 + hsh(i, 243) * 2, 1 + hsh(i, 244) * 2); } c.restore();
    var hy = cy - S * 1.1 + press * (S * 1.1 - S * .35) + (1 - press) * 0;
    c.save(); c.shadowColor = "rgba(60,40,20,.4)"; c.shadowBlur = 14; c.shadowOffsetY = 10 * (1 - press) + 3;
    c.fillStyle = "#6b3a1c"; c.fillRect(cx - S * .1, hy - S * .5, S * .2, S * .5); c.fillStyle = "#3a2210"; c.fillRect(cx - S * .45, hy - S * .06, S * .9, S * .06);
    c.fillStyle = "#555"; c.fillRect(cx - S * .5, hy, S, S * .06); c.restore();
    c.fillStyle = "rgba(60,40,20,.3)"; c.fillRect(0, cy + S * .38, w, 2);
    c.fillStyle = LP_INK; c.font = "11px Georgia,serif"; c.textAlign = "left"; c.fillText("пробная печать № " + (1 + Math.floor(t * .25)), w * .06, h * .1);
  },
  /* 2. Растр: полутоновая картинка из точек, размер точки зависит от яркости, плывёт градиент */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i, j;
    lpBg(E);
    var step = Math.max(7, m / 38), cols = Math.ceil(w / step), rows = Math.ceil(h / step), cx = w * .5 + Math.sin(t * .4) * w * .12, cy = h * .5 + Math.cos(t * .33) * h * .1;
    var px = HP.on ? HP.x * w : w * .3, py = HP.on ? HP.y * h : h * .3;
    c.save(); c.rotate(.26);
    for (i = -cols; i < cols * 2; i++) for (j = -rows; j < rows * 2; j++) {
      var x = i * step, y = j * step, rx = x * Math.cos(.26) + y * Math.sin(.26) , ry = -x * Math.sin(.26) + y * Math.cos(.26);
      var d = Math.hypot(rx - cx, ry - cy) / (m * .5), d2 = Math.hypot(rx - px, ry - py) / (m * .35);
      var v = Math.max(0, 1 - d) * .8 + Math.max(0, 1 - d2) * .5 + Math.sin(rx * .02 + t) * .05;
      v = Math.min(1, v); if (v < .04) continue;
      c.fillStyle = (rx + ry) % (step * 12) < step * 6 ? LP_INK : "#2b2723"; c.beginPath(); c.arc(x, y, step * .62 * Math.sqrt(v), 0, 6.2832); c.fill();
    }
    c.restore();
    c.save(); c.globalCompositeOperation = "multiply"; c.rotate(.0);
    for (i = 0; i < cols + 2; i++) for (j = 0; j < rows + 2; j++) {
      var v2 = Math.max(0, 1 - Math.hypot(i * step - w * .72, j * step - h * .6) / (m * .3)); if (v2 < .05) continue;
      c.fillStyle = "rgba(192,57,43,.8)"; c.beginPath(); c.arc(i * step + step * .4, j * step + step * .4, step * .5 * Math.sqrt(v2), 0, 6.2832); c.fill();
    }
    c.restore();
  },
  /* 3. Листы: стопка бумаги, верхний лист переворачивается; на листах набор и линейки */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i, j;
    lpBg(E);
    var pw = m * .5, ph = pw * 1.3, cx = w / 2, cy = h * .52, cyc = (t * .3) % 1, flip = cyc < .5 ? cyc * 2 : 0;
    for (i = 4; i >= 0; i--) { c.save(); c.shadowColor = "rgba(60,40,20,.25)"; c.shadowBlur = 8; c.shadowOffsetY = 3; c.fillStyle = i ? "#efe6d0" : "#fbf6ea"; c.translate(cx + i * 1.5, cy + i * 2); c.rotate((i - 2) * .006); c.fillRect(-pw / 2, -ph / 2, pw, ph); c.restore(); }
    function page(num, a) {
      c.save(); c.globalAlpha = a; c.fillStyle = LP_INK; c.font = "700 " + pw * .11 + "px Georgia,serif"; c.textAlign = "left"; c.textBaseline = "top"; c.fillText("Глава " + num, -pw * .38, -ph * .4);
      c.fillStyle = LP_RED; c.fillRect(-pw * .38, -ph * .4 + pw * .15, pw * .12, 2);
      for (j = 0; j < 14; j++) { var lw = pw * (.7 - hsh(j + num * 20, 251) * .25 * (j % 5 === 4 ? 2 : 1)); c.fillStyle = "rgba(29,26,23,.7)"; c.fillRect(-pw * .38, -ph * .4 + pw * .26 + j * ph * .045, lw, ph * .012); }
      c.fillStyle = LP_INK; c.font = "italic " + pw * .06 + "px Georgia,serif"; c.textAlign = "center"; c.fillText("— " + num + " —", 0, ph * .4); c.restore();
    }
    var n0 = 1 + Math.floor(t * .3);
    c.save(); c.translate(cx, cy); page(n0, 1); c.restore();
    var sx = Math.cos(flip * Math.PI), px = cx - pw / 2;
    if (cyc < .5) {
      c.save(); c.translate(px, cy); c.scale(sx, 1); c.shadowColor = "rgba(60,40,20," + (.3 * Math.sin(flip * Math.PI)) + ")"; c.shadowBlur = 12;
      c.fillStyle = sx > 0 ? "#fbf6ea" : "#efe6d0"; c.fillRect(0, -ph / 2, pw, ph); c.translate(pw / 2, 0); if (sx > 0) page(n0, 1); c.restore();
    }
    c.fillStyle = "rgba(60,40,20,.1)"; c.fillRect(0, cy + ph / 2 + 10, w, 2);
  }
];
