import './style.css';
import * as THREE from 'three';
import { buildResidence } from './model.js';
import { addCAD } from './cad.js';
import { loadMaterialTextures } from './texture-assets.js';
import { createAmbientPass } from './ambient.js';
import { rooms, sampleTimeline, clamp, smooth } from './timeline.js';
import { createRouteClock, JourneyMotion } from './motion.js';

const $=s=>document.querySelector(s);
let renderer,world,cad,ambient,textureMaps={},target=0,lastTime=0,frame=0,activeRoom=0,viewState=sampleTimeline(0),contextLost=false;
const motion=new JourneyMotion(createRouteClock(sampleTimeline));
let navigating=false,scrollRange=Math.max(1,document.documentElement.scrollHeight-innerHeight),writtenScroll=null,displayTime=0,viewportWidth=innerWidth,viewportHeight=innerHeight;
let savedMotion=null;try{savedMotion=localStorage.getItem('shakhrofar-reduced-motion');}catch{}
let reduced=savedMotion===null?matchMedia('(prefers-reduced-motion: reduce)').matches:savedMotion==='true';
const camera=new THREE.PerspectiveCamera(14,innerWidth/innerHeight,.025,5000);
const track=$('#scroll-track'),drawer=$('#spec-drawer');
const planViewer=$('#plan-viewer');
// Native modal dialogs make the rest of the document inert. Wrap Tab locally
// as well, so keyboard navigation does not leave the controls for browser chrome.
for(const dialog of [drawer,planViewer])dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const controls=[...dialog.querySelectorAll('button:not([disabled]),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length);
  const first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
});
function pauseJourney(){motion.paused=true;document.body.style.overflow='hidden';}
function resumeJourney(){motion.paused=document.hidden||drawer.open||planViewer.open;if(!drawer.open&&!planViewer.open)document.body.style.overflow='';lastTime=0;wake();}
$('#inspect-plan').addEventListener('click',()=>{pauseJourney();planViewer.showModal();$('#close-plan').focus();});
$('#close-plan').addEventListener('click',()=>planViewer.close());
planViewer.addEventListener('close',resumeJourney);
const palette={oak:['Натуральный дуб','Широкая доска · матовая'],travertine:['Травертин','Шлифованный камень'],walnut:['Натуральный орех','Масляная отделка'],boucle:['Светлое букле','Фактурная обивка'],bronze:['Тёмная бронза','Сатинированный металл'],stone:['Архитектурный камень','Наружная отделка']};
function applyMotion(){
  document.body.classList.toggle('reduced-motion',reduced);track.style.height=reduced?'650svh':'';
  $('#motion-toggle').setAttribute('aria-pressed',String(reduced));$('#motion-toggle').setAttribute('aria-label',reduced?'Выключить спокойный режим':'Включить спокойный режим');$('#motion-toggle span').textContent=reduced?'СПОКОЙНОЕ':'ПЛАВНОЕ';
}
applyMotion();
scrollRange=Math.max(1,document.documentElement.scrollHeight-innerHeight);

