import * as THREE from 'three';
export async function addCAD(scene){
  const image=new Image();image.src=window.__PLAN_DATA__ || import.meta.env.BASE_URL+'assets/residence-plan.svg';await image.decode();
  const canvas=document.createElement('canvas');canvas.width=3120;canvas.height=2268;canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
  const mat=new THREE.MeshBasicMaterial({map,toneMapped:false,transparent:true,depthWrite:false,opacity:1,polygonOffset:true,polygonOffsetFactor:-5,alphaTest:.005});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(26,18.9),mat);mesh.rotation.x=-Math.PI/2;mesh.position.set(10.5,.075,-5.65);mesh.renderOrder=20;scene.add(mesh);
  return {mesh,update(state){mat.opacity=state.cad;mesh.visible=state.cad>.001;}};
}
