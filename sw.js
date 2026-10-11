// Service worker: оболочка открывается без сети.
// При изменении любого файла оболочки увеличивай VERSION, чтобы кэш обновился.
const VERSION = 'hub-shell-v41';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/base.css',
  './css/layout.css',
  './js/main.js',
  './js/storage.js',
  './js/theme.js',
  './js/pin.js',
  './js/views.js',
  './js/plus.js',
  './js/ui.js',
  './js/dates.js',
  './js/tasks-view.js',
  './js/schedule-view.js',
  './js/schedule-data.js',
  './js/subs-view.js',
  './js/subs-calc.js',
  './js/subs-parts.js',
  './js/subs-form.js',
  './js/rates.js',
  './js/projects-calc.js',
  './js/projects-view.js',
  './js/rupor-parse.js',
  './js/rupor-import.js',
  './js/weekly-calc.js',
  './js/notes-calc.js',
  './js/notes-view.js',
  './js/knowledge-view.js',
  './js/bot-calc.js',
  './js/bot-sync.js',
  './js/bot-view.js',
  './bot/classify.js',
  './js/search-calc.js',
  './js/search-view.js',
  './js/weekly-view.js',
  './js/rupor-calc.js',
  './js/rupor-view.js',
  './js/projects-parse.js',
  './js/projects-data.js',
  './js/project-page.js',
  './js/questions-calc.js',
  './js/feed-calc.js',
  './js/feed-view.js',
  './js/questions-view.js',
  './js/arch-calc.js',
  './js/arch-view.js',
  './js/schedule-parse.js',
  './js/today-view.js',
  './js/goals-view.js',
  './js/data/crypto.js',
  './js/data/vault.js',
  './js/data/db.js',
  './js/data/github.js',
  './js/data/store.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Сначала сеть (свежая версия), при ошибке кэш. Для страниц — запасной index.html.
  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())),
      ),
  );
});
