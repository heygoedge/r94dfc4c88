/* Offline cache: versioned assets are immutable (cache first); the document is network first. */
const VERSION='20261118f',CACHE='heygo-'+VERSION;
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','manifest.json','icon-180.png','icon-512.png']).catch(()=>{})));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
 const req=e.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==location.origin)return;
 const put=res=>{if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return res;};
 if(req.mode==='navigate'){e.respondWith(fetch(req).then(put).catch(()=>caches.match(req).then(r=>r||caches.match('./'))));return;}
 e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(put)));
});
