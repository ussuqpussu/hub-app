// PIN-экран. С этапа 2 PIN открывает ключ данных (PBKDF2 + AES-GCM), а не просто сверяется с хэшем.
// Режимы: enter (вход), setup (первый запуск), restore (по коду восстановления), recovery (показ кода).
import { load, save, clearHubKeys } from './storage.js';
import { dbClear } from './data/db.js';
import {
  vaultExists,
  legacyPinExists,
  createVault,
  unlockVault,
  lockVault,
  codeToRaw,
  showCodeForRaw,
  wipeEverything,
  resumeSession,
  markHidden,
  clearHidden,
  getHiddenAt,
} from './data/vault.js';

const KEY_AUTOLOCK = 'hub.autolock';
const KEY_LOCKED_UNTIL = 'hub.lockedUntil';
const LEGACY = 'hub.pin';
const MAX_FAILS = 5;
const PENALTY_MS = 30000;

const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => Uint8Array.from(hex.match(/.{2}/g).map((h) => parseInt(h, 16)));

// Проверка PIN этапа 1 (хэш), нужна один раз для переноса на ключ данных.
async function checkLegacyPin(pin) {
  const p = load(LEGACY);
  if (!p) return false;
  const material = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(p.salt), iterations: p.iter || 150000 },
    material,
    256,
  );
  return toHex(bits) === p.hash;
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

