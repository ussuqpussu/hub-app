// Блок «Оформление» в настройках: плитки тем, каталог настроек темы (движок из превью), обои, живые обои, заставка, звуки.
import { el } from './ui.js';
import { THEMES, currentTheme, setTheme, invertTheme, resetThemeOvr, setAccent, effectiveColors } from './theme.js';
import { themeWipe } from './motion-kit.js';
import { SPLASHES, showSplash, getAppearance, setAppearance, GLASS_WALLS, GLASS_ACCENTS, LIVE_OPTIONS, saveWallpaperFile, removeWallpaper, hasWallpaper, playSound, reducedMotion } from './appearance.js';

const ENGINE = new URL('../theme/engine.html', import.meta.url).href;

function tile(t, active, onPick) {
  const b = el('button', { type: 'button', class: 'theme-tile', role: 'radio', 'aria-checked': String(t.id === active), 'data-theme': t.id, 'data-pick': t.id, 'aria-label': `${t.name}. ${t.note}` }, [
    el('span', { class: 'theme-tile__screen' }, [
      el('span', { class: 'theme-tile__card' }, [el('b', { text: 'Сегодня' }), el('i'), el('i')]),
      el('span', { class: 'theme-tile__btn', text: 'Кнопка' }),
    ]),
    el('span', { class: 'theme-tile__name', text: t.name }),
    el('span', { class: 'theme-tile__note', text: t.note }),
  ]);
  b.addEventListener('click', onPick);
  return b;
}

