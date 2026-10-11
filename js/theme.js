import { load, save } from './storage.js';

export const THEMES = [
  { id: 'minimal', name: 'Минимализм', note: 'Светлая: белое, чёрное, прямые углы' },
  { id: 'creation', name: 'Сотворение', note: 'Тёмная: чёрный фон, заголовки с засечками, кнопки-пилюли' },
];

const KEY = 'hub.theme';

export function currentTheme() {
  const id = load(KEY, 'minimal');
  return THEMES.some((t) => t.id === id) ? id : 'minimal';
}

export function applyTheme(id) {
  const theme = THEMES.some((t) => t.id === id) ? id : 'minimal';
  document.documentElement.dataset.theme = theme;
  // Цвет строки состояния берём из токена, а не из жёсткого значения.
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && bg) meta.setAttribute('content', bg);
  return theme;
}

export function setTheme(id) {
  const applied = applyTheme(id);
  save(KEY, applied);
  return applied;
}
