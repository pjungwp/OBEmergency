const CACHE="ob-emergency-assist-v1.1.0";
const CORE=[
  "./","./index.html","./styles.css","./app.js","./data.js","./local-session-store.js","./manifest.webmanifest",
  "./icons/icon.svg","./icons/icon-192.png","./icons/icon-512.png","./icons/apple-touch-icon.png","./icons/ping-avatar.png",
  "./flowcharts/pph.jpg","./flowcharts/htn.jpg","./flowcharts/eclampsia.jpg","./flowcharts/cardiac.jpg"
];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
});

self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim()));
});

self.addEventListener("message",event=>{
  if(event.data?.type==="SKIP_WAITING")self.skipWaiting();
});

async function cacheSuccessful(request,response){
  if(response?.ok&&response.type!=="opaque"){
    const cache=await caches.open(CACHE);
    await cache.put(request,response.clone());
  }
  return response;
}

async function networkFirst(request,fallback){
  try{return await cacheSuccessful(request,await fetch(request));}
  catch(error){
    const cached=await caches.match(request);
    if(cached)return cached;
    if(fallback){const page=await caches.match(fallback);if(page)return page;}
    throw error;
  }
}

async function cacheFirst(request){
  const cached=await caches.match(request);
  if(cached)return cached;
  return cacheSuccessful(request,await fetch(request));
}

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==="navigate"){
    event.respondWith(networkFirst(request,"./index.html"));
    return;
  }

  if(["script","style","worker"].includes(request.destination)){
    event.respondWith(networkFirst(request));
    return;
  }

  if(["image","font"].includes(request.destination)){
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
