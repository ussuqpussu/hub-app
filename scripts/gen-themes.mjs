// Собирает css/themes.css из js/theme-data.js. Запуск: node scripts/gen-themes.mjs
import { writeFileSync } from 'node:fs';
import { THEME_DEFS } from '../js/theme-data.js';

const LIGHT = { danger: '#b3261e', overlay: 'rgb(17 17 17 / 45%)', ok: '#1a7f37', warn: '#a16207', green: '#1fa855', yellow: '#e8a100', red: '#e5342a', off: '#b8b8b8', charts: ['#c2410c', '#2563eb', '#1a7f37', '#a16207', '#7c3aed', '#be185d', '#0e7490'], lineMix: 14, fillMix: 7 };
const DARK = { danger: '#ff8a80', overlay: 'rgb(0 0 0 / 65%)', ok: '#30d158', warn: '#ffd60a', green: '#30d158', yellow: '#ffd60a', red: '#ff453a', off: '#636366', charts: ['#ffb4a2', '#5e9cff', '#30d158', '#ffd60a', '#d8b4fe', '#ff9aa2', '#7fd7e8'], lineMix: 16, fillMix: 8 };

export function block(t) {
  const k = t.dark ? DARK : LIGHT;
  const rem = (v) => (v === '0' || v.endsWith('px') ? v : v.replace(/em$/, 'rem'));
  const pill = rem(t.btn);
  const m = rem(t.card);
  const s = m === '0' ? '0' : `calc(${m} * 0.6)`;
  const L = [
    `[data-theme="${t.id}"] {`,
    `  color-scheme: ${t.dark ? 'dark' : 'light'};`,
    `  --c-bg: ${t.bg};`,
    `  --c-surface: ${t.surface.startsWith('rgba') ? t.bg : t.surface};`,
    `  --c-text: ${t.text};`,
    `  --c-accent: ${t.accent};`,
    `  --c-on-accent: ${t.onAccent};`,
    `  --c-dim: ${t.dim};`,
    `  --c-line: color-mix(in srgb, var(--c-text) ${k.lineMix}%, var(--c-bg));`,
    `  --c-fill: color-mix(in srgb, var(--c-text) ${k.fillMix}%, var(--c-bg));`,
    `  --c-danger: ${k.danger};`,
    `  --c-overlay: ${k.overlay};`,
    `  --c-ok: ${k.ok};`,
    `  --c-warn: ${k.warn};`,
    `  --lamp-green: ${k.green};`,
    `  --lamp-yellow: ${k.yellow};`,
    `  --lamp-red: ${k.red};`,
    `  --lamp-off: ${k.off};`,
    ...k.charts.map((c, i) => `  --chart-${i + 1}: ${c};`),
    `  --font-ui: ${t.font};`,
    `  --font-head: var(--font-ui);`,
    `  --fw-head: 600;`,
    `  --radius-s: ${s};`,
    `  --radius-m: ${m};`,
    `  --radius-pill: ${pill};`,
    `  --border-style: solid;`,
    `}`,
  ];
  return L.join('\n');
}

export const css = () => `/* Темы 3–16. Файл собран скриптом scripts/gen-themes.mjs из js/theme-data.js, руками не правим. */\n\n${THEME_DEFS.map(block).join('\n\n')}\n`;

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(new URL('../css/themes.css', import.meta.url), css());
  console.log(`themes.css: ${THEME_DEFS.length} тем`);
}
