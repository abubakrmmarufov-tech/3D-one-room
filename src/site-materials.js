import * as THREE from 'three';

// World-space micro relief avoids seams from disconnected GLB UV islands. No
// displacement or extra vertices: the original site/hotel meshes are untouched.
export function tuneSiteSurface(material, kind) {
  const stone = kind === 'stone', asphalt = kind === 'asphalt', context = kind === 'context';
  material.roughness = asphalt ? .96 : context ? .88 : .83;
  material.metalness = 0;
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vSiteWorld;\n' + shader.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSiteWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader = `varying vec3 vSiteWorld;
      float siteHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float siteNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(siteHash(i),siteHash(i+vec2(1,0)),f.x),mix(siteHash(i+vec2(0,1)),siteHash(i+vec2(1)),f.x),f.y);}
      float siteHeight(vec2 p){${asphalt ? 'return siteNoise(p*32.0)*.0025+siteNoise(p*3.0)*.0015;' : stone ? 'return siteNoise(p*7.0)*.025+siteNoise(p*32.0)*.006;' : context ? 'return siteNoise(p*18.0)*.003;' : 'vec2 edge=abs(fract(p/vec2(.6,.6))-.5);float joint=smoothstep(.473,.492,max(edge.x,edge.y));return -joint*.006+siteNoise(p*28.0)*.0015;'}}
      ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      vec2 surface=vSiteWorld.xz;${context ? 'surface=vec2(vSiteWorld.x+vSiteWorld.z,vSiteWorld.y);' : ''}
      float h=siteHeight(surface),eps=.012;
      vec2 slope=vec2(siteHeight(surface+vec2(eps,0))-h,siteHeight(surface+vec2(0,eps))-h)/eps;
      vec3 localSlope=${context ? 'vec3(slope.x,slope.y,slope.x)' : 'vec3(slope.x,0.0,slope.y)'};
      normal=normalize(normal-(viewMatrix*vec4(localSlope,0.0)).xyz*.45);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float mottling=siteNoise(vSiteWorld.xz*.17);
      diffuseColor.rgb*=mix(.91,1.04,mottling);${context ? 'diffuseColor.rgb*=mix(.85,1.0,smoothstep(0.0,8.0,vSiteWorld.y));' : ''}`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(siteNoise(vSiteWorld.xz*2.0)-.5)*.1,.55,1.0);');
  };
  material.customProgramCacheKey = () => `site-surface-${kind}-1`;
}

// Detail on baked solid planting elsewhere in the source scene. Shared material
// treatment only; hotel geometry and source planting outlines are preserved.
export function tuneSourceFoliage(material) {
  material.color.set(material.name === 'Leaves light' ? 0x71854d : material.name === 'Shrub' ? 0x3f5938 : 0x4c693f);
  material.roughness = .95;
  material.onBeforeCompile = shader => {
    shader.vertexShader='varying vec3 vLeafWorld;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvLeafWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader='varying vec3 vLeafWorld;\n'+shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float leafDetail=sin(vLeafWorld.x*24.0+sin(vLeafWorld.y*17.0))*sin(vLeafWorld.z*29.0+vLeafWorld.y*13.0);
      diffuseColor.rgb*=.87+leafDetail*.11;`);
  };
  material.customProgramCacheKey=()=> 'source-planting-detail-1';
}
