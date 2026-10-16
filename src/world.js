// Shared daylight, sky and site lighting. No network environment-map download.
import * as THREE from 'three';
import { CARS, PEOPLE, TREES, RESIDENTIAL, toScene } from './config.js';
import { addCars, addPeople, addTrees } from './props.js';
import { lightingAt } from './daylight.js';

export function buildWorld(scene) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() },
      sunDirection: { value: new THREE.Vector3() }, sunColor: { value: new THREE.Color() }, daylight: { value: 1 } },
    vertexShader: `varying vec3 vDir;
      void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform vec3 top;uniform vec3 bottom;uniform vec3 sunDirection;uniform vec3 sunColor;uniform float daylight;
      varying vec3 vDir;
      void main(){vec3 dir=normalize(vDir);float h=pow(clamp(dir.y,0.0,1.0),.55);
        vec3 sky=mix(bottom,top,h);float facing=max(dot(dir,normalize(sunDirection)),0.0);
        sky+=sunColor*pow(facing,32.0)*.18*daylight;
        sky+=sunColor*smoothstep(.99965,.99985,facing)*daylight*2.0;
        gl_FragColor=vec4(sky,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  // Keep the dome inside the far plane, centered on the viewer even inside a room.
  sky.renderOrder = -10; sky.frustumCulled = false; sky.userData.isSky = true; scene.add(sky);
  scene.background = new THREE.Color(0x89a9bf);
  scene.fog = new THREE.Fog(0xe1e5e3, 400, 1400);
  const ambient = new THREE.HemisphereLight(0xe2eaf1, 0x8d887c, .62); scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff2df, 2.2);
  sun.castShadow = true; sun.shadow.autoUpdate = false;
  sun.shadow.mapSize.setScalar(2048);
  sun.shadow.bias = -.00018; sun.shadow.normalBias = .035;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 500;
  scene.add(sun, sun.target);
  const facadeLights = RESIDENTIAL.map(t => {
    const c = toScene(...t.centre), light = new THREE.SpotLight(0xffc68a, 0, 100, .52, .75, 2);
    light.position.set(c.x, 14, c.z + 22); light.target.position.set(c.x, 48, c.z);
    scene.add(light, light.target); return light;
  });
  addTrees(scene, TREES.protos, TREES.list, toScene);
  addCars(scene, CARS, toScene); addPeople(scene, PEOPLE, toScene);
  let lastHour = -1, lighting, shadowTime = -1;
  const focus = new THREE.Vector3(0, 30, 0);
  function setTime(hour) {
    if (hour === lastHour) return lighting;
    lastHour = hour; lighting = lightingAt(hour);
    const u = sky.material.uniforms;
    u.top.value.copy(lighting.top); u.bottom.value.copy(lighting.horizon);
    u.sunColor.value.copy(lighting.sunColor); u.daylight.value = lighting.daylight;
    const angle = (hour - 6) / 12 * Math.PI;
    u.sunDirection.value.set(Math.cos(angle), Math.sin(angle), -.28).normalize();
    // At night the same shadow light supplies a faint moon fill.
    const direction = u.sunDirection.value.clone();
    if (direction.y < 0) direction.negate();
    sun.position.copy(focus).addScaledVector(direction, 220);
    sun.target.position.copy(focus); sun.color.copy(lighting.sunColor); sun.intensity = lighting.sun;
    ambient.color.copy(lighting.top).lerp(new THREE.Color(0xffffff), .6);
    ambient.intensity = lighting.ambient;
    scene.fog.color.copy(lighting.horizon); scene.background.copy(lighting.horizon);
    scene.environmentIntensity = lighting.environment;
    for (const light of facadeLights) light.intensity = lighting.night * 2400;
    return lighting;
  }
  function setFocus(position = null) {
    focus.copy(position ?? new THREE.Vector3(0, 30, 0));
    const extent = position ? 24 : 120, c = sun.shadow.camera;
    Object.assign(c, { left: -extent, right: extent, top: extent, bottom: -extent }); c.updateProjectionMatrix();
    const hour = lastHour; lastHour = -1; setTime(hour < 0 ? 13 : hour); sun.shadow.needsUpdate = true;
  }
  setFocus(); setTime(13);
  return { sun, sky, setTime, setFocus,
    invalidateShadow() { sun.shadow.needsUpdate = true; },
    update(now, camera, changing) {
      sky.position.copy(camera.position);
      // Static buildings don't need a fresh shadow pass on every camera frame.
      if (changing && now - shadowTime > .2) { sun.shadow.needsUpdate = true; shadowTime = now; }
    },
  };
}
