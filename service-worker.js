const CACHE_NAME = 'pwa-olymp-stop-v2';

const FILES_TO_CACHE = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './style.css',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {

  // NÃO cacheia robot.js (sempre pega versão nova)
  if (event.request.url.includes('robot.js')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Estratégia Network First
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});