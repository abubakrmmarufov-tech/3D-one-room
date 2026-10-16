import * as THREE from 'three';

const sources={
  plaster:{normalMap:new URL('./assets/optimized/plaster-normal.webp',import.meta.url).href},
  linen:{normalMap:new URL('./assets/optimized/linen-normal.webp',import.meta.url).href,roughnessMap:new URL('./assets/optimized/linen-roughness.webp',import.meta.url).href},
  oak:{map:new URL('./assets/optimized/oak-color.webp',import.meta.url).href,normalMap:new URL('./assets/optimized/oak-normal.webp',import.meta.url).href,roughnessMap:new URL('./assets/optimized/oak-roughness.webp',import.meta.url).href},
  walnut:{map:new URL('./assets/optimized/walnut-color.webp',import.meta.url).href,normalMap:new URL('./assets/optimized/walnut-normal.webp',import.meta.url).href,roughnessMap:new URL('./assets/optimized/walnut-roughness.webp',import.meta.url).href},
  boucle:{normalMap:new URL('./assets/optimized/boucle-normal.webp',import.meta.url).href,roughnessMap:new URL('./assets/optimized/boucle-roughness.webp',import.meta.url).href},
};

export async function loadMaterialTextures(){
  const loader=new THREE.TextureLoader(), result={};
  await Promise.all(Object.entries(sources).map(async([kind,channels])=>{
    result[kind]={};
    await Promise.all(Object.entries(channels).map(async([channel,url])=>{
      let map;try{map=await loader.loadAsync(url);}catch{return;}map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;
      map.colorSpace=channel==='map'?THREE.SRGBColorSpace:THREE.NoColorSpace;
      const metres={oak:1.7,walnut:1.4,boucle:.45,plaster:1,linen:.5}[kind];map.repeat.set(1/metres,1/metres);result[kind][channel]=map;
      if(kind==='walnut'){map.center.set(.5,.5);map.rotation=Math.PI/2;}
    }));
  }));
  return result;
}
