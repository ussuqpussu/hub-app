// Оформление в настройках: плитки выбора темы и каталог настроек (цвета, плитки и кнопки, макет и текст, анимации, сохранение).
// Любое изменение применяется сразу и хранится на этом устройстве (ключ hub.look, плюс hub.appearance для эффектов).
import { el } from './ui.js';
import { THEMES, PALETTES, FONTS, OPTIONS, DEFAULT_LOOK, getLook, setLook, resetLook, effectiveColors, onLook } from './theme.js';
import { themeWipe } from './motion-kit.js';
import { SPLASHES, showSplash, getAppearance, setAppearance, LIVE_OPTIONS, saveWallpaperFile, removeWallpaper, hasWallpaper, playSound, reducedMotion } from './appearance.js';
import { save, load } from './storage.js';

// Сегмент: ряд кнопок, выбранная подсвечена (ползунок едет сам: js/motion-ui.js)
function seg(label, options, value, onPick) {
  const box = el('div', { class: 'seg', role: 'group', 'aria-label': label });
  options.forEach(([v, name]) => {
    const b = el('button', { type: 'button', text: name, 'aria-pressed': String(v === value) });
    b.addEventListener('click', () => { if (v !== value) { playSound('tap'); onPick(v); } });
    box.append(b);
  });
  return box;
}

const field = (label, ...nodes) => el('div', { class: 'st-field' }, [el('span', { class: 'st-field__l', text: label }), ...nodes]);

function toggle(label, hint, checked, onChange) {
  const cb = el('input', { type: 'checkbox', 'aria-label': label });
  cb.checked = !!checked;
  cb.addEventListener('change', () => onChange(cb.checked));
  return el('label', { class: 'st-switch' }, [el('span', { class: 'st-switch__t' }, [el('b', { text: label }), hint ? el('small', { text: hint }) : null]), cb, el('i', { class: 'st-switch__k', 'aria-hidden': 'true' })]);
}

// ---------- плитка «Тема» ----------
export function themeTile() {
  const box = el('section', { class: 'card st-tile st-tile--theme' });
  function render() {
    const look = getLook();
    const picks = THEMES.map((t) => {
      const b = el('button', { type: 'button', class: `theme-pick theme-pick--${t.id}`, role: 'radio', 'aria-checked': String(look.theme === t.id), 'aria-label': `${t.name}. ${t.note}` }, [
        el('span', { class: 'theme-pick__screen', 'aria-hidden': 'true' }, [el('i'), el('i'), el('i'), el('i'), el('i')]),
        el('span', { class: 'theme-pick__name', text: t.name }),
        el('span', { class: 'theme-pick__note', text: t.note }),
      ]);
      b.addEventListener('click', () => { if (look.theme !== t.id) { playSound('tap'); setLook({ theme: t.id }); } });
      return b;
    });
    const modeSeg = seg('Режим', OPTIONS.mode, look.mode, (v) => themeWipe(modeSeg, () => setLook({ mode: v })));
    box.replaceChildren(
      el('h2', { text: 'Тема' }),
      el('div', { class: 'theme-picks', role: 'radiogroup', 'aria-label': 'Тема оформления' }, picks),
      field('Светлая или тёмная', modeSeg),
    );
  }
  render();
  onLook(() => { if (box.isConnected) render(); });
  return box;
}

// ---------- каталог настроек ----------
const TABS = [['colors', 'Цвета'], ['tiles', 'Плитки и кнопки'], ['layout', 'Макет и текст'], ['motion', 'Анимации'], ['save', 'Сохранение']];
let tab = 'colors';