export function createLock(root, { onUnlock, onLock }) {
  const state = { fails: 0, hiddenAt: 0, unlocked: false };
  const $ = (s) => root.querySelector(s);
  const title = $('#lock-title');
  const hint = $('#lock-hint');
  const form = $('#lock-form');
  const input = $('#lock-pin');
  const input2 = $('#lock-pin2');
  const label2 = $('#lock-pin2-label');
  const codeWrap = $('#lock-code-wrap');
  const codeInput = $('#lock-code');
  const err = $('#lock-err');
  const submit = $('#lock-submit');
  const forgot = $('#lock-forgot');
  const restoreLink = $('#lock-restore');
  const recovery = $('#lock-recovery');
  const recoveryCode = $('#lock-recovery-code');
  let mode = 'enter';
  let pendingRaw = null; // ключ из кода восстановления, пока не задан PIN

  // Неверный ввод: коробка встряхивается, подсказка появляется плавно.
  const box0 = root.querySelector('.lock__box');
  new MutationObserver(() => { if (!err.textContent || !box0) return; box0.classList.remove('lock__box--shake'); void box0.offsetWidth; box0.classList.add('lock__box--shake'); }).observe(err, { childList: true, characterData: true, subtree: true });

  const valid = (v) => /^\d{4,6}$/.test(v);

  function show(newMode) {
    mode = newMode;
    err.textContent = '';
    input.value = '';
    input2.value = '';
    codeInput.value = '';
    const isSetup = mode === 'setup' || mode === 'restore';
    form.hidden = mode === 'recovery';
    recovery.hidden = mode !== 'recovery';
    label2.hidden = !isSetup;
    input2.hidden = !isSetup;
    codeWrap.hidden = mode !== 'restore';
    forgot.hidden = isSetup || mode === 'recovery';
    restoreLink.hidden = mode !== 'setup';
    if (mode === 'setup') {
      title.textContent = 'Придумай PIN';
      hint.textContent = 'От 4 до 6 цифр. Он открывает ключ, которым шифруются твои данные на этом устройстве.';
      submit.textContent = 'Сохранить PIN';
    } else if (mode === 'restore') {
      title.textContent = 'Восстановление';
      hint.textContent = 'Введи код восстановления и придумай PIN для этого устройства.';
      submit.textContent = 'Восстановить';
    } else if (mode === 'recovery') {
      title.textContent = 'Код восстановления';
      hint.textContent = 'Сохрани его в надёжном месте. Без него данные на новом устройстве или после сброса не открыть. Позже код можно показать в настройках по PIN.';
    } else {
      title.textContent = 'Введи PIN';
      hint.textContent = '';
      submit.textContent = 'Открыть';
    }
    root.classList.remove('lock--out');
    root.hidden = false;
    root.classList.remove('lock--in'); void root.offsetWidth; root.classList.add('lock--in');
    state.unlocked = false;
    document.getElementById('app').hidden = true;
    if (mode !== 'recovery') (mode === 'restore' ? codeInput : input).focus();
  }

  function finishUnlock() {
    state.unlocked = true;
    state.fails = 0;
    document.getElementById('app').hidden = false;
    root.classList.add('lock--out');
    setTimeout(() => { if (state.unlocked) { root.hidden = true; root.classList.remove('lock--out'); } }, 320);
    onUnlock();
  }

  function doLock() {
    lockVault();
    onLock && onLock();
  }

  async function onSubmit(e) {
    e.preventDefault();
    err.textContent = '';
    const pin = input.value.trim();
    if (!valid(pin)) {
      err.textContent = 'PIN: от 4 до 6 цифр.';
      return;
    }
    if (mode === 'setup' || mode === 'restore') {
      if (input2.value.trim() !== pin) {
        err.textContent = 'PIN не совпал, повтори ещё раз.';
        return;
      }
      try {
        if (mode === 'restore') {
          let raw;
          try {
            raw = await codeToRaw(codeInput.value);
          } catch (_) {
            err.textContent = 'Код не распознан. Проверь, что он введён полностью.';
            return;
          }
          await createVault(pin, raw);
          finishUnlock();
          return;
        }
        pendingRaw = await createVault(pin);
        recoveryCode.textContent = await showCodeForRaw(pendingRaw);
        show('recovery');
        recoveryCode.textContent = await showCodeForRaw(pendingRaw);
      } catch (_) {
        err.textContent = 'Не удалось сохранить PIN: браузеру нужен защищённый адрес (https).';
      }
      return;
    }
    const until = load(KEY_LOCKED_UNTIL, 0);
    if (Date.now() < until) {
      err.textContent = `Слишком много попыток. Подожди ${Math.ceil((until - Date.now()) / 1000)} с.`;
      return;
    }
    let ok = false;
    try {
      if (vaultExists()) {
        await unlockVault(pin);
        ok = true;
      } else if (legacyPinExists() && (await checkLegacyPin(pin))) {
        // Перенос PIN этапа 1: создаём ключ данных и показываем код восстановления.
        pendingRaw = await createVault(pin);
        save(KEY_LOCKED_UNTIL, 0);
        show('recovery');
        recoveryCode.textContent = await showCodeForRaw(pendingRaw);
        return;
      }
    } catch (ex) {
      if (!(ex && ex.message === 'wrong-pin')) {
        err.textContent = 'Не удалось проверить PIN в этом браузере.';
        return;
      }
    }
    if (ok) {
      save(KEY_LOCKED_UNTIL, 0);
      finishUnlock();
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
  restoreLink.addEventListener('click', () => show('restore'));

  $('#lock-recovery-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode.textContent);
      $('#lock-recovery-copy').textContent = 'Скопировано';
    } catch (_) {
      $('#lock-recovery-copy').textContent = 'Выдели код и скопируй вручную';
    }
  });

  $('#lock-recovery-done').addEventListener('click', () => {
    pendingRaw = null;
    recoveryCode.textContent = '';
    finishUnlock();
  });

  forgot.addEventListener('click', () => {
    const box = $('#lock-reset');
    box.hidden = !box.hidden;
  });

  $('#lock-reset-yes').addEventListener('click', async () => {
    wipeEverything();
    clearHubKeys();
    await dbClear();
    $('#lock-reset').hidden = true;
    show('setup');
  });

  $('#lock-reset-no').addEventListener('click', () => {
    $('#lock-reset').hidden = true;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      state.hiddenAt = Date.now();
      if (state.unlocked) markHidden(state.hiddenAt);
      return;
    }
    const min = getAutolock();
    if (state.unlocked && min > 0 && state.hiddenAt && Date.now() - state.hiddenAt > min * 60000) {
      doLock();
      show('enter');
    } else if (state.unlocked) {
      clearHidden();
    }
  });

  return {
    async start() {
      show(vaultExists() || legacyPinExists() ? 'enter' : 'setup');
      if (!vaultExists()) return;
      // Обновление страницы: если вкладку не закрывали и автоблокировка не сработала, PIN не нужен.
      const min = getAutolock();
      const hiddenAt = getHiddenAt();
      const expired = min > 0 && hiddenAt && Date.now() - hiddenAt > min * 60000;
      if (!expired && (await resumeSession())) finishUnlock();
      else if (expired) doLock();
    },
    lockNow() {
      if (vaultExists()) {
        doLock();
        show('enter');
      }
    },
  };
}
