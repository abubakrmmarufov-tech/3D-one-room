import assert from 'node:assert/strict';
import vm from 'node:vm';
import { lightingAt, hourDelta, formatHour } from '../src/daylight.js';
import { createServiceWorker } from './offline-worker.mjs';

for(let hour=0;hour<24;hour+=.025){
 const light=lightingAt(hour);
 for(const key of ['sun','ambient','environment','daylight','night','exposure'])assert(Number.isFinite(light[key]),`${hour}: ${key}`);
 assert(light.night>=0&&light.night<=1);assert(light.daylight>=0&&light.daylight<=1);
 const next=lightingAt(hour+.025);assert(Math.abs(light.night-next.night)<.04,'No abrupt night-light threshold');
}
assert.equal(lightingAt(0).night,1);assert.equal(lightingAt(12).night,0);
assert(lightingAt(6.5).sunColor.r>lightingAt(6.5).sunColor.b);
assert(lightingAt(18.5).night>lightingAt(12).night);
assert(lightingAt(22).top.equals(lightingAt(-2).top));
assert.equal(hourDelta(23.9,.1).toFixed(1),'0.2');assert.equal(formatHour(24),'00:00');

const scope='https://example.test/3D-one-room/';
const stores=new Map();const key=request=>typeof request==='string'?request:request.url;
const cacheAPI={async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);},async open(name){
 if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name);
 return{async match(request){return data.get(key(request))?.clone();},async put(request,response){data.set(key(request),response.clone());}};
}};
let offline=false,failAsset=false,requests=[];
const network=async request=>{
 const url=key(request);requests.push(url);if(offline)throw new Error('Offline');
 if(failAsset&&url.endsWith('post-123.js'))return new Response('missing',{status:404});
 return new Response(url.endsWith('/')?'viewer shell':url,{status:200});
};
const assets=['./','./assets/app-123.js','./assets/post-123.js','./models/shahrofar.glb?v=stable'];
function worker(version){const handlers={};const self={registration:{scope},location:{origin:new URL(scope).origin},clients:{async claim(){}},addEventListener(name,fn){handlers[name]=fn;}};
 vm.runInNewContext(createServiceWorker(assets,version),{self,caches:cacheAPI,fetch:network,URL,Response,AbortController,setTimeout,clearTimeout});
 return handlers;
}
async function lifecycle(handler){let promise;handler({waitUntil(p){promise=p;}});await promise;}
async function get(handler,url,mode='cors'){let response;handler({request:{url,mode,method:'GET'},respondWith(p){response=p;}});return response;}
const first=worker('one');await lifecycle(first.install);await lifecycle(first.activate);
offline=true;
assert.equal(await(await get(first.fetch,scope,'navigate')).text(),'viewer shell');
for(const asset of assets.slice(1))assert.equal((await get(first.fetch,new URL(asset,scope).href)).status,200);
// An online navigation must not replace this release's shell with a newer shell
// whose hashed scripts have not been installed in this cache yet.
offline=false;requests=[];
assert.equal(await(await get(first.fetch,scope,'navigate')).text(),'viewer shell');
assert.equal(requests.length,0,'Navigation remains on the atomically cached release');
// New release reuses immutable assets and the versioned model without a redownload.
offline=false;requests=[];const second=worker('two');await lifecycle(second.install);
assert.deepEqual(requests,[scope]);assert.equal((await cacheAPI.keys()).length,2);
await lifecycle(second.activate);assert.equal((await cacheAPI.keys()).length,1);
// A partial install is never advertised as a complete offline copy.
stores.clear();failAsset=true;const broken=worker('broken');await assert.rejects(()=>lifecycle(broken.install));
assert.equal((await cacheAPI.keys()).length,0);
console.log('Day cycle: 960 samples, continuous lighting, dawn/dusk, midnight wrap passed.');
console.log('Offline worker: shell + dynamic chunks + model, update reuse, cleanup and failed-install checks passed.');
