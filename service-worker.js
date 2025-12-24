const CACHE_NAME = "catalog-cache-v1";
const FILES = [
    "/",
    "/index.html",
    "/css/styles.css",
    "/js/app.js",
    "/js/router.js",
    "/js/storage.js",
    "/js/views.js",
    "/js/sample-data.js",
    "/assets/placeholder.png"
];

self.addEventListener("install", e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
    );
});

self.addEventListener("fetch", e => {
    e.respondWith(
        caches.match(e.request).then(res => res || fetch(e.request))
    );
});
