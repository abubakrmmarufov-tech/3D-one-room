import * as THREE from 'three';
import {createTimeControls} from './time-controls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RESIDENTIAL, toScene, towerByKey } from './config.js';
import { apartments, aptsOnFloor } from './data.js';
import { buildWorld } from './world.js';
import { loadComplex } from './building.js';
import { buildFloor } from './floor.js';
import { prepareInteriorMaterials, enhanceInteriorMaterials, lightInteriorMaterials } from './interior-materials.js';
import { WalkControls } from './walk.js';
import { drawPlan, planTransform } from './plan.js';
import {planFigure, planRoomEntries} from './plan-labels.js';
import {floorPreview} from './floor-preview.js';
import { areaText, roomName, roomCount, roomTotal } from './locale.js';
import {STATUSES,emptyInventory,recordFor,priceText,dateText,apartmentUrl} from './inventory-core.js';
import {createInventoryReader} from './inventory-reader.js';
import {createSelectionControls} from './selection-controls.js';
import {interiorNearPlane} from './camera-clearance.js';
import {pickApartment} from './apartment-picking.js';
const $=s=>document.querySelector(s),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
$('#stage').appendChild(renderer.domElement);const canvas=renderer.domElement;
const exteriorFov=()=>THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(38)/2)*Math.max(1,innerHeight/innerWidth)));
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(exteriorFov(),innerWidth/innerHeight,.15,1800);
const HOME={pos:new THREE.Vector3(-35,98,135),target:new THREE.Vector3(20,30,-12)};
camera.position.copy(HOME.pos);
const controls=new OrbitControls(camera,canvas);controls.target.copy(HOME.target);
Object.assign(controls,{enableDamping:true,dampingFactor:.07,minDistance:12,maxDistance:420,maxPolarAngle:Math.PI*.48,autoRotate:false,rotateSpeed:.65,zoomSpeed:.7});
const world=buildWorld(scene),pmrem=new THREE.PMREMGenerator(renderer);
const env=new THREE.Scene();env.add(world.sky.clone());
const ground=new THREE.Mesh(new THREE.CircleGeometry(1200,24).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x77786c}));ground.position.y=-40;env.add(ground);
const environment=pmrem.fromScene(env,.04);scene.environment=environment.texture;pmrem.dispose();
const walk=new WalkControls(camera,canvas);
let post=null;
let building=null,ready=false,transitioning=false,warming=false,tween=null,dollhouse=null,walkInterior=null,labels=[],miniBg=null,miniT=null;
const state={mode:'overview',tower:null,floor:null,listTower:RESIDENTIAL[0].key,apt:null,hoverApt:null,previewFloor:null,rooms:0,availability:''};
const selection=createSelectionControls(()=>state,()=>{state.hoverApt=null;state.previewFloor=null;updateOverlays();},()=>{if(state.apt&&state.mode==='floor')drawPlan($('#side .plan'),state.apt);},()=>{time.close();setRoomsOpen(false);});
let inventory=emptyInventory(),inventorySource='loading',inventoryChecked=null;
const unitBadge=a=>{const r=recordFor(inventory,a.id);return `<span class="status-badge" data-status="${r.status}">${STATUSES[r.status]}</span>`;};
const inventoryNote=()=>inventorySource==='live'?`Данные: ${inventory.updatedAt?dateText(inventory.updatedAt):'статусы ещё не заполнены'}`:inventorySource==='cached'?`Сохранённая копия · ${dateText(inventoryChecked)}. Статус мог измениться.`:inventorySource==='loading'?'Проверяем статусы квартир…':'Статусы недоступны. Проверьте соединение.';
const visited=new Set();let lastRoom=-1,lastTour=false;
prepareInteriorMaterials();
let lighting;
const time=createTimeControls(hour=>{lighting=world.setTime(hour);renderer.toneMappingExposure=lighting.exposure;lightInteriorMaterials(lighting.night);building?.setLighting(lighting.night);walkInterior?.setLighting(lighting.night);},()=>{selection.close();setRoomsOpen(false);});
time.update(0);
let adaptiveScale=1,slowFrames=0,performanceTimer=0;
let quality='balanced';try{quality=localStorage.getItem('shahrofar-quality')??'balanced';}catch{}
if(!['high','balanced'].includes(quality))quality='balanced';$('#quality').value=quality;
function resize(){
 for(const label of labels)label.size=null;
 const pixelBudget=quality==='high'?3000000:1500000;
 renderer.setPixelRatio(Math.max(.65,Math.min(devicePixelRatio||1,quality==='high'?1.75:1.25,Math.sqrt(pixelBudget/(innerWidth*innerHeight)))*adaptiveScale));renderer.setSize(innerWidth,innerHeight);
 camera.aspect=innerWidth/innerHeight;camera.fov=state.mode==='walk'?65:exteriorFov();if(state.mode==='walk')camera.near=interiorNearPlane(camera.fov,camera.aspect,walkInterior.nav.radius);camera.updateProjectionMatrix();post?.resize();
 if(state.mode==='walk'&&walkInterior)prepareMinimap(walkInterior.apt);
 if(state.apt&&state.mode==='floor')drawPlan($('#side .plan'),state.apt);
}
function setQuality(value){quality=value;adaptiveScale=1;try{localStorage.setItem('shahrofar-quality',value);}catch{}world.sun.shadow.mapSize.setScalar(quality==='high'?2048:1024);world.sun.shadow.map?.dispose();world.sun.shadow.map=null;world.invalidateShadow();resize();}
$('#quality').onchange=e=>{setQuality(e.target.value);syncPost();};
let postRequest=0;
async function syncPost(){const request=++postRequest;post?.dispose();post=null;if(state.mode!=='walk'||quality!=='high')return;try{const{createInteriorPost}=await import('./post.js');if(request===postRequest&&state.mode==='walk'&&quality==='high')post=createInteriorPost(renderer,scene,camera);}catch{toast('Детальные эффекты пока недоступны. Основной просмотр работает.');}}
setQuality(quality);addEventListener('resize',resize);
const loading=$('#loading');
loadComplex(apartments,k=>loading.querySelector('b').textContent=`${Math.min(99,Math.max(0,Math.round(k*100)))}%`).then(async b=>{building=b;scene.add(b.group);building.setLighting(lighting.night);world.invalidateShadow();loading.querySelector('span').textContent='Подготавливаем 3D-просмотр…';warming=true;try{await renderer.compileAsync(scene,camera);}finally{warming=false;}ready=true;loading.hidden=true;document.body.dataset.ready='true';performance.mark('scene-ready');refresh();const linked=apartments.find(a=>a.id===new URLSearchParams(location.search).get('apt'));if(linked){selectApt(linked);const linkedRoom=new URLSearchParams(location.search).get('room');if(linked.id==='B12-0'&&['living','bedroom'].includes(linkedRoom))enterWalk(linked,linkedRoom);}if(import.meta.env.PROD&&'serviceWorker'in navigator)navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(()=>{});}).catch(err=>{console.error(err);loading.innerHTML='<span>Не удалось загрузить модель. Проверьте соединение.</span><button class="btn" id="retry">Повторить</button>';$('#retry').onclick=()=>location.reload();});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;walk.resetInput();loading.hidden=false;loading.innerHTML='<span>3D-просмотр приостановлен.</span><button class="btn" id="retry">Открыть заново</button>';$('#retry').onclick=()=>location.reload();});
function flyTo(pos,target){
 const distance=camera.position.distanceTo(pos),dir0=camera.position.clone().sub(controls.target).normalize(),dir1=pos.clone().sub(target).normalize();
 const duration=reduced.matches?0:THREE.MathUtils.clamp(Math.max(distance/65,dir0.angleTo(dir1)/.8),.9,2.8);
 if(!duration){camera.position.copy(pos);controls.target.copy(target);controls.update();tween=null;return;}
 tween={p0:camera.position.clone(),t0:controls.target.clone(),p1:pos.clone(),t1:target.clone(),t:0,duration};controls.enabled=false;
}
const ease=t=>t*t*t*(t*(t*6-15)+10);
function floorCentre(tower,floor){const list=aptsOnFloor(tower,floor),v=new THREE.Vector3();for(const a of list)v.add(building.units.get(a.id).center);return v.divideScalar(list.length);}
function floorView(tower,floor){const target=floorCentre(tower,floor),az=Math.atan2(camera.position.x-controls.target.x,camera.position.z-controls.target.z);return{target,pos:target.clone().add(new THREE.Vector3(Math.sin(az)*28,42,Math.cos(az)*28))};}
function aptView(a){const c=building.units.get(a.id).center,target=c.clone().add(new THREE.Vector3(0,.5,0)),t=towerByKey[a.tower],tc=toScene(...t.centre),dir=new THREE.Vector3(c.x-tc.x,0,c.z-tc.z).normalize();return{target,pos:target.clone().addScaledVector(dir,18).add(new THREE.Vector3(0,23,0))};}
const matches=a=>(!state.rooms||a.rooms===state.rooms)&&(!state.availability||recordFor(inventory,a.id).status===state.availability);
function updateSelectionContext(){
 const el=$('#selection-context'),a=state.hoverApt??state.apt,f=state.previewFloor??(a?{tower:a.tower,floor:a.floor}:state.mode==='floor'?{tower:state.tower,floor:state.floor}:null);
 el.hidden=state.mode==='walk'||!f;
 if(el.hidden)return;
 const preview=!!state.previewFloor||!!state.hoverApt;
 el.innerHTML=`<span>${preview?'Предпросмотр':'Выбрано'}</span><strong>${towerByKey[f.tower].label} · этаж ${f.floor}${a&&!state.previewFloor?` · № ${a.number}`:''}</strong>`;
}
function updateOverlays(){if(!building)return;building.hotelPick&&(building.hotelPick.visible=false);for(const a of apartments){
 const u=building.units.get(a.id),open=state.mode==='floor'&&a.tower===state.tower&&a.floor===state.floor;
 const hover=state.hoverApt===a,band=state.previewFloor??(state.mode==='overview'&&state.hoverApt?{tower:state.hoverApt.tower,floor:state.hoverApt.floor}:null);
 const onBand=band?.tower===a.tower&&band.floor===a.floor,selected=a===state.apt,emphasis=hover||selected||onBand;
 const show=state.mode!=='walk'&&matches(a)&&(open||emphasis||state.rooms||state.availability);
 u.overlay.visible=!!show;u.overlay.material.color.setHex(hover||selected?0x267c80:onBand?0xd6a352:0xd5c8a6);
 u.overlay.material.opacity=(hover||selected) ? .24 : onBand ? .25 : open ? .025 : .14;
 u.overlay.material.depthTest=!emphasis;u.edges.visible=!!show&&(open||emphasis);
 u.edges.material.depthTest=!emphasis;u.edges.material.color.setHex(hover||selected?0x154f55:0x9a702d);u.edges.material.opacity=emphasis?.95:.2;
 }updateSelectionContext();}
