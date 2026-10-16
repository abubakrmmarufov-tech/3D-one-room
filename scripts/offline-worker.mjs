// Build-time generation keeps the worker, page and hashed chunks in one release.
export function createServiceWorker(assets, version) {
  return `const ASSETS=${JSON.stringify(assets)};
const PREFIX='shahrofar-'+new URL(self.registration.scope).pathname.replace(/[^a-z0-9]/gi,'-')+'-';
const CACHE=PREFIX+${JSON.stringify(version)};
const INDEX=new URL('./',self.registration.scope).href;
const absolute=path=>new URL(path,self.registration.scope).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE),oldNames=(await caches.keys()).filter(name=>name.startsWith(PREFIX)&&name!==CACHE);
 try{
  let next=0;
  await Promise.all(Array.from({length:3},async()=>{
   while(next<ASSETS.length){const path=ASSETS[next++],url=absolute(path);let response;
    if(path!=='./')for(const name of oldNames){response=await(await caches.open(name)).match(url);if(response)break;}
    response??=await fetch(url,{cache:path==='./'?'reload':'force-cache'});
    if(!response.ok)throw new Error('Offline asset unavailable');
    await cache.put(url,response);
   }
  }));
 }catch(error){await caches.delete(CACHE);throw error;}
 // A new release waits for old tabs to close; never replace their scripts mid-tour.
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(request.mode==='navigate'){
   // Keep the shell and its hashed chunks from one atomic release together.
   // A newly installed worker supplies the next shell after old tabs close.
   const saved=await cache.match(INDEX);if(saved)return saved;
   return fetch(request,{cache:'no-cache'});
  }
  const saved=await cache.match(request);if(saved)return saved;
  const response=await fetch(request);if(response.ok&&ASSETS.some(path=>absolute(path)===url.href))await cache.put(request,response.clone());return response;
 })());
});
`;
}
