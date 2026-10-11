// Слой данных: локальный кэш, очередь отправки, слияние, синхронизация с репозиторием.
// Любое изменение сначала сохраняется на устройстве (зашифрованным), потом уходит в GitHub.
import { encryptJSON, decryptJSON } from './crypto.js';
import { dbGet, dbSet, dbDelete, dbAll, dbClear } from './db.js';
import { createGithub, GhError } from './github.js';

export const MODULES = ['inbox', 'tasks', 'goals', 'subs', 'projects', 'questions', 'rupor'];
export const TOMBSTONE_TTL = 30 * 24 * 3600 * 1000;
const path = (m) => `data/${m}.json`;

// Одна запись побеждает по updatedAt. При равенстве остаётся первая (из репозитория).
export function mergeItems(a, b, now = Date.now()) {
  const map = new Map();
  [...a, ...b].forEach((it) => {
    const cur = map.get(it.id);
    if (!cur || it.updatedAt > cur.updatedAt) map.set(it.id, it);
  });
  return [...map.values()].filter((it) => !(it.deleted && now - it.updatedAt > TOMBSTONE_TTL));
}

const isStr = (v) => typeof v === 'string';

// Проверка записи при чтении из репозитория: битые записи пропускаем, а не ломаем весь файл.
const VALID = {
  inbox: (it) => isStr(it.text) && isStr(it.type),
  tasks: (it) => isStr(it.title) && typeof it.done === 'boolean',
  goals: (it) => isStr(it.title) && typeof it.progress === 'number',
  projects: (it) => isStr(it.name) && isStr(it.status),
  questions: (it) => isStr(it.text) && isStr(it.status) && isStr(it.who),
  rupor: (it) => isStr(it.postId) && it.status && typeof it.status === 'object',
  subs: (it) => isStr(it.name) && typeof it.price === 'number' && isStr(it.period) && isStr(it.startDate),
};

function validItem(it, m) {
  return (
    it &&
    typeof it.id === 'string' &&
    it.id.length > 0 &&
    typeof it.updatedAt === 'number' &&
    (it.deleted === true || (VALID[m] ? VALID[m](it) : true))
  );
}

