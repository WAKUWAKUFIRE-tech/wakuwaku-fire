/* App-specific scope and cache: never intercept the homepage or FIRE QUEST. */
// Bump this version whenever a shell asset changes; waiting updates activate after old tabs close.
const CACHE = 'fire-life-clock-shell-20260912-3';
const ROOT = '/life-clock/';
const SHELL = [ROOT, `${ROOT}index.html`, `${ROOT}styles.css`, `${ROOT}app.js`, `${ROOT}calculations.js`, `${ROOT}storage.js`, `${ROOT}manifest.webmanifest`, `${ROOT}icon.svg`, `${ROOT}icon-192.png`, `${ROOT}icon-512.png`, `${ROOT}icon-maskable.png`, `${ROOT}apple-touch-icon.png`];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('fire-life-clock-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(ROOT)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(ROOT)) || fetch(event.request)));
  } else if (SHELL.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.pathname)) || fetch(event.request)));
  }
});
