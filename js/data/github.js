// Чтение и запись файлов приватного репозитория через GitHub API (Contents).
// Токен ограничен одним репозиторием. Базовый адрес можно заменить только для тестов.
import { bytesToB64, b64ToBytes } from './crypto.js';

export class GhError extends Error {
  constructor(kind, message, status = 0) {
    super(message);
    this.kind = kind; // network | auth | notfound | conflict | ratelimit | server
    this.status = status;
  }
}

const enc = new TextEncoder();
const dec = new TextDecoder();

export function createGithub({ repo, token, apiBase = 'https://api.github.com', fetchImpl = (...a) => fetch(...a) }) {
  const headers = () => ({
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  });

  const url = (path) => `${apiBase}/repos/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;

  async function call(u, init) {
    let res;
    try {
      res = await fetchImpl(u, { ...init, headers: { ...headers(), ...(init && init.headers) }, cache: 'no-store' });
    } catch (_) {
      throw new GhError('network', 'Нет связи с GitHub');
    }
    if (res.ok) return res;
    if (res.status === 401) throw new GhError('auth', 'Токен не принят', 401);
    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      if (res.status === 429 || remaining === '0') throw new GhError('ratelimit', 'Лимит запросов GitHub', res.status);
      throw new GhError('auth', 'Нет доступа к репозиторию', 403);
    }
    if (res.status === 404) throw new GhError('notfound', 'Не найдено', 404);
    if (res.status === 409 || res.status === 422) throw new GhError('conflict', 'Файл изменился', res.status);
    throw new GhError('server', `Ошибка GitHub ${res.status}`, res.status);
  }

  return {
    // Возвращает {sha, text} или null, если файла ещё нет.
    async getFile(path) {
      try {
        const res = await call(url(path));
        const body = await res.json();
        const text = dec.decode(b64ToBytes(String(body.content || '').replace(/\n/g, '')));
        return { sha: body.sha, text };
      } catch (e) {
        if (e instanceof GhError && e.kind === 'notfound') return null;
        throw e;
      }
    },

    async putFile(path, text, sha, message) {
      const body = { message, content: bytesToB64(enc.encode(text)) };
      if (sha) body.sha = sha;
      const res = await call(url(path), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const out = await res.json();
      return out.content.sha;
    },

    // Проверка токена и доступа к репозиторию.
    async checkAccess() {
      const res = await call(`${apiBase}/repos/${repo}`);
      const body = await res.json();
      return { private: !!body.private };
    },
  };
}
