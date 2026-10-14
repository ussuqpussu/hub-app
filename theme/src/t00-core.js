/* ===== Ядро новых тем хаба =====
   hubAddTheme(def) добавляет тему в движок. При первом вызове из списка остаётся только «Сотворение»,
   остальные старые темы убираются. Сцены темы: TSN[id] (названия) и TSC[id] (четыре функции рисования). */
var HUB_KEPT = false;
var HP = { x: .5, y: .5, on: 0, down: 0, tap: 0 }; // указатель над сценой: x,y от 0 до 1, tap — время последнего касания (секунды)
function hubAddTheme(d) {
  if (!HUB_KEPT) {
    HUB_KEPT = true;
    var keep = T.filter(function (th) { return th.n === 'Сотворение'; });
    T.length = 0;
    keep.forEach(function (x) { T.push(x); });
    cur = 0;
    var hp = function (e) {
      var w = innerWidth || 1, h = innerHeight || 1;
      HP.x = Math.max(0, Math.min(1, e.clientX / w));
      HP.y = Math.max(0, Math.min(1, e.clientY / h));
      HP.on = 1;
    };
    document.addEventListener('pointermove', hp);
    document.addEventListener('pointerdown', function (e) { hp(e); HP.down = 1; HP.tap = performance.now() / 1000; });
    document.addEventListener('pointerup', function () { HP.down = 0; });
    document.addEventListener('pointerleave', function () { HP.on = 0; });
  }
  T.push({
    L: 'hub10', x10: 1, hs: 0, hauto: 'style', sv: '', bg: 'none', st: 'flat', cls2: '',
    n: d.n, g: d.g, ts: d.ts, lo: d.lo, b: d.b, s: d.s, t: d.t, a: d.a, ba: d.ba, dim: d.dim, dk: d.dk ? 1 : 0,
    pal: d.pal, tf: d.tf, cr: d.cr, brr: d.brr, d: d.d,
    tm: [0, 1, 2, 3, 0, 1, 2, 3, 0],
    cat: { p: 'solid', b: d.pal[2], s: d.pal[2], e: d.b, n: d.pal[1] },
  });
}
/* общие помощники сцен */
function hubSecs() { return performance.now() / 1000; }
function hubTapAge() { return hubSecs() - HP.tap; } // секунд с последнего касания
