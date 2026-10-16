import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PLANS, planFrame, towerByKey } from './config.js';
import { bounds, inside, interiorPoint, distToPolygon, polygonArea } from './geometry.js';
import { interiorMaterials } from './interior-materials.js';
import { furnishRoom } from './furnishings.js';
import { createNavigation } from './navigation.js';
import { furnitureObstacle } from './furniture-layout.js';
const byColor=new Map();
function mat(value){if(typeof value!=='number')return value;if(!byColor.has(value))byColor.set(value,new THREE.MeshStandardMaterial({color:value,roughness:.84}));return byColor.get(value);}
const straightWindow=w=>{const b=bounds(w);return w.length<=5&&polygonArea(w)>.9*(b.x1-b.x0)*(b.y1-b.y0);};
const shape=p=>new THREE.Shape(p.map(([x,y])=>new THREE.Vector2(x,y)));
function flat(p,y){const g=new THREE.ShapeGeometry(shape(p));g.rotateX(-Math.PI/2);g.translate(0,y,0);return g;}
function prism(p,y0,y1){const g=new THREE.ExtrudeGeometry(shape(p),{depth:y1-y0,bevelEnabled:false,curveSegments:1});g.rotateX(-Math.PI/2);g.translate(0,y0,0);return g;}
class Batch{
 constructor(){this.parts=new Map();this.obstacles=[];this.record=false;}
 add(m,g){m=mat(m);if(!this.parts.has(m))this.parts.set(m,[]);this.parts.get(m).push(g);}
 box(m,x0,y0,x1,y1,z0,z1,soft=false){
  const w=Math.abs(x1-x0),d=Math.abs(y1-y0),h=z1-z0;if(w<.001||d<.001||h<.001)return;
  const g=soft?new RoundedBoxGeometry(w,h,d,2,Math.min(.035,w/5,d/5,h/3)):new THREE.BoxGeometry(w,h,d);
  g.translate((x0+x1)/2,(z0+z1)/2,-(y0+y1)/2);this.add(m,g);
  if(this.record){const o=furnitureObstacle(x0,y0,x1,y1,z0,z1);if(o)this.obstacles.push(o);}
 }
 cyl(m,x,y,r,z0,z1,seg=24){const g=new THREE.CylinderGeometry(r,r,z1-z0,seg);g.translate(x,(z0+z1)/2,-y);this.add(m,g);if(this.record&&r>.2&&z0<.85&&z1>.28)this.obstacles.push(Array.from({length:12},(_,i)=>[x+r*Math.cos(i*Math.PI/6),y+r*Math.sin(i*Math.PI/6)]));}
 ball(m,x,y,r,z,sx=1,sy=1,sz=1){const g=new THREE.SphereGeometry(r,12,8);g.scale(sx,sy,sz);g.translate(x,z,-y);this.add(m,g);}
 strip(m,a,b,width,y0,y1){const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<.08)return;const g=new THREE.BoxGeometry(L,y1-y0,width);g.rotateY(Math.atan2(b[1]-a[1],b[0]-a[0]));g.translate((a[0]+b[0])/2,(y0+y1)/2,-(a[1]+b[1])/2);this.add(m,g);}
 build(group,own){for(const [m,list]of this.parts){const geos=list.map(g=>g.index?g.toNonIndexed():g),g=mergeGeometries(geos,false);for(const x of new Set([...list,...geos]))x.dispose();own.push(g);const mesh=new THREE.Mesh(g,m);mesh.castShadow=!m.transparent;mesh.receiveShadow=true;group.add(mesh);}}
}
export function buildFloor(towerKey,floor,apts,walk=null){
 const S=interiorMaterials(),tower=towerByKey[towerKey],fl=tower.floors.find(f=>f.floor===floor),plan=PLANS[fl.plan],frame=planFrame(tower),baseY=fl.z+tower.slab,H=fl.h-.5;
 const group=new THREE.Group();group.position.set(frame.position.x,baseY,frame.position.z);group.rotation.y=frame.rotY;
 const own=[],floorMeshes=[],B=new Batch(),shown=walk?[walk]:apts;
 const mountWalls=[...plan.walls,...plan.struct];
 B.canMountAt=(x,y)=>mountWalls.some(w=>distToPolygon(w,x,y)<.22);
 for(const apt of shown){
  const base=flat(apt.data.outline,.002);own.push(base);const baseMesh=new THREE.Mesh(base,S.oak);baseMesh.receiveShadow=true;group.add(baseMesh);floorMeshes.push(baseMesh);
  for(const threshold of apt.data.thresholds??[])B.add(S.stone,flat(threshold,.007));
  for(const room of apt.data.rooms){
   const tiled=['bath','storage','loggia'].includes(room.kind);
   // Room polygons overlap slightly at door thresholds; separate their finish layers.
   const g=flat(room.poly,tiled?.018:room.kind==='hall'?.006:.012);own.push(g);const m=new THREE.Mesh(g,tiled?S.tile:S.oak);m.receiveShadow=true;m.userData={apt,room};group.add(m);floorMeshes.push(m);
   B.record=!!walk;furnishRoom(B,room,H);B.record=false;
  }
  for(const b of apt.data.balconies){const g=flat(b.poly,.012);own.push(g);const m=new THREE.Mesh(g,S.stone);m.receiveShadow=true;group.add(m);floorMeshes.push(m);furnishRoom(B,{...b,kind:'balcony'},H);}
 }
 if(!walk)for(const c of plan.common??[])B.add(S.stone,flat(c,.004));
 for(const w of [...plan.walls,...plan.struct]){
  B.add(S.plaster,prism(w,0,H));
  for(let i=0;i<w.length;i++)B.strip(S.stone,w[i],w[(i+1)%w.length],.025,.012,.095);
 }
 for(const opening of plan.doorways??[]){
  const b=bounds(opening);B.add(S.plaster,prism(opening,2.16,H));
  if(b.x1-b.x0>b.y1-b.y0){B.box(S.walnut,b.x0-.035,b.y0-.025,b.x0+.025,b.y1+.035,.01,2.17);B.box(S.walnut,b.x1-.025,b.y0-.035,b.x1+.045,b.y1+.025,.01,2.17);B.box(S.walnut,b.x0-.035,b.y0-.025,b.x1+.035,b.y1+.025,2.12,2.18);}
  else{B.box(S.walnut,b.x0-.025,b.y0-.035,b.x1+.035,b.y0+.025,.01,2.17);B.box(S.walnut,b.x0-.035,b.y1-.025,b.x1+.035,b.y1+.045,.01,2.17);B.box(S.walnut,b.x0-.025,b.y0-.035,b.x1+.025,b.y1+.035,2.12,2.18);}
 }
 for(const w of plan.beams??[])B.add(S.plaster,prism(w,H-.38,H));
 for(const w of plan.windows){
  B.add(S.plaster,prism(w,0,.85));B.add(S.glass,prism(w,.85,H-.35));B.add(S.plaster,prism(w,H-.35,H));
  const b=bounds(w),along=b.x1-b.x0>b.y1-b.y0,L=along?b.x1-b.x0:b.y1-b.y0;
  if(L>.35&&straightWindow(w)){const a=along?[b.x0,(b.y0+b.y1)/2]:[(b.x0+b.x1)/2,b.y0],z=along?[b.x1,(b.y0+b.y1)/2]:[(b.x0+b.x1)/2,b.y1];
   B.strip(S.bronze,a,z,.045,.84,.88);B.strip(S.bronze,a,z,.045,H-.38,H-.34);
   for(let k=0;k<=Math.ceil(L/1.3);k++){const f=k/Math.ceil(L/1.3),x=a[0]+(z[0]-a[0])*f,y=a[1]+(z[1]-a[1])*f;B.box(S.bronze,x-.018,y-.018,x+.018,y+.018,.87,H-.35);}
  }
 }
 for(const w of plan.glazing)B.add(S.glass,prism(w,0,H));
 if(walk)for(const w of plan.windows){
  const b=bounds(w),along=b.x1-b.x0>b.y1-b.y0,L=along?b.x1-b.x0:b.y1-b.y0;if(L<1.1||!straightWindow(w))continue;
  const x=(b.x0+b.x1)/2,y=(b.y0+b.y1)/2;
  let inward=0;for(const sign of[-1,1])if(walk.data.rooms.some(r=>['bedroom','living'].includes(r.kind)&&inside(r.poly,x+(along?0:sign*.34),y+(along?sign*.34:0))))inward=sign;
  if(!inward)continue;
  for(const end of[0,1]){const positions=[],uvs=[],width=Math.min(.45,L*.22),start=end?L-width:0;
   for(let k=0;k<16;k++){const t=k/15,u=start+t*width,fold=Math.sin(t*Math.PI*8)*.035;
    const xx=along?b.x0+u:x+inward*(.20+fold),yy=along?y+inward*(.20+fold):b.y0+u;
    positions.push(xx,.20,-yy,xx,H-.15,-yy);uvs.push(t,0,t,H-.35);
   }
   const idx=[];for(let k=0;k<15;k++){const i=k*2;idx.push(i,i+1,i+2,i+1,i+3,i+2);}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(idx);g.computeVertexNormals();B.add(S.curtain,g);
  }
 }

 // Soft contact patches anchor furniture in the comfort tier as well.
 if(walk)for(const obstacle of B.obstacles){const r=bounds(obstacle),g=new THREE.PlaneGeometry(r.x1-r.x0+.18,r.y1-r.y0+.18);g.rotateX(-Math.PI/2);g.translate((r.x0+r.x1)/2,.023,-(r.y0+r.y1)/2);B.add(S.contact,g);}
 let spawn=null,nav=null;
 if(walk){
  nav=createNavigation(plan,walk.data,B.obstacles);
  // A safe room point, computed after furniture placement.
  const main=nav.rooms.filter(r=>r.point&&['living','kitchen','bedroom'].includes(r.room.kind)).sort((a,b)=>b.room.area-a.room.area)[0];
  if(!nav.spawn)throw new Error('No safe apartment entrance');
  const [sx,sy]=nav.spawn,first=main?.point&&nav.route(nav.spawn,main.point),[tx,ty]=first?.[1]??main?.point??[sx+1,sy];const s=frame.toScene(sx,sy),t=frame.toScene(tx,ty);
  spawn={x:s.x,z:s.z,yaw:Math.atan2(-(t.x-s.x),-(t.z-s.z))};
  B.add(S.ceiling,flat(walk.data.outline,H));
  for(const room of walk.data.rooms){if(room.area<1.2)continue;const [x,y]=interiorPoint(room.poly);B.cyl(S.lamp,x,y,.12,H-.035,H-.015);const light=new THREE.PointLight(0xffecd2,room.kind==='hall'?14:room.area>15?26:12,12,2);light.position.set(x,H-.20,-y);group.add(light);}
  group.add(new THREE.HemisphereLight(0xfff3df,0xb7b4a6,.7));
 }
 B.build(group,own);group.updateMatrixWorld(true);
 return {apt:walk,group,floorMeshes,baseY,spawn,frame,plan,nav,H,
  move(x,z,nx,nz){const a=frame.toPlan(x,z),b=frame.toPlan(nx,nz),p=nav.move([a.x,a.y],[b.x,b.y]);return frame.toScene(...p);},
  route(from,to){const a=frame.toPlan(from.x,from.z),b=frame.toPlan(to.x,to.z);return nav.route([a.x,a.y],[b.x,b.y])?.map(p=>frame.toScene(...p));},
  dispose(){group.removeFromParent();own.forEach(g=>g.dispose());},
 };
}
