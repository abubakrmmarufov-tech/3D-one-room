import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {addTrees} from '../src/props.js';
import {addPathLighting} from '../src/site-lighting.js';
import {fixtureCentres,derivePathLights} from './site-light-data.mjs';
import {crownGeometry,plantLeaf} from '../src/foliage.js';
import {replaceTerraceShrubs} from '../src/terrace-foliage.js';

// Canvas drawing is browser-verified; this checks geometry and source placement.
const ctx=new Proxy({createLinearGradient(){return {addColorStop(){}};}},{get:(o,k)=>o[k]??(()=>{})});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const data=JSON.parse(fs.readFileSync('src/model/complex.json'));
const toScene=(x,y)=>({x:x-data.site_centre[0],z:-(y-data.site_centre[1])});
const scene=new THREE.Scene();addTrees(scene,data.tree_protos,data.trees,toScene);
assert.equal(scene.userData.treeBudget.trees,1123);
assert(scene.userData.treeBudget.triangles<350000,'Tree geometry must stay below its budget');
assert(scene.userData.treeBudget.batches<=40,'Tree batches must stay bounded');
assert.equal(scene.children.filter(m=>m.isInstancedMesh).reduce((n,m)=>n+m.count,0),data.trees.length*2,'No duplicated or lost source trees');
for(const m of scene.children){assert.equal(m.material.depthWrite,true);assert.equal(m.material.transparent,false);assert(m.boundingSphere.radius>0);}
for(let k=0;k<4;k++){
 const a=crownGeometry(k,55,71),b=crownGeometry(k,55,71);
 assert.deepEqual(a.attributes.position.array,b.attributes.position.array,'Foliage must be deterministic');
 assert(a.attributes.position.array.every(Number.isFinite));
}
const leaf=plantLeaf(.3,.11);leaf.computeBoundingBox();assert(leaf.boundingBox.max.z<=.301);assert(leaf.boundingBox.max.x<=.056);
const pair=new THREE.Mesh(new THREE.BoxGeometry(.5,.1,.2),new THREE.MeshBasicMaterial());pair.position.set(15,8,19);pair.updateMatrixWorld();
assert.equal(fixtureCentres(pair).length,1,'Seamed box faces must be one fixture');
assert(fixtureCentres(pair)[0].distanceTo(pair.position)<.001);
const bytes=fs.readFileSync('public/models/shahrofar.glb');
const {scene:root}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const sourceCount=root.children.length;
assert(!root.getObjectByName('Podium')&&!root.getObjectByName('Podium_decks'),'The removed podium and rooftop must not be downloaded or rendered');
assert(root.getObjectByName('Courtyard_garden'),'Replacement courtyard is present');
assert(data.people.every(p=>p[2]<=1),'No people float above the removed rooftop');
const originalShrubs=[];root.updateMatrixWorld(true);root.traverse(m=>{if(m.material?.name==='Shrub')originalShrubs.push({mesh:m,geometry:m.geometry,bounds:new THREE.Box3().setFromObject(m),residential:['V','B'].includes(m.parent.userData.tower)});});
assert.equal(replaceTerraceShrubs(root),16);
for(const {mesh,geometry,bounds,residential} of originalShrubs){
 if(!residential){assert.equal(mesh.geometry,geometry,'Hotel and site shrubs must retain their source geometry');continue;}
 const replacement=new THREE.Box3().setFromObject(mesh);
 assert(replacement.min.distanceTo(bounds.min)<.002&&replacement.max.distanceTo(bounds.max)<.002,'Terrace planting must retain its source footprint');
 assert.equal(mesh.material.transparent,false);assert(mesh.material.alphaTest>0);
}
assert.deepEqual(derivePathLights(root),JSON.parse(fs.readFileSync('src/model/site-lights.json')),'Re-derive lighting when the GLB changes');
const lighting=addPathLighting(root);assert(root.userData.pathLights>50,'Existing site/deck fixtures must find actual ground surfaces');assert(root.userData.pathLights<200);
assert.equal(root.children.length,sourceCount+1,'Lighting must add only one batched overlay');
lighting.setNight(0);assert.equal(root.children.at(-1).visible,false);lighting.setNight(1);assert.equal(root.children.at(-1).visible,true);
const report={...scene.userData.treeBudget,pathLights:root.userData.pathLights,addedAssetDownloads:0};
fs.writeFileSync('docs/qa/site-budget.json',JSON.stringify(report,null,2)+'\n');console.log(report);
