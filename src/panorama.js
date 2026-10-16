import * as THREE from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {rng} from './materials.js';
import {smooth} from './timeline.js';

// Authored city and terrain, deliberately not presented as a surveyed view.
const fract=n=>n-Math.floor(n);
const hash=(x,z)=>fract(Math.sin(x*127.1+z*311.7)*43758.5453);
function noise(x,z){
  const a=Math.floor(x),b=Math.floor(z);let u=fract(x),v=fract(z);u=u*u*(3-2*u);v=v*v*(3-2*v);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(a,b),hash(a+1,b),u),THREE.MathUtils.lerp(hash(a,b+1),hash(a+1,b+1),u),v);
}
function fbm(x,z){let sum=0,amp=.5;for(let i=0;i<5;i++){sum+=amp*noise(x,z);x=x*2.07+13;z=z*2.07+31;amp*=.5;}return sum;}

export function buildPanorama(scene){
  const group=new THREE.Group();group.name='Authored golden-hour city';scene.add(group);
  scene.fog=new THREE.FogExp2(0xd8cbb7,.00034);
  const sky=new Sky();sky.scale.setScalar(5000);sky.frustumCulled=false;scene.add(sky);
  const u=sky.material.uniforms;u.turbidity.value=5.5;u.rayleigh.value=1.5;u.mieCoefficient.value=.007;u.mieDirectionalG.value=.8;
  u.sunPosition.value.set(26,6,-38);u.cloudCoverage.value=.36;u.cloudDensity.value=.24;u.cloudScale.value=.00016;u.cloudElevation.value=.45;
  u.uAppear={value:0};sky.material.fragmentShader='uniform float uAppear;\n'+sky.material.fragmentShader.replace('#include <colorspace_fragment>','#include <colorspace_fragment>\ngl_FragColor.rgb=mix(vec3(.960784,.949020,.921569),gl_FragColor.rgb,uAppear);');

  // A real height field gives the ridge shaded slopes and a fine silhouette.
  const terrain=new THREE.PlaneGeometry(6000,2600,320,120);terrain.rotateX(-Math.PI/2);terrain.translate(0,0,-2450);
  const positions=terrain.attributes.position,colors=[];
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getZ(i),foothill=smooth(-1120,-2500,z);
    const ridge=Math.pow(fbm(x*.0018,z*.0018),1.4),detail=fbm(x*.012,z*.012);
    const y=-76+foothill*(130+ridge*670+detail*50);positions.setY(i,y);
    const c=new THREE.Color().setHSL(.57,.12,.13+ridge*.13+detail*.05);colors.push(c.r,c.g,c.b);
  }
  terrain.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrain.computeVertexNormals();
  group.add(new THREE.Mesh(terrain,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1})));

  const random=rng(811),boxes=[],roofs=[],pitched=[],trees=[],cars=[];
  const dummy=new THREE.Object3D();
  for(let gx=-20;gx<=20;gx++)for(let gz=-20;gz<=20;gz++){
    const x=gx*32+8+(random()-.5)*6,z=gz*32+8+(random()-.5)*6;
    if(Math.hypot(x-10,z+6)<58)continue;
    // Open planted blocks and a predominantly low-rise fabric give the few
    // apartment and office towers a legible skyline instead of a uniform grid.
    if(noise(gx*.23,gz*.23)>.66||random()<.12){
      for(let j=0;j<9;j++)trees.push({x:x+(random()-.5)*26,z:z+(random()-.5)*26,r:2.1+random()*2.5});
      continue;
    }
    const tower=random()>.84;
    const width=tower?12+random()*9:13+random()*10,depth=tower?11+random()*9:12+random()*11;
    const height=tower?29+random()*42:6+Math.pow(random(),1.6)*16;
    const tone=new THREE.Color().setHSL(.065+random()*.09,.07+random()*.15,.34+random()*.28);
    boxes.push({x,z,width,depth,height,tone});
    roofs.push({x,z,width:width+.24,depth:depth+.24,height:.35,y:-75+height});
    if(!tower&&random()>.42)pitched.push({x,z,width:width+1,depth:depth+1,height:2+random()*1.5,y:-75+height});
    else if(random()>.35)roofs.push({x:x+width*.2,z:z-depth*.2,width:width*.22,depth:depth*.3,height:1.25,y:-75+height+.7});
    for(let j=0;j<2;j++)trees.push({x:x+width*.5+3,z:z-depth*.5+j*8,r:1.6+random()*1.9});
    if(random()>.55)cars.push({x:gx*32-5,z:gz*32+random()*22,tone:new THREE.Color().setHSL(random(),.08,.25+random()*.4)});
  }
  const facade=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.85});
  facade.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vFacadeUv;varying vec3 vFacadeNormal;varying vec3 vBuildingSize;varying float vBuildingSeed;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFacadeUv=uv;vFacadeNormal=normal;vBuildingSize=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));vBuildingSeed=instanceMatrix[3].x*.17+instanceMatrix[3].z*.31;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vFacadeUv;varying vec3 vFacadeNormal;varying vec3 vBuildingSize;varying float vBuildingSeed;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      if(abs(vFacadeNormal.y)<.5){
        float faceWidth=abs(vFacadeNormal.z)>.5?vBuildingSize.x:vBuildingSize.z;
        float office=step(.6,fract(sin(vBuildingSeed)*731.));
        vec2 grid=vFacadeUv*vec2(max(2.,floor(faceWidth/mix(2.7,1.7,office))),max(2.,floor(vBuildingSize.y/3.3)));
        vec2 cell=fract(grid),aa=min(fwidth(grid),vec2(.2));
        vec2 border=mix(vec2(.22,.22),vec2(.07,.10),office);
        vec2 panes=smoothstep(border-aa,border+aa,cell)*(1.-smoothstep(1.-border-aa,1.-border+aa,cell));
        float windowMask=panes.x*panes.y;
        float varied=fract(sin(dot(floor(grid),vec2(12.9898,78.233))+vBuildingSeed)*43758.5453);
        vec3 windowColor=mix(vec3(.075,.10,.105),vec3(.36,.32,.23),varied*.6);
        windowColor=mix(windowColor,vec3(.67,.46,.21),step(.955,varied));
        diffuseColor.rgb=mix(diffuseColor.rgb,windowColor,windowMask);
        diffuseColor.rgb*=1.-.13*step(.95,cell.y);
      }`);
  };
  const buildings=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),facade,boxes.length);
  boxes.forEach((b,i)=>{dummy.position.set(b.x,-75+b.height/2,b.z);dummy.scale.set(b.width,b.height,b.depth);dummy.updateMatrix();buildings.setMatrixAt(i,dummy.matrix);buildings.setColorAt(i,b.tone);});
  group.add(buildings);
  const rooftop=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0x8f8a7c,roughness:1}),roofs.length);
  roofs.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.width,b.height,b.depth);dummy.updateMatrix();rooftop.setMatrixAt(i,dummy.matrix);});group.add(rooftop);
  const roofGeometry=new THREE.ConeGeometry(Math.SQRT1_2,1,4);roofGeometry.rotateY(Math.PI/4);
  const tileRoofs=new THREE.InstancedMesh(roofGeometry,new THREE.MeshStandardMaterial({color:0x765346,roughness:1}),pitched.length);
  pitched.forEach((b,i)=>{dummy.position.set(b.x,b.y+b.height/2,b.z);dummy.scale.set(b.width,b.height,b.depth);dummy.updateMatrix();tileRoofs.setMatrixAt(i,dummy.matrix);});group.add(tileRoofs);
  const canopy=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:0x5e6750,roughness:1}),trees.length);
  trees.forEach((b,i)=>{dummy.position.set(b.x,-72.2,b.z);dummy.scale.set(b.r,b.r*1.3,b.r);dummy.updateMatrix();canopy.setMatrixAt(i,dummy.matrix);});group.add(canopy);
  const traffic=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.45}),cars.length);
  cars.forEach((b,i)=>{dummy.position.set(b.x,-74.4,b.z);dummy.scale.set(1.7,1.15,3.8);dummy.updateMatrix();traffic.setMatrixAt(i,dummy.matrix);traffic.setColorAt(i,b.tone);});group.add(traffic);

  const road=new THREE.MeshStandardMaterial({color:0x9c998b,roughness:1});
  road.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vGround;').replace('#include <begin_vertex>','#include <begin_vertex>\nvGround=position.xy;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vGround;').replace('#include <color_fragment>','#include <color_fragment>\nvec2 street=abs(mod(vGround+vec2(5.,-5.),32.)-16.);float asphalt=max(step(12.,street.x),step(12.,street.y));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.19,.19,.17),asphalt*.7);');
  };
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(6000,6000),road);ground.rotation.x=-Math.PI/2;ground.position.y=-75.1;group.add(ground);
  return{group,sky,update(state){group.visible=state.progress>.205;u.uAppear.value=smooth(.18,.29,state.progress);},buildings:boxes.length};
}
