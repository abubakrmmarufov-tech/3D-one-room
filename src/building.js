// The retained residential tower and landscaped courtyard, from the derived Blender export.
// Floors are separate objects so they can be hidden for the cut-away view,
// and every apartment has an invisible pick volume used for hovering and highlighting.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { MODEL_URL, toScene, towerByKey, planFrame } from './config.js';
import { groundTexture } from './textures.js';
import {loadLandscapeTextures,tuneWater,waterTime}from './landscape.js';
import { FACADE_MAPS } from './facade_maps.js';
import { tuneSiteSurface, tuneSourceFoliage } from './site-materials.js';
import { addPathLighting } from './site-lighting.js';
import { replaceTerraceShrubs } from './terrace-foliage.js';

const GLASS = new Set(['Window glass', 'Curtain glass', 'Shop glass', 'Shop window', 'Gallery glass', 'Pool water', 'River']);

const GROUND = {
  Grass: 'grass', Lawn: 'grass', Asphalt: 'asphalt', Paving: 'paving', Sidewalk: 'paving', 'Deck paving': 'deck',
  Cobble: 'cobble', 'Deck stone': 'stone', 'Pool mosaic': 'mosaic', 'Copper screen': 'copper', 'Rubber blue': 'rubber',
  Promenade: 'promenade',
  ...FACADE_MAPS,
};
const groundTex = {};
const nightUniform={value:0};
function windowGlow(m){
  m.onBeforeCompile=shader=>{
    shader.uniforms.windowNight=nightUniform;
    shader.vertexShader='varying vec3 vWindowWorld;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWindowWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader='uniform float windowNight;\nvarying vec3 vWindowWorld;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      vec3 cell=floor(vWindowWorld/vec3(3.8,3.3,3.8));
      float occupied=fract(sin(dot(cell,vec3(12.9898,78.233,37.719)))*43758.5453);
      float glow=smoothstep(occupied*.45+.12,occupied*.45+.32,windowNight)*step(.38,occupied);
      totalEmissiveRadiance+=mix(vec3(1.0,.56,.24),vec3(1.0,.82,.51),occupied)*glow*.42;`);
  };
  m.customProgramCacheKey=()=> 'residential-window-glow-1';
}

function tuneMaterial(m,landscape) {
  const g = GROUND[m.name];
  if (g) {
    groundTex[g] ??= groundTexture(g);
    m.map = groundTex[g];
    m.color.set(0xffffff);
    m.needsUpdate = true;
  }
  if(['Grass','Lawn'].includes(m.name)){Object.assign(m,landscape);m.color.set(0x9eaf8e);m.normalScale=new THREE.Vector2(.3,.3);m.roughness=.95;}
  if (GLASS.has(m.name)) {
    // lighter glass that picks up the sky
    if (!['River', 'Pool water', 'Shop window', 'Gallery glass'].includes(m.name)) m.color.offsetHSL(0, -0.05, 0.12);
    m.envMapIntensity = 1.2;
    m.roughness = Math.max(0.06, Math.min(m.roughness, 0.12));
  }
  if(['River','Pool water'].includes(m.name))tuneWater(m);
  if(['Asphalt','Paving','Sidewalk','Promenade','Deck paving','Deck stone','Courtyard stone','Embankment','Neighbour','Neighbour solid'].includes(m.name))tuneSiteSurface(m,m.name==='Asphalt'?'asphalt':m.name==='Embankment'?'stone':m.name.startsWith('Neighbour')?'context':'paving');
  if(['Leaves','Leaves light','Shrub'].includes(m.name))tuneSourceFoliage(m);
  if(m.name==='Foam'){m.transparent=true;m.opacity=.10;m.depthWrite=false;}
  if (m.name.startsWith('Stained')) m.emissiveIntensity = 0.25;
  if (m.name === 'Railing glass' || m.name === 'Railing glass dark' || m.name === 'Neighbour') {
    m.transparent = true;
    m.depthWrite = false;
    m.side = THREE.DoubleSide;
  }
  // Context buildings must occlude one another predictably through an apartment
  // window; blended whole buildings swap draw order as the camera turns.
  if(m.name==='Neighbour'){m.transparent=false;m.opacity=1;m.depthWrite=true;m.color.set(0xabb8bc);m.roughness=.9;}
  if(['Window glass','Curtain glass','Shop glass','Shop window','Gallery glass'].includes(m.name))windowGlow(m);
  if (m.name.startsWith('Leaves') || m.name === 'Shrub' || m.name === 'Grass' || m.name === 'Lawn') m.envMapIntensity = 0.4;
}

// The published artifact page can't serve .glb files, so it gets the same bytes base64-encoded
// in a JSON file ({ "glb": "..." }); everywhere else the .glb is loaded directly.
async function loadModel(loader, url, onProgress) {
  if (!new URL(url,location.href).pathname.endsWith('.json')) return loader.loadAsync(url, (e) => e.total && onProgress?.(e.loaded / e.total));
  const { glb } = await (await fetch(url)).json();
  const bytes = Uint8Array.from(atob(glb), (c) => c.charCodeAt(0));
  return loader.parseAsync(bytes.buffer, '');
}

export async function loadComplex(apartments, onProgress) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const landscape={};
  const gltf=await loadModel(loader,MODEL_URL,onProgress);
  const root = gltf.scene;
  const o = toScene(0, 0);
  root.position.set(o.x, 0, o.z);

  const towers = {}; // key -> { floors: { n: { slab, walls } }, roof }
  const tower = (k) => (towers[k] ??= { floors: {}, roof: null });
  const picks = [];
  const tuned = new Set();

  root.traverse((obj) => {
    const d = obj.userData;
    if (d.pick) {
      picks.push(obj);
      return;
    }
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      for (const m of [obj.material].flat()) {
        if (!tuned.has(m)) {
          tuneMaterial(m,landscape);
          tuned.add(m);
        }
        if (m.transparent) obj.castShadow = false;
      }
    }
    if (d.tower && d.part === 'roof') tower(d.tower).roof = obj;
    else if (d.tower && d.floor) {
      const f = (tower(d.tower).floors[d.floor] ??= {});
      f[d.part === 'walls' ? 'walls' : 'slab'] = obj;
    }
  });

  replaceTerraceShrubs(root);
  // pick volumes -> highlight overlays
  const units = new Map();
  let hotelPick = null;
  const box = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse(obj=>{obj.matrixAutoUpdate=false;});
  for (const mesh of picks) {
    mesh.visible = false;
    if (!mesh.userData.hotel) continue;
    mesh.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    mesh.userData.hotel = towerByKey[mesh.userData.tower];
    hotelPick = mesh;
  }
  // Rebuild residential pick volumes from the corrected apartment boundaries.
  // The pruned GLB retains Block Б in its original position.
  for (const apt of apartments) {
    const frame = planFrame(towerByKey[apt.tower]);
    const shape = new THREE.Shape(apt.data.outline.map(([x,y]) => new THREE.Vector2(x,y)));
    const geo = new THREE.ExtrudeGeometry(shape,{depth:apt.ceiling,bevelEnabled:false,curveSegments:1});
    geo.rotateX(-Math.PI/2);
    const mesh = new THREE.Mesh(geo,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    mesh.position.set(frame.position.x-root.position.x,apt.baseY,frame.position.z-root.position.z);
    mesh.rotation.y=frame.rotY;mesh.renderOrder=10;mesh.visible=false;mesh.userData.apt=apt;root.add(mesh);
    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo,35),new THREE.LineBasicMaterial({transparent:true,opacity:.7}));
    edges.visible=false;mesh.add(edges);mesh.updateMatrixWorld(true);box.setFromObject(mesh);const c=box.getCenter(new THREE.Vector3());
    units.set(apt.id,{overlay:mesh,edges,center:new THREE.Vector3(c.x,apt.baseY,c.z),top:box.max.y});
  }

  const each = (fn) => {
    for (const [k, t] of Object.entries(towers)) {
      for (const [n, f] of Object.entries(t.floors)) fn(k, +n, f, t);
    }
  };
  const setVisible = (o, v) => o && (o.visible = v);
  // Finishes are optional: a slow/missing texture never holds the scene loader open.
  loadLandscapeTextures().then(maps=>{for(const m of tuned)if(['Grass','Lawn'].includes(m.name)){Object.assign(m,maps);m.needsUpdate=true;}});
  const pathLighting=addPathLighting(root);
  const lamps=[...tuned].filter(m=>m.name==='Lamp glow');

  return {
    group: root,
    update(time){waterTime.value=time;},
    setLighting(night){pathLighting.setNight(night);nightUniform.value=night;for(const m of lamps)m.emissiveIntensity=.05+night*1.8;},
    towers,
    units,
    hotelPick,
    pickables: [...units.values()].map((u) => u.overlay).concat(hotelPick ? [hotelPick] : []),
    // Cut-away: hide everything above `floor` in `towerKey` and open up that floor.
    showUpTo(towerKey, floor) {
      each((k, n, f, t) => {
        const above = k === towerKey && n > floor;
        setVisible(f.slab, !above);
        setVisible(f.walls, !above && !(k === towerKey && n === floor));
        setVisible(t.roof, k !== towerKey);
      });
    },
    // Everything visible, except the walls of an apartment floor someone is walking around in.
    showAll(openTower = null, openFloor = null) {
      each((k, n, f, t) => {
        setVisible(f.slab, true);
        setVisible(f.walls, !(k === openTower && n === openFloor));
        setVisible(t.roof, true);
      });
    },
  };
}
