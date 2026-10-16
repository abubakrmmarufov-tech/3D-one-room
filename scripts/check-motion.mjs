import fs from'node:fs';import assert from'node:assert/strict';import * as THREE from'three';import{createNavigation}from'../src/navigation.js';import{collectFurniture}from'../src/furniture-layout.js';import{WalkControls}from'../src/walk.js';
globalThis.addEventListener=()=>{};globalThis.document={addEventListener(){}};
const plans=JSON.parse(fs.readFileSync('src/model/plans.json')),report=[];
const frame={toScene:(x,y)=>({x,z:-y}),toPlan:(x,z)=>({x,y:-z})};
for(const[key,p]of Object.entries(plans))for(const[unit,a]of p.apartments.entries()){
 const obstacles=a.rooms.flatMap(r=>collectFurniture(r,2.8).obstacles),nav=createNavigation(p,a,obstacles),walk=new WalkControls(new THREE.PerspectiveCamera(),{addEventListener(){}});
 assert(nav.spawn);const interior={nav,frame,baseY:0,spawn:{x:nav.spawn[0],z:-nav.spawn[1],yaw:0},route:(f,t)=>nav.route([f.x,-f.z],[t.x,-t.z])?.map(q=>frame.toScene(...q)),move:(x,z,nx,nz)=>frame.toScene(...nav.move([x,-z],[nx,-nz]))};
 walk.start(interior,new THREE.Scene());let failures=[];
 for(const r of nav.rooms){assert(walk.goToRoom(r.index),`No route ${key}/${unit}/${r.index}`);let seconds=0;while(walk.path.length&&seconds<120){walk.update(1/60);seconds+=1/60;assert(nav.clear(walk.pos.x,-walk.pos.y),`Collision ${key}/${unit}/${r.index}`);}if(walk.path.length)failures.push({room:r.index,remaining:walk.path.length,pos:[walk.pos.x,-walk.pos.y],goal:r.point});}
 report.push({plan:key,unit,rooms:nav.rooms.length,failures});walk.stop();
}
fs.writeFileSync('docs/qa/motion.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.filter(r=>r.failures.length),null,2));assert.equal(report.reduce((n,r)=>n+r.failures.length,0),0,'Walking stalled');console.log('Movement completed for all apartment room sequences');
