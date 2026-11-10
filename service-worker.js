// Cache-first, cập nhật nền. Đổi V mỗi khi phát hành để xóa cache cũ.
const V = 'eternal-pixel-v12';
const CORE = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png',
  'src/main.js', 'src/data.js', 'src/items.js', 'src/ui.js', 'src/save.js', 'src/combat.js', 'src/touch.js', 'src/audio.js', 'src/sprites.js',
  'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
