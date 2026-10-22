// Оформление сверх тем: свои обои, живые обои, заставка при входе, тихие звуки.
// Всё хранится на этом устройстве (настройки в localStorage, картинка обоев в IndexedDB) и не синхронизируется.
import { load, save } from './storage.js';
import { dbGet, dbSet, dbDelete } from './data/db.js';

const KEY = 'hub.appearance';
const DEFAULTS = { effects: true, live: 'auto', splash: true, hero: true, heroPos: 'side', sky: true, sounds: false, volume: 30, wpOn: true, wpDim: 40, lite: 'auto', splashStyle: 'auto' };
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
    lite: ['auto', 'on', 'off'].includes(s.lite) ? s.lite : DEFAULTS.lite,
    splashStyle: SPLASHES.some((x) => x[0] === s.splashStyle) ? s.splashStyle : DEFAULTS.splashStyle,
  };
}
export function setAppearance(patch) {
  const next = { ...getAppearance(), ...patch };
  save(KEY, next);
  applyAppearance();
  listeners.forEach((fn) => fn(next));
  return next;
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
// Заставки: выбираются в настройках независимо от темы; «auto» — своя у текущей темы.
export const SPLASHES = [['auto', 'Буква «X» с искрой (по умолчанию)'], ['creation', 'Буквы из шума'], ['myth', 'Руны и искра'], ['mythbento', 'Стеклянная капсула'], ['mythmono', 'Буква «X» с искрой'], ['type', 'Печатная машинка'], ['wave', 'Волна'], ['eclipse', 'Затмение'], ['orbit', 'Орбита']];
export function showSplash(name = 'Хаб', force) {
  if (!force && (!getAppearance().splash || reducedMotion())) return Promise.resolve();
  // У каждой темы своя заставка: Сотворение — буквы из ASCII-шума, Мифы — руны превращаются в имя и вспыхивает искра,
  // Бенто — свечение и капсула, Монолит — «Х» с искрой, как на карточке с руками.
  const pick = force || getAppearance().splashStyle;
  const th = pick && pick !== 'auto' ? pick : 'mythmono';
  return new Promise((resolve) => {
    const d = document.createElement('div');
    d.className = `splash splash--${th}`;
    d.setAttribute('aria-hidden', 'true');
    const spark = document.createElement('div');
    spark.className = 'splash__spark';
    const t = document.createElement('div');
    t.className = 'splash__name';
    const line = document.createElement('div');
    line.className = 'splash__line';
    const sub = document.createElement('div');
    sub.className = 'splash__sub';
    const WD = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
    const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const now = new Date();
    sub.textContent = `${WD[now.getDay()]} · ${now.getDate()} ${MON[now.getMonth()]}`;
    const word = th === 'mythmono' ? 'X' : name;
    d.append(spark, t, line, sub);
    document.body.append(d);
    // буквы проявляются из шума (символы своей темы)
    const pool = th === 'myth' ? 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ' : th === 'creation' ? '@#%&*+=-:.' : '';
    if (pool) {
      const start = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - start) / 650);
        const fixed = Math.floor(k * word.length);
        t.textContent = word.split('').map((c, i) => (i < fixed ? c : pool[Math.floor(Math.random() * pool.length)])).join('');
        if (k < 1) setTimeout(step, 45);
      };
      step();
    } else if (th === 'type') {
      let i = 0;
      const tick = () => { t.textContent = word.slice(0, i); if (i++ < word.length) setTimeout(tick, 140); };
      tick();
    } else if (th === 'wave') {
      word.split('').forEach((c, i) => { const sp = document.createElement('span'); sp.textContent = c; sp.style.setProperty('--d', `${i * 90}ms`); t.append(sp); });
    } else t.textContent = word;
    if (th === 'orbit') for (let i = 0; i < 3; i++) { const o = document.createElement('i'); o.className = 'splash__orb'; o.style.setProperty('--d', `${i * -0.45}s`); d.append(o); }
    setTimeout(() => d.classList.add('splash--out'), 1250);
    setTimeout(() => { d.remove(); resolve(); }, 1850);
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