function clearFloor(){dollhouse?.dispose();dollhouse=null;}
function buildLabels(){const root=$('#labels');root.replaceChildren();labels=[];if(state.mode!=='floor')return;for(const a of aptsOnFloor(state.tower,state.floor)){const el=document.createElement('button');el.className='tag';el.textContent=`№ ${a.number}`;el.setAttribute('aria-label',`Квартира ${a.number}, ${roomCount(a.rooms)}, ${areaText(a.area)} квадратных метров`);el.onclick=()=>selectApt(a);el.onpointerenter=el.onfocus=()=>previewApartment(a);el.onpointerleave=el.onblur=()=>previewApartment(null);root.append(el);labels.push({a,el,size:null});}}
const tmp=new THREE.Vector3();
function updateLabels(){
 if(labels.some(label=>!label.size)){
   // Batch visibility writes and layout reads, then reuse these dimensions until
   // resize. Camera motion needs only rectangle arithmetic, not forced layout.
   for(const label of labels)label.el.hidden=false;
   for(const label of labels)label.size={w:label.el.offsetWidth,h:label.el.offsetHeight};
 }
 const placed=[];
 const occupied=['.brand','#floors','#side','#selection-toggle','#selection-panel.is-open','#selection-context','.settings'].flatMap(selector=>{
   const el=$(selector);if(!el||!el.getClientRects().length)return[];
   const r=el.getBoundingClientRect();return r.width&&r.height?[r]:[];
 });
 for(const{a,el,size}of [...labels].sort((x,y)=>Number(y.a===state.apt)-Number(x.a===state.apt))){
   const u=building.units.get(a.id);tmp.set(u.center.x,u.top+.25,u.center.z).project(camera);
   const x=(tmp.x+1)*innerWidth/2,y=(1-tmp.y)*innerHeight/2;
   const {w,h}=size;
   const box={left:x-w/2-5,right:x+w/2+5,top:y-h/2-4,bottom:y+h/2+4};
   const intersects=r=>box.left<r.right&&box.right>r.left&&box.top<r.bottom&&box.bottom>r.top;
   const hidden=tmp.z>1||tmp.z< -1||!matches(a)||box.left<8||box.right>innerWidth-8||box.top<8||box.bottom>innerHeight-8||placed.some(intersects)||occupied.some(intersects);
   el.hidden=hidden;if(!hidden)placed.push(box);
   el.style.left=`${x}px`;el.style.top=`${y}px`;el.classList.toggle('selected',a===state.apt);
 }
}
function renderFloors(){const t=towerByKey[state.listTower];$('#floors').innerHTML=`<div class="tower-tabs">${RESIDENTIAL.map(r=>`<button data-tower="${r.key}" class="${r.key===t.key?'on':''}" aria-pressed="${r.key===t.key}">${r.label}</button>`).join('')}</div><button class="overview-btn" data-act="overview">К зданию</button><h3>Жилые этажи</h3>${[...t.floors].reverse().map(({floor:f})=>`<button class="floor-btn ${state.tower===t.key&&state.floor===f?'active':''}" data-floor="${f}" aria-pressed="${state.tower===t.key&&state.floor===f}" aria-label="${t.label}, этаж ${f}" ${!ready?'disabled':''}><span class="num">${f}</span><span class="meta">этаж · ${aptsOnFloor(t.key,f).length} квартир</span></button>`).join('')}<div class="lobby-note">1–${t.floors[0].floor-1} · общественные этажи</div>`;}
function renderSide(){
 const side=$('#side');
 if(state.mode==='overview'){
   side.innerHTML=`<div class="eyebrow">Жилой блок Б</div>
     <h1>Найдите свою квартиру</h1>
     <p class="sub">Выберите этаж, затем квартиру. Откройте планировку и прогуляйтесь по комнатам.</p>
     <div class="stats"><div><b>${apartments.length}</b><span>квартир в модели</span></div><div><b>${RESIDENTIAL[0].floors.length}</b><span>жилых этажей</span></div></div>
     <button class="btn showcase-btn" data-act="showcase" ${!ready?'disabled':''}>Открыть гостиную № 57 <span>Демонстрационный интерьер · 12 этаж ↗</span></button>
     <div class="buyer-filters"><div><div class="label" id="rooms-filter-label">Комнаты</div><div class="seg" role="group" aria-labelledby="rooms-filter-label">${[0,1,2,3].map(r=>`<button data-rooms="${r}" class="${state.rooms===r?'on':''}" aria-label="${r?roomCount(r):'Любое количество комнат'}" aria-pressed="${state.rooms===r}">${r||'Все'}</button>`).join('')}</div></div>
     <label class="availability-filter" for="availability">Статус продажи<select id="availability"><option value="">Все статусы</option>${Object.entries(STATUSES).map(([key,label])=>`<option value="${key}" ${state.availability===key?'selected':''}>${label}</option>`).join('')}</select></label></div>
     <button class="btn primary start-btn" data-act="start" ${!ready?'disabled':''}>Выбрать этаж <span aria-hidden="true">↗</span></button>
     <p class="inventory-note">${inventoryNote()}</p>
     <details class="project-note"><summary>О проекте и планировках</summary><p>Интерьеры — предложение по обустройству. Планировки основаны на октябрьском комплекте чертежей. Номера используются для навигации, площади требуют уточнения по документации.</p></details>`;
   return;
 }
 const list=aptsOnFloor(state.tower,state.floor),t=towerByKey[state.tower];
 if(!state.apt){
   const shown=list.filter(matches);
   side.innerHTML=`<button class="back" data-act="overview">← К зданию</button>
     <div class="eyebrow">${t.label} · этаж ${state.floor}</div><h2>Выберите квартиру</h2>
     <p class="sub">${shown.length===list.length?`${list.length} квартир на этаже`:`По фильтрам: ${shown.length} из ${list.length}`}</p>
     ${floorPreview(list,null,matches)}
     <div class="apt-list">${shown.map(a=>`<button class="apt-row" data-apt="${a.id}"><span class="t">№ ${a.number}</span><span class="p">${areaText(a.area)} м²</span><span class="d">${roomCount(a.rooms)} · ${roomTotal(a.data.rooms.length)}</span><span class="arrow" aria-hidden="true">↗</span><span class="apt-availability">${unitBadge(a)}</span></button>`).join('')||'<p class="sub">На этом этаже нет квартир с выбранными параметрами. Измените фильтры на экране здания.</p>'}</div>
     <p class="inventory-note">${inventoryNote()}</p><p class="note">Номера используются для навигации в модели.</p>`;
   return;
 }
 const a=state.apt,r=recordFor(inventory,a.id);
 side.innerHTML=`<button class="back" data-act="floor">← Все квартиры на ${a.floor} этаже</button>
   <div class="unit-heading"><div class="eyebrow">${t.label} · этаж ${a.floor}</div>${unitBadge(a)}</div>
   <h2>Квартира № ${a.number}</h2><p class="sub">${roomCount(a.rooms)} · ${roomTotal(a.data.rooms.length)}</p>
   <details class="floor-location"><summary>Где находится на этаже</summary>${floorPreview(list,a.id,matches)}</details>
   ${planFigure(a)}
   <div class="specs"><div><span>${a.data.area_source==='room-sum'?'Сумма площадей комнат':'Площадь по плану'}</span><b>${areaText(a.area)} м²</b></div><div><span>Высота потолка</span><b>${areaText(a.ceiling)} м</b></div></div>
   ${r.price!==null?`<div class="asking-price"><span>Стоимость квартиры</span><strong>${priceText(r.price)}</strong></div>`:''}
   <div class="actions"><button class="btn primary" data-act="walk">Войти в квартиру <span aria-hidden="true">↗</span></button>${a.id==='B12-0'?'<button class="btn showcase-btn" data-act="showcase">Открыть гостиную <span>Демонстрационный интерьер ↗</span></button>':''}<button class="btn share-btn" data-act="share">Скопировать ссылку <span aria-hidden="true">↗</span></button></div>
   <p class="inventory-note">${inventoryNote()}</p><details class="project-note"><summary>О площадях и обустройстве</summary><p>Обустройство и материалы показаны как дизайн-предложение. Номера — навигационные, площади не являются заверенными измерениями.</p></details>`;
 drawPlan(side.querySelector('.plan'),a);
}
function refresh(){world.invalidateShadow();renderFloors();renderSide();updateOverlays();selection.sync();$('#hint').textContent=state.mode==='overview'?'Потяните, чтобы повернуть · Колесо — масштаб':'Выберите квартиру · Потяните, чтобы повернуть';}
$('#floors').onclick=e=>{const b=e.target.closest('button');if(!b||transitioning||!ready)return;if(b.dataset.tower){state.listTower=b.dataset.tower;state.previewFloor=null;state.hoverApt=null;renderFloors();updateOverlays();}else if(b.dataset.floor)selectFloor(state.listTower,+b.dataset.floor);else if(b.dataset.act==='overview')goOverview();};
function previewApartment(a){if(!ready||transitioning||state.mode==='walk')return;state.hoverApt=a;state.previewFloor=null;updateOverlays();}
function previewFloorButton(e){const b=e.target.closest('[data-floor]');if(!b||!ready||transitioning||state.mode==='walk')return;state.hoverApt=null;state.previewFloor={tower:state.listTower,floor:+b.dataset.floor};updateOverlays();}
$('#floors').addEventListener('pointerover',e=>{if(e.pointerType!=='touch')previewFloorButton(e);});
$('#floors').addEventListener('focusin',previewFloorButton);
function clearFloorPreview(){state.previewFloor=null;updateOverlays();}
$('#floors').addEventListener('pointerleave',clearFloorPreview);
$('#floors').addEventListener('focusout',e=>{if(!$('#floors').contains(e.relatedTarget))clearFloorPreview();});
$('#floors').addEventListener('pointerout',e=>{if(e.target.closest('[data-floor]')&&!e.relatedTarget?.closest?.('[data-floor]'))clearFloorPreview();});
for(const event of ['pointerover','focusin'])$('#side').addEventListener(event,e=>{if(event==='pointerover'&&e.pointerType==='touch')return;const b=e.target.closest('[data-apt]');if(b)previewApartment(apartments.find(a=>a.id===b.dataset.apt));});
for(const event of ['pointerout','focusout'])$('#side').addEventListener(event,e=>{if(e.target.closest('[data-apt]')&&!e.target.closest('[data-apt]').contains(e.relatedTarget))previewApartment(null);});
$('#side').addEventListener('keydown',e=>{const b=e.target.closest('.floor-unit[data-apt]');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();if(!transitioning)selectApt(apartments.find(a=>a.id===b.dataset.apt));}});
async function shareApartment(){try{if(!navigator.clipboard)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(apartmentUrl(state.apt.id));toast('Ссылка на квартиру скопирована.');}catch{toast('Не удалось скопировать ссылку. Разрешите доступ к буферу обмена.');}}
$('#side').onclick=e=>{const b=e.target.closest('button,[data-apt]');if(!b||transitioning||!ready)return;const act=b.dataset.act;if(act==='overview')goOverview();else if(act==='floor')selectFloor(state.tower,state.floor);else if(act==='walk')enterWalk(state.apt);else if(act==='share')shareApartment();else if(act==='showcase'){const a=apartments.find(a=>a.id==='B12-0');selectApt(a);enterWalk(a,true);}else if(act==='start')selectFloor(state.listTower,12);else if(b.dataset.apt)selectApt(apartments.find(a=>a.id===b.dataset.apt));else if(b.dataset.rooms!==undefined){state.rooms=+b.dataset.rooms;refresh();}};
$('#side').onchange=e=>{if(e.target.id==='availability'){state.availability=e.target.value;updateOverlays();}};
function goOverview(){if(!ready||transitioning)return;if(state.mode==='walk'){exitWalk(true);return;}clearFloor();building.showAll();Object.assign(state,{mode:'overview',tower:null,floor:null,apt:null,hoverApt:null,previewFloor:null});buildLabels();flyTo(HOME.pos,HOME.target);selection.close();refresh();}
$('#home').onclick=goOverview;
function selectFloor(tower,floor){if(!ready||transitioning)return;enhanceInteriorMaterials();if(state.tower!==tower||state.floor!==floor||state.mode!=='floor'){clearFloor();building.showUpTo(tower,floor);dollhouse=buildFloor(tower,floor,aptsOnFloor(tower,floor));scene.add(dollhouse.group);}Object.assign(state,{mode:'floor',tower,floor,listTower:tower,apt:null,hoverApt:null,previewFloor:null});const v=floorView(tower,floor);flyTo(v.pos,v.target);buildLabels();selection.close(true);refresh();}
function selectApt(a){if(!a||transitioning)return;if(state.mode!=='floor'||a.tower!==state.tower||a.floor!==state.floor)selectFloor(a.tower,a.floor);state.apt=a;state.hoverApt=null;state.previewFloor=null;const v=aptView(a);flyTo(v.pos,v.target);refresh();selection.showDetails();}
let toastTimer;function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
async function fade(change,label=''){if(transitioning)return;transitioning=true;$('#fade').textContent=label;$('#fade').classList.add('on');try{if(!reduced.matches)await new Promise(r=>setTimeout(r,260));await change();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}catch(error){console.error(error);toast('Не удалось открыть пространство. Вернитесь к зданию.');}finally{warming=false;$('#fade').classList.remove('on');$('#fade').textContent='';transitioning=false;}}
function enterWalk(a,showcase=false){if(!a||state.mode!=='floor')return;const presentationKind=typeof showcase==='string'?showcase:'living';let presentationPitch=-.20;selection.close();fade(async()=>{warming=true;const next=buildFloor(a.tower,a.floor,aptsOnFloor(a.tower,a.floor),a);if(showcase){const r=next.nav.rooms.find(r=>r.room.kind===presentationKind&&r.focus);if(r){presentationPitch=r.pitch??-.20;const p=next.frame.toScene(...r.point),f=next.frame.toScene(...r.focus);next.spawn={...p,yaw:Math.atan2(-(f.x-p.x),-(f.z-p.z))};}}clearFloor();$('#labels').replaceChildren();labels=[];building.showAll(a.tower,a.floor);walkInterior=next;scene.add(walkInterior.group);Object.assign(state,{mode:'walk',apt:a,hoverApt:null});updateOverlays();tween=null;controls.enabled=false;camera.fov=65;camera.near=interiorNearPlane(camera.fov,camera.aspect,next.nav.radius);camera.updateProjectionMatrix();world.setFocus(building.units.get(a.id).center);walkInterior.setLighting(lighting.night);syncPost();walk.start(walkInterior,scene);if(showcase)walk.pitch=walk.pitchAim=presentationPitch;$('#ext-ui').hidden=true;$('#walk-ui').hidden=false;$('#home').hidden=true;$('#walk-title').innerHTML=`<span>${a.towerLabel} · ${a.floor} этаж</span><b>Квартира № ${a.number}</b>`;visited.clear();lastRoom=-1;lastTour=false;renderRooms();setRoomsOpen(false);$('#rooms-toggle').focus({preventScroll:true});try{await renderer.compileAsync(scene,camera);}finally{warming=false;}},'Готовим интерьер…');}
function exitWalk(overview=false){if(!walkInterior||transitioning)return;const a=walkInterior.apt;fade(()=>{walk.stop();postRequest++;post?.dispose();post=null;world.setFocus();joyEnd();walkInterior.dispose();walkInterior=null;camera.fov=exteriorFov();camera.near=.15;camera.updateProjectionMatrix();controls.enabled=true;$('#ext-ui').hidden=false;$('#walk-ui').hidden=true;$('#home').hidden=false;state.mode='overview';// Allow the destination update within this single guarded transition.
transitioning=false;if(overview)goOverview();else{selectFloor(a.tower,a.floor);selectApt(a);const v=aptView(a);camera.position.copy(v.pos);controls.target.copy(v.target);tween=null;controls.update();}selection.close();transitioning=true;});}
$('#exit-walk').onclick=()=>exitWalk();addEventListener('keydown',e=>{if(e.code!=='Escape'||transitioning)return;if(time.close()){$('#time-toggle').focus({preventScroll:true});return;}if(selection.close(true))return;if(!$('#rooms').hidden){setRoomsOpen(false);$('#rooms-toggle').focus({preventScroll:true});return;}if(state.mode==='walk')exitWalk();else if(state.mode==='floor'&&state.apt)selectFloor(state.tower,state.floor);else if(state.mode==='floor')goOverview();});
function setRoomsOpen(open){$('#rooms').hidden=!open;$('#minimap').hidden=!open;$('#rooms-toggle').setAttribute('aria-expanded',String(open));if(open){time.close();prepareMinimap(walkInterior.apt);drawMinimap();}}
$('#rooms-toggle').onclick=()=>setRoomsOpen($('#rooms').hidden);
$('#rooms-close').onclick=()=>{setRoomsOpen(false);$('#rooms-toggle').focus({preventScroll:true});};
function renderRooms(){
 const entries=planRoomEntries(walkInterior.apt);
 $('#room-list').innerHTML=walkInterior.nav.rooms.map(({room:r,index})=>{
   const entry=entries.find(e=>e.room===r),name=entry?.name??roomName(r);
   return `<button data-room="${index}" aria-label="Перейти: ${name}"><i>${index+1}</i><span>${name}</span><small>${areaText(r.area)} м²</small><em aria-hidden="true">○</em></button>`;
 }).join('');
}
$('#room-list').onclick=e=>{const b=e.target.closest('[data-room]');if(!b||transitioning)return;if(walk.goToRoom(+b.dataset.room)){toast(`Идём: ${roomName(walkInterior.nav.rooms[+b.dataset.room].room)}`);setRoomsOpen(false);$('#rooms-toggle').focus({preventScroll:true});}else toast('Проход сейчас недоступен. Выберите соседнюю точку на полу.');};
$('#tour').onclick=()=>{if(transitioning)return;if(walk.tour)walk.cancelRoute();else{walk.startTour();setRoomsOpen(false);$('#rooms-toggle').focus({preventScroll:true});toast('Тур начат. Любое движение остановит маршрут.');}};
function updateRoomState(){const current=walk.currentRoom();if(current>=0)visited.add(current);if(current!==lastRoom||walk.tour!==lastTour){for(const b of $('#room-list').children){const i=+b.dataset.room;b.classList.toggle('on',i===current);b.setAttribute('aria-current',i===current?'location':'false');b.querySelector('em').textContent=visited.has(i)?'✓':'○';}$('#room-status').textContent=`Осмотрено ${visited.size} из ${walkInterior.nav.rooms.length} помещений`;$('#tour').textContent=walk.tour?'Остановить тур':'Начать тур';$('#tour').classList.toggle('on',walk.tour);if(lastTour&&!walk.tour&&visited.size===walkInterior.nav.rooms.length)toast('Вы осмотрели все помещения квартиры.');lastRoom=current;lastTour=walk.tour;}}
const mini=$('#minimap canvas');function prepareMinimap(a){if(!mini.clientWidth||!mini.clientHeight)return;const off=document.createElement('canvas');off.width=mini.clientWidth;off.height=mini.clientHeight;drawPlan(off,a,{pad:8,labels:false});miniBg=off;miniT=planTransform(a,mini.clientWidth,mini.clientHeight,8);}
function drawMinimap(){if($('#minimap').hidden||!miniBg||!miniT||!mini.clientWidth)return;const dpr=Math.min(devicePixelRatio||1,2),w=mini.clientWidth,h=mini.clientHeight;if(mini.width!==Math.round(w*dpr)||mini.height!==Math.round(h*dpr)){mini.width=Math.round(w*dpr);mini.height=Math.round(h*dpr);}const g=mini.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,mini.width,mini.height);g.drawImage(miniBg,0,0,mini.width,mini.height);g.setTransform(dpr,0,0,dpr,0,0);const p=walk.localState(),x=miniT.px(p.x),y=miniT.py(p.y),angle=Math.atan2(-p.dy,p.dx);g.fillStyle='rgba(130,105,62,.18)';g.beginPath();g.moveTo(x,y);g.arc(x,y,23,angle-.6,angle+.6);g.closePath();g.fill();g.fillStyle='#8b7048';g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.arc(x,y,4,0,Math.PI*2);g.fill();g.stroke();}
const joy=$('#joystick'),knob=joy.querySelector('.knob');let joyId=null;function joyMove(e){const r=joy.getBoundingClientRect(),max=r.width/2-12;let dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dy);if(d>max){dx*=max/d;dy*=max/d;}knob.style.transform=`translate(${dx}px,${dy}px)`;walk.setJoystick(dx/max,dy/max);}
function joyEnd(){joyId=null;knob.style.transform='';walk.setJoystick(0,0);}
joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;joy.setPointerCapture(joyId);joyMove(e);});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyMove(e);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])joy.addEventListener(ev,joyEnd);addEventListener('blur',joyEnd);addEventListener('pointerdown',e=>{if(e.pointerType==='touch')document.body.classList.add('touch');});
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),tooltip=$('#tooltip');let down=null;
function pick(e){if(!ready||transitioning)return null;ndc.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(ndc,camera);return pickApartment(ray,building.pickables,state,matches);}
canvas.addEventListener('pointerdown',e=>{down=selection.dismissFromCanvas()?null:{x:e.clientX,y:e.clientY};tooltip.style.opacity=0;});canvas.addEventListener('pointercancel',()=>down=null);
canvas.addEventListener('pointermove',e=>{if(state.mode==='walk'||e.pointerType==='touch'||e.buttons||transitioning)return;const hit=pick(e),a=hit?.apt;if(state.previewFloor||state.hoverApt!==(a??null)){state.previewFloor=null;state.hoverApt=a??null;updateOverlays();}canvas.style.cursor=a?'pointer':'';if(a||hit?.hotel){tooltip.textContent=a?`${a.towerLabel} · ${a.floor} этаж · квартира № ${a.number}`:'';const box=tooltip.getBoundingClientRect();tooltip.style.left=`${Math.max(8,Math.min(e.clientX+16,innerWidth-box.width-8))}px`;tooltip.style.top=`${Math.max(8,Math.min(e.clientY+12,innerHeight-box.height-8))}px`;tooltip.style.opacity=1;}else tooltip.style.opacity=0;});
canvas.addEventListener('pointerleave',()=>{tooltip.style.opacity=0;state.hoverApt=null;updateOverlays();});canvas.addEventListener('pointerup',e=>{if(state.mode==='walk'||!down||transitioning)return;const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y)>6;down=null;if(moved)return;const hit=pick(e);tooltip.style.opacity=0;const a=hit?.apt;if(!a)return;if(state.mode!=='floor'||a.tower!==state.tower||a.floor!==state.floor)selectFloor(a.tower,a.floor);else selectApt(a);});
let previous=null,uiTimer=0;document.addEventListener('visibilitychange',()=>{previous=null;joyEnd();});
renderer.setAnimationLoop(now=>{
 if(previous===null)previous=now;
 const elapsed=Math.max((now-previous)/1000,0),dt=Math.min(elapsed,.05);previous=now;
 if(document.hidden)return;
 // Reduce fill cost on a struggling GPU without interrupting camera input.
 if(ready&&!transitioning&&elapsed<.5){performanceTimer+=elapsed;if(elapsed>.04)slowFrames+=elapsed;
  if(performanceTimer>5){if(slowFrames/performanceTimer>.65&&adaptiveScale>.75){adaptiveScale=Math.max(.75,adaptiveScale-.1);resize();}performanceTimer=slowFrames=0;}}
 const changing=time.update(dt);
 if(tween){tween.t+=dt;const k=ease(Math.min(1,tween.t/tween.duration));camera.position.lerpVectors(tween.p0,tween.p1,k);controls.target.lerpVectors(tween.t0,tween.t1,k);camera.lookAt(controls.target);if(k>=1){tween=null;controls.enabled=true;controls.update();}}
 uiTimer+=dt;
 if(state.mode==='walk'){if(!transitioning)walk.update(dt);if(uiTimer>.1){drawMinimap();updateRoomState();uiTimer=0;}}
 else{if(!tween)controls.update();if(ready&&uiTimer>.033){updateLabels();uiTimer=0;}}
 world.update(now/1000,camera,changing);building?.update(now/1000);
 if(!warming){if(post)post.render();else renderer.render(scene,camera);}
});
refresh();
let inventorySignature='';
createInventoryReader({catalog:apartments,onUpdate:s=>{const signature=JSON.stringify([s.source,s.data,s.source==='cached'?s.checkedAt:null]);inventory=s.data;inventorySource=s.source;inventoryChecked=s.checkedAt;if(signature!==inventorySignature){inventorySignature=signature;if(state.mode!=='walk')renderSide();updateOverlays();}}});
