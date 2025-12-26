const CACHE_NAME = "catalog-pwa-v1";
const OFFLINE_URL = "index.html";

const ASSETS = [
  "./",
  "index.html",
  "style.css",
  "script.js",
  "db.js",
  "manifest.json",
  "icons/icon-72.png",
  "icons/icon-96.png",
  "icons/icon-144.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => {
          if (req.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
        });
    })
  );
});
