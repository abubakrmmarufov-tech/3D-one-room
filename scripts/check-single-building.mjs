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
import {windowDressing,joinedWindowPaths} from '../src/window-dressing.js';
import {materialVariant,refreshMaterialVariants} from '../src/material-variants.js';
import {interiorNearPlane} from '../src/camera-clearance.js';
import {roomPartitions,apartmentEntrance} from '../src/interior-shell.js';
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
const bedroom=apt.rooms.find(r=>r.kind==='bedroom'),bed=collectFurniture(bedroom,2.8,{}, {...bedroom.furniture,showcase:true});
const obstacles=apt.rooms.flatMap(r=>r===living?hero.obstacles:r===bedroom?bed.obstacles:collectFurniture(r,2.8).obstacles),nav=createNavigation(plans.B,apt,obstacles);
assert(nav.clear(...hero.presentation.standing),'Presentation position must be clear of walls and furniture');
assert(nav.route(nav.spawn,hero.presentation.standing),'Presentation position must be connected to the entrance');
assert(nav.clear(...bed.presentation.standing),'Bedroom presentation point is clear');
assert(nav.route(nav.spawn,bed.presentation.standing),'Bedroom presentation connects to the entrance');
const cloth=bed.commands.filter(c=>c.type==='surface');
assert.equal(cloth.length,2,'Duvet and runner use draped geometry');
for(const {args:[,surface]}of cloth){
 assert(surface.positions.every(Number.isFinite));
 for(let i=0;i<surface.positions.length;i+=3)assert(inside(bedroom.poly,surface.positions[i],-surface.positions[i+2]),'Bedding stays inside the source room');
 for(let i=0;i<surface.indices.length;i+=3){
  const [a,b,c]=surface.indices.slice(i,i+3).map(n=>surface.positions.slice(n*3,n*3+3));
  assert((b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2])>0,'Textile faces point upwards');
 }
}
const foot=bed.presentation.bedFootprint;
assert(!nav.clear((foot[0][0]+foot[1][0])/2,(foot[0][1]+foot[1][1])/2),'Draped bedding overhang blocks walking');
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
const bedroomWindows=plans.B.windows.filter(w=>w.some(p=>distToPolygon(bedroom.poly,...p)<.35)),joined=joinedWindowPaths(bedroomWindows);
assert.equal(bedroomWindows.length,2);assert.equal(joined.length,1,'Adjacent bedroom glazing uses one curtain track');
assert.equal(joinedWindowPaths([[[0,0],[.1,0],[.1,1],[0,1]],[[0,1.3],[.1,1.3],[.1,2],[0,2]]]).length,2,'Curtain tracks must not bridge a solid wall');
const bedroomDressing=windowDressing(joined[0],bedroom,2.8);
assert.equal(bedroomDressing.panels.length,2);
for(const panel of bedroomDressing.panels)for(const p of panel.footprint)assert(inside(bedroom.poly,...p),'Bedroom curtains stay inside the source room');
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
let geometry,wallOcclusionSamples=0,nearPlaneSamples=0,partitionSightlines=0;
try{
 const {prepareInteriorMaterials}=await server.ssrLoadModule('/src/interior-materials.js'),materials=prepareInteriorMaterials();
 const {buildFloor}=await server.ssrLoadModule('/src/floor.js'),{apartments,aptsOnFloor}=await server.ssrLoadModule('/src/data.js');
 const unit=apartments.find(a=>a.id==='B12-0'),built=buildFloor('B',12,aptsOnFloor('B',12),unit);
 const bedroomStop=built.nav.rooms.find(r=>r.room.kind==='bedroom');
 assert(bedroomStop.focus,'Actual dressed bedroom has a deliberate tour viewpoint');
 assert.deepEqual(bedroomStop.point,bed.presentation.standing);assert.equal(bedroomStop.pitch,-.24);
 const bedsideLights=built.group.children.filter(l=>l.isPointLight&&l.distance===3);
 assert.equal(bedsideLights.length,2,'Both bedside lamps have local light sources');
 built.setLighting(0);const dayPower=bedsideLights.map(l=>l.intensity);built.setLighting(1);
 assert(bedsideLights.every((l,i)=>l.intensity>dayPower[i]*5),'Bedside lighting follows the shared day-night state');
 // Test the rendered shell, not just material settings: rays from valid walking
 // positions must hit the actual wall faces at low, eye and ceiling height.
 for(const m of[materials.plaster,materials.ceiling]){
  assert.equal(m.transparent,false);assert.equal(m.opacity,1);
  assert.equal(m.depthWrite,true);assert.equal(m.depthTest,true);
 }
 const walls=built.group.children.filter(m=>m.isMesh&&m.material===materials.plaster),ray=new THREE.Raycaster();
 assert(walls.length,'Solid wall geometry is present');
 // Source room fills leave gaps beside the stepped structural wall. Verify
 // the actual tile triangles cover those exposed floor edges.
 for(const [x,y]of[[-11.75,.28],[-10.1,.32],[-9.25,.32]]){
  ray.set(built.group.localToWorld(new THREE.Vector3(x,.3,-y)),new THREE.Vector3(0,-1,0));ray.near=0;ray.far=.4;
  assert.equal(ray.intersectObjects(built.floorMeshes,false)[0]?.object.material,materials.tile,'WC tile finish must reach the surrounding wall faces');
 }
 assert.equal(roomPartitions(plans.B).length,6,'Six room/apartment boundaries require infill below the extracted beams');
 for(const poly of roomPartitions(plans.B)){
  const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),along=x1-x0>y1-y0;
  for(const t of[.15,.5,.85])for(const height of[.45,1.65,2.1])for(const sign of[-1,1]){
   const x=along?x0+(x1-x0)*t:(x0+x1)/2,y=along?(y0+y1)/2:y0+(y1-y0)*t,offset=(along?y1-y0:x1-x0)/2+.3;
   const from=built.group.localToWorld(new THREE.Vector3(x+(along?0:sign*offset),height,-(y+(along?sign*offset:0)))),to=built.group.localToWorld(new THREE.Vector3(x,height,-y));
   ray.set(from,to.sub(from).normalize());ray.near=0;ray.far=offset+.02;
   assert(ray.intersectObjects(walls,false).length,'Sightline through a missing room/apartment partition');partitionSightlines++;
  }
 }
 const entrance=apartmentEntrance(plans.B,apt);
 assert(entrance,'Apartment entrance must be identified from its real doorway');
 assert(!built.nav.clear(entrance.x,entrance.y),'The closed entrance must block walking');
 assert.equal(built.group.children.filter(m=>m.name==='Главный вход').length,1,'A single Russian entrance label');
 for(const sign of[-1,1]){
  const {x,y,along}=entrance,from=built.group.localToWorld(new THREE.Vector3(x+(along?0:sign*.3),1.3,-(y+(along?sign*.3:0)))),to=built.group.localToWorld(new THREE.Vector3(x,1.3,-y));
  ray.set(from,to.sub(from).normalize());ray.far=.32;
  assert(ray.intersectObjects(built.group.children.filter(m=>m.material===materials.walnut),false).length,'Entrance leaf must be opaque from both sides');
 }
 for(const poly of[...built.plan.walls,...built.plan.struct])for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  if(length<.08)continue;
  for(const t of[.2,.5,.8])for(const sign of[-1,1]){
   const x=a[0]+dx*t,y=a[1]+dy*t,px=x+sign*dy/length*.24,py=y-sign*dx/length*.24;
   if(!built.nav.clear(px,py))continue;
   for(const height of[.4,1.65,built.H-.1]){
    const from=built.group.localToWorld(new THREE.Vector3(px,height,-py)),to=built.group.localToWorld(new THREE.Vector3(x,height,-y));
    ray.set(from,to.sub(from).normalize());ray.near=0;ray.far=.26;
    assert(ray.intersectObjects(walls,false).length,`Opaque wall face missing near ${x}, ${y} at ${height}`);
    wallOcclusionSamples++;
   }
  }
 }
 assert(wallOcclusionSamples>100,'Wall occlusion sampling covers the apartment');
 // A near-plane corner must remain within half the collision radius in every
 // orientation; this catches see-through clipping after a wide-screen resize.
 const camera=new THREE.PerspectiveCamera(65,1,.1,1800);
 for(const aspect of[.33,.46,.75,1,16/9,844/390,32/9,6])for(const pitch of[-1.05,0,1.05])for(const yaw of[0,.7,1.57]){
  camera.aspect=aspect;camera.near=interiorNearPlane(camera.fov,aspect,built.nav.radius);camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  for(const x of[-1,1])for(const y of[-1,1]){
   const corner=new THREE.Vector3(x,y,-1).unproject(camera);
   assert(corner.length()<=built.nav.radius*.5+1e-7,'Near plane can cut through a collision wall');nearPlaneSamples++;
  }
 }
 for(const timing of[[1/60],[1/30],[1/60,1/30,.05,1/60]]){
 walk.start(built,new THREE.Scene());
 for(const r of built.nav.rooms){
  assert(walk.goToRoom(r.index),`Dressed showcase route ${r.index}`);
  for(let i=0;walk.path.length&&i<7200;i++){walk.update(timing[i%timing.length]);const p=built.frame.toPlan(walk.pos.x,walk.pos.y);assert(built.nav.clear(p.x,p.y),'Dressed room collision');}
  assert.equal(walk.path.length,0,`Dressed showcase route stalled: ${r.index}`);
 }
 walk.stop();
 }
 geometry={meshes:0,triangles:0,bytes:0};
 built.group.traverse(m=>{if(!m.isMesh)return;geometry.meshes++;const g=m.geometry;geometry.triangles+=(g.index?.count??g.attributes.position.count)/3;geometry.bytes+=(g.index?.array.byteLength??0)+Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0);});
 assert(geometry.meshes<60,'Showcase geometry should stay batched');
 assert(geometry.triangles<180000,'Active apartment triangle budget');
 built.dispose();
}finally{await server.close();}
const report={tower:'B',apartments:catalog.length,residentialFloors:16,modelBytes:fs.statSync('public/models/shahrofar.glb').size,modelNodes:root.listNodes().length,modelMeshes:root.listMeshes().length,showcaseRoomsReachable:nav.rooms.length,showcaseFurnitureParts:hero.commands.length};
report.showcaseGeometry=geometry;
report.curvedCurtainPanels=dressing.panels.length;report.lateMaterialMapsVerified=true;
report.wallOcclusionSamples=wallOcclusionSamples;report.nearPlaneSamples=nearPlaneSamples;
report.partitionSightlines=partitionSightlines;report.closedEntranceVerified=true;
report.bedroomFurnitureParts=bed.commands.length;report.bedroomTextileTriangles=cloth.reduce((n,c)=>n+c.args[1].indices.length/3,0);
report.bedroomCurtainPanels=bedroomDressing.panels.length;report.bedroomPresentationVerified=true;report.dressedRouteTimingProfiles=3;
fs.writeFileSync('docs/qa/single-building.json',JSON.stringify(report,null,2)+'\n');console.log(report);
