import * as THREE from 'three';
const source={map:new URL('./assets/optimized/grass-color.webp',import.meta.url).href,normalMap:new URL('./assets/optimized/grass-normal.webp',import.meta.url).href,roughnessMap:new URL('./assets/optimized/grass-roughness.webp',import.meta.url).href};
export const waterTime={value:0};
export async function loadLandscapeTextures(){
 const loader=new THREE.TextureLoader(),maps={};
 await Promise.all(Object.entries(source).map(async([key,url])=>{let t;try{t=await loader.loadAsync(url);}catch{return;}t.colorSpace=key==='map'?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.setScalar(1/24);t.anisotropy=4;maps[key]=t;}));return maps;
}
export function tuneWater(m){
 m.color.set(m.name==='River'?0x507b7d:0x628f95);m.roughness=.2;m.metalness=.18;m.envMapIntensity=1.1;
 m.onBeforeCompile=s=>{s.uniforms.waterTime=waterTime;s.vertexShader='varying vec3 vWaterWorld;\n'+s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWaterWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');s.fragmentShader='uniform float waterTime;\nvarying vec3 vWaterWorld;\n'+s.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nvec2 wave=vec2(sin(vWaterWorld.x*2.1+vWaterWorld.z*.7+waterTime*.55),cos(vWaterWorld.z*2.7-vWaterWorld.x*.5+waterTime*.4))*.035;normal=normalize(normal+(viewMatrix*vec4(wave.x,0.0,wave.y,0.0)).xyz);');};
 m.customProgramCacheKey=()=> 'shahrofar-water-1';
}
