// Шифрование: AES-GCM 256 бит. Ключ данных случайный, его открывает PIN (PBKDF2).
// Всё на встроенном WebCrypto, без внешних библиотек.

const enc = new TextEncoder();
const dec = new TextDecoder();

export const PBKDF2_ITER = 200000;

export function bytesToB64(bytes) {
  let s = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i += 0x8000) s += String.fromCharCode(...arr.subarray(i, i + 0x8000));
  return btoa(s);
}

export function b64ToBytes(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i);
  return out;
}

export function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

export async function deriveWrapKey(secret, saltB64, iterations = PBKDF2_ITER) {
  const material = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: b64ToBytes(saltB64), iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function importDataKey(rawBytes) {
  return crypto.subtle.importKey('raw', rawBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptBytes(key, plainBytes) {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plainBytes);
  return { iv: bytesToB64(iv), ct: bytesToB64(new Uint8Array(ct)) };
}

export async function decryptBytes(key, box) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(box.iv) }, key, b64ToBytes(box.ct));
  return new Uint8Array(pt);
}

// Файл данных в репозитории: {"v":1,"iv":"...","ct":"..."}. Внутри JSON модуля.
export async function encryptJSON(key, obj) {
  const box = await encryptBytes(key, enc.encode(JSON.stringify(obj)));
  return JSON.stringify({ v: 1, ...box });
}

export async function decryptJSON(key, text) {
  const env = JSON.parse(text);
  if (!env || env.v !== 1 || !env.iv || !env.ct) throw new Error('bad-envelope');
  return JSON.parse(dec.decode(await decryptBytes(key, env)));
}

export async function encryptString(key, str) {
  return encryptBytes(key, enc.encode(str));
}

export async function decryptString(key, box) {
  return dec.decode(await decryptBytes(key, box));
}

// Код восстановления: 32 байта ключа + 2 байта контрольной суммы, base32, группы по 5 знаков.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32(bytes) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function unbase32(str) {
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of str) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error('bad-char');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

async function checksum(raw) {
  const h = await crypto.subtle.digest('SHA-256', raw);
  return new Uint8Array(h).slice(0, 2);
}

export async function keyToRecoveryCode(raw) {
  const sum = await checksum(raw);
  const all = new Uint8Array(raw.length + 2);
  all.set(raw, 0);
  all.set(sum, raw.length);
  return base32(all).match(/.{1,5}/g).join('-');
}

export async function recoveryCodeToKey(code) {
  const clean = String(code).toUpperCase().replace(/[^A-Z2-7]/g, '');
  let all;
  try {
    all = unbase32(clean);
  } catch (_) {
    throw new Error('bad-code');
  }
  if (all.length < 34) throw new Error('bad-code');
  const raw = all.slice(0, 32);
  const sum = all.slice(32, 34);
  const expect = await checksum(raw);
  if (sum[0] !== expect[0] || sum[1] !== expect[1]) throw new Error('bad-code');
  return raw;
}
