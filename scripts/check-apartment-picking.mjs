import assert from 'node:assert/strict';
import * as THREE from 'three';
import {pickApartment} from '../src/apartment-picking.js';

const ray = new THREE.Raycaster(), state = {mode:'floor', tower:'B', floor:16};
function volume(floor, x, tower='B') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(4,2.8,4),new THREE.MeshBasicMaterial());
  mesh.position.set(x,floor*3.3,0);mesh.visible=false;
  mesh.userData.apt={tower,floor,id:`${tower}${floor}`};mesh.updateMatrixWorld();
  return mesh;
}
// A ray through the cutaway's central gap used to hit an invisible lower-floor
// volume. THREE raycasts invisible objects too: visibility is not a pick mask.
const lower=volume(10,0),selected=volume(16,6),upper=volume(20,0),other=volume(16,0,'V');
const objects=[lower,selected,upper,other],matches=()=>true;
ray.set(new THREE.Vector3(0,90,0),new THREE.Vector3(0,-1,0));
assert.equal(pickApartment(ray,[lower,selected],state,matches),undefined,'Floor 16 must never select hidden floor 10 through a gap');
assert.equal(pickApartment(ray,objects,state,matches),undefined,'Other towers and floors cannot intercept the cutaway');
ray.set(new THREE.Vector3(6,90,0),new THREE.Vector3(0,-1,0));
assert.equal(pickApartment(ray,objects,state,matches)?.apt.id,'B16');
assert.equal(pickApartment(ray,objects,state,()=>false),undefined,'Inventory filters still apply');
ray.set(new THREE.Vector3(0,90,0),new THREE.Vector3(0,-1,0));
assert.equal(pickApartment(ray,[lower,selected],{mode:'overview'},matches)?.apt.id,'B10','Overview still allows discovery of any floor');
assert.equal(pickApartment(ray,objects,{mode:'walk'},matches),undefined,'Interior interaction cannot select an exterior apartment');
for(const floor of [5,10,16,20]) for(const x of [-1,0,6,8]) {
  ray.set(new THREE.Vector3(x,90,0),new THREE.Vector3(0,-1,0));
  const hit=pickApartment(ray,objects,{...state,floor},matches);
  if(hit)assert(hit.apt.tower==='B'&&hit.apt.floor===floor);
}
for(const mesh of objects){mesh.geometry.dispose();mesh.material.dispose();}
console.log('Apartment raycasting: hidden floors rejected; selected floor, filters and overview verified.');
