/* ---------- СТЕКЛО (по мотивам motion-kit) ---------- */
TSN.glass = ["Кольца", "Бублик", "Линия", "Остров"];

var GL_F = "600 {s}px Manrope,'Segoe UI',system-ui,sans-serif";
function glFont(c, s, wt) { c.font = (wt || 600) + " " + Math.round(s) + "px Manrope,'Segoe UI',system-ui,sans-serif"; }
function glEase(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return 1 - Math.pow(1 - x, 3); }
function glEaseIO(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
function glPhase(t, per) { return (t % per); }
/* ровная диагональная заливка, без «свечений» */
function glBg(E) {
  var c = E.ctx, g = c.createLinearGradient(0, 0, E.w, E.h);
  g.addColorStop(0, "#232842"); g.addColorStop(1, "#0a0b10");
  c.fillStyle = g; c.fillRect(0, 0, E.w, E.h);
  c.globalAlpha = .05; c.fillStyle = "#fff";
  for (var i = 0; i < 140; i++) c.fillRect(hsh(i, 201) * E.w, hsh(i, 202) * E.h, 1, 1);
  c.globalAlpha = 1;
}
/* матовая панель: полупрозрачная заливка, рамка 1px, блик сверху */
function glPanel(c, x, y, w, h, r) {
  var g = c.createLinearGradient(x, y, x + w * .4, y + h);
  g.addColorStop(0, "rgba(255,255,255,.11)"); g.addColorStop(1, "rgba(255,255,255,.03)");
  rrect(c, x, y, w, h, r); c.fillStyle = g; c.fill();
  c.strokeStyle = "rgba(255,255,255,.12)"; c.lineWidth = 1; rrect(c, x + .5, y + .5, w - 1, h - 1, r); c.stroke();
  c.strokeStyle = "rgba(255,255,255,.12)"; c.beginPath(); c.moveTo(x + r, y + 1.5); c.lineTo(x + w - r, y + 1.5); c.stroke();
}
function glNum(v) { return Math.round(v).toString(); }

TSC.glass = [
  /* 0. Кольца: три кольца заполняются каскадом, числа набегают */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    glBg(E);
    var px = w * .06, py = h * .1, pw = w * .88, ph = h * .8;
    glPanel(c, px, py, pw, ph, m * .06);
    var per = 7, p = glPhase(t, per), fade = p > 6 ? 1 - (p - 6) : 1;
    c.globalAlpha = fade;
    var cx = px + pw * .28, cy = py + ph * .52, R = Math.min(pw * .22, ph * .4);
    var rings = [["#ff3b5c", .78, "Задачи", 12], ["#30d158", .62, "Фокус", 9], ["#32ade6", .45, "Встречи", 4]];
    rings.forEach(function (r, k) {
      var rr = R * (1 - k * .24), a = glEase((p - .3 - k * .14) / 1.4);
      c.lineWidth = R * .13; c.lineCap = "round";
      c.strokeStyle = "rgba(255,255,255,.09)"; c.beginPath(); c.arc(cx, cy, rr, 0, 6.2832); c.stroke();
      c.strokeStyle = r[0]; c.beginPath(); c.arc(cx, cy, rr, -1.5708, -1.5708 + 6.2832 * r[1] * a); c.stroke();
      var ty = py + ph * (.32 + k * .2);
      c.textAlign = "left"; c.fillStyle = "rgba(255,255,255,.6)"; glFont(c, m * .035, 500); c.fillText(r[2], px + pw * .58, ty);
      c.fillStyle = "#f1f2f6"; glFont(c, m * .06, 700); c.fillText(glNum(r[3] * a), px + pw * .58, ty + m * .065);
    });
    c.globalAlpha = 1;
    c.textAlign = "left"; c.fillStyle = "#f1f2f6"; glFont(c, m * .045, 700); c.fillText("Сегодня", px + pw * .05, py + ph * .14);
  },
  /* 1. Бублик: сегменты рисуются по очереди, в центре число */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    glBg(E);
    var px = w * .06, py = h * .1, pw = w * .88, ph = h * .8;
    glPanel(c, px, py, pw, ph, m * .06);
    var per = 7, p = glPhase(t, per), fade = p > 6 ? 1 - (p - 6) : 1;
    c.globalAlpha = fade;
    var segs = [[.23, "#8b5cf6", "Орбита"], [.2, "#3b82f6", "Прилив"], [.2, "#14b8a6", "Северная звезда"], [.18, "#22c55e", "Росток"], [.18, "#ec4899", "Грань"], [.01, "#f59e0b", "Кампания"]];
    var cx = px + pw * .27, cy = py + ph * .52, R = Math.min(pw * .2, ph * .36), acc = -1.5708;
    c.lineWidth = R * .2; c.lineCap = "butt";
    c.strokeStyle = "rgba(255,255,255,.07)"; c.beginPath(); c.arc(cx, cy, R, 0, 6.2832); c.stroke();
    segs.forEach(function (s, k) {
      var a = glEase((p - .2 - k * .11) / 1), span = 6.2832 * s[0];
      c.strokeStyle = s[1]; c.beginPath(); c.arc(cx, cy, R, acc, acc + Math.max(0, span - .05) * a); c.stroke();
      acc += span;
      var ly = py + ph * (.2 + k * .12), la = glEase((p - .6 - k * .11) / .6);
      c.globalAlpha = fade * la; c.fillStyle = s[1]; rrect(c, px + pw * .55, ly - m * .018, m * .03, m * .03, m * .008); c.fill();
      c.textAlign = "left"; c.fillStyle = "#e6e8f2"; glFont(c, m * .034, 500); c.fillText(s[2], px + pw * .55 + m * .05, ly + m * .008);
      c.globalAlpha = fade;
    });
    c.textAlign = "center"; c.fillStyle = "#f1f2f6"; glFont(c, m * .09, 700); c.fillText(glNum(333 * glEase((p - .2) / 1.2)), cx, cy + m * .02);
    c.fillStyle = "rgba(255,255,255,.55)"; glFont(c, m * .032, 500); c.fillText("готово", cx, cy + m * .065);
    c.globalAlpha = 1;
  },
  /* 2. Линия: путь вычерчивается, под ним проявляется заливка, число считается */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    glBg(E);
    var px = w * .06, py = h * .1, pw = w * .88, ph = h * .8;
    glPanel(c, px, py, pw, ph, m * .06);
    var per = 7, p = glPhase(t, per), fade = p > 6 ? 1 - (p - 6) : 1;
    c.globalAlpha = fade;
    var V = [18, 24, 20, 32, 28, 40, 36, 52, 44, 58, 50, 66, 60, 74, 68, 72, 80, 76, 88, 84, 92, 86, 96, 100], n = V.length;
    var gx = px + pw * .06, gy = py + ph * .36, gw = pw * .88, gh = ph * .5;
    var pts = V.map(function (v, k) { return [gx + gw * k / (n - 1), gy + gh * (1 - v / 100)]; });
    var draw = glEase((p - .35) / 1.7), upto = draw * (n - 1);
    var path = function (lim) {
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (var k = 1; k <= Math.min(n - 1, Math.ceil(lim)); k++) {
        var f = Math.min(1, lim - (k - 1)), x0 = pts[k - 1][0], y0 = pts[k - 1][1], x1 = x0 + (pts[k][0] - x0) * f, y1 = y0 + (pts[k][1] - y0) * f, cm = (x0 + x1) / 2;
        c.bezierCurveTo(cm, y0, cm, y1, x1, y1);
      }
    };
    var ga = glEase((p - 1.3) / 1);
    if (ga > 0) {
      var g = c.createLinearGradient(0, gy, 0, gy + gh); g.addColorStop(0, "rgba(59,130,246," + (.35 * ga) + ")"); g.addColorStop(1, "rgba(59,130,246,0)");
      path(n - 1); c.lineTo(gx + gw, gy + gh); c.lineTo(gx, gy + gh); c.closePath(); c.fillStyle = g; c.fill();
    }
    c.strokeStyle = "#3b82f6"; c.lineWidth = 2.5; c.lineCap = "round"; c.lineJoin = "round"; path(upto); c.stroke();
    var k0 = Math.min(n - 1, Math.floor(upto)), kf = upto - k0, k1 = Math.min(n - 1, k0 + 1);
    zDot(c, pts[k0][0] + (pts[k1][0] - pts[k0][0]) * kf, pts[k0][1] + (pts[k1][1] - pts[k0][1]) * kf, m * .012, "#fff");
    c.textAlign = "left"; c.fillStyle = "#f1f2f6"; glFont(c, m * .045, 700); c.fillText("Пропускная способность", px + pw * .06, py + ph * .14);
    glFont(c, m * .085, 700); c.fillText(glNum(121 * draw), px + pw * .06, py + ph * .31);
    c.fillStyle = "rgba(255,255,255,.55)"; glFont(c, m * .032, 500); c.textAlign = "right"; c.fillText("за 30 дней", px + pw * .94, py + ph * .31);
    c.globalAlpha = 1;
  },
  /* 3. Остров: капсула меняет форму: ожидание, тост, таймер, раскрытая карточка */
  function (E) {
    var c = E.ctx, w = E.w, h = E.h, t = E.t, m = E.m, i;
    glBg(E);
    var per = 14, p = glPhase(t, per);
    /* состояния: [время начала, ширина, высота, радиус] в долях m */
    var S = [[0, .22, .06, .03], [1, .6, .085, .042], [3.4, .32, .07, .035], [5.6, .74, .26, .065], [10, .32, .07, .035], [12.5, .22, .06, .03]], cur = S[0], prev = S[0];
    for (i = 0; i < S.length; i++) if (p >= S[i][0]) { prev = S[Math.max(0, i - 1)]; cur = S[i]; }
    var k = glEase((p - cur[0]) / .6), W = (prev[1] + (cur[1] - prev[1]) * k) * m * 1.15, H = (prev[2] + (cur[2] - prev[2]) * k) * m * 1.15, R = (prev[3] + (cur[3] - prev[3]) * k) * m * 1.15;
    var x = w / 2 - W / 2, y = h * .14;
    c.save(); c.shadowColor = "rgba(2,3,8,.55)"; c.shadowBlur = m * .05; c.shadowOffsetY = m * .02;
    c.fillStyle = "#08080b"; rrect(c, x, y, W, H, R); c.fill(); c.restore();
    var secs = p - cur[0], la = glEase((secs - .14) / .3), tt = Math.max(0, 1500 - Math.floor(Math.max(0, p - 3.4) * 60));
    var mm = Math.floor(tt / 60), ss = tt % 60, tm = (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss;
    c.globalAlpha = la; c.textBaseline = "middle";
    if (cur === S[1]) {
      zDot(c, x + H * .5, y + H * .5, H * .3, "#5b4bd6");
      c.textAlign = "left"; c.fillStyle = "#fff"; glFont(c, m * .032, 500); c.fillText("Фокус начался: можно не отвлекаться", x + H * .95, y + H * .52);
    } else if (cur === S[2] || cur === S[4]) {
      c.strokeStyle = "#ffb347"; c.lineWidth = 2; c.beginPath(); c.arc(x + H * .42, y + H * .5, H * .17, t * 5, t * 5 + 4.7); c.stroke();
      c.textAlign = "left"; c.fillStyle = "#fff"; glFont(c, m * .032, 500); c.fillText("Фокус", x + H * .75, y + H * .52);
      c.textAlign = "right"; c.fillStyle = "#ffb347"; glFont(c, m * .034, 700); c.fillText(tm, x + W - H * .4, y + H * .52);
    } else if (cur === S[3]) {
      c.textAlign = "left"; c.fillStyle = "#b4b4bd"; glFont(c, m * .03, 500); c.fillText("Фокус-сессия", x + W * .06, y + H * .2);
      c.fillStyle = "#fff"; glFont(c, m * .036, 600); c.fillText("25 минут", x + W * .06, y + H * .34);
      c.textAlign = "right"; c.fillStyle = "#ffb347"; glFont(c, m * .11, 700); c.fillText(tm, x + W * .94, y + H * .3);
      [["+5 мин", .52, "rgba(255,255,255,.14)", "#fff"], ["II", .74, "rgba(255,179,71,.22)", "#ffb347"], ["■", .88, "rgba(255,90,90,.24)", "#ff8585"]].forEach(function (b) {
        var bw = b[0].length > 2 ? W * .2 : W * .1; rrect(c, x + W * b[1] - bw / 2, y + H * .66, bw, H * .22, H * .11); c.fillStyle = b[2]; c.fill();
        c.fillStyle = b[3]; c.textAlign = "center"; glFont(c, m * .03, 600); c.fillText(b[0], x + W * b[1], y + H * .77);
      });
    }
    c.globalAlpha = 1; c.textBaseline = "alphabetic";
  }
];