function syncScroll(progress){
  const top=progress*scrollRange;
  // Ignore the scroll event produced by this write, including pixel rounding.
  writtenScroll=top;window.scrollTo({top,behavior:'instant'});
}
function go(progress){
  target=clamp(progress);motion.setTarget(target);navigating=!reduced;
  if(navigating)syncScroll(motion.progress);
  if(reduced){motion.reset(target);syncScroll(target);}
  wake();
}
// A wheel, swipe or page key takes over at the displayed location. The velocity
// is retained, so reversing direction decelerates instead of cutting abruptly.
function interruptJourney(){
  if(!navigating||motion.paused)return;
  navigating=false;target=motion.progress;motion.setTarget(target);syncScroll(target);
}
addEventListener('wheel',event=>{
  if(motion.paused||event.ctrlKey||event.deltaY===0)return;
  // Keep wheel intent near the camera instead of accumulating rooms of lag.
  // A direction reversal takes effect here, before the browser scrolls away.
  event.preventDefault();
  const units=event.deltaMode===1?16:event.deltaMode===2?innerHeight:1;
  const reverse=Math.sign(event.deltaY)!==Math.sign(motion.target-motion.position);
  const anchor=navigating||reverse?motion.progress:motion.clock.toProgress(motion.target);
  const requested=motion.clock.toTime(clamp(anchor+event.deltaY*units/scrollRange));
  const time=Math.max(0,Math.min(motion.clock.duration,Math.max(motion.position-.8,Math.min(motion.position+.8,requested))));
  target=motion.clock.toProgress(time);navigating=false;
  motion.setTarget(target);syncScroll(target);wake();
},{passive:false});
addEventListener('touchstart',interruptJourney,{passive:true});
addEventListener('keydown',event=>{
  if(!navigating||motion.paused||event.target.closest('button,a,input,textarea,select,[contenteditable]'))return;
  const deltas={ArrowUp:-64,ArrowDown:64,PageUp:-innerHeight*.85,PageDown:innerHeight*.85,' ':innerHeight*.85*(event.shiftKey?-1:1)};
  if(!(event.key in deltas)&&event.key!=='Home'&&event.key!=='End')return;
  event.preventDefault();navigating=false;
  target=event.key==='Home'?0:event.key==='End'?1:clamp(motion.progress+deltas[event.key]/scrollRange);
  motion.setTarget(target);syncScroll(target);wake();
});
$('#home').addEventListener('click',()=>go(0));$('#back-plan').addEventListener('click',()=>go(0));$('#enter').addEventListener('click',()=>go(rooms[0].jump));
document.querySelectorAll('[data-room]').forEach(b=>b.addEventListener('click',()=>go(rooms[+b.dataset.room-1].jump)));
$('#motion-toggle').addEventListener('click',()=>{
  let p=viewState.progress;reduced=!reduced;
  if(reduced)p=p<.2?0:rooms[Math.max(0,sampleTimeline(p).room-1)].jump;
  try{localStorage.setItem('shakhrofar-reduced-motion',String(reduced));}catch{}
  applyMotion();scrollRange=Math.max(1,document.documentElement.scrollHeight-innerHeight);
  navigating=false;target=p;motion.reset(p);syncScroll(p);wake();
});
function openDrawer(room=rooms[Math.max(0,activeRoom-1)]){
  $('#spec-number').textContent=`${room.label.toUpperCase()} · АР–8 / ${String(room.id).padStart(2,'0')}`;
  $('#spec-title').textContent=room.name;$('#spec-intro').textContent=room.description;$('#spec-size').textContent=room.size;$('#spec-area').textContent=room.area;$('#spec-height').textContent=room.id===5?'Открытое небо':'3,30 м';
  $('#swatches').replaceChildren(...room.palette.map(key=>{const el=document.createElement('div');el.className='swatch';const sample=document.createElement('span');sample.className=`swatch-sample ${key}`;sample.setAttribute('aria-hidden','true');const title=document.createElement('span');title.textContent=palette[key][0];const br=document.createElement('br');const detail=document.createElement('span');detail.textContent=palette[key][1];el.append(sample,title,br,detail);return el;}));
  $('#spec-notes').replaceChildren(...room.notes.map(t=>{const el=document.createElement('li');el.textContent=t;return el;}));
  pauseJourney();drawer.showModal();$('#close-drawer').focus();
}
$('#index-button').addEventListener('click',()=>openDrawer());$('#open-file').addEventListener('click',()=>openDrawer());
$('#close-drawer').addEventListener('click',()=>drawer.close());drawer.addEventListener('click',e=>{if(e.target===drawer&&e.clientX<drawer.getBoundingClientRect().left)drawer.close();});drawer.addEventListener('close',resumeJourney);
// Keep download paths valid when served beneath a subdirectory.
$('.download-link').href=window.__PLAN_DATA__ || import.meta.env.BASE_URL+'assets/residence-plan.svg';

