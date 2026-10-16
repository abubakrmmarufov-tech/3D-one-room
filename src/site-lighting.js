import * as THREE from 'three';
import patches from './model/site-lights.json' with {type:'json'};

// Surface-projected pools are derived offline from existing GLB fixture heads.
// Startup adds one batch, without raycasting the entire site on a phone.
export function addPathLighting(root) {
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
    uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{night:{value:0}}]),
    vertexShader:`varying vec2 vPatch;
      #include <common>
      #include <fog_pars_vertex>
      void main(){vPatch=uv*2.0-1.0;vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader:`uniform float night;varying vec2 vPatch;
      #include <common>
      #include <fog_pars_fragment>
      void main(){float falloff=pow(max(0.0,1.0-dot(vPatch,vPatch)),2.5);
        gl_FragColor=vec4(vec3(1.0,.64,.30),falloff*night*.28);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
    fog:true,
  });
  const mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2),material,patches.length), matrix=new THREE.Matrix4();
  patches.forEach(([x,y,z,radius],i)=>{
    matrix.makeScale(radius,1,radius);matrix.setPosition(new THREE.Vector3(x,y+.018,z));mesh.setMatrixAt(i,matrix);
  });
  mesh.name='Existing fixture light pools';mesh.renderOrder=1;mesh.computeBoundingSphere();root.add(mesh);
  root.userData.pathLights=patches.length;
  return {setNight(value){material.uniforms.night.value=value;mesh.visible=value>.001;}};
}
