const CACHE_VERSION = "customised-app-v13-women-nutrition";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./icon.svg",
  "./weekly-full-plan.html","./workout-dashboard.html","./nutrition-dashboard.html","./women-fitness.html"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(FILES_TO_CACHE).catch(() => cache.addAll(["./index.html","./app.js"])))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then((fresh) => {
        const copy = fresh.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put("./index.html", copy));
        return fresh;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (req.url.includes("/app.js") || req.url.includes("/index.html") || req.url.includes("/service-worker.js")) {
    event.respondWith(
      fetch(req).then((fresh) => {
        const copy = fresh.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        return fresh;
      }).catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((fresh) => {
      const copy = fresh.clone();
      caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
      return fresh;
    }))
  );
});
