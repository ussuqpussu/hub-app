// Блок «Оформление» в настройках: плитки тем, каталог настроек темы (движок из превью), обои, живые обои, заставка, звуки.
import { el } from './ui.js';
import { THEMES, currentTheme, setTheme, invertTheme, resetThemeOvr } from './theme.js';
import { getAppearance, setAppearance, LIVE_OPTIONS, saveWallpaperFile, removeWallpaper, hasWallpaper, playSound, reducedMotion } from './appearance.js';

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
    flip.addEventListener('click', () => { invertTheme(th.id); playSound('tap'); render(); });
    const reset = el('button', { type: 'button', class: 'btn', text: 'Сбросить правки темы' });
    reset.addEventListener('click', () => { resetThemeOvr(th.id); playSound('tap'); render(); });
    tools.replaceChildren(el('h3', { text: `Тема «${th.name}»` }), el('div', { class: 'row' }, [flip, reset]), el('p', { class: 'muted', text: 'Кнопка меняет местами фон и текст: тёмная тема становится светлой и наоборот.' }));
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
    mountEditor();
  }
  render();
  root.append(seg, grid, tools, editorBox);

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
  const vol = el('input', { type: 'range', class: 'field', min: '0', max: '100', step: '5', value: String(a.volume), 'aria-label': 'Громкость звуков' });
  vol.addEventListener('change', () => { setAppearance({ volume: Number(vol.value) }); playSound('done'); });

  root.append(
    el('h3', { text: 'Эффекты' }),
    toggle('Эффекты (живые обои, заставка)', 'effects'),
    el('label', { class: 'field-label', text: 'Живые обои' }), live,
    toggle('Анимация темы сверху страниц', 'hero'),
    toggle('Небо и погода в плитке «Погода»', 'sky'),
    toggle('Заставка при входе', 'splash'),
    el('h3', { text: 'Звуки' }),
    toggle('Тихие звуки (вход, добавление, готово)', 'sounds', (on) => { if (on) playSound('unlock'); }),
    el('label', { class: 'field-label', text: 'Громкость' }), vol,
    el('p', { class: 'muted', text: reducedMotion() ? 'В системе включено «уменьшение движения»: живые обои и заставка не показываются.' : 'Если в системе включено «уменьшение движения», живые обои и заставка отключаются сами.' }),
  );
  return root;
}
