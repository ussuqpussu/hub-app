// Хранилище секретов на устройстве.
// В localStorage лежит только зашифрованное: ключ данных (под PIN) и токен GitHub (под ключом данных).
// Открытые значения живут в памяти, пока приложение разблокировано.
import { load, save, remove } from '../storage.js';
import {
  PBKDF2_ITER,
  bytesToB64,
  randomBytes,
  deriveWrapKey,
  importDataKey,
  encryptBytes,
  decryptBytes,
  encryptString,
  decryptString,
  keyToRecoveryCode,
  recoveryCodeToKey,
} from './crypto.js';

const KEY = 'hub.vault';
const LEGACY = 'hub.pin';

const session = { raw: null, dataKey: null, token: null, repo: null };

export function vaultExists() {
  const v = load(KEY);
  return !!(v && v.wrappedKey && v.salt);
}

export function legacyPinExists() {
  const p = load(LEGACY);
  return !!(p && p.hash && p.salt);
}

export function isUnlocked() {
  return !!session.dataKey;
}

export function getSession() {
  return session;
}

export function lockVault() {
  session.raw = null;
  session.dataKey = null;
  session.token = null;
  session.repo = null;
}

async function wrapRaw(pin, raw, saltB64, iter) {
  const wrapKey = await deriveWrapKey(pin, saltB64, iter);
  return encryptBytes(wrapKey, raw);
}

async function openSession(raw, vault) {
  session.raw = raw;
  session.dataKey = await importDataKey(raw);
  session.repo = vault.repo || null;
  session.token = null;
  if (vault.token) {
    try {
      session.token = await decryptString(session.dataKey, vault.token);
    } catch (_) {
      session.token = null;
    }
  }
}

// Создаёт хранилище. Если raw не задан, генерирует новый ключ данных.
export async function createVault(pin, raw = null) {
  const key = raw || randomBytes(32);
  const salt = bytesToB64(randomBytes(16));
  const wrappedKey = await wrapRaw(pin, key, salt, PBKDF2_ITER);
  const vault = { v: 1, salt, iter: PBKDF2_ITER, wrappedKey, token: null, repo: null };
  save(KEY, vault);
  remove(LEGACY);
  await openSession(key, vault);
  return key;
}

export async function unlockVault(pin) {
  const vault = load(KEY);
  if (!vault) throw new Error('no-vault');
  const wrapKey = await deriveWrapKey(pin, vault.salt, vault.iter);
  let raw;
  try {
    raw = await decryptBytes(wrapKey, vault.wrappedKey);
  } catch (_) {
    throw new Error('wrong-pin');
  }
  await openSession(raw, vault);
}

export async function verifyPin(pin) {
  try {
    const vault = load(KEY);
    const wrapKey = await deriveWrapKey(pin, vault.salt, vault.iter);
    await decryptBytes(wrapKey, vault.wrappedKey);
    return true;
  } catch (_) {
    return false;
  }
}

export async function changePin(oldPin, newPin) {
  const vault = load(KEY);
  if (!vault || !(await verifyPin(oldPin))) throw new Error('wrong-pin');
  const salt = bytesToB64(randomBytes(16));
  const wrappedKey = await wrapRaw(newPin, session.raw, salt, PBKDF2_ITER);
  save(KEY, { ...vault, salt, iter: PBKDF2_ITER, wrappedKey });
}

export async function getRecoveryCode(pin) {
  if (!(await verifyPin(pin))) throw new Error('wrong-pin');
  return keyToRecoveryCode(session.raw);
}

export async function codeToRaw(code) {
  return recoveryCodeToKey(code);
}

export async function showCodeForRaw(raw) {
  return keyToRecoveryCode(raw);
}

export async function setToken(token, repo) {
  const vault = load(KEY);
  if (!vault || !session.dataKey) throw new Error('locked');
  const wrapped = await encryptString(session.dataKey, token);
  save(KEY, { ...vault, token: wrapped, repo });
  session.token = token;
  session.repo = repo;
}

export function clearToken() {
  const vault = load(KEY);
  if (vault) save(KEY, { ...vault, token: null });
  session.token = null;
}

export function hasStoredToken() {
  const v = load(KEY);
  return !!(v && v.token);
}

export function getRepo() {
  return session.repo;
}

export function wipeEverything() {
  lockVault();
  remove(KEY);
  remove(LEGACY);
}
