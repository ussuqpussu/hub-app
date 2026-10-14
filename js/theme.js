import { load, save } from './storage.js';
import { THEME_DEFS } from './theme-data.js';

// «Сотворение» описано в css/tokens.css, остальные темы в css/themes.css (собирается из theme-data.js).
// engine — имя темы в движке (theme/engine.html): им рисуются сцены и работает каталог настроек.
export const THEMES = [
  { id: 'creation', name: 'Сотворение', engine: 'Сотворение', note: 'Тёмная: чёрный фон, ASCII-руки, заголовки с засечками, кнопки-пилюли', group: 'Тёмные', dark: true, base: { b: '#050505', s: '#101010', t: '#d4d4d4', a: '#f2f2f2', ba: '#050505', dim: '#9a9a9a' } },
  ...THEME_DEFS.map((t) => ({ id: t.id, name: t.name, engine: t.name, note: t.note, group: t.group, dark: t.dark, base: { b: t.bg, s: t.surface.startsWith('#') ? t.surface : t.bg, t: t.text, a: t.accent, ba: t.onAccent, dim: t.dim } })),
];

const KEY = 'hub.theme';
export const KEY_OVR = 'hub.themeOvr';
const DEFAULT = 'creation';

const isHex = (s) => /^#[0-9a-f]{6}$/i.test(String(s || ''));
const rgbOf = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (a) => `#${a.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, k) => { const A = rgbOf(a); const B = rgbOf(b); return toHex(A.map((v, i) => v + (B[i] - v) * k)); };
const lum = (h) => {
  const c = rgbOf(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// Настройки каталога: { "*": {...на все темы}, "<имя темы>": {...} }. Их пишет и читает движок (тот же ключ).
export function getOvr() {
  const o = load(KEY_OVR, {});
  return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
}
export function setOvr(obj) { return save(KEY_OVR, obj); }
const ovrFor = (name, all = getOvr()) => ({ ...(all['*'] || {}), ...(all[name] || {}) });

// Итоговые цвета темы с учётом правок (повторяет getT из движка).
export function effectiveColors(id, all = getOvr()) {
  const th = THEMES.find((t) => t.id === id) || THEMES[0];
  const o = ovrFor(th.engine, all);
  const r = { ...th.base };
  ['b', 's', 't', 'a', 'ba', 'dim'].forEach((k) => { if (isHex(o[k])) r[k] = o[k]; });
  if (isHex(o.a) && !isHex(o.ba)) r.ba = lum(o.a) > 0.45 ? '#111111' : '#ffffff';
  if ((isHex(o.t) || isHex(o.b)) && !isHex(o.dim)) r.dim = mix(r.t, r.b, 0.4);
  r.dk = lum(r.b) < 0.3;
  if (isHex(o.b) && !isHex(o.s)) r.s = mix(r.b, r.t, r.dk ? 0.06 : 0.03);
  return r;
}

export function currentTheme() {
  const id = load(KEY, DEFAULT);
  return THEMES.some((t) => t.id === id) ? id : DEFAULT;
}

const INLINE = ['--c-bg', '--c-surface', '--c-text', '--c-accent', '--c-on-accent', '--c-dim', '--c-line', '--c-fill', '--radius-m', '--radius-s', '--radius-pill', '--font-ui'];

export function applyTheme(id) {
  const root = document.documentElement;
  const theme = THEMES.some((t) => t.id === id) ? id : DEFAULT;
  root.dataset.theme = theme;
  delete root.dataset.custom;
  INLINE.forEach((p) => root.style.removeProperty(p));
  const th = THEMES.find((t) => t.id === theme);
  const all = getOvr();
  const o = ovrFor(th.engine, all);
  if (Object.keys(o).length) {
    const c = effectiveColors(theme, all);
    const set = (p, v) => root.style.setProperty(p, v);
    if (['b', 's', 't', 'a', 'ba', 'dim'].some((k) => isHex(o[k]))) {
      set('--c-bg', c.b); set('--c-surface', c.s); set('--c-text', c.t); set('--c-accent', c.a); set('--c-on-accent', c.ba); set('--c-dim', c.dim);
      set('--c-line', `color-mix(in srgb, var(--c-text) ${c.dk ? 16 : 14}%, var(--c-bg))`);
      set('--c-fill', `color-mix(in srgb, var(--c-text) ${c.dk ? 8 : 7}%, var(--c-bg))`);
      root.style.colorScheme = c.dk ? 'dark' : 'light';
    }
    if (o.cr != null && o.cr !== '' && Number.isFinite(+o.cr)) { set('--radius-m', `${+o.cr / 16}rem`); set('--radius-s', `${+o.cr / 28}rem`); }
    if (typeof o.brr === 'string' && o.brr) set('--radius-pill', o.brr);
    if (typeof o.tf === 'string' && o.tf) set('--font-ui', o.tf);
  } else root.style.removeProperty('color-scheme');
  // Цвет строки состояния берём из токена, а не из жёсткого значения.
  const bg = getComputedStyle(root).getPropertyValue('--c-bg').trim();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && bg) meta.setAttribute('content', bg);
  return theme;
}

export function setTheme(id) {
  const applied = applyTheme(id);
  save(KEY, applied);
  return applied;
}

// «Светлая ↔ тёмная»: меняет местами фон и текст, как кнопка в каталоге превью.
export function invertTheme(id = currentTheme()) {
  const th = THEMES.find((t) => t.id === id) || THEMES[0];
  const all = getOvr();
  const c = effectiveColors(th.id, all);
  const nb = c.t;
  const nt = c.b;
  const next = { ...all, [th.engine]: { ...(all[th.engine] || {}), b: nb, t: nt, s: mix(nb, nt, 0.06) } };
  delete next[th.engine].ba;
  delete next[th.engine].dim;
  setOvr(next);
  applyTheme(th.id);
  return next;
}

export function resetThemeOvr(id = currentTheme()) {
  const th = THEMES.find((t) => t.id === id) || THEMES[0];
  const all = { ...getOvr() };
  delete all[th.engine];
  setOvr(all);
  applyTheme(th.id);
}
