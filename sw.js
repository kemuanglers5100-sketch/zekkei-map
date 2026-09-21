const CACHE = 'zk-v1';
const ASSETS = ['./', 'index.html', 'css/style.css', 'manifest.json', 'icons/icon.svg',
  'data/prefectures.js', 'data/spots.js', 'data/photos.js', 'data/japan-map.js',
  'js/util.js', 'js/store.js', 'js/filter.js', 'js/candidates.js', 'js/map.js', 'js/ui.js', 'js/views.js', 'js/admin.js', 'js/app.js'];

self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
    return res;
  }).catch(() => caches.match(req)));
});
