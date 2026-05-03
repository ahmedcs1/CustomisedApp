const CACHE_VERSION = "customised-app-v26-final-update-adhkar-fix";
const LOCAL_FILES = ["./","./index.html","./app.js","./manifest.json","./icon.svg","./weekly-full-plan.html","./workout-dashboard.html","./women-fitness.html","./nutrition-dashboard.html","./calendar-dashboard.html","./terms.html"];
self.addEventListener("install", event => { self.skipWaiting(); event.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(LOCAL_FILES).catch(()=>Promise.resolve()))); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch", event => {
  const req = event.request; const url = new URL(req.url);
  if(url.origin !== self.location.origin){ event.respondWith(fetch(req)); return; }
  if(req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css")){
    event.respondWith(fetch(req,{cache:"no-store"}).then(res=>{const copy=res.clone();caches.open(CACHE_VERSION).then(c=>c.put(req,copy));return res;}).catch(()=>caches.match(req).then(cached=>cached||caches.match("./index.html"))));
    return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE_VERSION).then(c=>c.put(req,copy));return res;})));
});