export function appearanceBlock() {
  const root = el('div', { class: 'settings-group' }, [el('h2', { text: 'Оформление' })]);
  let filter = 'all';
  const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Какие темы показывать' });
  const grid = el('div', { class: 'themes-3', role: 'radiogroup', 'aria-label': 'Тема оформления' });
  const tools = el('div', { class: 'stack stack--tight' });
  const editorBox = el('div', { class: 'theme-editor' });
  const glassBox = el('div', { class: 'stack stack--tight' });

  // Каталог настроек: тот же код, что в превью тем. Правки сохраняются сразу и применяются к хабу.
  function mountEditor() {
    editorBox.replaceChildren();
    const th = THEMES.find((t) => t.id === currentTheme()) || THEMES[0];
    const frame = el('iframe', { class: 'theme-editor__frame', title: `Каталог настроек темы «${th.name}»`, loading: 'lazy' });
    frame.src = `${ENGINE}#editor&t=${encodeURIComponent(th.engine)}&dk=${document.documentElement.style.colorScheme === 'light' || !th.dark ? 0 : 1}`;
    editorBox.append(el('h3', { text: 'Каталог настроек темы' }), el('p', { class: 'muted', text: 'Цвета, плитки, шрифты, макет, анимации по страницам, кот, руки и звезда. Правки применяются сразу и хранятся на этом устройстве.' }), frame);
  }

  function renderTools() {
    const th = THEMES.find((t) => t.id === currentTheme()) || THEMES[0];
    const flip = el('button', { type: 'button', class: 'btn', text: 'Светлая ↔ тёмная' });
    flip.addEventListener('click', () => { themeWipe(flip, () => { invertTheme(th.id); render(); }); playSound('tap'); });
    const reset = el('button', { type: 'button', class: 'btn', text: 'Сбросить правки темы' });
    reset.addEventListener('click', () => { resetThemeOvr(th.id); playSound('tap'); render(); });
    tools.replaceChildren(el('h3', { text: `Тема «${th.name}»` }), el('div', { class: 'row' }, [flip, reset]), el('p', { class: 'muted', text: 'Кнопка меняет местами фон и текст: тёмная тема становится светлой и наоборот.' }));
  }

  // Стекло для любой темы; у темы «Стекло» ещё обои-заливки и акцент из набора
  function renderGlass() {
    const a = getAppearance();
    const sel = el('select', { class: 'field', 'aria-label': 'Стекло' });
    [['auto', 'Как у темы (включено в «Бенто» и «Монолите»)'], ['off', 'Выкл, сплошные панели'], ['tinted', 'Тонированное'], ['clear', 'Прозрачное, виднее обои']].forEach(([v, t]) => sel.append(el('option', { value: v, text: t })));
    sel.value = a.glass;
    sel.addEventListener('change', () => { setAppearance({ glass: sel.value }); renderGlass(); });
    const kids = [el('h3', { text: 'Стекло' }), el('p', { class: 'muted', text: 'Матовые панели с зерном и тонкой рамкой. Размытие нагружает слабые телефоны, поэтому в других темах по умолчанию выключено. «Выкл» даёт сплошные панели для лучшей читаемости.' }), sel];
    glassBox.replaceChildren(...kids);
  }

  function render() {
    const active = currentTheme();
    seg.replaceChildren(...[['all', 'Все'], ['Светлые', 'Светлые'], ['Тёмные', 'Тёмные']].map(([id, name]) => {
      const b = el('button', { type: 'button', text: name, 'aria-pressed': String(filter === id) });
      b.addEventListener('click', () => { filter = id; render(); });
      return b;
    }));
    grid.replaceChildren(...THEMES.filter((t) => filter === 'all' || t.group === filter).map((t) => tile(t, active, () => { setTheme(t.id); playSound('tap'); render(); })));
    renderTools();
    renderGlass();
    mountEditor();
  }
  render();
  root.append(seg, grid, tools, glassBox, editorBox);

  // Обои
  const wpMsg = el('p', { class: 'muted', role: 'status' });
  const file = el('input', { type: 'file', accept: 'image/*', hidden: '' });
  const pickBtn = el('button', { type: 'button', class: 'btn', text: 'Выбрать картинку' });
  const rmBtn = el('button', { type: 'button', class: 'btn', text: 'Убрать обои' });
  const dim = el('input', { type: 'range', class: 'field', min: '0', max: '90', step: '5', value: String(getAppearance().wpDim), 'aria-label': 'Затемнение обоев' });
  pickBtn.addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0];
    if (!f) return;
    wpMsg.textContent = 'Сжимаю картинку…';
    try { const n = await saveWallpaperFile(f); wpMsg.textContent = `Обои сохранены на этом устройстве (${Math.round(n / 1024)} КБ).`; } catch (e) { wpMsg.textContent = e && e.message ? e.message : 'Не получилось.'; }
    file.value = '';
    rmBtn.hidden = !(await hasWallpaper());
  });
  rmBtn.addEventListener('click', async () => { await removeWallpaper(); rmBtn.hidden = true; wpMsg.textContent = 'Обои убраны.'; });
  dim.addEventListener('input', () => setAppearance({ wpDim: Number(dim.value) }));
  hasWallpaper().then((v) => { rmBtn.hidden = !v; });
  root.append(el('h3', { text: 'Обои' }), el('p', { class: 'muted', text: 'Картинку выбираешь ты. Она хранится только на этом устройстве и не уходит в репозиторий.' }), el('div', { class: 'row' }, [pickBtn, rmBtn]), file, el('label', { class: 'field-label', text: 'Затемнение обоев' }), dim, wpMsg);

  // Эффекты и звуки
  const a = getAppearance();
  const toggle = (label, key, after) => {
    const cb = el('input', { type: 'checkbox', 'aria-label': label });
    cb.checked = !!getAppearance()[key];
    cb.addEventListener('change', () => { setAppearance({ [key]: cb.checked }); if (after) after(cb.checked); });
    return el('label', { class: 'row' }, [el('span', { text: label }), cb]);
  };
  const live = el('select', { class: 'field', 'aria-label': 'Живые обои' });
  LIVE_OPTIONS.forEach((o) => live.append(el('option', { value: o.id, text: o.name })));
  live.value = a.live;
  live.addEventListener('change', () => setAppearance({ live: live.value }));
  const lite = el('select', { class: 'field', 'aria-label': 'Экономный режим' });
  [['auto', 'Сам (включается на слабых устройствах)'], ['on', 'Включён'], ['off', 'Выключен']].forEach(([v, t]) => lite.append(el('option', { value: v, text: t })));
  lite.value = a.lite;
  lite.addEventListener('change', () => setAppearance({ lite: lite.value }));
  const heroPos = el('select', { class: 'field', 'aria-label': 'Где показывать анимацию' });
  [['side', 'Сбоку (на узком экране сверху)'], ['top', 'Сверху'], ['bg', 'Фоном за содержимым']].forEach(([v, t]) => heroPos.append(el('option', { value: v, text: t })));
  heroPos.value = a.heroPos;
  heroPos.addEventListener('change', () => setAppearance({ heroPos: heroPos.value }));
  const vol = el('input', { type: 'range', class: 'field', min: '0', max: '100', step: '5', value: String(a.volume), 'aria-label': 'Громкость звуков' });
  vol.addEventListener('change', () => { setAppearance({ volume: Number(vol.value) }); playSound('done'); });

  // «Монолит»: два вида главной и два вида навигации — выбрать, какой оставить
  const monoHome = el('select', { class: 'field', 'aria-label': 'Вид главной в «Монолите»' });
  [['grid', 'Сетка плиток (макет 1)'], ['stage', 'Руки на весь экран (макет 3)']].forEach(([v, t]) => monoHome.append(el('option', { value: v, text: t })));
  monoHome.value = a.monoHome;
  monoHome.addEventListener('change', () => setAppearance({ monoHome: monoHome.value }));
  const monoNav = el('select', { class: 'field', 'aria-label': 'Навигация в «Монолите»' });
  [['menu', 'Меню по «Х», капсула телефона листается'], ['icons', 'Значки внизу панели, на телефоне «Ещё»']].forEach(([v, t]) => monoNav.append(el('option', { value: v, text: t })));
  monoNav.value = a.monoNav;
  monoNav.addEventListener('change', () => setAppearance({ monoNav: monoNav.value }));
  {
    root.append(
      el('h3', { text: 'Тема «Монолит»' }),
      el('label', { class: 'field-label', text: 'Вид главной' }), monoHome,
      el('label', { class: 'field-label', text: 'Навигация: где Подписки, Знания, Поиск и Настройки' }), monoNav,
    );
  }

  root.append(
    el('h3', { text: 'Эффекты' }),
    toggle('Эффекты (живые обои, заставка)', 'effects'),
    el('label', { class: 'field-label', text: 'Живые обои' }), live,
    toggle('Анимация темы на страницах', 'hero'),
    el('label', { class: 'field-label', text: 'Где показывать анимацию' }), heroPos,
    el('label', { class: 'field-label', text: 'Экономный режим (без размытия стекла, меньше кадров; при игре и в фоне сцены замирают сами)' }), lite,
    toggle('Небо и погода в плитке «Погода»', 'sky'),
    toggle('Заставка при входе', 'splash'),
    el('label', { class: 'field-label', text: 'Какая заставка' }), (() => {
      const sel = el('select', { class: 'field', 'aria-label': 'Какая заставка' });
      SPLASHES.forEach(([v, t]) => sel.append(el('option', { value: v, text: t })));
      sel.value = getAppearance().splashStyle;
      sel.addEventListener('change', () => { setAppearance({ splashStyle: sel.value }); showSplash('Хаб', sel.value); });
      const b = el('button', { type: 'button', class: 'btn btn--s', text: 'Показать' });
      b.addEventListener('click', () => showSplash('Хаб', sel.value));
      return el('div', { class: 'row' }, [sel, b]);
    })(),
    el('h3', { text: 'Звуки' }),
    toggle('Тихие звуки (вход, добавление, готово)', 'sounds', (on) => { if (on) playSound('unlock'); }),
    el('label', { class: 'field-label', text: 'Громкость' }), vol,
    el('p', { class: 'muted', text: reducedMotion() ? 'В системе включено «уменьшение движения»: живые обои и заставка не показываются.' : 'Если в системе включено «уменьшение движения», живые обои и заставка отключаются сами.' }),
  );
  return root;
}
