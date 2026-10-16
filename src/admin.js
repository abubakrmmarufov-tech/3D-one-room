import catalog from './model/apartment-catalog.json';
import {STATUSES,REPOSITORY,emptyInventory,recordFor,recordEqual,validateRecord,parseDraft,summary,towerText,priceText,dateText,inventoryCsv,apartmentUrl} from './inventory-core.js';
import {createInventoryReader} from './inventory-reader.js';
import {GitHubInventory} from './inventory-github.js';

const $=s=>document.querySelector(s),byId=new Map(catalog.map(a=>[a.id,a])),api=new GitHubInventory(catalog);
const DRAFT_KEY='shahrofar-inventory-draft-v1',PAGE_SIZE=24;
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const badge=r=>`<span class="status-badge" data-status="${r.status}">${STATUSES[r.status]}</span>`;
let publicData=emptyInventory(),base=emptyInventory(),changes={},login='',page=0,editing=null,busy=false,restored=false;
let publication=null,publicationTimer=null;
let status={source:'loading',checkedAt:null},opener=null,draftPersistent=true;
try{const saved=localStorage.getItem(DRAFT_KEY);if(saved){const d=parseDraft(saved,catalog);base=d.base;changes=d.changes;restored=!!Object.keys(changes).length;}}catch{draftPersistent=false;}
function working(){return {...base,units:{...base.units,...changes}};}
function notice(message,error=false){$('#notice').textContent=message;$('#notice').classList.toggle('error',error);$('#notice').hidden=!message;}
function persist(){
 try{if(Object.keys(changes).length)localStorage.setItem(DRAFT_KEY,JSON.stringify({version:1,base,changes}));else localStorage.removeItem(DRAFT_KEY);draftPersistent=true;}catch{draftPersistent=false;}
}
function sessionUI(){
 $('#session-state').textContent=login?`GitHub · ${login}`:'Просмотр · без подключения';
 $('#connect').hidden=!!login;$('#logout').hidden=!login;
 $('#review').disabled=busy;$('#publish').disabled=busy;
}
function filtered(){
 const inv=working(),q=$('#search').value.trim().toLocaleLowerCase('ru-RU').replace(/^№\s*/,''),tower=$('#filter-tower').value,floor=$('#filter-floor').value,rooms=$('#filter-rooms').value,s=$('#filter-status').value;
 return catalog.filter(a=>(!q||String(a.number)===q||a.id.toLowerCase().includes(q))&&(!tower||a.tower===tower)&&(!floor||a.floor===+floor)&&(!rooms||a.rooms===+rooms)&&(!s||recordFor(inv,a.id).status===s));
}
function render(){
 const inv=working(),counts=summary(catalog,inv),dirty=Object.keys(changes).length,rows=filtered();
 $('#summary').innerHTML=[['total','Всего в модели',catalog.length],['available','Свободна',counts.available],['reserved','Бронь',counts.reserved],['sold','Продана',counts.sold],['unknown','Статус не указан',counts.unknown]].map(([s,label,n])=>`<div class="summary-card" data-status="${s}"><strong>${n}</strong><span>${label}</span></div>`).join('');
 const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));page=Math.min(page,pages-1);
 $('#result-count').textContent=`Найдено ${rows.length} из ${catalog.length}${dirty?' · с черновыми правками':''}`;
 $('#inventory-body').innerHTML=rows.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE).map(a=>{
  const r=recordFor(inv,a.id),edited=Object.hasOwn(changes,a.id);
  return `<tr class="${edited?'dirty':''}"><td><strong>№ ${a.number}</strong>${edited?'<em class="draft-marker">Черновик</em>':''}<small>${towerText(a.tower)} · ${a.id}</small></td><td>${a.floor}</td><td>${a.rooms}-комнатная<small>${new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(a.area)} м² в модели</small></td><td>${badge(r)}</td><td class="${r.price===null?'price-empty':''}">${r.price===null?'Не указана':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(r.price)}</td><td><div class="row-actions"><button class="button" data-edit="${a.id}" aria-label="Изменить: ${towerText(a.tower)}, квартира ${a.number}">Изменить</button><a href="${esc(apartmentUrl(a.id))}" target="_blank" rel="noopener" aria-label="Открыть в 3D: ${towerText(a.tower)}, квартира ${a.number}">3D ↗</a></div></td></tr>`;
 }).join('');
 $('#no-results').hidden=rows.length>0;$('#inventory-table').hidden=rows.length===0;
 $('#page-info').textContent=`Страница ${page+1} из ${pages}`;$('#prev-page').disabled=page===0;$('#next-page').disabled=page>=pages-1;
 $('#draft-bar').hidden=!dirty;$('#draft-count').textContent=`Изменено квартир: ${dirty}`;
 $('#draft-location').textContent=draftPersistent?'Черновик в этом браузере. Посетители его ещё не видят.':'Черновик только в этой вкладке. Хранилище недоступно — скачайте его перед выходом.';
 const prefix=login?'В репозитории':'На сайте';
 $('#data-state').textContent=status.source==='loading'?'Загружаем данные…':status.source==='unavailable'?'Сеть недоступна · статусы не подтверждены':`${prefix}: ${dateText((login?base:publicData).updatedAt)}${status.source==='cached'?' · сохранённая копия, проверьте связь':''}`;
 sessionUI();
}
for(const f of [...new Set(catalog.map(a=>a.floor))].sort((a,b)=>a-b))$('#filter-floor').add(new Option(String(f),String(f)));
$('#filters').onsubmit=e=>e.preventDefault();$('#filters').oninput=()=>{page=0;render();};$('#filters').onchange=()=>{page=0;render();};
$('#clear-filters').onclick=()=>{$('#filters').reset();page=0;render();};
$('#prev-page').onclick=()=>{page--;render();};$('#next-page').onclick=()=>{page++;render();};

