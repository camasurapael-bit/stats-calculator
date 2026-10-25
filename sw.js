const CACHE = "stats-calc-v27";
const FILES = ["./", "index.html", "manifest.webmanifest", "css/style.css?v=27", "css/grouped.css?v=27", "css/theme.css?v=27", "css/enhance.css?v=27", "css/features.css?v=27",
  "js/script.js?v=27", "js/grouped.js?v=27", "js/bg.js?v=27", "js/numpad.js?v=27", "js/ui.js?v=27", "js/features.js?v=27",
  "assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/apple-touch-icon.png", "assets/icons/favicon.ico"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: false }).then(hit => hit || fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match("index.html"))));
});
