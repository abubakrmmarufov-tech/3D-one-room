import * as THREE from 'three';

const sources={
  plaster:{normalMap:new URL('./assets/materials/plaster-normal.jpg',import.meta.url).href},
  linen:{normalMap:new URL('./assets/materials/linen-normal.jpg',import.meta.url).href,roughnessMap:new URL('./assets/materials/linen-roughness.jpg',import.meta.url).href},
  oak:{map:new URL('./assets/materials/oak-color.jpg',import.meta.url).href,normalMap:new URL('./assets/materials/oak-normal.jpg',import.meta.url).href,roughnessMap:new URL('./assets/materials/oak-roughness.jpg',import.meta.url).href},
  walnut:{map:new URL('./assets/materials/walnut-color.jpg',import.meta.url).href,normalMap:new URL('./assets/materials/walnut-normal.jpg',import.meta.url).href,roughnessMap:new URL('./assets/materials/walnut-roughness.jpg',import.meta.url).href},
  boucle:{normalMap:new URL('./assets/materials/boucle-normal.jpg',import.meta.url).href,roughnessMap:new URL('./assets/materials/boucle-roughness.jpg',import.meta.url).href},
};

export async function loadMaterialTextures(){
  const loader=new THREE.TextureLoader(), result={};
  await Promise.all(Object.entries(sources).map(async([kind,channels])=>{
    result[kind]={};
    await Promise.all(Object.entries(channels).map(async([channel,url])=>{
      const map=await loader.loadAsync(url);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=8;
      map.colorSpace=channel==='map'?THREE.SRGBColorSpace:THREE.NoColorSpace;
      const metres={oak:1.7,walnut:1.4,boucle:.45,plaster:1,linen:.5}[kind];map.repeat.set(1/metres,1/metres);result[kind][channel]=map;
      if(kind==='walnut'){map.center.set(.5,.5);map.rotation=Math.PI/2;}
    }));
  }));
  return result;
}
