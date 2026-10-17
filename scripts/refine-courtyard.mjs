// Derived presentation landscaping; preserves the residential tower and plans.
// Run once against the former podium export, then commit the resulting asset.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {prune} from '@gltf-transform/functions';
import {MeshoptDecoder,MeshoptEncoder} from 'meshoptimizer';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {derivePathLights} from './site-light-data.mjs';

await Promise.all([MeshoptDecoder.ready,MeshoptEncoder.ready]);
const path='public/models/shahrofar.glb',before=fs.statSync(path).size;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
const doc=await io.read(path);
if(doc.getRoot().listNodes().some(n=>n.getName()==='Courtyard garden'))throw Error('Courtyard already refined');
const removed=[];
for(const node of doc.getRoot().listNodes())if(['Podium','Podium decks'].includes(node.getName())){removed.push(node.getName());node.dispose();}
if(removed.length!==2)throw Error('Expected the podium and its rooftop furnishings');
const buffer=doc.getRoot().listBuffers()[0],scene=doc.getRoot().listScenes()[0];
const group=doc.createNode('Courtyard garden').setExtras({presentationLandscape:true});scene.addChild(group);
const batches=new Map(),materials=new Map();
function material(name,color){
  if(!materials.has(name))materials.set(name,doc.getRoot().listMaterials().find(m=>m.getName()===name)??doc.createMaterial(name).setBaseColorFactor([...new THREE.Color(color).toArray(),1]).setRoughnessFactor(.88).setMetallicFactor(0));
  return materials.get(name);
}
function add(name,color,g){
  if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  if(!batches.has(name))batches.set(name,{material:material(name,color),geometries:[]});
  batches.get(name).geometries.push(g.index?g.toNonIndexed():g);
}
function flat(points,y){
  const g=new THREE.ShapeGeometry(new THREE.Shape(points.map(p=>new THREE.Vector2(...p))));g.rotateX(-Math.PI/2);g.translate(0,y,0);
  const p=g.attributes.position;for(let i=0;i<p.count;i++)g.attributes.uv.setXY(i,p.getX(i),-p.getZ(i));return g;
}
function box(name,color,x,y,z,w,h,d,rot=0){const g=new THREE.BoxGeometry(w,h,d).rotateY(rot).translate(x,y+h/2,-z);add(name,color,g);}
let outer=[[-61,240],[-63,252],[-60.5,266],[-53,279],[-40,288],[-20,292.5],[0,293.5],[20,291.5],[38,285],[53,274],[63,260],[68.5,244],[69.5,229],[66,216]];
for(let n=0;n<2;n++){const smooth=[outer[0]];for(let i=0;i<outer.length-1;i++){const a=outer[i],b=outer[i+1];smooth.push(a.map((v,j)=>v*.75+b[j]*.25),a.map((v,j)=>v*.25+b[j]*.75));}smooth.push(outer.at(-1));outer=smooth;}
const boundary=outer.concat([[64,210],[52,212],[30,216.5],[22,224],[24,230],[14,236],[4.5,242.5],[-15,243],[-17,241],[-52,241],[-58,240]]);
add('Courtyard stone',0xc5c0b1,flat(boundary,.145));
const islands=[[-39,263,13,6.5,-.25],[-24,281,14,5.5,.1],[-8,258,7,9,.2],[-4,285,10,4.2,0],[56,253,6,10,.1],[50,280,8,4,-.35],[-46,247,9,3.2,.2],[58,228,5,7,0]];
const newTrees=[];
function ellipse(x,y,rx,ry,angle){return Array.from({length:48},(_,i)=>{const a=i/48*Math.PI*2,u=Math.cos(a)*rx,v=Math.sin(a)*ry;return[x+u*Math.cos(angle)-v*Math.sin(angle),y+u*Math.sin(angle)+v*Math.cos(angle)];});}
for(const [i,[x,y,rx,ry,angle]]of islands.entries()){
  add('Courtyard edging',0xd5d1c6,flat(ellipse(x,y,rx+.28,ry+.28,angle),.22));
  add('Lawn',0x789054,flat(ellipse(x,y,rx,ry,angle),.235));
  for(const offset of [-.5,.5])newTrees.push([x+rx*offset*Math.cos(angle),y+rx*offset*Math.sin(angle),.82,.92,i*.7,0]);
  // Low timber seats face the planting, with a continuous open path around it.
  const bx=x,by=y-ry-1.1;
  for(let slat=0;slat<5;slat++)box('Courtyard timber',0x75604a,bx,.48,by+slat*.13,3.4,.10,.10);
  for(const dx of [-1.3,1.3])box('Courtyard metal',0x353c38,bx+dx,.15,by+.26,.10,.34,.65);
  box('Courtyard metal',0x353c38,x+rx+1.1,.15,y,.18,.88,.18);
  box('Lamp glow',0xffe0aa,x+rx+1.1,1.03,y,.21,.10,.21);
}
for(const [name,{material,geometries}]of batches){
  const g=mergeGeometries(geometries),primitive=doc.createPrimitive().setMaterial(material);
  for(const [from,to,size]of [['position','POSITION',3],['normal','NORMAL',3],['uv','TEXCOORD_0',2]])primitive.setAttribute(to,doc.createAccessor().setType(size===3?'VEC3':'VEC2').setArray(new Float32Array(g.attributes[from].array)).setBuffer(buffer));
  const mesh=doc.createMesh(name).addPrimitive(primitive);group.addChild(doc.createNode(name).setMesh(mesh));
  for(const geometry of geometries)geometry.dispose();g.dispose();
}
await doc.transform(prune({keepAttributes:true}));
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});
await io.write(path,doc);
const complexPath='src/model/complex.json',complex=JSON.parse(fs.readFileSync(complexPath));
const removedPeople=complex.people.filter(p=>p[2]>1).length;
complex.people=complex.people.filter(p=>p[2]<=1);complex.trees.push(...newTrees);
fs.writeFileSync(complexPath,JSON.stringify(complex)+'\n');
const bytes=fs.readFileSync(path),hash=createHash('sha256').update(bytes).digest('hex').slice(0,16);
fs.writeFileSync('src/config.js',fs.readFileSync('src/config.js','utf8').replace(/shahrofar\.glb\?v=[a-f0-9]+/,`shahrofar.glb?v=${hash}`));
const {scene:built}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
fs.writeFileSync('src/model/site-lights.json',JSON.stringify(derivePathLights(built))+'\n');
console.log(JSON.stringify({removed,before,after:bytes.length,removedPeople,newTrees:newTrees.length,hash}));
