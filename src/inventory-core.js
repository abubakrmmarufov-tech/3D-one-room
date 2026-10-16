export const STATUSES=Object.freeze({unknown:'Статус не указан',available:'Свободна',reserved:'Бронь',sold:'Продана'});
export const REPOSITORY=Object.freeze({owner:'abubakrmmarufov-tech',repo:'3D-one-room',branch:'main',path:'public/inventory.json'});
export const EMPTY_RECORD=Object.freeze({status:'unknown',price:null});
export const emptyInventory=()=>({version:1,updatedAt:null,units:{}});
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
function keysOnly(value,allowed){if(!plain(value)||Object.keys(value).some(k=>!allowed.includes(k)))throw new Error('В файле есть неподдерживаемые поля.');}
export function validateRecord(value){
 keysOnly(value,['status','price']);
 if(!Object.hasOwn(STATUSES,value.status))throw new Error('Выберите допустимый статус.');
 const p=value.price;
 if(p!==null&&(typeof p!=='number'||!Number.isFinite(p)||p<0||p>1e11||Math.abs(p*100-Math.round(p*100))>.001))throw new Error('Цена: число от 0 до 100 млрд, не более двух знаков после запятой.');
 return {status:value.status,price:p};
}
export function parseInventory(input,catalog){
 if(typeof input==='string'&&input.length>150000)throw new Error('Файл данных слишком большой.');
 const data=typeof input==='string'?JSON.parse(input):input;
 keysOnly(data,['version','updatedAt','units']);
 if(data.version!==1||!(data.updatedAt===null||(typeof data.updatedAt==='string'&&/^\d{4}-\d\d-\d\dT/.test(data.updatedAt)&&Number.isFinite(Date.parse(data.updatedAt)))))throw new Error('Неизвестная версия или дата данных.');
 if(!plain(data.units))throw new Error('Неверный список квартир.');
 const ids=new Set(catalog.map(a=>a.id)),units={};
 for(const [id,record] of Object.entries(data.units)){
  if(!ids.has(id))throw new Error('В файле есть квартира, которой нет в модели.');
  const r=validateRecord(record);if(r.status!=='unknown'||r.price!==null)units[id]=r;
 }
 return {version:1,updatedAt:data.updatedAt,units};
}
export const recordFor=(inventory,id)=>inventory.units[id]??EMPTY_RECORD;
export const recordEqual=(a,b)=>a.status===b.status&&a.price===b.price;
export function mergeChanges(current,base,changes,catalog,updatedAt=new Date().toISOString()){
 const known=new Set(catalog.map(a=>a.id)),units={...current.units};
 for(const [id,value] of Object.entries(changes)){
  if(!known.has(id))throw new Error('Квартира отсутствует в модели.');
  const next=validateRecord(value),now=recordFor(current,id);
  if(!recordEqual(now,recordFor(base,id))&&!recordEqual(now,next)){
   const e=new Error('Эту квартиру уже изменил другой редактор. Сохраните черновик и обновите данные перед повторной правкой.');e.code='CONFLICT';throw e;
  }
  if(next.status==='unknown'&&next.price===null)delete units[id];else units[id]=next;
 }
 return parseInventory({version:1,updatedAt,units},catalog);
}
export function summary(catalog,inventory){
 const counts={unknown:0,available:0,reserved:0,sold:0};
 for(const a of catalog)counts[recordFor(inventory,a.id).status]++;
 return counts;
}
export const towerText=key=>'Блок Б';
export const priceText=price=>price===null?'Цена не указана':`${new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(price)} TJS`;
export const dateText=value=>value?new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'ещё не обновлялись';
export function inventoryCsv(catalog,inventory){
 const cell=x=>`"${String(x??'').replace(/^[=+\-@\t\r]/,"'$&").replaceAll('"','""')}"`;
 const rows=[['ID модели','Блок','№ в модели','Этаж','Комнат','Площадь в модели, м²','Статус','Цена, TJS','Дата данных'],...catalog.map(a=>[a.id,towerText(a.tower),a.number,a.floor,a.rooms,a.area,STATUSES[recordFor(inventory,a.id).status],recordFor(inventory,a.id).price,inventory.updatedAt])];
 return '\uFEFF'+rows.map(row=>row.map(cell).join(';')).join('\r\n');
}
export function parseDraft(input,catalog){
 if(typeof input==='string'&&input.length>300000)throw new Error('Черновик слишком большой.');
 const raw=typeof input==='string'?JSON.parse(input):input;
 keysOnly(raw,['version','base','changes']);
 if(raw.version!==1||!plain(raw.changes))throw new Error('Неверный формат черновика.');
 const base=parseInventory(raw.base,catalog),ids=new Set(catalog.map(a=>a.id)),changes={};
 for(const [id,r] of Object.entries(raw.changes)){if(!ids.has(id))throw new Error('Черновик относится к другой модели.');changes[id]=validateRecord(r);}
 return {version:1,base,changes};
}
export function apartmentUrl(id,base=location.href){const url=new URL('./',base);url.searchParams.set('apt',id);return url.href;}
