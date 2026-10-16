import * as THREE from 'three';

export function rng(seed=731) { return () => { seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296; }; }
function texture(kind) {
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');const random=rng(63+kind.length);
  const base={oak:[170,142,105],walnut:[82,60,44],travertine:[206,193,168],boucle:[218,209,188],rug:[189,179,157],stone:[71,66,55]}[kind];
  const data=ctx.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const noise=(random()-.5)*(kind==='travertine'?2:kind==='rug'?5:12);
    let pattern=0;
    if(kind==='oak'||kind==='walnut') pattern=6*Math.sin(x*.43+Math.sin(y*.021)*2)+3*Math.sin(x*1.8+y*.006)+(Math.floor(x/64)%2?6:-3);
    if(kind==='travertine')pattern=3*Math.sin(y*.065+Math.sin(x*.009)*1.4)+1.2*Math.sin(y*.21+Math.sin(x*.02)*.8)+(random()>.999?-9:0);
    if(kind==='boucle')pattern=8*Math.sin(x*1.3)*Math.sin(y*1.3)+(random()>.89?-16:0);
    if(kind==='rug')pattern=3*Math.sin(x*1.6)*Math.cos(y*1.8)+((x%7===0)?-6:2);
    if(kind==='stone')pattern=10*Math.sin(x*.012+y*.026+Math.sin(y*.03))+(Math.sin(x*.03-y*.04)>.97?24:0);
    const i=(y*512+x)*4;for(let j=0;j<3;j++)data.data[i+j]=base[j]+noise+pattern;data.data[i+3]=255;
  }
  ctx.putImageData(data,0,0);
  if(kind==='oak'){
    ctx.strokeStyle='#7e6948';ctx.lineWidth=1;
    for(let x=0;x<512;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.stroke();for(let y=(x%128?128:0);y<512;y+=256){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+64,y);ctx.stroke();}}
  }
  const map=new THREE.CanvasTexture(c);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
  const repeat={oak:[1/1.7,1/1.7],walnut:[1/1.4,1/1.4],travertine:[1/2.4,1/2.4],boucle:[1/.45,1/.45],rug:[1/.7,1/.7],stone:[1/2.4,1/2.4]}[kind];map.repeat.set(...repeat);return map;
}

