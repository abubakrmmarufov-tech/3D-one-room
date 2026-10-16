import * as THREE from 'three';
import { loadMaterialTextures } from './texture-assets.js';
import { tileTexture } from './textures.js';
let shared;
export async function prepareInteriorMaterials() {
 const maps=await loadMaterialTextures();
 const make=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.82,envMapIntensity:.65,...extra});
 const tile=tileTexture();tile.repeat.set(1/2.4,1/2.4);
 shared={
  oak:make(0xe9dcc4,{...maps.oak,normalScale:new THREE.Vector2(.2,.2)}),
  walnut:make(0xc4ad92,{...maps.walnut,normalScale:new THREE.Vector2(.15,.15),roughness:.65}),
  plaster:make(0xf2eee4,{...maps.plaster,normalScale:new THREE.Vector2(.07,.07)}),
  fabric:new THREE.MeshPhysicalMaterial({color:0xc8bda6,...maps.boucle,normalScale:new THREE.Vector2(.32,.32),roughness:.96,sheen:.5,sheenColor:0xd5c9b4}),
  linen:new THREE.MeshPhysicalMaterial({color:0xede7da,...maps.linen,normalScale:new THREE.Vector2(.2,.2),roughness:.94,sheen:.3}),
  tile:make(0xffffff,{map:tile,bumpMap:tile,bumpScale:.002,roughness:.55}),
  stone:make(0xd7cbb5,{roughness:.58}),dark:make(0x272b29,{roughness:.34}),
  bronze:make(0x8e795a,{metalness:.72,roughness:.34}),ceramic:make(0xf3f0e8,{roughness:.2}),
  ceiling:make(0xf6f2e9,{side:THREE.DoubleSide}),
  glass:new THREE.MeshPhysicalMaterial({color:0xdfedea,metalness:.05,roughness:.12,transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide}),
  curtain:new THREE.MeshPhysicalMaterial({color:0xe6dfcf,...maps.linen,roughness:1,side:THREE.DoubleSide,sheen:.5}),
  lamp:make(0xfff0d4,{emissive:0xffdca1,emissiveIntensity:1.3}),
 };
 const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),gradient=g.createRadialGradient(32,32,8,32,32,32);gradient.addColorStop(0,'rgba(40,34,25,.28)');gradient.addColorStop(.5,'rgba(40,34,25,.18)');gradient.addColorStop(1,'rgba(40,34,25,0)');g.fillStyle=gradient;g.fillRect(0,0,64,64);
 shared.contact=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,toneMapped:false});
 return shared;
}
export const interiorMaterials=()=>shared;
