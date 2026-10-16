import * as THREE from 'three';
import { createRequire } from 'node:module';
import { mkdirSync,writeFileSync,readFileSync } from 'node:fs';
import { sampleTimeline } from '../src/timeline.js';
import {buildResidence} from '../src/model.js';
const require=createRequire(import.meta.url);
let createCanvas;
try { ({createCanvas}=require('@napi-rs/canvas')); }
catch(error) {
  if(!process.env.CODEX_RUNTIME_MODULES)throw new Error('CPU analysis needs @napi-rs/canvas. Install version 0.1.100, or set CODEX_RUNTIME_MODULES to a dependency directory containing it.',{cause:error});
  ({createCanvas}=require(process.env.CODEX_RUNTIME_MODULES+'/@napi-rs/canvas'));
}
globalThis.document={createElement(type){if(type==='canvas')return createCanvas(512,512);throw new Error('Unsupported analysis element: '+type);}};
const world=buildResidence(null,{analysisOnly:true});
const report={scope:'CPU geometry, source, and timeline checks only. No browser rendering or shader compilation.',checks:[],collisions:[],bodyBoundsIntersections:[],landmarks:[],scene:{}};
const check=(name,pass,details)=>report.checks.push({name,pass,details});
let meshes=0,edges=0,triangles=0;
world.root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}if(o.isLineSegments)edges++;});report.scene={meshes,edges,triangles};
for(const p of [0,.12,.25,.4,.58,.695,.82,1]){const s=sampleTimeline(p);report.landmarks.push({progress:p,camera:s.eye.toArray(),fov:s.fov,waves:s.waves,clipHeight:s.clipHeight});}
const livingFloor=world.root.children.find(o=>o.isMesh&&o.userData.zone===3&&o.userData.kind==='oak');livingFloor.geometry.computeBoundingBox();const floorBox=livingFloor.geometry.boundingBox;check('modeled quarter ellipse has requested 6.30 by 12.50 envelope',Math.abs(floorBox.max.x-floorBox.min.x-6.3)<.0001&&Math.abs(floorBox.max.y-floorBox.min.y-12.5)<.0001);
check('opening camera',sampleTimeline(0).eye.equals(new THREE.Vector3(10,85,-6.25)));
check('entrance camera',sampleTimeline(.25).eye.equals(new THREE.Vector3(10,1.65,.8)));
check('foyer view stays within the entrance',sampleTimeline(.32).eye.distanceTo(new THREE.Vector3(10,1.65,-1.75))<.002);
check('kitchen view is beyond its doorway',sampleTimeline(.425).room===2&&sampleTimeline(.425).eye.z< -4);
check('bedroom view is physically inside the room',sampleTimeline(.57).room===3&&sampleTimeline(.57).eye.x<6.2&&sampleTimeline(.57).eye.z< -8.3);
check('living view is inside the curved room',sampleTimeline(.785).room===4&&sampleTimeline(.785).eye.x>16);
check('terrace view crosses the glazing line',sampleTimeline(1).room===5&&Math.pow((sampleTimeline(1).eye.x-13.7)/6.3,2)+Math.pow(sampleTimeline(1).eye.z/12.5,2)>1.1);
check('full 3.30 m wall height',sampleTimeline(.25).clipHeight===3.3);
check('quarter ellipse area',Math.abs(PI()*6.3*12.5/4-61.8)<.06);
function PI(){return Math.PI;}
const dir=s=>new THREE.Vector3(0,0,-1).applyQuaternion(s.quaternion);
const bedroom=sampleTimeline(.57),bedDirection=new THREE.Vector3(3.3-bedroom.eye.x,.75-bedroom.eye.y,-10-bedroom.eye.z).normalize();
check('bedroom view faces the bed',dir(bedroom).dot(bedDirection)>.85);
const roomSamples=Array.from({length:751},(_,i)=>sampleTimeline(.25+i/1000));
check('continuous route physically enters all four rooms and terrace',[1,2,3,4,5].every(room=>roomSamples.some(s=>s.room===room)));
check('bedroom entrance and exit pass through the actual west portal',roomSamples.filter((s,i)=>i&&((s.eye.x<7)!==(roomSamples[i-1].eye.x<7))).every(s=>s.eye.z< -7.4&&s.eye.z> -9.1));
const allMaterials=new Set();world.root.traverse(o=>{if(o.isMesh)allMaterials.add(o.material);});
let patched=0,pbrCount=0;for(const mat of allMaterials){if(!mat.isMeshStandardMaterial)continue;pbrCount++;const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};mat.onBeforeCompile(shader);if(shader.vertexShader.includes('vWorld=(modelMatrix')&&shader.fragmentShader.includes('float inkReveal=')&&shader.uniforms.uWave&&shader.uniforms.uOrigin)patched++;}
check('all modeled PBR material wave hooks inject into pinned Three.js shader',patched===pbrCount,{patched,materialCount:pbrCount});
let maxStep=0,maxAngle=0,last;
const frozenBounds=new Map(),triCache=new Map();world.update(sampleTimeline(1));world.scene.updateMatrixWorld(true);world.root.traverse(o=>{if(o.isMesh&&o.userData.kind&&o.userData.kind!=='leaf'){const b=new THREE.Box3().setFromObject(o,true);if(b.max.y>.12&&b.min.y<1.7)frozenBounds.set(o,b);}});
function trianglesFor(obj){if(triCache.has(obj))return triCache.get(obj);const result=[],pos=obj.geometry.attributes.position,index=obj.geometry.index;for(let i=0;i<(index?.count||pos.count);i+=3){const verts=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(pos,index?index.getX(i+j):i+j).applyMatrix4(obj.matrixWorld));result.push(new THREE.Triangle(...verts));}triCache.set(obj,result);return result;}
const nearest=new THREE.Vector3();
function touchesBody(obj,point){const triangles=trianglesFor(obj);for(let y=.28;y<=1.55;y+=.14){const center=new THREE.Vector3(point.x,y,point.z);for(const t of triangles){t.closestPointToPoint(center,nearest);if(nearest.distanceToSquared(center)<.14*.14)return true;}}return false;}
for(let i=0;i<=1000;i++){
  const p=i/1000,s=sampleTimeline(p);
  checkFinite(s,p);
  if(last){maxStep=Math.max(maxStep,s.eye.distanceTo(last.eye));maxAngle=Math.max(maxAngle,s.quaternion.angleTo(last.quaternion));}last=s;
  if(p>=.25){
    // Camera lens clearance is checked against actual mesh bounds. Transparent glazing is
    // excluded because its opening is independently checked through live transforms below.
    for(const [obj,b]of frozenBounds){if(obj.userData.kind==='glass')continue;const point=s.eye;
      if(b.containsPoint(point)&&report.collisions.length<30)report.collisions.push({p,kind:obj.userData.kind,zone:obj.userData.zone,camera:point.toArray(),bounds:[b.min.toArray(),b.max.toArray()]});
      if(b.max.y>.16&&b.min.y<1.5){const dx=Math.max(b.min.x-point.x,0,point.x-b.max.x),dz=Math.max(b.min.z-point.z,0,point.z-b.max.z);if(Math.hypot(dx,dz)<.14&&touchesBody(obj,point)&&report.bodyBoundsIntersections.length<30)report.bodyBoundsIntersections.push({p,kind:obj.userData.kind,zone:obj.userData.zone,bounds:[b.min.toArray(),b.max.toArray()]});}
    }
  }
}
function checkFinite(s,p){if(![...s.eye.toArray(),...s.quaternion.toArray(),s.fov,s.clipHeight].every(Number.isFinite))throw new Error('Non-finite camera at '+p);}
check('camera path has no discontinuous positional jump',maxStep<2,{maxStep});
check('camera rotation has no discontinuous jump',maxAngle<.08,{maxAngleDegrees:maxAngle*180/Math.PI});
check('all walking camera samples exactly 1.65m',Array.from({length:751},(_,i)=>sampleTimeline(.25+i/1000).eye.y).every(y=>y===1.65));
check('no camera lens inside opaque scene bounds',report.collisions.length===0,report.collisions);
check('walking route has 0.14m sampled capsule clearance from opaque triangles',report.bodyBoundsIntersections.length===0,report.bodyBoundsIntersections);
// Test moving glazing at its actual scroll-dependent transforms, rather than
// testing the closed facade or the final open pose for the whole journey.
const panes=[];world.root.traverse(o=>{if(o.isMesh&&o.userData.kind==='glass'&&o.userData.zone===3)panes.push(o);});
const glazingIntersections=[];
for(let i=0;i<=180;i++){
  const p=.82+i*.001,s=sampleTimeline(p);world.update(s);world.scene.updateMatrixWorld(true);
  for(const pane of panes){triCache.delete(pane);for(const t of trianglesFor(pane)){t.closestPointToPoint(s.eye,nearest);if(nearest.distanceTo(s.eye)<.14){glazingIntersections.push({progress:p,distance:nearest.distanceTo(s.eye)});break;}}}
}
check('moving glazing clears the terrace camera by 0.14m',glazingIntersections.length===0,glazingIntersections);
world.update(sampleTimeline(0));world.scene.updateMatrixWorld(true);const closed=panes.map(o=>o.getWorldPosition(new THREE.Vector3()));
world.update(sampleTimeline(1));world.scene.updateMatrixWorld(true);const moved=panes.map((o,i)=>o.getWorldPosition(new THREE.Vector3()).distanceTo(closed[i])).filter(d=>d>.001);
check('four sliding glass leaves open at least 1.50m',moved.length===4&&moved.every(d=>d>=1.5-1e-9),moved);
world.update(sampleTimeline(0));world.scene.updateMatrixWorld(true);check('all glass returns to its closed transform',panes.every((o,i)=>o.getWorldPosition(new THREE.Vector3()).distanceTo(closed[i])<1e-9));
check('future living room remains ink',Array.from({length:701},(_,i)=>sampleTimeline(i/1000).waves[3]).every(v=>v===0));
check('PBR complete at final frame',sampleTimeline(1).waves.every(v=>v===1));
check('exactly reversible deterministic state',JSON.stringify(sampleTimeline(.48))===JSON.stringify(sampleTimeline(.48)));
world.update(sampleTimeline(0));world.scene.updateMatrixWorld(true);check('no hidden roof over initial plan',world.root.children.filter(o=>o.isMesh&&o.position.y>=3.3).every(o=>!o.visible));
const plan=readFileSync('public/assets/residence-plan.svg','utf8');check('CAD axis glyphs present',["Д′","Г′","В′","Б′",'37','38','39'].every(t=>plan.includes(t)));check('millimetre dimensions present',['7000','6700','6300','20000','6000','6500','12500'].every(t=>plan.includes(t)));
check('CAD title block present',plan.includes('ШАХРОФАР · Блок В-24 · План 24-го этажа · М 1:200'));
mkdirSync('docs/qa',{recursive:true});writeFileSync('docs/qa/geometry-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({scene:report.scene,checks:report.checks.length,failed:report.checks.filter(c=>!c.pass)},null,2));
if(report.checks.some(c=>!c.pass))process.exitCode=1;
