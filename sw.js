const CACHE = "stats-calc-v23";
const FILES = ["./", "index.html", "manifest.webmanifest", "css/style.css?v=23", "css/grouped.css?v=23", "css/theme.css?v=23", "css/enhance.css?v=23", "css/features.css?v=23",
  "js/script.js?v=23", "js/grouped.js?v=23", "js/bg.js?v=23", "js/numpad.js?v=23", "js/ui.js?v=23", "js/features.js?v=23",
  "assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/apple-touch-icon.png", "assets/icons/favicon.ico"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: false }).then(hit => hit || fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match("index.html"))));
});
