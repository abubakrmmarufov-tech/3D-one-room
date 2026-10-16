import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {smooth} from './timeline.js';

// Multiply a small-scale ambient contact term over the already color-managed
// framebuffer. The paper opening retains its exact unprocessed ink rendering.
export function createAmbientPass(renderer,world,camera){
  const pass=new SSAOPass(world.scene,camera,1,1,24);pass.renderToScreen=true;
  pass.kernelRadius=.38;pass.minDistance=.012/camera.far;pass.maxDistance=.65/camera.far;
  pass.normalMaterial.clippingPlanes=[world.materials.cutPlane];
  pass.copyMaterial.uniforms.strength={value:0};
  pass.copyMaterial.fragmentShader='uniform sampler2D tDiffuse;uniform float strength;varying vec2 vUv;void main(){vec3 ao=texture2D(tDiffuse,vUv).rgb;gl_FragColor=vec4(mix(vec3(1.),ao,strength),1.);}';
  const transparent=[world.panorama.group,world.panorama.sky];world.scene.traverse(o=>{if(o.isMesh&&(o.material?.transparent||o.userData.inkContour))transparent.push(o);});
  const renderOverride=pass._renderOverride.bind(pass);
  pass._renderOverride=(...args)=>{
    const saved=transparent.map(o=>o.visible);transparent.forEach(o=>o.visible=false);
    try{return renderOverride(...args);}finally{transparent.forEach((o,i)=>o.visible=saved[i]);}
  };
  function resize(){const scale=Math.min(1,900/innerWidth);pass.setSize(Math.round(innerWidth*scale),Math.round(innerHeight*scale));}
  resize();
  return{resize,render(state){
    if(state.progress<=.27)return;
    pass.copyMaterial.uniforms.strength.value=smooth(.27,.34,state.progress)*.60;
    pass.minDistance=.018/camera.far;pass.maxDistance=.6/camera.far;
    pass.ssaoMaterial.uniforms.cameraNear.value=camera.near;pass.ssaoMaterial.uniforms.cameraFar.value=camera.far;
    pass.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(camera.projectionMatrix);
    pass.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);
    pass.render(renderer,null,null);
  }};
}
