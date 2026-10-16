import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {createNavigation} from '../src/navigation.js';
import {collectFurniture} from '../src/furniture-layout.js';
import {WalkControls} from '../src/walk.js';
import {windowPath} from '../src/window-path.js';
import {inside,distToPolygon} from '../src/geometry.js';
import {createServer} from 'vite';
import {showcaseFrame} from '../src/showcase-room.js';
import {windowDressing} from '../src/window-dressing.js';
import {materialVariant,refreshMaterialVariants} from '../src/material-variants.js';
const read=p=>JSON.parse(fs.readFileSync(p)),complex=read('src/model/complex.json'),plans=read('src/model/plans.json'),catalog=read('src/model/apartment-catalog.json');
assert.deepEqual(complex.towers.map(t=>t.key),['B']);assert.deepEqual(Object.keys(plans),['B']);
assert.equal(complex.towers[0].floors.length,16);assert.equal(catalog.length,128);
assert(catalog.every(a=>a.tower==='B'&&/^B\d+-\d+$/.test(a.id)));
assert.deepEqual(catalog.find(a=>a.id==='B12-0'),{id:'B12-0',tower:'B',number:57,floor:12,rooms:2,area:125.08});
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
await MeshoptDecoder.ready;const doc=await io.read('public/models/shahrofar.glb');
const root=doc.getRoot();
assert(root.listNodes().length>100);
for(const n of root.listNodes())assert(!['A','V'].includes(n.getExtras().tower)&&!/^([AV] |Hotel terrace|Sign [EHLOT]$)/.test(n.getName()),`Removed building node: ${n.getName()}`);
for(const mesh of root.listMeshes())assert(mesh.listParents().some(p=>p.propertyType==='Node'),'Orphaned building mesh');
const apt=plans.B.apartments[0],living=apt.rooms.find(r=>r.kind==='living'),hero=collectFurniture(living,2.8,{}, {...living.furniture,showcase:true});
const obstacles=apt.rooms.flatMap(r=>r===living?hero.obstacles:collectFurniture(r,2.8).obstacles),nav=createNavigation(plans.B,apt,obstacles);
assert(nav.clear(...hero.presentation.standing),'Presentation position must be clear of walls and furniture');
assert(nav.route(nav.spawn,hero.presentation.standing),'Presentation position must be connected to the entrance');
const {L,uv}=showcaseFrame(living);
assert(!nav.clear(...uv(L*.5+.66,1.98)),'Walking must respect the tabletop overhang beyond its pedestal');
globalThis.addEventListener=()=>{};globalThis.document={addEventListener(){}};
const frame={toScene:(x,y)=>({x,z:-y}),toPlan:(x,z)=>({x,y:-z})},walk=new WalkControls(new THREE.PerspectiveCamera(),{addEventListener(){}});
const room=nav.rooms.find(r=>r.room===living);room.point=hero.presentation.standing;room.focus=hero.presentation.focus;
const interior={nav,frame,baseY:0,spawn:{x:nav.spawn[0],z:-nav.spawn[1],yaw:0},route:(f,t)=>nav.route([f.x,-f.z],[t.x,-t.z])?.map(q=>frame.toScene(...q)),move:(x,z,nx,nz)=>frame.toScene(...nav.move([x,-z],[nx,-nz]))};
walk.start(interior,new THREE.Scene());
for(const r of nav.rooms){
 assert(walk.goToRoom(r.index),`Showcase route ${r.index}`);
 for(let i=0;walk.path.length&&i<7200;i++){walk.update(1/60);assert(nav.clear(walk.pos.x,-walk.pos.y),'Showcase collision');}
 assert.equal(walk.path.length,0,`Showcase route stalled: ${r.index}`);
}
walk.stop();
const curved=plans.B.windows.find(w=>w.length>20&&w.some(p=>distToPolygon(living.poly,...p)<.35)),path=windowPath(curved);
assert(path?.length>2,'Curved window must have a frame following its boundary');
for(const [x,y]of path)assert(inside(curved,x,y)||distToPolygon(curved,x,y)<.025,'Window frames must stay within the glazing ribbon');
const dressing=windowDressing(path,living,2.8);
assert.equal(dressing.panels.length,2,'Curved bay has a gathered panel at each end');
for(const panel of dressing.panels){
 assert(panel.positions.every(Number.isFinite),'Curtains have finite geometry');
 assert(Math.max(...panel.indices)<panel.positions.length/3,'Curtain indices stay within their vertices');
 for(const [x,y]of panel.footprint)assert(inside(living.poly,x,y),'Curtains stay inside the actual living-room outline');
}
// Reproduce entering before optional maps finish; late maps must update accent
// upholstery without resetting its tint or locally generated weave bump.
const source=new THREE.MeshPhysicalMaterial({color:0xeeeeee}),bump=new THREE.Texture();
const early=materialVariant(source,{color:0x717968,bumpMap:bump});
assert.equal(early.normalMap,null);
source.normalMap=new THREE.Texture();source.roughnessMap=new THREE.Texture();
refreshMaterialVariants(source);
const late=materialVariant(source,{color:0x717968,bumpMap:bump});
for(const material of[early,late]){
 assert.equal(material.normalMap,source.normalMap);assert.equal(material.roughnessMap,source.roughnessMap);
 assert.equal(material.color.getHex(),0x717968);assert.equal(material.bumpMap,bump);
}
early.dispose();late.dispose();source.normalMap.dispose();source.roughnessMap.dispose();bump.dispose();source.dispose();
// Build the actual merged rendering geometry with a canvas drawing stub. Browser
// screenshots verify appearance; these budgets catch accidental mesh explosions.
const ctx=new Proxy({createRadialGradient(){return{addColorStop(){}};}},{get:(o,k)=>o[k]??(()=>{})});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
let geometry;
try{
 const {prepareInteriorMaterials}=await server.ssrLoadModule('/src/interior-materials.js');prepareInteriorMaterials();
 const {buildFloor}=await server.ssrLoadModule('/src/floor.js'),{apartments,aptsOnFloor}=await server.ssrLoadModule('/src/data.js');
 const unit=apartments.find(a=>a.id==='B12-0'),built=buildFloor('B',12,aptsOnFloor('B',12),unit);
 walk.start(built,new THREE.Scene());
 for(const r of built.nav.rooms){
  assert(walk.goToRoom(r.index),`Dressed showcase route ${r.index}`);
  for(let i=0;walk.path.length&&i<7200;i++){walk.update(1/60);const p=built.frame.toPlan(walk.pos.x,walk.pos.y);assert(built.nav.clear(p.x,p.y),'Dressed room collision');}
  assert.equal(walk.path.length,0,`Dressed showcase route stalled: ${r.index}`);
 }
 walk.stop();
 geometry={meshes:0,triangles:0,bytes:0};
 built.group.traverse(m=>{if(!m.isMesh)return;geometry.meshes++;const g=m.geometry;geometry.triangles+=(g.index?.count??g.attributes.position.count)/3;geometry.bytes+=(g.index?.array.byteLength??0)+Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0);});
 assert(geometry.meshes<60,'Showcase geometry should stay batched');
 assert(geometry.triangles<180000,'Active apartment triangle budget');
 built.dispose();
}finally{await server.close();}
const report={tower:'B',apartments:catalog.length,residentialFloors:16,modelBytes:fs.statSync('public/models/shahrofar.glb').size,modelNodes:root.listNodes().length,modelMeshes:root.listMeshes().length,showcaseRoomsReachable:nav.rooms.length,showcaseFurnitureParts:hero.commands.length};
report.showcaseGeometry=geometry;
report.curvedCurtainPanels=dressing.panels.length;report.lateMaterialMapsVerified=true;
fs.writeFileSync('docs/qa/single-building.json',JSON.stringify(report,null,2)+'\n');console.log(report);
