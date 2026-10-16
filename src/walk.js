import * as THREE from 'three';
import { inside, innerRect } from './geometry.js';
const EYE=1.65,clamp=THREE.MathUtils.clamp;
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export class WalkControls{
 constructor(camera,dom){
  Object.assign(this,{camera,dom,enabled:false,yaw:0,pitch:0,yawAim:0,pitchAim:0,keys:new Set(),joy:{x:0,y:0},pos:new THREE.Vector2(),velocity:new THREE.Vector2(),path:[],tour:false,tourIndex:0,dwell:0});
  this.ray=new THREE.Raycaster();this.ndc=new THREE.Vector2();
  this.ring=new THREE.Mesh(new THREE.RingGeometry(.12,.16,40),new THREE.MeshBasicMaterial({color:0xfff6e1,transparent:true,opacity:.65,depthWrite:false}));this.ring.rotation.x=-Math.PI/2;this.ring.visible=false;
  dom.addEventListener('pointerdown',e=>this.onDown(e));dom.addEventListener('pointermove',e=>this.onMove(e));dom.addEventListener('pointerup',e=>this.onUp(e));
  for(const event of ['pointercancel','lostpointercapture'])dom.addEventListener(event,()=>{this.drag=null;this.ring.visible=false;});
  dom.addEventListener('pointerleave',()=>this.ring.visible=false);
  const codes=new Set(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
  addEventListener('keydown',e=>{if(!this.enabled||!codes.has(e.code)||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;e.preventDefault();this.keys.add(e.code);this.cancelRoute();});
  addEventListener('keyup',e=>this.keys.delete(e.code));
  addEventListener('blur',()=>this.resetInput());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.resetInput();});
 }
 start(interior,scene){this.interior=interior;this.enabled=true;this.resetInput();this.pos.set(interior.spawn.x,interior.spawn.z);this.yaw=this.yawAim=interior.spawn.yaw;this.pitch=this.pitchAim=-.035;scene.add(this.ring);this.apply();}
 cancelRoute(){this.path=[];this.tour=false;this.dwell=0;this.arrivalFocus=null;}
 resetInput(){this.keys.clear();this.joy={x:0,y:0};this.drag=null;this.velocity.set(0,0);this.cancelRoute();this.ring.visible=false;}
 stop(){this.resetInput();this.enabled=false;this.interior=null;this.ring.removeFromParent();}
 setJoystick(x,y){this.joy={x,y};if(x||y)this.cancelRoute();}
 floorHit(e){const r=this.dom.getBoundingClientRect();this.ndc.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);this.ray.setFromCamera(this.ndc,this.camera);const h=this.ray.intersectObject(this.interior.group,true)[0];return h&&this.interior.floorMeshes.includes(h.object)?h.point:null;}
 onDown(e){if(!this.enabled||this.drag)return;this.cancelRoute();this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};this.dom.setPointerCapture(e.pointerId);}
 onMove(e){if(!this.enabled)return;const d=this.drag;if(d&&d.id===e.pointerId){if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>5)d.moved=true;if(d.moved){const k=e.pointerType==='touch'?.0035:.0027;this.yawAim+=(e.clientX-d.lastX)*k;this.pitchAim=clamp(this.pitchAim+(e.clientY-d.lastY)*k,-1.05,1.05);this.ring.visible=false;}d.lastX=e.clientX;d.lastY=e.clientY;return;}if(e.pointerType!=='touch'){const p=this.floorHit(e);this.ring.visible=!!p;if(p)this.ring.position.set(p.x,p.y+.016,p.z);}}
 onUp(e){if(!this.enabled||this.drag?.id!==e.pointerId)return;const d=this.drag;this.drag=null;if(d.moved)return;const p=this.floorHit(e);if(p)this.navigate(p);}
 navigate(p){const route=this.interior.route({x:this.pos.x,z:this.pos.y},p);if(!route)return false;this.path=route.slice(1);return true;}
 roomDestination(r){
  if(!r?.point||!this.navigate(this.interior.frame.toScene(...r.point)))return false;
  if(r.focus){this.arrivalFocus=this.interior.frame.toScene(...r.focus);this.pitchAim=-.20;return true;}
  const q=innerRect(r.room.poly,.16),along=q.x1-q.x0>=q.y1-q.y0,L=Math.max(q.x1-q.x0,q.y1-q.y0),S=Math.min(q.x1-q.x0,q.y1-q.y0),layout=r.room.furniture??{};
  let u=L/2,v=S/2;if(r.room.kind==='living')v=.55;else if(r.room.kind==='bedroom')u=1.1;else if(r.room.kind==='kitchen'){u=Math.min(L-.85,3.6)/2;v=.4;}else if(r.room.kind==='bath'){u=.5;v=.4;}
  if(layout.flipU)u=L-u;if(layout.flipV)v=S-v;this.arrivalFocus=this.interior.frame.toScene(q.x0+(along?u:v),q.y0+(along?v:u));return true;
 }
 goToRoom(index){this.cancelRoute();return this.roomDestination(this.interior.nav.rooms[index]);}
 startTour(){this.cancelRoute();this.tour=true;this.tourIndex=0;return this.nextTourRoom();}
 nextTourRoom(){const rooms=this.interior.nav.rooms;while(this.tourIndex<rooms.length){const r=rooms[this.tourIndex++];if(this.roomDestination(r))return true;}this.tour=false;return false;}
 currentRoom(){if(!this.interior)return -1;const p=this.interior.frame.toPlan(this.pos.x,this.pos.y);return this.interior.nav.rooms.findIndex(r=>inside(r.room.poly,p.x,p.y));}
 update(dt){
  if(!this.enabled)return;dt=Math.min(Math.max(dt,0),.05);const k=this.keys;
  let forward=(k.has('KeyW')||k.has('ArrowUp')?1:0)-(k.has('KeyS')||k.has('ArrowDown')?1:0)-this.joy.y;
  let side=(k.has('KeyD')?1:0)-(k.has('KeyA')?1:0)+this.joy.x;
  const turn=(k.has('ArrowLeft')||k.has('KeyQ')?1:0)-(k.has('ArrowRight')||k.has('KeyE')?1:0);
  this.yawAim+=turn*1.15*dt;
  let vx=0,vz=0;
  if(forward||side){const n=Math.max(1,Math.hypot(forward,side));forward/=n;side/=n;vx=(-Math.sin(this.yaw)*forward+Math.cos(this.yaw)*side)*1.45;vz=(-Math.cos(this.yaw)*forward-Math.sin(this.yaw)*side)*1.45;}
  else if(this.path.length){
   let p=this.path[0],dx=p.x-this.pos.x,dz=p.z-this.pos.y,dist=Math.hypot(dx,dz);
   if(dist<.085){this.path.shift();if(!this.path.length){this.velocity.multiplyScalar(.1);this.dwell=0;}}
   else{const speed=Math.min(1.35,Math.sqrt(2*1.7*dist));vx=dx/dist*speed;vz=dz/dist*speed;if(!this.drag)this.yawAim+=clamp(angleDelta(this.yawAim,Math.atan2(-dx,-dz)),-.95*dt,.95*dt);}
  }else{if(this.arrivalFocus&&!this.drag){const dx=this.arrivalFocus.x-this.pos.x,dz=this.arrivalFocus.z-this.pos.y;if(Math.hypot(dx,dz)>.45)this.yawAim+=clamp(angleDelta(this.yawAim,Math.atan2(-dx,-dz)),-.75*dt,.75*dt);}
   if(this.tour){this.dwell+=dt;if(this.dwell>4.2){this.dwell=0;this.nextTourRoom();}}}
  const damp=1-Math.exp(-7*dt);this.velocity.lerp(new THREE.Vector2(vx,vz),damp);
  if(this.velocity.lengthSq()>.00001){const moved=this.interior.move(this.pos.x,this.pos.y,this.pos.x+this.velocity.x*dt,this.pos.y+this.velocity.y*dt);this.pos.set(moved.x,moved.z);}
  this.yaw+=clamp(angleDelta(this.yaw,this.yawAim)*(1-Math.exp(-11*dt)),-1.65*dt,1.65*dt);this.pitch+=(this.pitchAim-this.pitch)*(1-Math.exp(-11*dt));this.apply();
 }
 apply(){this.camera.position.set(this.pos.x,this.interior.baseY+EYE,this.pos.y);this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');}
 localState(){const f=this.interior.frame,p=f.toPlan(this.pos.x,this.pos.y),q=f.toPlan(this.pos.x-Math.sin(this.yaw),this.pos.y-Math.cos(this.yaw));return{x:p.x,y:p.y,dx:q.x-p.x,dy:q.y-p.y};}
}
