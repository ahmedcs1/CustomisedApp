const CACHE_VERSION = "customised-app-v17-security-clean";
const LOCAL_FILES = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./icon.svg",
  "./weekly-full-plan.html",
  "./workout-dashboard.html",
  "./women-fitness.html",
  "./nutrition-dashboard.html",
  "./calendar-dashboard.html"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(LOCAL_FILES).catch(() => cache.addAll(["./index.html", "./app.js"]))
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Do not cache or interfere with external APIs, WhatsApp, Google Maps, or third-party services.
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req));
    return;
  }

  // Network-first for pages and JS so updates appear quickly.
  if (req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith(".js")) {
    event.respondWith(
      fetch(req)
        .then((fresh) => {
          const copy = fresh.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          return fresh;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // Cache-first for static local assets only.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((fresh) => {
      const copy = fresh.clone();
      caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
      return fresh;
    }))
  );
});