function showDialog(selector){opener=document.activeElement;const dialog=$(selector);dialog.showModal();(dialog.querySelector('input:not([type=file]),select')??dialog.querySelector('[data-close]'))?.focus();}
for(const dialog of document.querySelectorAll('dialog')){
 dialog.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>{if(!busy)dialog.close();});
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 dialog.addEventListener('close',()=>{if(dialog.id==='auth-dialog')$('#github-token').value='';opener?.focus({preventScroll:true});});
}
$('#connect').onclick=()=>{$('#auth-error').hidden=true;showDialog('#auth-dialog');};
$('#auth-form').onsubmit=async e=>{
 e.preventDefault();if(busy)return;busy=true;$('#auth-submit').disabled=true;$('#auth-submit').textContent='Подключаем…';$('#auth-error').hidden=true;
 let token=$('#github-token').value;$('#github-token').value='';
 try{
  const snapshot=await api.connect(token);token='';login=snapshot.login;
  if(!Object.keys(changes).length)base=snapshot.data;
  status={source:'live',checkedAt:new Date().toISOString()};$('#auth-dialog').close();notice('GitHub подключён. Публикация доступна при наличии права Contents: Read and write.');
 }catch(error){$('#auth-error').textContent=error.name==='TimeoutError'?'GitHub отвечает слишком долго. Попробуйте снова.':error.message;$('#auth-error').hidden=false;}
 finally{token='';busy=false;$('#auth-submit').disabled=false;$('#auth-submit').textContent='Подключить';render();}
};
$('#logout').onclick=()=>{if(busy)return;api.disconnect();login='';if(!Object.keys(changes).length)base=publicData;notice('Вы вышли. Токен удалён из памяти; неопубликованный черновик остаётся в этом браузере.');render();};
$('#inventory-body').onclick=e=>{
 const b=e.target.closest('[data-edit]');if(!b||busy)return;editing=byId.get(b.dataset.edit);const a=editing,r=recordFor(working(),a.id);
 $('#edit-title').textContent=`Квартира № ${a.number}`;$('#edit-location').textContent=`${towerText(a.tower)} · ЭТАЖ ${a.floor} · ${a.id}`;
 $('#edit-meta').textContent=`${a.rooms}-комнатная · ${new Intl.NumberFormat('ru-RU').format(a.area)} м² в модели`;
 $('#edit-status').value=r.status;$('#edit-price').value=r.price===null?'':String(r.price);$('#edit-price').setCustomValidity('');$('#edit-preview').href=apartmentUrl(a.id);showDialog('#edit-dialog');
};
$('#edit-price').oninput=()=>$('#edit-price').setCustomValidity('');
$('#edit-form').onsubmit=e=>{
 e.preventDefault();if(!editing||busy)return;
 const value=$('#edit-price').value.trim().replace(/\s/g,''),price=value===''?null:Number(value.replace(',','.'));
 try{if(value&&!/^\d+(?:[.,]\d{1,2})?$/.test(value))throw new Error('Укажите цену числом, максимум два знака после запятой.');validateRecord({status:$('#edit-status').value,price});}
 catch(error){$('#edit-price').setCustomValidity(error.message);$('#edit-price').reportValidity();return;}
 const id=editing.id,next={status:$('#edit-status').value,price};
 if(recordEqual(next,recordFor(base,id)))delete changes[id];else changes[id]=next;
 persist();$('#edit-dialog').close();notice('Правка сохранена в черновик. Для общего доступа проверьте и опубликуйте изменения.');render();$(`[data-edit="${id}"]`)?.focus({preventScroll:true});
};
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#export-csv').onclick=()=>download(`shahrofar-${Object.keys(changes).length?'draft-':''}${new Date().toISOString().slice(0,10)}.csv`,inventoryCsv(filtered(),working()),'text/csv;charset=utf-8');
$('#download-draft').onclick=()=>download('shahrofar-draft.json',JSON.stringify({version:1,base,changes},null,2),'application/json');
$('#import-draft').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;
 if(Object.keys(changes).length)return notice('Сначала скачайте или отмените текущие правки, затем восстановите другой черновик.',true);
 try{if(file.size>300000)throw new Error('Черновик слишком большой.');const d=parseDraft(await file.text(),catalog);base=d.base;changes=d.changes;persist();render();notice('Черновик восстановлен. Перед публикацией будут проверены изменения в репозитории.');}catch(error){notice(error.message,true);}
};
$('#discard-draft').onclick=()=>showDialog('#discard-dialog');$('#confirm-discard').onclick=async()=>{changes={};base=publicData;persist();$('#discard-dialog').close();notice('Черновые правки отменены.');render();if(login)await refreshData();};
$('#review').onclick=()=>{
 if(!Object.keys(changes).length)return;
 if(!api.connected){$('#auth-error').hidden=true;showDialog('#auth-dialog');return;}
 $('#review-error').hidden=true;$('#review-changes').innerHTML=Object.entries(changes).map(([id,r])=>{
  const a=byId.get(id),old=recordFor(base,id);return `<div class="review-item"><strong>${towerText(a.tower)} · № ${a.number} · этаж ${a.floor}</strong><p>Было: ${STATUSES[old.status]} · ${esc(priceText(old.price))}</p>${badge(r)}<p>Будет: ${esc(priceText(r.price))}</p></div>`;
 }).join('');showDialog('#review-dialog');
};
$('#publish').onclick=async()=>{
 if(busy||!api.connected)return;busy=true;sessionUI();$('#publish').textContent='Сохраняем…';$('#review-error').hidden=true;
 try{
  const result=await api.publish(base,changes);base=result.data;changes={};persist();publication={updatedAt:result.data.updatedAt,deadline:Date.now()+180000};
  $('#review-dialog').close();notice('Сохранено в GitHub. Ожидаем публикацию на сайте; обычно это занимает 1–3 минуты.');
  clearTimeout(publicationTimer);publicationTimer=setTimeout(checkPublication,4000);
 }catch(error){$('#review-error').textContent=error.name==='TimeoutError'?'Ответ GitHub не получен. Обновите данные, чтобы проверить результат; черновик сохранён.':error.message;$('#review-error').hidden=false;if(!api.connected)login='';}
 finally{busy=false;$('#publish').textContent='Опубликовать';render();}
};
async function checkPublication(){await reader.refresh();if(publication){if(Date.now()>publication.deadline){notice('Данные сохранены в GitHub, но публикация ещё не подтверждена. Проверьте Actions → Deploy to GitHub Pages в репозитории.');publication=null;}else publicationTimer=setTimeout(checkPublication,6000);}}
async function refreshData(){
 if(busy)return;$('#refresh-data').disabled=true;
 try{if(api.connected){const snapshot=await api.read();if(!Object.keys(changes).length)base=snapshot.data;notice(Object.keys(changes).length?'Репозиторий проверен. Ваш черновик сохранён; конфликты будут проверены при публикации.':'Данные репозитория обновлены.');}await reader.refresh();}
 catch(error){notice(error.message,true);if(!api.connected)login='';}finally{$('#refresh-data').disabled=false;render();}
}
$('#refresh-data').onclick=refreshData;
const reader=createInventoryReader({catalog,onUpdate:s=>{
 publicData=s.data;status=s;
 if(!login&&!Object.keys(changes).length)base=publicData;
 if(publication&&s.source==='live'&&s.data.updatedAt===publication.updatedAt){publication=null;clearTimeout(publicationTimer);notice('Опубликовано. Новые статусы и цены уже доступны посетителям сайта.');}
 render();
}});
if(restored)notice('Неопубликованный черновик восстановлен из этого браузера. Проверьте его перед публикацией.');
// Opening only the admin page must never download the 6.5 MB 3D model.
// A viewer-installed worker can still serve this page offline later.
addEventListener('beforeunload',e=>{if(busy||(!draftPersistent&&Object.keys(changes).length)){e.preventDefault();e.returnValue='';}});
