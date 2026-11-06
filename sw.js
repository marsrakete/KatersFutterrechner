importScripts('./version.js');
const CACHE = `katers-futterrechner-${globalThis.APP_VERSION_INFO.cacheVersion}`;
const ASSETS = ['./', './index.html', './styles.css', './app.js', './data.js', './texts.js', './presentation.js', './updates.js', './version.js', './calculation.js', './storage.js', './manifest.webmanifest', './icons/cat.svg', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/katers-futterrechner-og.png', './og-image.jpg'];
const scopedCache = `katers:${new URL(self.registration.scope).pathname}:${CACHE}`;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(scopedCache).then(cache => cache.addAll(ASSETS.map(asset => new Request(new URL(asset, self.registration.scope), { cache: 'reload' })))));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const prefix = new URL(self.registration.scope).pathname;
    // The cache name is scoped below so unrelated apps on this origin stay untouched.
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(`katers:${prefix}:`) && name !== scopedCache).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (url.pathname === new URL('./version.json', self.registration.scope).pathname) {
    event.respondWith(fetch(new Request(event.request, { cache: 'no-store' })));
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(scopedCache);
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    try { return await fetch(event.request); }
    catch (error) {
      if (event.request.mode === 'navigate') return cache.match('./index.html');
      throw error;
    }
  })());
});
