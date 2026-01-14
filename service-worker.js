const CACHE_NAME = 'stock-control-v1';
const STATIC_ASSETS = ['./', './index.html', './manifest.json', './js/app.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(STATIC_ASSETS.map(asset => cache.add(asset)));
  }));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }).catch(() => {
      return new Response('离线状态 - 请检查您的网络连接');
    })
  );
});