export function lookCatalog() {
  const box = el('section', { class: 'card st-tile st-tile--catalog' });
  const panel = el('div', { class: 'st-panel' });
  const tabs = el('div', { class: 'seg st-tabs', role: 'group', 'aria-label': 'Разделы каталога' });
  function paintTabs() {
    tabs.replaceChildren(...TABS.map(([id, name]) => {
      const b = el('button', { type: 'button', text: name, 'aria-pressed': String(id === tab) });
      b.addEventListener('click', () => { tab = id; paintTabs(); renderPanel(); });
      return b;
    }));
  }

  function colors() {
    const look = getLook();
    const mode = effectiveColors(look.theme, look).dk ? 'dark' : 'light';
    const grid = el('div', { class: 'pal-grid', role: 'radiogroup', 'aria-label': 'Готовые палитры' }, PALETTES.map((p) => {
      const c = p[mode];
      const b = el('button', { type: 'button', class: 'pal', role: 'radio', 'aria-checked': String(look.palette === p.id), style: `--pb:${c.b};--ps:${c.s};--pt:${c.t};--pa:${c.a}` }, [
        el('span', { class: 'pal__sw', 'aria-hidden': 'true' }, [el('i'), el('i'), el('i')]),
        el('span', { class: 'pal__n', text: p.name }),
      ]);
      b.addEventListener('click', () => { playSound('tap'); setLook({ palette: p.id, accent: '' }); });
      return b;
    }));
    // свой акцент: цвет кнопок, активного значка и графиков
    const dots = ['#ff6b6b', '#ff9f43', '#f5c542', '#5fd6a0', '#4cc9f0', '#6c8cff', '#b183ff', '#ff7ac6'].map((h) => {
      const b = el('button', { type: 'button', class: 'dot', style: `--dot:${h}`, 'aria-label': `Акцент ${h}`, 'aria-pressed': String(look.accent.toLowerCase() === h) });
      b.addEventListener('click', () => { playSound('tap'); setLook({ accent: h }); });
      return b;
    });
    const custom = el('input', { type: 'color', class: 'st-color', value: look.accent || effectiveColors(look.theme, look).a, 'aria-label': 'Свой цвет акцента' });
    custom.addEventListener('change', () => setLook({ accent: custom.value }));
    const clear = el('button', { type: 'button', class: 'btn btn--s btn--ghost', text: 'Акцент из палитры' });
    clear.addEventListener('click', () => setLook({ accent: '' }));
    return [
      field('Готовые палитры', grid),
      field('Свой акцент', el('div', { class: 'dots' }, [...dots, custom]), el('div', { class: 'row' }, [clear])),
      wallpaperBlock(),
    ];
  }

  function wallpaperBlock() {
    const a = getAppearance();
    const msg = el('p', { class: 'muted', role: 'status' });
    const file = el('input', { type: 'file', accept: 'image/*', hidden: '' });
    const pickBtn = el('button', { type: 'button', class: 'btn btn--s', text: 'Выбрать картинку' });
    const rmBtn = el('button', { type: 'button', class: 'btn btn--s btn--ghost', text: 'Убрать обои' });
    const dim = el('input', { type: 'range', class: 'st-range', min: '0', max: '90', step: '5', value: String(a.wpDim), 'aria-label': 'Затемнение обоев' });
    pickBtn.addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      const f = file.files && file.files[0];
      if (!f) return;
      msg.textContent = 'Сжимаю картинку…';
      try { const n = await saveWallpaperFile(f); msg.textContent = `Обои сохранены на этом устройстве (${Math.round(n / 1024)} КБ).`; } catch (e) { msg.textContent = e && e.message ? e.message : 'Не получилось.'; }
      file.value = '';
      rmBtn.hidden = !(await hasWallpaper());
    });
    rmBtn.addEventListener('click', async () => { await removeWallpaper(); rmBtn.hidden = true; msg.textContent = 'Обои убраны.'; });
    dim.addEventListener('input', () => setAppearance({ wpDim: Number(dim.value) }));
    hasWallpaper().then((v) => { rmBtn.hidden = !v; });
    return field('Свои обои', el('p', { class: 'muted', text: 'Картинка хранится только на этом устройстве и не уходит в репозиторий.' }), el('div', { class: 'row' }, [pickBtn, rmBtn]), file, el('label', { class: 'st-sub' }, [el('span', { text: 'Затемнение' }), dim]), msg);
  }

  function tiles() {
    const look = getLook();
    return [
      field('Скругление плиток', seg('Скругление', OPTIONS.radius, look.radius, (v) => setLook({ radius: v }))),
      field('Рамка плиток', seg('Рамка', OPTIONS.border, look.border, (v) => setLook({ border: v }))),
      field('Плотность', seg('Плотность', OPTIONS.density, look.density, (v) => setLook({ density: v }))),
      field('Кнопки', seg('Вид кнопок', OPTIONS.btn, look.btn, (v) => setLook({ btn: v }))),
      el('div', { class: 'st-demo', 'aria-hidden': 'true' }, [el('span', { class: 'btn btn--primary', text: 'Кнопка' }), el('span', { class: 'btn', text: 'Вторая' }), el('span', { class: 'st-demo__tile', text: 'Плитка' })]),
    ];
  }

  function layout() {
    const look = getLook();
    const scale = el('input', { type: 'range', class: 'st-range', min: '85', max: '130', step: '5', value: String(look.scale), 'aria-label': 'Размер текста и элементов' });
    const out = el('output', { text: `${look.scale}%` });
    scale.addEventListener('input', () => { out.textContent = `${scale.value}%`; });
    scale.addEventListener('change', () => setLook({ scale: Number(scale.value) }));
    const fonts = el('div', { class: 'font-grid', role: 'radiogroup', 'aria-label': 'Шрифт интерфейса' }, FONTS.map((f) => {
      const b = el('button', { type: 'button', class: 'fontpick', role: 'radio', 'aria-checked': String(look.font === f.id), style: `font-family:${f.css}` }, [el('b', { text: 'Аа' }), el('span', { text: f.name }), el('small', { text: 'Сегодня, 22 октября' })]);
      b.addEventListener('click', () => { playSound('tap'); setLook({ font: f.id }); });
      return b;
    }));
    return [
      field('Ширина содержимого', seg('Ширина', OPTIONS.width, look.width, (v) => setLook({ width: v })), el('p', { class: 'muted', text: '«На весь экран» заполняет монитор без пустых полей, «По центру» держит колонку до 90 rem.' })),
      field('Размер текста и элементов', el('div', { class: 'st-sub' }, [scale, out])),
      field('Шрифт', fonts),
      field('Заголовки и цифры', seg('Заголовки', OPTIONS.head, look.head, (v) => setLook({ head: v }))),
    ];
  }

  function motion() {
    const a = getAppearance();
    const look = getLook();
    const live = el('select', { class: 'field', 'aria-label': 'Живые обои' });
    LIVE_OPTIONS.forEach((o) => live.append(el('option', { value: o.id, text: o.name })));
    live.value = a.live;
    live.addEventListener('change', () => setAppearance({ live: live.value }));
    const lite = el('select', { class: 'field', 'aria-label': 'Экономный режим' });
    [['auto', 'Сам (включается на слабых устройствах)'], ['on', 'Включён'], ['off', 'Выключен']].forEach(([v, t]) => lite.append(el('option', { value: v, text: t })));
    lite.value = a.lite;
    lite.addEventListener('change', () => setAppearance({ lite: lite.value }));
    const splash = el('select', { class: 'field', 'aria-label': 'Какая заставка' });
    SPLASHES.forEach(([v, t]) => splash.append(el('option', { value: v, text: t })));
    splash.value = a.splashStyle;
    splash.addEventListener('change', () => { setAppearance({ splashStyle: splash.value }); showSplash('Хаб', splash.value); });
    const show = el('button', { type: 'button', class: 'btn btn--s', text: 'Показать' });
    show.addEventListener('click', () => showSplash('Хаб', splash.value));
    const vol = el('input', { type: 'range', class: 'st-range', min: '0', max: '100', step: '5', value: String(a.volume), 'aria-label': 'Громкость звуков' });
    vol.addEventListener('change', () => { setAppearance({ volume: Number(vol.value) }); playSound('done'); });
    return [
      field('Появление страниц и плиток', seg('Появление', OPTIONS.entry, look.entry, (v) => setLook({ entry: v }))),
      field('Заставка при входе', toggle('Показывать заставку', 'Один раз за сеанс, по касанию пропускается', a.splash, (v) => setAppearance({ splash: v })), el('div', { class: 'row' }, [splash, show])),
      field('Фон и сцены', toggle('Эффекты', 'Живые обои, заставка, плавные переходы', a.effects, (v) => { setAppearance({ effects: v }); renderPanel(); }), el('label', { class: 'st-sub' }, [el('span', { text: 'Живые обои' }), live]),
        toggle('Сцена на «Сегодня»', 'Руки из символов в первой плитке', a.hero, (v) => setAppearance({ hero: v })),
        toggle('Небо и погода', 'В плитке погоды', a.sky, (v) => setAppearance({ sky: v }))),
      field('Звуки', toggle('Тихие звуки', 'Вход, добавление, готово', a.sounds, (v) => { setAppearance({ sounds: v }); if (v) playSound('unlock'); }), el('label', { class: 'st-sub' }, [el('span', { text: 'Громкость' }), vol])),
      field('Экономный режим', el('p', { class: 'muted', text: 'Без размытия, сцена реже обновляется. При игре и в фоне сцена замирает сама.' }), lite),
      el('p', { class: 'muted', text: reducedMotion() ? 'В системе включено «уменьшение движения»: заставка и анимации не показываются.' : 'Если в системе включено «уменьшение движения», анимации отключаются сами.' }),
    ];
  }

  function saving() {
    const msg = el('p', { class: 'muted', role: 'status', text: 'Все настройки сохраняются сразу, на этом устройстве.' });
    const exp = el('button', { type: 'button', class: 'btn btn--s', text: 'Сохранить в файл' });
    exp.addEventListener('click', () => {
      const data = { look: getLook(), appearance: getAppearance() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `hub-look-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      msg.textContent = 'Файл с настройками оформления сохранён.';
    });
    const inp = el('input', { type: 'file', accept: 'application/json,.json', hidden: '' });
    const imp = el('button', { type: 'button', class: 'btn btn--s', text: 'Загрузить из файла' });
    imp.addEventListener('click', () => inp.click());
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      try {
        const d = JSON.parse(await f.text());
        if (!d || typeof d !== 'object' || !d.look) throw new Error('bad');
        save('hub.look', d.look);
        if (d.appearance) setAppearance(d.appearance);
        setLook({});
        msg.textContent = 'Настройки загружены.';
      } catch (_) { msg.textContent = 'Это не файл настроек оформления.'; }
      inp.value = '';
    });
    const reset = el('button', { type: 'button', class: 'btn btn--s btn--ghost', text: 'Сбросить оформление' });
    reset.addEventListener('click', () => { resetLook(); msg.textContent = 'Оформление сброшено: Мозаика, графит.'; });
    return [field('Файл настроек', el('div', { class: 'row' }, [exp, imp]), inp), field('Сброс', el('div', { class: 'row' }, [reset])), msg];
  }

  function renderPanel() {
    const fn = { colors, tiles, layout, motion, save: saving }[tab];
    panel.replaceChildren(...fn());
  }
  paintTabs();
  renderPanel();
  box.append(el('h2', { text: 'Каталог настроек' }), el('p', { class: 'muted', text: 'Всё применяется сразу и хранится на этом устройстве.' }), tabs, panel);
  onLook(() => { const ae = document.activeElement; if (box.isConnected && !(ae && ae.matches && ae.matches('input[type=range],input[type=color],select'))) renderPanel(); });
  return box;
}
