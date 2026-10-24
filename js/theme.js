// Оформление хаба: две темы («Мозаика» и «Лист»), у каждой тёмный и светлый режим.
// Всё, что можно менять в каталоге настроек, хранится одним объектом hub.look (на этом устройстве).
// Цвета собираются из палитры (шесть цветов) плюс свой акцент; остальное (линии, заливки, тени) CSS выводит из них сам.
import { load, save } from './storage.js';

export const THEMES = [
  { id: 'mosaic', name: 'Мозаика', note: 'Плитки с мягкими углами и тонкой рамкой, всё в одну сетку на весь экран', engine: 'Монолит' },
  { id: 'sheet', name: 'Лист', note: 'Единый плоский лист: блоки разделены тонкими линиями, без карточек и теней', engine: 'Монолит' },
];

// Палитры: тёмный и светлый вариант. b — фон, s — плитка, t — текст, d — приглушённый текст, a — акцент, o — текст на акценте.
export const PALETTES = [
  { id: 'graphite', name: 'Графит', dark: { b: '#0b0b0d', s: '#151518', t: '#ececef', d: '#92939b', a: '#f2f2f4', o: '#0b0b0d' }, light: { b: '#eceded', s: '#fafafa', t: '#16161a', d: '#62636b', a: '#16161a', o: '#fafafa' } },
  { id: 'ink', name: 'Чернильный', dark: { b: '#080b14', s: '#10162a', t: '#e8ecfa', d: '#8b94b3', a: '#8fb0ff', o: '#08102a' }, light: { b: '#e9edf8', s: '#f8faff', t: '#10172e', d: '#5a6384', a: '#2f55d4', o: '#ffffff' } },
  { id: 'emerald', name: 'Изумруд', dark: { b: '#07100d', s: '#0f1d18', t: '#e4f1ea', d: '#869a90', a: '#5fd6a0', o: '#04130c' }, light: { b: '#e6efe9', s: '#f7fbf8', t: '#0d1f17', d: '#53675c', a: '#13805a', o: '#ffffff' } },
  { id: 'amber', name: 'Янтарь', dark: { b: '#100c06', s: '#1c1609', t: '#f3ead8', d: '#a39578', a: '#f5b94a', o: '#1a1203' }, light: { b: '#f1ebdd', s: '#fffaf0', t: '#231a08', d: '#6d5f40', a: '#a15f00', o: '#ffffff' } },
  { id: 'rose', name: 'Роза', dark: { b: '#110809', s: '#1f1114', t: '#f6e6e8', d: '#a98a90', a: '#ff8fa3', o: '#240509' }, light: { b: '#f4e8ea', s: '#fff8f9', t: '#26090f', d: '#74545b', a: '#c0243f', o: '#ffffff' } },
  { id: 'violet', name: 'Фиалка', dark: { b: '#0c0813', s: '#171024', t: '#eee8fa', d: '#9a8fb5', a: '#b79cff', o: '#140a2a' }, light: { b: '#ece8f6', s: '#faf8ff', t: '#1a1230', d: '#625878', a: '#6a3fd0', o: '#ffffff' } },
  { id: 'ice', name: 'Лёд', dark: { b: '#06101a', s: '#0d1b2a', t: '#e3f0fa', d: '#84a0b8', a: '#6ad4f0', o: '#04141e' }, light: { b: '#e4eef5', s: '#f6fbff', t: '#0b1a26', d: '#4f677a', a: '#0a7ea8', o: '#ffffff' } },
  { id: 'sand', name: 'Песок', dark: { b: '#0f0d0a', s: '#1a1712', t: '#efe9de', d: '#9c9585', a: '#e2cfa8', o: '#17120a' }, light: { b: '#eee9df', s: '#fbf8f1', t: '#1d1910', d: '#675f4d', a: '#6b5428', o: '#ffffff' } },
];

export const FONTS = [
  { id: 'onest', name: 'Onest', css: '"Onest", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif' },
  { id: 'golos', name: 'Golos Text', css: '"Golos Text", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif' },
  { id: 'system', name: 'Системный', css: '"Segoe UI Variable", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif' },
];

export const DEFAULT_LOOK = {
  theme: 'mosaic', mode: 'auto', palette: 'graphite', accent: '',
  radius: 'soft', border: 'thin', density: 'normal', btn: 'pill',
  width: 'wide', scale: 100, font: 'onest', head: 'serif',
  entry: 'rise',
};

export const OPTIONS = {
  radius: [['sharp', 'Острые'], ['soft', 'Мягкие'], ['round', 'Круглые']],
  border: [['none', 'Без рамки'], ['thin', 'Тонкая'], ['bold', 'Заметная']],
  density: [['compact', 'Плотно'], ['normal', 'Обычно'], ['airy', 'Свободно']],
  btn: [['pill', 'Пилюли'], ['soft', 'Скруглённые'], ['sharp', 'Прямые']],
  width: [['full', 'На весь экран'], ['wide', 'Широко'], ['center', 'По центру']],
  head: [['serif', 'С засечками'], ['sans', 'Без засечек']],
  entry: [['rise', 'Всплытие'], ['fade', 'Проявление'], ['none', 'Без анимации']],
  mode: [['auto', 'Как в системе'], ['dark', 'Тёмная'], ['light', 'Светлая']],
};