export function createMaterialSystem(textureMaps={}){
  const cutPlane=new THREE.Plane(new THREE.Vector3(0,-1,0),.05);
  const zones=[{origin:[10,-.4],radius:8},{origin:[10,-3.8],radius:11},{origin:[6.5,-8.5],radius:10},{origin:[13.5,-7.5],radius:15},{origin:[18,-8],radius:18}].map(z=>({origin:new THREE.Vector2(...z.origin),radius:{value:-2},max:z.radius}));
  const maps={};['oak','walnut','travertine','boucle','rug','stone'].forEach(k=>maps[k]=textureMaps[k]?.map||texture(k));
  const shaders=[];
  function make(kind,zone=0,extras={}){
    const colors={oak:0xffffff,walnut:0xffffff,travertine:0xffffff,boucle:0xffffff,rug:0xffffff,stone:0xffffff,bronze:0x66503a,white:0xecebe5,linen:0xe4dfd2,black:0x161814,glass:0xcbd5cf,leaf:0x566049,clay:0x896f54,metal:0x303329};
    const settings={color:colors[kind]??0xffffff,roughness:kind==='bronze'?.38:kind==='glass'?.06:kind==='travertine'?.62:.86,metalness:kind==='bronze'?.75:kind==='metal'?.6:0,map:maps[kind]||null,clippingPlanes:[cutPlane],clipShadows:true,...extras};
    if(kind==='white'&&textureMaps.plaster){settings.normalMap=textureMaps.plaster.normalMap;settings.normalScale=new THREE.Vector2(.10,.10);}
    if(textureMaps[kind]){
      Object.assign(settings,textureMaps[kind]);
      if(kind==='boucle'){settings.map=null;settings.color=0xe3dac6;}
      if(kind==='walnut')settings.color=0x9e8064;
      settings.normalScale=new THREE.Vector2(kind==='boucle'?.48:kind==='linen'?.2:.24,kind==='boucle'?.48:kind==='linen'?.2:.24);
      settings.roughness=kind==='walnut'?.8:kind==='oak'?.88:1;
    }else if(maps[kind]){settings.bumpMap=maps[kind];settings.bumpScale=kind==='boucle'?.008:.002;}
    if(kind==='glass'){settings.transparent=true;settings.opacity=.085;settings.depthWrite=false;settings.side=THREE.DoubleSide;settings.envMapIntensity=1.1;}
    if(kind==='linen')Object.assign(settings,{sheen:.45,sheenColor:0xe4dfd2,sheenRoughness:1});
    if(kind==='boucle')Object.assign(settings,{sheen:.8,sheenColor:0xe1d7c3,sheenRoughness:.85});
    const mat=(kind==='boucle'||kind==='linen')?new THREE.MeshPhysicalMaterial(settings):new THREE.MeshStandardMaterial(settings);
    mat.onBeforeCompile=shader=>{
      shader.uniforms.uWave=zones[zone].radius;shader.uniforms.uOrigin={value:zones[zone].origin};
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWorld=(modelMatrix * vec4(transformed,1.0)).xyz;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWorld; uniform float uWave; uniform vec2 uOrigin;').replace('#include <dithering_fragment>','#include <dithering_fragment>\nfloat inkReveal=smoothstep(-0.6,0.6,uWave-distance(vWorld.xz,uOrigin));\ngl_FragColor.rgb=mix(vec3(0.960784,0.949020,0.921569),gl_FragColor.rgb,inkReveal);');
      // Future rooms have a flat paper finish. Skip their expensive PBR lighting
      // until the reveal reaches a fragment, preserving its clipping and alpha.
      shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(uWave-distance(vWorld.xz,uOrigin)<=-0.6){gl_FragColor=vec4(0.960784,0.949020,0.921569,opacity);return;}');
      shaders.push(shader);
    };
    mat.customProgramCacheKey=()=>`wave-v2-${zone}`;
    return mat;
  }
  function edgeMaterial(zone){
    return new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uWave:zones[zone].radius,uOrigin:{value:zones[zone].origin},uCut:{value:.05}},vertexShader:'varying vec3 vWorld; void main(){ vec4 w=modelMatrix*vec4(position,1.0);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',fragmentShader:'varying vec3 vWorld;uniform float uWave;uniform vec2 uOrigin;uniform float uCut;void main(){if(vWorld.y>uCut+.008)discard;float r=smoothstep(-.6,.6,uWave-distance(vWorld.xz,uOrigin));gl_FragColor=vec4(.21,.23,.19,(1.-r)*.9);}',polygonOffset:true,polygonOffsetFactor:-1});
  }
  const edgeMaterials=zones.map((_,i)=>edgeMaterial(i));
  // Soft furniture has no hard EdgesGeometry creases. An inverted hull adds
  // only its silhouette, so an unrevealed cushion still reads as ink on paper.
  const outlineMaterials=zones.map((_,i)=>{
    const mat=edgeMaterial(i);mat.side=THREE.BackSide;
    mat.vertexShader=mat.vertexShader.replace('vec4(position,1.0)','vec4(position+normal*.006,1.0)');return mat;
  });
  return {make,edgeMaterials,outlineMaterials,cutPlane,zones,maps,update(state){cutPlane.constant=state.clipHeight+(state.walls>.9999?.015:0);zones.forEach((z,i)=>z.radius.value=THREE.MathUtils.lerp(-2,z.max,state.waves[i]));[...edgeMaterials,...outlineMaterials].forEach(m=>m.uniforms.uCut.value=state.clipHeight);}};
}
