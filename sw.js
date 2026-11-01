/* 9 Sạch: lưu đệm /assets/ (mô hình 3D, ảnh) — lần vào sau hiện gần như ngay. Kiểu stale-while-revalidate: dùng bản đã lưu, tải bản mới ngầm cho lần sau.
   Sửa file trong assets/ thì lần mở kế tiếp vẫn thấy bản cũ, lần sau nữa mới thấy bản mới; muốn ép: đổi số CACHE. */
const CACHE = '9s-assets-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.startsWith('9s-')).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || !/\/assets\//.test(u.pathname) || r.headers.has('range')) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(r);
    const net = fetch(r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