export function createStore({ getKey, getAccess, debounceMs = 15000, retryMs = [30000, 120000, 600000], now = () => Date.now() }) {
  const listeners = new Set();
  const mem = {};
  MODULES.forEach((m) => {
    mem[m] = { base: [], sha: null, syncedAt: null, pending: [] };
  });
  let status = { state: 'idle', pending: 0, lastSync: null, error: null };
  let timer = null;
  let retryTimer = null;
  let retryStep = 0;
  let chain = Promise.resolve();
  let apiBase = 'https://api.github.com';
  let fetchImpl;

  const emit = () => listeners.forEach((fn) => fn({ ...status }));
  const setStatus = (patch) => {
    status = { ...status, ...patch, pending: pendingCount() };
    emit();
  };
  const pendingCount = () => MODULES.reduce((n, m) => n + mem[m].pending.length, 0);

  function view(m) {
    return mergeItems(mem[m].base, mem[m].pending.map((p) => p.record), now());
  }

  async function init() {
    MODULES.forEach((m) => {
      mem[m] = { base: [], sha: null, syncedAt: null, pending: [] };
    });
    const key = getKey();
    if (!key) {
      setStatus({ state: 'locked' });
      return;
    }
    for (const m of MODULES) {
      const f = await dbGet('files', m);
      if (f) {
        try {
          mem[m].base = (await decryptJSON(key, f.cipher)).items || [];
          mem[m].sha = f.sha || null;
          mem[m].syncedAt = f.syncedAt || null;
        } catch (_) {
          mem[m].base = [];
        }
      }
    }
    const q = (await dbAll('queue')).sort((x, y) => (x.key < y.key ? -1 : 1));
    for (const { key: opId, value } of q) {
      if (!mem[value.module]) continue;
      try {
        const rec = await decryptJSON(key, value.cipher);
        mem[value.module].pending.push({ opId, record: rec });
      } catch (_) {
        /* запись от другого ключа: пропускаем, не удаляем */
      }
    }
    const lastSync = MODULES.map((m) => mem[m].syncedAt).filter(Boolean).sort((x, y) => x - y).pop() || null;
    setStatus({ state: getAccess() ? 'idle' : 'notoken', lastSync, error: null });
  }

  async function enqueue(m, record) {
    const key = getKey();
    if (!key) throw new Error('locked');
    const opId = `${String(now()).padStart(15, '0')}-${Math.random().toString(36).slice(2, 8)}`;
    await dbSet('queue', opId, { module: m, cipher: await encryptJSON(key, record) });
    mem[m].pending.push({ opId, record });
    setStatus(status.state === 'locked' ? { state: 'idle' } : {});
    scheduleSync();
  }

  function list(m) {
    return view(m)
      .filter((it) => !it.deleted)
      .sort((a, b) => b.created - a.created);
  }

  async function add(m, fields) {
    const t = now();
    const record = { id: crypto.randomUUID(), created: t, updatedAt: t, ...fields };
    await enqueue(m, record);
    return record;
  }

  // Запись с заранее известным id (отметка привычки за день): создаёт или обновляет, в том числе поверх удалённой.
  async function upsert(m, id, fields) {
    const cur = view(m).find((it) => it.id === id);
    const t = now();
    const base = cur && !cur.deleted ? cur : { created: t };
    const record = { ...base, ...fields, id, updatedAt: Math.max(t, cur ? cur.updatedAt + 1 : t) };
    await enqueue(m, record);
    return record;
  }

  async function update(m, id, fields) {
    const cur = view(m).find((it) => it.id === id && !it.deleted);
    if (!cur) return null;
    const record = { ...cur, ...fields, id, updatedAt: Math.max(now(), cur.updatedAt + 1) };
    await enqueue(m, record);
    return record;
  }

  async function remove(m, id) {
    const cur = view(m).find((it) => it.id === id);
    if (!cur) return;
    await enqueue(m, { id, deleted: true, updatedAt: Math.max(now(), cur.updatedAt + 1) });
  }

  function scheduleSync(delay = debounceMs) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      syncNow();
    }, delay);
  }

  function scheduleRetry() {
    clearTimeout(retryTimer);
    const ms = retryMs[Math.min(retryStep, retryMs.length - 1)];
    retryStep += 1;
    retryTimer = setTimeout(() => syncNow(), ms);
  }

  async function syncModule(m, gh) {
    const key = getKey();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const remote = await gh.getFile(path(m));
      let remoteItems = [];
      if (remote) {
        try {
          const parsed = await decryptJSON(key, remote.text);
          remoteItems = Array.isArray(parsed.items) ? parsed.items.filter((it) => validItem(it, m)) : [];
        } catch (_) {
          // Не затираем чужое: если файл не расшифровывается, ничего не пишем.
          throw new GhError('key', 'Файл в репозитории не расшифровывается этим ключом. Введи код восстановления.');
        }
      }
      const snapshot = mem[m].pending.slice();
      const merged = mergeItems(remoteItems, snapshot.map((p) => p.record), now());
      if (snapshot.length === 0) {
        const cipher = remote ? remote.text : await encryptJSON(key, { items: [] });
        mem[m].base = merged;
        mem[m].sha = remote ? remote.sha : null;
        mem[m].syncedAt = now();
        await dbSet('files', m, { cipher, sha: mem[m].sha, syncedAt: mem[m].syncedAt });
        return;
      }
      const cipher = await encryptJSON(key, { items: merged });
      const adds = snapshot.filter((p) => !p.record.deleted).length;
      const dels = snapshot.length - adds;
      try {
        const sha = await gh.putFile(path(m), cipher, remote ? remote.sha : undefined, `hub: ${m} +${adds} -${dels}`);
        mem[m].base = merged;
        mem[m].sha = sha;
        mem[m].syncedAt = now();
        await dbSet('files', m, { cipher, sha, syncedAt: mem[m].syncedAt });
        for (const p of snapshot) await dbDelete('queue', p.opId);
        const sent = new Set(snapshot.map((p) => p.opId));
        mem[m].pending = mem[m].pending.filter((p) => !sent.has(p.opId));
        return;
      } catch (e) {
        if (e instanceof GhError && e.kind === 'conflict' && attempt < 3) continue;
        throw e;
      }
    }
  }

  function syncNow() {
    chain = chain.then(async () => {
      clearTimeout(timer);
      const access = getAccess();
      if (!getKey()) return;
      if (!access) {
        setStatus({ state: 'notoken' });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setStatus({ state: 'offline' });
        return;
      }
      setStatus({ state: 'syncing', error: null });
      const gh = createGithub({ repo: access.repo, token: access.token, apiBase, fetchImpl });
      try {
        for (const m of MODULES) await syncModule(m, gh);
        retryStep = 0;
        clearTimeout(retryTimer);
        const lastSync = MODULES.map((m) => mem[m].syncedAt).filter(Boolean).sort((x, y) => x - y).pop() || null;
        setStatus({ state: 'idle', lastSync, error: null });
        if (pendingCount() > 0) scheduleSync(0);
      } catch (e) {
        const kind = e instanceof GhError ? e.kind : 'server';
        const message = e instanceof GhError ? e.message : 'Ошибка синхронизации';
        if (kind === 'network') {
          setStatus({ state: 'offline', error: { kind, message } });
          scheduleRetry();
        } else if (kind === 'ratelimit' || kind === 'server') {
          setStatus({ state: 'error', error: { kind, message } });
          scheduleRetry();
        } else {
          setStatus({ state: 'error', error: { kind, message } });
        }
      }
    });
    return chain;
  }

  async function exportAll() {
    const modules = {};
    MODULES.forEach((m) => {
      modules[m] = list(m);
    });
    return { app: 'hub', schema: 1, exportedAt: new Date(now()).toISOString(), modules };
  }

  async function importAll(obj) {
    if (!obj || obj.app !== 'hub' || obj.schema !== 1 || typeof obj.modules !== 'object') throw new Error('Это не файл экспорта хаба');
    let count = 0;
    for (const m of MODULES) {
      const items = (obj.modules[m] || []).filter((it) => validItem(it, m) && !it.deleted);
      for (const it of items) {
        const cur = view(m).find((x) => x.id === it.id);
        if (cur && cur.updatedAt >= it.updatedAt) continue;
        await enqueue(m, { ...it });
        count += 1;
      }
    }
    return count;
  }

  async function wipeLocal() {
    clearTimeout(timer);
    clearTimeout(retryTimer);
    await dbClear();
    MODULES.forEach((m) => {
      mem[m] = { base: [], sha: null, syncedAt: null, pending: [] };
    });
    setStatus({ state: 'idle', lastSync: null, error: null });
  }

  return {
    init,
    list,
    add,
    upsert,
    update,
    remove,
    syncNow,
    scheduleSync,
    exportAll,
    importAll,
    wipeLocal,
    getStatus: () => ({ ...status }),
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    configure(opts) {
      if (opts.apiBase) apiBase = opts.apiBase;
      if (opts.fetchImpl) fetchImpl = opts.fetchImpl;
    },
  };
}
