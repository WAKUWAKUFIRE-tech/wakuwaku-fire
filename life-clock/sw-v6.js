/* Versioned worker used to move visitors off older cached life-clock shells. */
const CACHE = 'fire-life-clock-shell-20260915-18';
const ROOT = '/life-clock/';
const ASSETS = [`${ROOT}index.html`, `${ROOT}styles.css`, `${ROOT}app.js`, `${ROOT}calculations.js`, `${ROOT}storage.js`, `${ROOT}bucket-data.js`, `${ROOT}life-world.js`, `${ROOT}manifest.webmanifest`, `${ROOT}icon.svg`, `${ROOT}icon-192.png`, `${ROOT}icon-512.png`, `${ROOT}icon-maskable.png`, `${ROOT}apple-touch-icon.png`];

self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('fire-life-clock-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(ROOT)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(`${ROOT}index.html`, copy));
      return response;
    }).catch(() => caches.match(`${ROOT}index.html`)));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(url.pathname, copy));
      return response;
    }).catch(() => caches.match(url.pathname)));
  }
});
