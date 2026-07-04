const CACHE='bhm-ecosystem-v1-6a';
const ASSETS=['/','/index.html','/customer.html','/styles.css','/script.js','/manifest.webmanifest','/assets/icon-192.png','/assets/icon-512.png','/assets/icon-180.png','/assets/bear-head-header.png','/assets/bear-head-hero.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()).catch(()=>{}));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.pathname==='/app' || url.pathname==='/app/' || url.pathname==='/app.html' || url.pathname==='/service-worker.js'){
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match('/app.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
    return response;
  }).catch(()=>caches.match('/customer.html'))));
});
