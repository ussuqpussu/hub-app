/* ===== Надстройка для хаба: режимы #stage (сцена сверху страницы) и #editor (каталог настроек) =====
   Настройки тем (OVR) хранятся в localStorage под ключом hub.themeOvr, их читает и сам хаб. */
(function () {
  var H = location.hash || '';
  var MODE = /(^|[#&])stage/.test(H) ? 'stage' : /(^|[#&])editor/.test(H) ? 'editor' : '';
  if (!MODE) return;
  var KEY = 'hub.themeOvr';
  var q = function (k) { var m = H.match(new RegExp('[&#]' + k + '=([^&]*)')); return m ? decodeURIComponent(m[1]) : null; };
  var last = '';
  function loadOvr() {
    var raw = '';
    try { raw = localStorage.getItem(KEY) || ''; } catch (e) { /* без хранилища работаем с пустыми настройками */ }
    if (raw === last) return false;
    last = raw;
    var o = {};
    try { o = JSON.parse(raw || '{}') || {}; } catch (e) { o = {}; }
    for (var k in OVR) delete OVR[k];
    for (k in o) if (o[k] && typeof o[k] === 'object') OVR[k] = o[k];
    return true;
  }
  function saveOvr() {
    var s = JSON.stringify(OVR);
    if (s === last) return;
    last = s;
    try { localStorage.setItem(KEY, s); } catch (e) { /* не сохранилось: настройки останутся до закрытия */ }
  }
  function themeIndex(name) {
    for (var i = 0; i < T.length; i++) if (T[i].n === name) return i;
    return 0;
  }
  var dk = q('dk') === '1';
  var css = document.createElement('style');
  var base = 'html,body{background:transparent!important;margin:0!important;padding:0!important;overflow:hidden!important;color-scheme:' + (dk ? 'dark' : 'light') + '!important}' +
    'body>*:not(.wrap):not(script){display:none!important}.wrap{display:block!important;margin:0!important;padding:0!important;max-width:none!important}.wrap>*:not(#big){display:none!important}';
  if (MODE === 'stage') {
    css.textContent = base +
      '#big{display:block!important;position:fixed;inset:0;width:auto!important;height:auto!important;padding:0!important;margin:0!important;background:none!important;border:0!important}' +
      '#big .info,#big .ad-hd,#big .ad-tabs,#big .ad-foot{display:none!important}' +
      '#big .scr{position:absolute!important;inset:0!important;width:auto!important;height:auto!important;max-width:none!important;max-height:none!important;aspect-ratio:auto!important;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding:0!important;margin:0!important}' +
      '#big .lay{position:absolute!important;inset:0!important;padding:0!important}' +
      '#big .lay :not(canvas):not(:has(canvas)):not(pre.ad-asc):not(.myth-st):not(.myth-st *):not(.myth-toast):not(.myth-toast *):not(.myth-rageov):not(.myth-rageov *):not(.myth-fly):not(.myth-fly *):not(.myth-runes){display:none!important}#big .lay :has(canvas){transform:none!important;filter:none!important;background:none!important;border:0!important;box-shadow:none!important;padding:0!important;margin:0!important}' +
      '#big pre.ad-asc{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;margin:0!important}#big .lay canvas{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;margin:0!important}' +
      '#big .myth-st{position:static!important;margin:0!important}#big .myth-st:has(video){position:fixed!important;inset:0!important;background:var(--mybg,#050505)!important}#big .myth-st video{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;object-fit:contain!important}#big .myth-runes{position:absolute!important;left:14px;bottom:8px;margin:0!important;z-index:5}';
  } else {
    css.textContent = base.replace('overflow:hidden!important;', 'overflow:auto!important;') +
      '#big{display:block!important;padding:0!important;margin:0!important}#big .scr,#z20-fav{display:none!important}#big .info{width:auto!important;max-width:none!important;padding:18px 22px 22px!important;box-sizing:border-box!important}';
  }
  document.head.appendChild(css);
  document.documentElement.classList.add('hub-' + MODE);

  loadOvr();
  // Пока хаб не прислал настоящие проекты, вместо учебных названий из превью показываем созвездия (ничего не выдумываем про проекты).
  if (typeof PROJECTS !== 'undefined') {
    PROJECTS.length = 0;
    ['Орион', 'Лира', 'Кассиопея', 'Андромеда', 'Персей', 'Лебедь', 'Пегас'].forEach(function (n, i) { PROJECTS.push({ id: 'c' + i, name: n, type: 'созвездие', st: 'в работе', pr: 30 + i * 9, next: '', upd: '' }); });
  }
  cur = themeIndex(q('t'));
  ADPG = +q('pg') || 0;
  if (typeof z33Sync === 'function') z33Sync();
  renderBig();

  // Кот темы (тот же рисунок и настройки, что в превью): отправляем хабу, он сажает кота на кнопку «+».
  function sendCat() {
    try {
      var th = getT(cur);
      var c = th.cat || (th.L === 'adam' ? { p: 'tuxedo', b: '#a9a9a9', s: '#f2f2f2', t: '#f2f2f2', e: '#111', n: '#8a8a8a' } : null);
      var svg = c ? String(petSvg(c) || '') : '';
      if (/^myth/.test(th.k) && typeof mythPetSvg === 'function') svg = mythPetSvg();
      parent.postMessage({ type: 'hub-cat', theme: T[cur].n, svg: svg }, '*');
    } catch (e) { /* без кота */ }
  }
  function rerender() { if (typeof z33Sync === 'function') z33Sync(); renderBig(); sendCat(); }
  window.addEventListener('storage', function (e) { if (e.key === KEY && loadOvr()) rerender(); });
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.type !== 'hub-set') return;
    var ch = false;
    if (d.t != null) { var i = themeIndex(d.t); if (i !== cur) { cur = i; ch = true; } }
    if (d.pg != null && +d.pg !== ADPG) { ADPG = +d.pg; ch = true; }
    if (d.dk != null) { var s = (d.dk ? 'dark' : 'light'); if (document.documentElement.style.colorScheme !== s) document.documentElement.style.setProperty('color-scheme', s, 'important'); }
    if (Array.isArray(d.projects) && d.projects.length && typeof PROJECTS !== 'undefined') {
      PROJECTS.length = 0;
      d.projects.forEach(function (p) { PROJECTS.push(p); });
      ch = true;
    }
    if (ch) rerender();
  });
  if (MODE === 'editor') {
    // правки каталога сохраняются сразу; хаб подхватывает их через событие storage
    setInterval(saveOvr, 300);
  }
  sendCat();
  try { parent.postMessage({ type: 'hub-engine-ready', mode: MODE }, '*'); } catch (e) { /* без родителя */ }
})();
