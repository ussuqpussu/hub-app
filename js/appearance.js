// Оформление сверх тем: свои обои, живые обои, заставка при входе, тихие звуки.
// Всё хранится на этом устройстве (настройки в localStorage, картинка обоев в IndexedDB) и не синхронизируется.
import { load, save } from './storage.js';
import { dbGet, dbSet, dbDelete } from './data/db.js';
import { effectiveColors } from './theme.js';

const KEY = 'hub.appearance';
const DEFAULTS = { effects: true, live: 'auto', splash: true, hero: true, heroPos: 'side', sky: true, sounds: false, volume: 30, wpOn: true, wpDim: 40, glass: 'auto', wpGrad: -1, lite: 'auto' };
export const LIVE_OPTIONS = [
  { id: 'auto', name: 'Как у темы' },
  { id: 'stars', name: 'Звёзды' },
  { id: 'blobs', name: 'Мягкие пятна' },
  { id: 'dust', name: 'Пылинки' },
  { id: 'fireflies', name: 'Светлячки' },
  { id: 'mist', name: 'Туман' },
  { id: 'sun', name: 'Солнечный свет' },
  { id: 'off', name: 'Выкл' },
];

const listeners = new Set();
export const onAppearance = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export function getAppearance() {
  const s = load(KEY, {}) || {};
  return {
    effects: s.effects !== false,
    live: LIVE_OPTIONS.some((o) => o.id === s.live) ? s.live : DEFAULTS.live,
    splash: s.splash !== false,
    hero: s.hero !== false,
    heroPos: ['top', 'side', 'bg'].includes(s.heroPos) ? s.heroPos : DEFAULTS.heroPos,
    sky: s.sky !== false,
    sounds: s.sounds === true,
    volume: Number.isFinite(s.volume) ? Math.min(100, Math.max(0, s.volume)) : DEFAULTS.volume,
    wpOn: s.wpOn !== false,
    wpDim: Number.isFinite(s.wpDim) ? Math.min(90, Math.max(0, s.wpDim)) : DEFAULTS.wpDim,
    glass: ['auto', 'off', 'tinted', 'clear'].includes(s.glass) ? s.glass : DEFAULTS.glass,
    lite: ['auto', 'on', 'off'].includes(s.lite) ? s.lite : DEFAULTS.lite,
    wpGrad: Number.isInteger(s.wpGrad) && s.wpGrad >= -1 && s.wpGrad < GLASS_WALLS.length ? s.wpGrad : DEFAULTS.wpGrad,
  };
}
export function setAppearance(patch) {
  const next = { ...getAppearance(), ...patch };
  save(KEY, next);
  applyAppearance();
  listeners.forEach((fn) => fn(next));
  return next;
}

// Диагональные обои для стекла (из motion-kit): два цвета, ровная заливка без «свечений»
export const GLASS_WALLS = [['Пепел', '#2a2f45', '#0a0b10'], ['Песок', '#d9a066', '#4a3322'], ['Шалфей', '#7fb08c', '#16251d'], ['Аврора', '#4f7cff', '#a855f7'], ['Дым', '#6b7280', '#1f2937'],
  ['Прилив', '#0ea5e9', '#1e3a8a'], ['Цветение', '#f472b6', '#7c3aed'], ['Жар', '#fb923c', '#7f1d1d'], ['Роща', '#22c55e', '#064e3b'], ['Сумрак', '#6366f1', '#1e1b4b']];
export const GLASS_ACCENTS = [['Синий', '#3b82f6'], ['Фиолетовый', '#8b5cf6'], ['Розовый', '#ec4899'], ['Оранжевый', '#f97316'], ['Зелёный', '#22c55e'], ['Серый', '#9ca3af']];
export const wallGrad = (i, dark = true) => (GLASS_WALLS[i] ? `linear-gradient(155deg, ${GLASS_WALLS[i][1]}${dark ? '55' : '40'} 0%, ${GLASS_WALLS[i][2]}${dark ? 'aa' : '30'} 100%)` : '');

