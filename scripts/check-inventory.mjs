import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {currentCatalog} from './build-catalog.mjs';
import {emptyInventory,parseInventory,validateRecord,recordFor,mergeChanges,summary,parseDraft,inventoryCsv,apartmentUrl} from '../src/inventory-core.js';
import {GitHubInventory} from '../src/inventory-github.js';
import {createInventoryReader} from '../src/inventory-reader.js';
const catalog=JSON.parse(readFileSync('src/model/apartment-catalog.json'));
const [a,b]=catalog;
const available={status:'available',price:1250000.5},reserved={status:'reserved',price:null},sold={status:'sold',price:1100000};
const fixture=units=>({version:1,updatedAt:'2026-10-16T12:00:00.000Z',units});
test('catalog exactly follows both residential blocks and all model identifiers',()=>{
 assert.deepEqual(catalog,currentCatalog());assert.equal(catalog.length,288);assert.equal(new Set(catalog.map(a=>a.id)).size,288);assert.deepEqual([...new Set(catalog.map(a=>a.tower))],['V','B']);
 assert.equal(summary(catalog,emptyInventory()).unknown,288);
 assert.equal(apartmentUrl('V12-0','https://example.test/3D-one-room/admin.html'),'https://example.test/3D-one-room/?apt=V12-0');
});
test('the repository inventory is valid before Pages publishes it',()=>{
 const inventory=parseInventory(readFileSync('public/inventory.json','utf8'),catalog);
 assert.equal(Object.values(summary(catalog,inventory)).reduce((sum,n)=>sum+n,0),catalog.length);
});
test('strict public schema rejects fake apartments, private fields, invalid values and oversize files',()=>{
 assert.deepEqual(parseInventory(fixture({[a.id]:available}),catalog).units[a.id],available);
 for(const record of [{status:'deleted',price:null},{status:'sold',price:-1},{status:'sold',price:Infinity},{status:'available',price:1.001},{status:'available',price:1e12},{status:'available',price:'123'},{status:'sold',price:null,buyer:'private'},{status:'unknown'}])assert.throws(()=>validateRecord(record));
 assert.throws(()=>parseInventory(fixture({A1:available}),catalog));
 assert.throws(()=>parseInventory({...emptyInventory(),unexpected:'rejected'},catalog));
 assert.throws(()=>parseInventory(' '.repeat(150001),catalog));
 assert.throws(()=>parseInventory({...emptyInventory(),updatedAt:'invalid'},catalog));
 assert.throws(()=>parseInventory({...emptyInventory(),units:[]},catalog));
 assert.equal(Object.keys(parseInventory(fixture({[a.id]:{status:'unknown',price:null}}),catalog).units).length,0);
});
test('optimistic merge preserves unrelated editors, permits idempotency and rejects conflicts',()=>{
 const base=emptyInventory(),current=fixture({[b.id]:reserved}),changes={[a.id]:available};
 const merged=mergeChanges(current,base,changes,catalog);assert.deepEqual(merged.units,{[a.id]:available,[b.id]:reserved});
 assert.throws(()=>mergeChanges(fixture({[a.id]:sold}),base,changes,catalog),e=>e.code==='CONFLICT');
 assert.deepEqual(mergeChanges(fixture(changes),base,changes,catalog).units,changes);
 assert.equal(recordFor(mergeChanges(fixture(changes),fixture(changes),{[a.id]:{status:'unknown',price:null}},catalog),a.id).status,'unknown');
});
test('drafts preserve clearing edits and reject unexpected fields or foreign unit data',()=>{
 const data={version:1,base:fixture({[a.id]:available}),changes:{[a.id]:{status:'unknown',price:null}}};
 assert.deepEqual(parseDraft(JSON.stringify(data),catalog),data);
 assert.throws(()=>parseDraft({...data,unexpected:'rejected'},catalog));
 assert.throws(()=>parseDraft({...data,changes:{A1:reserved}},catalog));
 assert.throws(()=>parseDraft(' '.repeat(300001),catalog));
});
test('CSV labels drafts externally and quotes cells, escaping spreadsheet formulas',()=>{
 const csv=inventoryCsv([{...a,id:'=cmd',tower:'V'}],fixture({}));assert(csv.startsWith('\uFEFF'));assert(csv.includes('"\'=cmd"'));assert(csv.includes('Статус не указан'));assert(csv.includes('Цена, TJS'));
 assert(!csv.includes('undefined'));
});
function fakeGithub({fail=0,race=false}={}){
 let data=emptyInventory(),sha='original',writes=0,calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,method:options.method});
  assert.equal(options.headers.Authorization,'Bearer test-only-token');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');
  if(fail)return Response.json({message:'Never surface raw API error or secrets'},{status:fail});
  if(url.endsWith('/user'))return Response.json({login:'test-owner'});
  if(options.method==='PUT'){
   writes++;const body=JSON.parse(options.body);assert.equal(body.sha,sha);assert.equal(body.branch,'main');
   if(race)return Response.json({}, {status:409});
   data=JSON.parse(Buffer.from(body.content,'base64').toString('utf8'));sha='next';
   return Response.json({content:{sha},commit:{sha:'commit',html_url:'https://github.com/example/commit'}});
  }
  return Response.json({type:'file',encoding:'base64',size:100,sha,content:Buffer.from(JSON.stringify(data)).toString('base64')});
 };
 return {fetchImpl,get data(){return data;},set data(value){data=value;sha='changed';},get writes(){return writes;},calls};
}
test('GitHub login, serial fresh read, SHA write, encoded content and logout',async()=>{
 const fake=fakeGithub(),api=new GitHubInventory(catalog,{fetchImpl:fake.fetchImpl});
 await assert.rejects(api.read(),/подключите/i);
 const original=await api.connect('test-only-token');assert.equal(original.login,'test-owner');assert(api.connected);
 fake.data=fixture({[b.id]:reserved});const result=await api.publish(original.data,{[a.id]:available});
 assert.equal(result.commit,'commit');assert.deepEqual(fake.data.units,{[a.id]:available,[b.id]:reserved});assert.equal(fake.writes,1);
 assert(!JSON.stringify(api).includes('test-only-token'));assert(fake.calls.every(c=>c.url.startsWith('https://api.github.com/')));
 api.disconnect();assert(!api.connected);await assert.rejects(api.read());
});
test('default browser transport preserves the global fetch receiver',async()=>{
 const original=globalThis.fetch,fake=fakeGithub();
 try{
  globalThis.fetch=function(...args){assert.equal(this,globalThis);return fake.fetchImpl(...args);};
  const api=new GitHubInventory(catalog);assert.equal((await api.connect('test-only-token')).login,'test-owner');api.disconnect();
 }finally{globalThis.fetch=original;}
});
test('permission errors fail closed without exposing raw errors or keeping rejected tokens',async()=>{
 for(const code of [401,403,404,422,500]){
  const api=new GitHubInventory(catalog,{fetchImpl:fakeGithub({fail:code}).fetchImpl});
  await assert.rejects(api.connect('test-only-token'),e=>!e.message.includes('secrets')&&e.code===code);assert(!api.connected);
 }
});
test('same-unit edit and intervening SHA race cannot overwrite another editor',async()=>{
 const fake=fakeGithub(),api=new GitHubInventory(catalog,{fetchImpl:fake.fetchImpl});const snapshot=await api.connect('test-only-token');
 fake.data=fixture({[a.id]:sold});await assert.rejects(api.publish(snapshot.data,{[a.id]:available}),e=>e.code==='CONFLICT');assert.equal(fake.writes,0);
 const raced=fakeGithub({race:true}),second=new GitHubInventory(catalog,{fetchImpl:raced.fetchImpl});const next=await second.connect('test-only-token');
 await assert.rejects(second.publish(next.data,{[a.id]:available}),e=>e.code==='CONFLICT');assert.equal(raced.data.units[a.id],undefined);
});
test('network uncertainty preserves the draft and does not echo transport credentials',async()=>{
 const api=new GitHubInventory(catalog,{fetchImpl:async()=>{throw new Error('secret transport detail');}});
 await assert.rejects(api.connect('test-only-token'),e=>e.code==='NETWORK'&&!e.message.includes('secret'));assert(!api.connected);
});
test('reader validates network data, caches only public data, labels stale fallback and survives storage denial',async()=>{
 const doc=new EventTarget();doc.baseURI='https://example.test/3D-one-room/';doc.hidden=false;globalThis.document=doc;
 globalThis.addEventListener=()=>{};globalThis.removeEventListener=()=>{};
 const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};let updates=[],offline=false,invalid=false;
 const fetchImpl=async(_url,options)=>{assert.equal(options.cache,'no-store');if(offline)throw new Error('Offline');return Response.json(invalid?{version:999}:fixture({[a.id]:sold}));};
 let reader=createInventoryReader({catalog,fetchImpl,storage,onUpdate:s=>updates.push(s)});
 await new Promise(r=>setTimeout(r,10));assert.equal(updates.at(-1).source,'live');assert.equal(updates.at(-1).data.units[a.id].status,'sold');
 assert(![...memory.values()].join('').includes('token'));
 offline=true;await reader.refresh();assert.equal(updates.at(-1).source,'cached');reader.dispose();
 updates=[];reader=createInventoryReader({catalog,fetchImpl,storage,onUpdate:s=>updates.push(s)});assert.equal(updates[0].source,'cached');await new Promise(r=>setTimeout(r,5));reader.dispose();
 updates=[];offline=false;invalid=true;reader=createInventoryReader({catalog,fetchImpl,storage:{getItem(){throw Error();},setItem(){throw Error();}},onUpdate:s=>updates.push(s)});await new Promise(r=>setTimeout(r,5));assert.equal(updates.at(-1).source,'unavailable');assert.equal(summary(catalog,updates.at(-1).data).unknown,288);reader.dispose();
});
test('admin bundle source does not persist tokens or load the renderer',()=>{
 const source=readFileSync('src/admin.js','utf8');assert(!source.includes("from 'three'"));assert(!source.includes('serviceWorker.register'));
 for(const s of source.matchAll(/localStorage\.setItem\([^\n]+/g))assert(!/token|login|session/i.test(s[0]));
});
