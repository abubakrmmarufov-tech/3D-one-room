import * as THREE from 'three';

const SURFACES = new Set(['Paving','Sidewalk','Promenade','Deck paving','Deck stone','Asphalt','Lawn','Grass','Cobble','Pool mosaic']);

// Lamp heads are separate connected pieces in their shared GLB material mesh.
// Weld quantized positions so exported face seams do not split one fixture.
export function fixtureCentres(mesh) {
  const geo=mesh.geometry, p=geo.attributes.position, index=geo.index;
  const parent=Array.from({length:p.count},(_,i)=>i), weld=new Map();
  const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  const join=(a,b)=>{parent[find(a)]=find(b);};
  for(let i=0;i<p.count;i++){
    const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*100)).join('/');
    if(weld.has(key))join(i,weld.get(key));else weld.set(key,i);
  }
  const count=index?.count??p.count;
  for(let i=0;i<count;i+=3){const a=index?index.getX(i):i;join(a,index?index.getX(i+1):i+1);join(a,index?index.getX(i+2):i+2);}
  const groups=new Map(), v=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
    const key=find(i);if(!groups.has(key))groups.set(key,new THREE.Box3());
    groups.get(key).expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld));
  }
  return [...groups.values()].filter(b=>b.getSize(v).length()<2.5).map(b=>b.getCenter(new THREE.Vector3()));
}

export function derivePathLights(root) {
  root.updateMatrixWorld(true);
  const heads=[], surfaces=[];
  root.traverse(mesh=>{
    if(!mesh.isMesh||Array.isArray(mesh.material))return;
    if(mesh.material.name==='Lamp glow'||(mesh.name.startsWith('Street_furniture')&&mesh.material.name==='Sign'))heads.push(...fixtureCentres(mesh));
    if(SURFACES.has(mesh.material.name))surfaces.push(mesh);
  });
  const ray=new THREE.Raycaster(), normalMatrix=new THREE.Matrix3(), normal=new THREE.Vector3(), patches=[];
  const unique=new Set();
  for(const head of heads){
    ray.set(head.clone().add(new THREE.Vector3(0,-.22,0)),new THREE.Vector3(0,-1,0));ray.far=12;
    const hit=ray.intersectObjects(surfaces,false).find(h=>normal.copy(h.face.normal).applyNormalMatrix(normalMatrix.getNormalMatrix(h.object.matrixWorld)).y>.7);
    if(!hit)continue;
    const key=`${Math.round(hit.point.x*2)}/${Math.round(hit.point.y*2)}/${Math.round(hit.point.z*2)}`;if(unique.has(key))continue;unique.add(key);
    patches.push({point:hit.point,radius:THREE.MathUtils.clamp((head.y-hit.point.y)*.72,1.6,5.8)});
  }
  return patches.map(({point,radius})=>[...point.toArray(),radius].map(v=>Math.round(v*1000)/1000));
}