// Стекло: «как у темы» включает его в «Бенто» и «Монолите»; вручную можно включить в любой теме.
// Заливка обоев своя для тёмной и светлой темы (на светлой она бледнее), поэтому вызывается и при смене светлая/тёмная.
export function applyGlass() {
  const root = document.documentElement;
  const a = getAppearance();
  const theme = root.dataset.theme;
  const mode = a.glass === 'auto' ? (theme === 'mythbento' || theme === 'mythmono' ? 'tinted' : '') : a.glass === 'off' ? '' : a.glass;
  if (mode) { if (root.dataset.glass !== mode) root.dataset.glass = mode; } else if (root.dataset.glass) delete root.dataset.glass;
  const idx = a.wpGrad >= 0 ? a.wpGrad : -1;
  let dk = true;
  try { dk = effectiveColors(theme).dk; } catch (_) { dk = true; }
  const want = mode && idx >= 0 ? wallGrad(idx, dk) : '';
  if (root.style.getPropertyValue('--wp-grad') !== want) { if (want) root.style.setProperty('--wp-grad', want); else root.style.removeProperty('--wp-grad'); }
}

export const reducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
export const motionAllowed = () => getAppearance().effects && !reducedMotion();

// ---- Обои ----
let wpUrl = null;
export async function saveWallpaperFile(file) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Нужна картинка (jpg, png, webp).');
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(bmp.width * k));
  cv.height = Math.max(1, Math.round(bmp.height * k));
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.82));
  if (!blob) throw new Error('Не получилось сжать картинку.');
  await dbSet('files', 'wallpaper', blob);
  setAppearance({ wpOn: true });
  return blob.size;
}
export async function removeWallpaper() {
  await dbDelete('files', 'wallpaper');
  applyAppearance();
}
export async function hasWallpaper() {
  try { return !!(await dbGet('files', 'wallpaper')); } catch (_) { return false; }
}

export async function applyAppearance() {
  const root = document.documentElement;
  const a = getAppearance();
  root.style.setProperty('--wp-dim', `${a.wpDim}%`);
  root.dataset.effects = motionAllowed() ? 'on' : 'off';
  root.dataset.heroPos = a.heroPos;
  applyGlass();
  let blob = null;
  try { blob = a.wpOn ? await dbGet('files', 'wallpaper') : null; } catch (_) { blob = null; }
  if (wpUrl) { URL.revokeObjectURL(wpUrl); wpUrl = null; }
  if (blob) {
    wpUrl = URL.createObjectURL(blob);
    root.style.setProperty('--wp-image', `url("${wpUrl}")`);
    root.dataset.wp = '1';
  } else {
    root.style.removeProperty('--wp-image');
    delete root.dataset.wp;
  }
}

// ---- Заставка ----
function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }

// Заставка темы «Мифы»: видео (звезда загорается, фон темнеет, открывается хаб). Показывается один раз за сеанс, по касанию пропускается.
export function showSplash(name = 'Хаб') {
  if (!getAppearance().splash || reducedMotion()) return Promise.resolve();
  return new Promise((resolve) => {
    const d = document.createElement('div');
    d.className = 'splash';
    d.setAttribute('aria-hidden', 'true');
    const t = document.createElement('div');
    t.className = 'splash__name';
    t.textContent = name;
    const line = document.createElement('div');
    line.className = 'splash__line';
    d.append(t, line);
    document.body.append(d);
    setTimeout(() => d.classList.add('splash--out'), 1150);
    setTimeout(() => { d.remove(); resolve(); }, 1750);
  });
}

// ---- Тихие звуки (синтез, без файлов) ----
let ctx = null;
const TONES = {
  unlock: [[523, 0, 0.12], [784, 0.09, 0.16]],
  add: [[660, 0, 0.09]],
  done: [[587, 0, 0.08], [880, 0.07, 0.12]],
  error: [[220, 0, 0.14]],
  tap: [[440, 0, 0.04]],
};
export function playSound(name) {
  const a = getAppearance();
  if (!a.sounds || a.volume <= 0 || !TONES[name]) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    if (ctx.state === 'suspended') ctx.resume();
    const t0 = ctx.currentTime;
    const gain = 0.12 * (a.volume / 100);
    TONES[name].forEach(([f, at, len]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + at + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len + 0.05);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + at);
      o.stop(t0 + at + len + 0.08);
    });
  } catch (_) { /* звук необязателен */ }
}
