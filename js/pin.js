// PIN-экран. Важно: на этапе 1 в приложении нет личных данных, и PIN защищает
// только вход в оболочку на этом устройстве. Защита данных (токен, шифрование)
// появится на этапе 2.
import { load, save, clearHubKeys } from './storage.js';

const KEY_PIN = 'hub.pin';
const KEY_AUTOLOCK = 'hub.autolock';
const KEY_LOCKED_UNTIL = 'hub.lockedUntil';
const ITERATIONS = 150000;
const MAX_FAILS = 5;
const PENALTY_MS = 30000;

const enc = new TextEncoder();

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function derive(pin, saltHex) {
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: ITERATIONS },
    keyMaterial,
    256,
  );
  return toHex(bits);
}

export function hasPin() {
  const p = load(KEY_PIN);
  return !!(p && p.hash && p.salt);
}

export async function setPin(pin) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await derive(pin, salt);
  save(KEY_PIN, { salt, hash, iter: ITERATIONS });
}

export async function checkPin(pin) {
  const p = load(KEY_PIN);
  if (!p) return false;
  const hash = await derive(pin, p.salt);
  return hash === p.hash;
}

export function resetAll() {
  clearHubKeys();
}

export const AUTOLOCK_OPTIONS = [
  { min: 1, label: '1 минута' },
  { min: 5, label: '5 минут' },
  { min: 15, label: '15 минут' },
  { min: 0, label: 'Не блокировать' },
];

export function getAutolock() {
  const v = load(KEY_AUTOLOCK, 5);
  return AUTOLOCK_OPTIONS.some((o) => o.min === v) ? v : 5;
}

export function setAutolock(min) {
  save(KEY_AUTOLOCK, min);
}

// Экран блокировки. Возвращает объект с методами lock() и onUnlock.
export function createLock(root, { onUnlock }) {
  const state = { fails: 0, hiddenAt: 0, unlocked: false };
  const $ = (s) => root.querySelector(s);
  const title = $('#lock-title');
  const hint = $('#lock-hint');
  const form = $('#lock-form');
  const input = $('#lock-pin');
  const input2 = $('#lock-pin2');
  const label2 = $('#lock-pin2-label');
  const err = $('#lock-err');
  const submit = $('#lock-submit');
  const forgot = $('#lock-forgot');
  let mode = 'enter';
  let firstPin = '';

  const valid = (v) => /^\d{4,6}$/.test(v);

  function show(newMode) {
    mode = newMode;
    err.textContent = '';
    input.value = '';
    input2.value = '';
    label2.hidden = true;
    input2.hidden = true;
    forgot.hidden = mode === 'setup';
    if (mode === 'setup') {
      title.textContent = 'Придумай PIN';
      hint.textContent = 'От 4 до 6 цифр. Он защищает вход в приложение на этом устройстве.';
      label2.hidden = false;
      input2.hidden = false;
      submit.textContent = 'Сохранить PIN';
    } else {
      title.textContent = 'Введи PIN';
      hint.textContent = '';
      submit.textContent = 'Открыть';
    }
    root.hidden = false;
    state.unlocked = false;
    document.getElementById('app').hidden = true;
    input.focus();
  }

  function unlock() {
    state.unlocked = true;
    state.fails = 0;
    root.hidden = true;
    document.getElementById('app').hidden = false;
    onUnlock();
  }

  async function onSubmit(e) {
    e.preventDefault();
    err.textContent = '';
    const pin = input.value.trim();
    if (!valid(pin)) {
      err.textContent = 'PIN: от 4 до 6 цифр.';
      return;
    }
    if (mode === 'setup') {
      if (input2.value.trim() !== pin) {
        err.textContent = 'PIN не совпал, повтори ещё раз.';
        return;
      }
      try {
        await setPin(pin);
      } catch (_) {
        err.textContent = 'Не удалось сохранить PIN: браузер не даёт нужную защиту. Открой приложение по https.';
        return;
      }
      unlock();
      return;
    }
    const until = load(KEY_LOCKED_UNTIL, 0);
    if (Date.now() < until) {
      err.textContent = `Слишком много попыток. Подожди ${Math.ceil((until - Date.now()) / 1000)} с.`;
      return;
    }
    let ok = false;
    try {
      ok = await checkPin(pin);
    } catch (_) {
      err.textContent = 'Не удалось проверить PIN в этом браузере.';
      return;
    }
    if (ok) {
      save(KEY_LOCKED_UNTIL, 0);
      unlock();
      return;
    }
    state.fails += 1;
    input.value = '';
    if (state.fails >= MAX_FAILS) {
      save(KEY_LOCKED_UNTIL, Date.now() + PENALTY_MS);
      state.fails = 0;
      err.textContent = 'Слишком много попыток. Подожди 30 секунд.';
    } else {
      err.textContent = `Неверный PIN. Осталось попыток: ${MAX_FAILS - state.fails}.`;
    }
    input.focus();
  }

  form.addEventListener('submit', onSubmit);

  forgot.addEventListener('click', () => {
    const box = $('#lock-reset');
    box.hidden = !box.hidden;
  });

  $('#lock-reset-yes').addEventListener('click', () => {
    resetAll();
    $('#lock-reset').hidden = true;
    show('setup');
  });

  $('#lock-reset-no').addEventListener('click', () => {
    $('#lock-reset').hidden = true;
  });

  // Автоблокировка при сворачивании.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      state.hiddenAt = Date.now();
      return;
    }
    const min = getAutolock();
    if (state.unlocked && min > 0 && state.hiddenAt && Date.now() - state.hiddenAt > min * 60000) {
      show('enter');
    }
  });

  return {
    start() {
      show(hasPin() ? 'enter' : 'setup');
    },
    lockNow() {
      if (hasPin()) show('enter');
    },
  };
}