function updateUI(state){
  document.documentElement.style.setProperty('--opening',state.opening.toFixed(4));
  $('.opening-copy').style.pointerEvents=state.opening>.5?'auto':'none';$('.opening-copy').inert=state.opening<.5;
  $('.opening-copy').setAttribute('aria-hidden',String(state.opening<.5));
  document.body.classList.toggle('immersed',state.progress>.22);
  const transitional=smooth(.14,.18,state.progress)*(1-smooth(.22,.255,state.progress));
  $('.transition-caption').style.opacity=transitional;
  const visible=state.room>0;
  $('.room-card').hidden=!visible;$('#back-plan').hidden=state.progress<.95;
  if(state.room!==activeRoom){
    activeRoom=state.room;
    if(visible){const room=rooms[activeRoom-1];$('#room-number').textContent=room.label.toUpperCase();$('#room-russian').textContent=room.ru;$('#room-name').textContent=room.name;$('#room-description').textContent=room.description;$('#room-size').textContent=room.size;$('#room-area').textContent=room.area;$('#room-clearance').textContent=activeRoom===5?'Открытое небо · Отметка +75,000 м':'Потолок 3,30 м · Отметка +75,000 м';}
    document.querySelectorAll('[data-room]').forEach(b=>b.setAttribute('aria-current',String(+b.dataset.room===activeRoom)));
    $('#room-count').textContent=String(activeRoom).padStart(2,'0');
  }
  const p=state.eye;$('#coordinates').textContent=`X ${p.x.toFixed(2).replace('.',',')} · Y ${p.y.toFixed(2).replace('.',',')} · Z ${p.z.toFixed(2).replace('.',',').replace('-','−')}`;
  $('#elevation').textContent=`+${(75+p.y).toFixed(2).replace('.',',')}`;$('#progress-fill').style.transform=`scaleX(${state.progress})`;
  $('#mode-label').textContent=state.progress<.12?'АРХИТЕКТУРНЫЙ ЧЕРТЁЖ':state.progress<.25?'ЧЕРТЁЖ ОБРЕТАЕТ ОБЪЁМ':state.room===5?'ВИДОВАЯ ТЕРРАСА · +75,000 М':`ВНУТРИ КВАРТИРЫ · ${String(state.room).padStart(2,'0')}`;
}
function resize(){
  // Viewport changes alter the scroll distance. Preserve the route location,
  // including when rotating a phone halfway through an active room transition.
  const previousScroll=writtenScroll??target*scrollRange;
  const nextRange=Math.max(1,document.documentElement.scrollHeight-innerHeight);
  const displayed=navigating?motion.progress:target;
  const keptPixels=Math.abs(scrollY-Math.min(previousScroll,nextRange))<1.1;
  const keptFraction=Math.abs(scrollY-displayed*nextRange)<1.1;
  scrollRange=nextRange;viewportWidth=innerWidth;viewportHeight=innerHeight;
  // A new scroll can arrive before its resize event. Honour that input rather
  // than restoring an older fraction over it; either event order is valid.
  if(!keptPixels&&!keptFraction&&!motion.paused){
    navigating=false;writtenScroll=null;target=clamp(scrollY/scrollRange);motion.setTarget(target);
  }else syncScroll(displayed);
  if(renderer){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();ambient?.resize();}
  wake();
}
function draw(now){
  frame=0;const delta=lastTime?Math.max(0,(now-lastTime)/1000):0;lastTime=now;
  if(reduced&&!motion.paused)motion.reset(target);
  let p=motion.advance(delta);
  if(navigating&&!motion.paused){syncScroll(p);if(!motion.moving)navigating=false;}
  if(reduced){const room=sampleTimeline(p).room;p=p<.2?0:rooms[Math.max(0,room-1)].jump;}
  viewState=sampleTimeline(p);updateUI(viewState);
  if(renderer&&world&&!contextLost){
    const opening=1-smooth(.12,.245,p),mobile=innerWidth<=700;
    camera.position.copy(viewState.eye);camera.quaternion.copy(viewState.quaternion);camera.fov=viewState.fov+(mobile?16*smooth(.20,.25,p):0);camera.near=p>=.25?.08:.2;camera.far=2500;
    camera.zoom=THREE.MathUtils.lerp(mobile?.35:.76,1,smooth(.12,.245,p));
    camera.setViewOffset(innerWidth,innerHeight,mobile?0:-innerWidth*.18*opening,mobile?-innerHeight*.18*opening:0,innerWidth,innerHeight);
    camera.updateProjectionMatrix();world.update(viewState);cad?.update(viewState);renderer.info.reset();renderer.setRenderTarget(null);renderer.render(world.scene,camera);ambient?.render(viewState);
  }
  displayTime=now;
  if(motion.moving&&!motion.paused&&!document.hidden)frame=requestAnimationFrame(draw);
}
function wake(){if(!frame&&!document.hidden){lastTime=0;frame=requestAnimationFrame(draw);}}
addEventListener('scroll',()=>{
  if(viewportWidth!==innerWidth||viewportHeight!==innerHeight){resize();return;}
  if(writtenScroll!==null&&Math.abs(scrollY-writtenScroll)<1.1)return;
  if(motion.paused)return;
  writtenScroll=null;navigating=false;target=clamp(scrollY/scrollRange);motion.setTarget(target);wake();
},{passive:true});
addEventListener('resize',resize,{passive:true});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){motion.paused=true;cancelAnimationFrame(frame);frame=0;lastTime=0;}
  else resumeJourney();
});
function fallback(message){
  contextLost=true;$('#world').replaceChildren();const img=document.createElement('img');img.className='fallback-image';img.src=window.__PLAN_DATA__ || import.meta.env.BASE_URL+'assets/residence-plan.svg';img.alt='Архитектурный план квартиры и видовой террасы';$('#world').append(img);
  const p=document.createElement('p');p.className='fallback-message';p.textContent=message;$('#world').append(p);$('#loading').classList.add('loaded');wake();
}
try{
  if(new URLSearchParams(location.search).has('no-webgl'))throw new Error('Requested drawing-only mode');
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.localClippingEnabled=true;
  renderer.domElement.setAttribute('aria-hidden','true');$('#world').append(renderer.domElement);renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback('Объёмная модель недоступна. Полный чертёж и описание комнат по-прежнему открываются.');});
  textureMaps=await loadMaterialTextures();
  if(contextLost)throw new Error('WebGL context was lost while materials loaded');
  world=buildResidence(renderer,{textureMaps});renderer.shadowMap.autoUpdate=false;cad=await addCAD(world.scene);ambient=createAmbientPass(renderer,world,camera);renderer.info.autoReset=false;world.update(sampleTimeline(0));renderer.render(world.scene,camera);wake();
  requestAnimationFrame(()=>requestAnimationFrame(()=>$('#loading').classList.add('loaded')));
}catch(error){fallback('Режим чертежа. Для объёмной прогулки нужен WebGL. План, выбор комнат и описание материалов доступны.');if(!new URLSearchParams(location.search).has('no-webgl'))console.warn('3D unavailable:',error.message);}

window.__residence={getState:()=>({progress:viewState.progress,scrollProgress:target,camera:viewState.eye.toArray(),quaternion:viewState.quaternion.toArray(),renderCamera:camera.position.toArray(),renderQuaternion:camera.quaternion.toArray(),displayTime,fov:camera.fov,room:viewState.room,clipHeight:viewState.clipHeight,waves:[...viewState.waves],glass:viewState.glass,cad:viewState.cad,opening:viewState.opening,reduced,contextLost,navigating,paused:motion.paused,moving:motion.moving,routeVelocity:motion.velocity,routeDuration:motion.clock.duration,drawCalls:renderer?.info.render.calls,triangles:renderer?.info.render.triangles}),sampleTimeline:p=>{const s=sampleTimeline(p);return {...s,eye:s.eye.toArray(),quaternion:s.quaternion.toArray()};},rooms,ready:true};
// A restored scroll position and the first view use the same controller too.
target=clamp(scrollY/scrollRange);motion.setTarget(target);
wake();