const KEY = 'hub.look';
const KEY_THEME = 'hub.theme';
const KEY_OVR = 'hub.themeOvr';
export { KEY_OVR };

const isHex = (s) => /^#[0-9a-f]{6}$/i.test(String(s || ''));
const rgbOf = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lum = (h) => {
  const c = rgbOf(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const onColor = (hex) => (contrast(hex, '#ffffff') >= 4.5 ? '#ffffff' : '#0b0b0d');

const pick = (list, v, d) => (list.some((o) => (Array.isArray(o) ? o[0] : o.id) === v) ? v : d);

export function getLook() {
  const s = load(KEY, {}) || {};
  const d = DEFAULT_LOOK;
  if (s.v !== 2) s.width = d.width; // 0.51: колонка по центру с полями; прежний выбор ширины сброшен один раз
  let theme = s.theme;
  if (!theme) { const old = load(KEY_THEME, null); theme = old; } // прежний ключ темы
  return {
    theme: pick(THEMES, theme, d.theme),
    mode: pick(OPTIONS.mode, s.mode, d.mode),
    palette: pick(PALETTES, s.palette, d.palette),
    accent: isHex(s.accent) ? s.accent : '',
    radius: pick(OPTIONS.radius, s.radius, d.radius),
    border: pick(OPTIONS.border, s.border, d.border),
    density: pick(OPTIONS.density, s.density, d.density),
    btn: pick(OPTIONS.btn, s.btn, d.btn),
    width: pick(OPTIONS.width, s.width, d.width),
    scale: Number.isFinite(s.scale) ? Math.min(130, Math.max(85, Math.round(s.scale))) : d.scale,
    font: pick(FONTS, s.font, d.font),
    head: pick(OPTIONS.head, s.head, d.head),
    entry: pick(OPTIONS.entry, s.entry, d.entry),
  };
}

const listeners = new Set();
export const onLook = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export function setLook(patch) {
  const next = { ...getLook(), ...patch, v: 2 };
  save(KEY, next);
  save(KEY_THEME, next.theme);
  applyTheme();
  listeners.forEach((fn) => fn(next));
  return next;
}
export function resetLook() {
  save(KEY, { ...DEFAULT_LOOK, v: 2 });
  save(KEY_THEME, DEFAULT_LOOK.theme);
  applyTheme();
  listeners.forEach((fn) => fn(getLook()));
}

const systemDark = () => !(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
export const resolveMode = (look = getLook()) => (look.mode === 'auto' ? (systemDark() ? 'dark' : 'light') : look.mode);

// Итоговые цвета: палитра в нужном режиме плюс свой акцент.
export function effectiveColors(_id, look = getLook()) {
  const mode = resolveMode(look);
  const pal = PALETTES.find((p) => p.id === look.palette) || PALETTES[0];
  const c = { ...pal[mode] };
  if (look.accent) { c.a = look.accent; c.o = onColor(look.accent); }
  return { b: c.b, s: c.s, t: c.t, a: c.a, ba: c.o, dim: c.d, dk: mode === 'dark' };
}

export const currentTheme = () => getLook().theme;

export function applyTheme() {
  const root = document.documentElement;
  const look = getLook();
  const c = effectiveColors(look.theme, look);
  const mode = c.dk ? 'dark' : 'light';
  const font = FONTS.find((f) => f.id === look.font) || FONTS[0];
  root.dataset.theme = look.theme;
  root.dataset.mode = mode;
  root.dataset.radius = look.radius;
  root.dataset.border = look.border;
  root.dataset.density = look.density;
  root.dataset.btn = look.btn;
  root.dataset.width = look.width;
  root.dataset.head = look.head;
  root.dataset.entry = look.entry;
  root.style.colorScheme = mode;
  const set = (p, v) => root.style.setProperty(p, v);
  set('--c-bg', c.b); set('--c-surface', c.s); set('--c-text', c.t); set('--c-dim', c.dim); set('--c-accent', c.a); set('--c-on-accent', c.ba);
  set('--font-ui', font.css);
  set('--ui-scale', String(look.scale / 100));
  // Сцена на «Сегодня» берёт цвета из той же записи, что и раньше (ключ hub.themeOvr, имя темы в движке)
  const th = THEMES.find((t) => t.id === look.theme) || THEMES[0];
  const all = load(KEY_OVR, {}) || {};
  const want = { b: c.b, s: c.s, t: c.t, a: c.a, ba: c.ba, dim: c.dim };
  if (JSON.stringify((all && all[th.engine]) || {}) !== JSON.stringify(want)) save(KEY_OVR, { ...(all || {}), [th.engine]: want });
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', c.b);
  save('hub.bootBg', c.b);
  save('hub.bootMode', mode);
  root.style.removeProperty('background');
  return look.theme;
}

export const setTheme = (id) => { setLook({ theme: id }); return currentTheme(); };

// Светлая ↔ тёмная одним нажатием (режим «как в системе» превращается в явный).
export function invertTheme() {
  const dark = effectiveColors().dk;
  return setLook({ mode: dark ? 'light' : 'dark' });
}

// Следим за системной темой, пока выбран режим «как в системе».
if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const on = () => { if (getLook().mode === 'auto') { applyTheme(); listeners.forEach((fn) => fn(getLook())); } };
  if (mq.addEventListener) mq.addEventListener('change', on);
}
