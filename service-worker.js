// Cache-first, cập nhật nền (cũng lưu font Montserrat sau lần tải đầu để chơi offline). Đổi V mỗi lần phát hành.
const V = 'eternal-pixel-v15';
const CORE = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png',
  ...['main', 'data', 'items', 'board', 'hud', 'inv', 'layout', 'save', 'combat', 'touch', 'audio', 'sprites', 'maps', 'themes', 'nav', 'charanim', 'chars'].map(n => `src/${n}.js`),
  ...['board.jpg', 'icons.png', 'plate_big.png', 'plate_small.png', 'hud_icons.png'].map(n => `assets/ui/${n}`),
  ...['mage', 'knight', 'elf', 'rogue'].flatMap(c => [`assets/chars/${c}.png`, `assets/chars/${c}.json`, `assets/chars/${c}_portrait.png`]),
  ...['forest', 'cave', 'volcano', 'ice', 'dark'].flatMap(t => [`assets/${t}.png`, `assets/${t}.json`]),
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
