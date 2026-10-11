// Безопасная обёртка над localStorage: в приватном окне или при очищенных данных
// доступ может падать, поэтому приложение должно работать и без него.
const memory = new Map();

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw);
  } catch (_) {
    /* хранилище недоступно, берём память */
  }
  return memory.has(key) ? memory.get(key) : fallback;
}

export function save(key, value) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
}

export function remove(key) {
  memory.delete(key);
  try {
    localStorage.removeItem(key);
  } catch (_) {
    /* ничего */
  }
}

export function clearHubKeys() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith('hub.')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch (_) {
    /* ничего */
  }
  memory.clear();
}
