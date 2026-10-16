import {emptyInventory,parseInventory} from './inventory-core.js';
const CACHE_KEY='shahrofar-public-inventory-v1';
export function createInventoryReader({catalog,onUpdate,fetchImpl=fetch,storage,url=new URL('inventory.json',document.baseURI).href}){
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{}
 let data=emptyInventory(),checkedAt=null,source='loading',busy=false,disposed=false;
 try{const saved=JSON.parse(storage?.getItem(CACHE_KEY)??'null');if(saved&&Number.isFinite(Date.parse(saved.checkedAt))){data=parseInventory(saved.data,catalog);checkedAt=saved.checkedAt;source='cached';}}catch{}
 const emit=()=>{if(!disposed)onUpdate({data,checkedAt,source});};
 async function refresh(){
  if(busy||disposed)return;busy=true;
  try{
   const response=await fetchImpl(url,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(6000)});
   if(!response.ok)throw new Error('Unavailable');
   data=parseInventory(await response.text(),catalog);checkedAt=new Date().toISOString();source='live';
   try{storage?.setItem(CACHE_KEY,JSON.stringify({data,checkedAt}));}catch{}
  }catch{source=checkedAt?'cached':'unavailable';}finally{busy=false;emit();}
 }
 const onVisible=()=>{if(!document.hidden)refresh();};
 emit();refresh();
 const timer=setInterval(onVisible,60000);
 addEventListener('online',onVisible);addEventListener('focus',onVisible);document.addEventListener('visibilitychange',onVisible);
 return {refresh,dispose(){disposed=true;clearInterval(timer);removeEventListener('online',onVisible);removeEventListener('focus',onVisible);document.removeEventListener('visibilitychange',onVisible);}};
}
