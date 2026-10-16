import * as THREE from 'three';
import{EffectComposer}from'three/addons/postprocessing/EffectComposer.js';
import{RenderPass}from'three/addons/postprocessing/RenderPass.js';
import{SSAOPass}from'three/addons/postprocessing/SSAOPass.js';
import{OutputPass}from'three/addons/postprocessing/OutputPass.js';
// Optional contact occlusion. The comfort tier uses the main MSAA renderer.
export function createInteriorPost(renderer,scene,camera){
 const size=renderer.getSize(new THREE.Vector2()),target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:2});
 const composer=new EffectComposer(renderer,target),beauty=new RenderPass(scene,camera),ao=new SSAOPass(scene,camera,1,1,16),output=new OutputPass();
 ao.kernelRadius=.38;ao.minDistance=.000015;ao.maxDistance=.0015;
 composer.addPass(beauty);composer.addPass(ao);composer.addPass(output);
 const resize=()=>{composer.setPixelRatio(Math.min(renderer.getPixelRatio(),1.5));renderer.getSize(size);composer.setSize(size.x,size.y);ao.ssaoMaterial.uniforms.cameraNear.value=camera.near;ao.ssaoMaterial.uniforms.cameraFar.value=camera.far;};resize();
 return{render:()=>composer.render(),resize,dispose(){ao.dispose();output.dispose();composer.dispose();}};
}
