import * as THREE from 'three';
import {materialVariant} from './material-variants.js';
let shared;
function canvasTexture(draw,size=256){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;draw(canvas.getContext('2d'),size);
 const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;return map;
}
export function showcaseMaterials(base){
 if(shared)return shared;
 const weave=canvasTexture((g,n)=>{
  g.fillStyle='#e3dccd';g.fillRect(0,0,n,n);
  for(let i=0;i<n;i+=3){g.fillStyle=i%2?'#d0c7b4':'#eee7d9';g.fillRect(i,0,1,n);g.fillStyle='rgba(122,111,91,.16)';g.fillRect(0,i,n,1);}
 });weave.repeat.set(3,3);
 const stone=canvasTexture((g,n)=>{
  g.fillStyle='#d9cbb4';g.fillRect(0,0,n,n);let seed=71;const rand=()=>((seed=seed*16807%2147483647)/2147483647);
  for(let i=0;i<13000;i++){const l=rand()>.5?255:90;g.fillStyle=`rgba(${l},${l-10},${l-25},${rand()*.06})`;g.fillRect(rand()*n,rand()*n,1+rand()*3,1);}
  for(let j=0;j<12;j++){g.strokeStyle='rgba(121,99,72,.055)';g.lineWidth=.6;g.beginPath();for(let x=0;x<=n;x+=8){const y=j*n/12+Math.sin(x/43+j)*4;x?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}
 },512);
 const make=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,envMapIntensity:.6,...extra});
 const olive=materialVariant(base.fabric,{color:0x717968,bumpMap:weave,bumpScale:.001});
 const linen=materialVariant(base.linen,{bumpMap:weave,bumpScale:.001});
 const bedding=materialVariant(base.linen,{color:0xe5dfd1,bumpMap:weave,bumpScale:.0015,side:THREE.DoubleSide});
 shared={...base,olive,linen,bedding,throw:make(0xada18c,{map:weave,bumpMap:weave,bumpScale:.0015,side:THREE.DoubleSide}),
  seam:make(0xb4a58c),rug:make(0xf3ecdb,{map:weave,bumpMap:weave,bumpScale:.003,roughness:1}),
  travertine:make(0xffffff,{map:stone,bumpMap:stone,bumpScale:.001,roughness:.48}),
  screen:make(0x17251f,{roughness:.25}),art:make(0xc9bea8),leaf:make(0x405632,{roughness:.86}),
 };
 return shared;
}
