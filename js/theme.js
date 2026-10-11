import { load, save } from './storage.js';
import { THEME_DEFS } from './theme-data.js';

// Темы 1–2 описаны в css/tokens.css, остальные в css/themes.css (собирается из theme-data.js).
export const THEMES = [
  { id: 'minimal', name: 'Минимализм', note: 'Светлая: белое, чёрное, прямые углы', group: 'Светлые', dark: false },
  { id: 'creation', name: 'Сотворение', note: 'Тёмная: чёрный фон, заголовки с засечками, кнопки-пилюли', group: 'Тёмные', dark: true },
  ...THEME_DEFS.map((t) => ({ id: t.id, name: t.name, note: t.note, group: t.group, dark: t.dark })),
];
export const CUSTOM = { id: 'custom', name: 'Своя тема', note: 'Свой акцентный цвет, светлая или тёмная схема', group: 'Своя' };

const KEY = 'hub.theme';
const KEY_CUSTOM = 'hub.customTheme';
const DEFAULT = 'minimal';

const isHex = (s) => /^#[0-9a-f]{6}$/i.test(String(s || ''));
const lum = (h) => {
  const n = parseInt(h.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// Цвет текста на акценте: берём тот из двух, у которого контраст выше.
export const onAccentFor = (hex) => (contrast(hex, '#ffffff') >= contrast(hex, '#111111') ? '#ffffff' : '#111111');

export function getCustom() {
  const c = load(KEY_CUSTOM, null) || {};
  return { accent: isHex(c.accent) ? c.accent : '#2f6650', dark: !!c.dark };
}
export function setCustom(patch) {
  const next = { ...getCustom(), ...patch };
  if (!isHex(next.accent)) next.accent = getCustom().accent;
  save(KEY_CUSTOM, next);
  return next;
}

export function currentTheme() {
  const id = load(KEY, DEFAULT);
  return id === 'custom' || THEMES.some((t) => t.id === id) ? id : DEFAULT;
}

export function applyTheme(id) {
  const root = document.documentElement;
  const known = id === 'custom' || THEMES.some((t) => t.id === id);
  const theme = known ? id : DEFAULT;
  if (theme === 'custom') {
    const c = getCustom();
    root.dataset.theme = c.dark ? 'minimal-dark' : 'minimal';
    root.dataset.custom = '1';
    root.style.setProperty('--c-accent', c.accent);
    root.style.setProperty('--c-on-accent', onAccentFor(c.accent));
  } else {
    root.dataset.theme = theme;
    delete root.dataset.custom;
    root.style.removeProperty('--c-accent');
    root.style.removeProperty('--c-on-accent');
  }
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
