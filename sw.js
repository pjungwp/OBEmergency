const CACHE="ob-emergency-assist-v0.21.0";
const CORE=["./","./index.html","./styles.css","./app.js","./data.js","./local-session-store.js","./sim-master.html","./sim-master.js","./sim-master.css","./sim-scenarios.js","./sim-engine.js","./sim-sync.js","./sim-monitor.html","./img/aurora-900.webp","./img/aurora-900.jpg","./img/icon-pph.webp","./img/icon-arrest.webp","./img/icon-trauma.webp","./img/icon-shoulder.webp","./img/icon-arrest.png","./img/icon-trauma.png","./img/icon-shoulder.png","./img/avatar.webp","./img/avatar.png","./pathways.js","./flowchart.js","./edu-decks.js","./cockpit-config.js","./task-engine.js","./decisions.js","./clock.js","./back-guard.js","./alerts.js","./medications.js","./history.js","./dystocia.js","./cockpit.js","./img/icon-htn.webp","./img/icon-eclampsia.webp","./img/icon-pph.png","./img/icon-htn.png","./img/icon-eclampsia.png","./manifest.webmanifest","./icons/favicon-48.png","./icons/icon-maskable-512.png","./img/splash.webp","./img/splash-640.webp","./img/splash.jpg","./icons/icon-192.png","./icons/icon-512.png","./icons/apple-touch-icon.png"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// Network first, so a new deploy reaches the phone on the next load;
// fall back to the cached copy when offline.
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match("./index.html"))));
});
