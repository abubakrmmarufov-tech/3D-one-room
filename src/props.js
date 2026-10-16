// Trees, cars and people around the complex, drawn as instanced meshes from the positions the
// Blender build exports (model/complex.json). Geometry is generated here, so nothing else to load.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { crownGeometry, leafTexture } from './foliage.js';

// deterministic noise so every visit looks the same
function rng(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function colorize(geo, fn) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  const pos = geo.attributes.position, n = pos.count;
  const col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    fn(c, pos.getX(i), pos.getY(i), pos.getZ(i));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

const BARK = new THREE.Color(0x5b4334);
function trunk(h, r0, r1, branches, rnd) {
  const parts = [new THREE.CylinderGeometry(r1, r0, h, 7).translate(0, h / 2, 0)];
  for (let i = 0; i < branches; i++) {
    const len = h * (0.35 + rnd() * 0.25);
    const b = new THREE.CylinderGeometry(r1 * 0.35, r1 * 0.6, len, 5).translate(0, len / 2, 0);
    b.rotateZ(0.6 + rnd() * 0.4);
    b.rotateY((i / branches) * Math.PI * 2 + rnd());
    b.translate(0, h * (0.6 + rnd() * 0.3), 0);
    parts.push(b);
  }
  return colorize(mergeGeometries(parts.map((g) => g.index ? g.toNonIndexed() : g)), (c) => c.copy(BARK));
}

// Original tree coordinates and prototype dimensions are retained. Dense nearby
// foliage and lighter distant foliage are fixed site regions, avoiding LOD popping.
export function addTrees(scene, protos, list, toScene) {
  const rnd = rng(11), atlas = leafTexture();
  const wood = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96 });
  const leaf = new THREE.MeshStandardMaterial({ map: atlas, alphaTest: .28,
    side: THREE.DoubleSide, vertexColors: true, roughness: .92, envMapIntensity: .35 });
  const kinds = [0, 1, 2, 3].map(i => ({
    wood: trunk(i === 3 ? 2.7 : 4.2, i === 3 ? .14 : .22, .08, i === 1 ? 0 : 5, rnd),
    near: crownGeometry(i, i === 1 ? 170 : 150, i * 19 + 71),
    far: crownGeometry(i, i === 1 ? 65 : 55, i * 19 + 71),
  }));
  const groups = new Map();
  list.forEach(([x, y, sc, sz, rot, k], i) => {
    const proto = protos[k], w = toScene(x, y);
    const kind = proto.light && proto.h <= 6 ? 3 : proto.h >= 9 && i % 3 === 0 ? 1 : proto.r < 2.4 && i % 4 === 1 ? 2 : 0;
    const near = Math.hypot(w.x, w.z) < 165;
    // Four outer sectors let the frustum reject whole distant stands of trees.
    const sector = near ? 0 : 1 + (w.x > 0 ? 1 : 0) + (w.z > 0 ? 2 : 0), key = `${kind}/${sector}`;
    if (!groups.has(key)) groups.set(key, { kind, near, trees: [] });
    groups.get(key).trees.push({ w, proto, sc, sz, rot });
  });
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), position = new THREE.Vector3(), scale = new THREE.Vector3(), euler = new THREE.Euler(), tint = new THREE.Color();
  let triangles = 0;
  for (const { kind, near, trees } of groups.values()) {
    const g = kinds[kind], wm = new THREE.InstancedMesh(g.wood, wood, trees.length), lm = new THREE.InstancedMesh(near ? g.near : g.far, leaf, trees.length);
    trees.forEach((t, i) => {
      // Crown bounds are authored at 7 m (5 m for ornamental trees).
      const reference = kind === 3 ? 5.6 : kind === 2 ? 8 : 7.5;
      quaternion.setFromEuler(euler.set(0, t.rot, 0));
      matrix.compose(position.set(t.w.x, 0, t.w.z), quaternion, scale.set(t.proto.r / (kind === 3 ? 2.3 : kind === 2 ? 1.9 : 3.2) * t.sc, t.proto.h / reference * t.sz, t.proto.r / (kind === 3 ? 2.3 : kind === 2 ? 1.9 : 3.2) * t.sc));
      wm.setMatrixAt(i, matrix); lm.setMatrixAt(i, matrix);
      tint.setHSL(.13 + (i % 5) * .006, .12, .8 + (i % 7) * .022); lm.setColorAt(i, tint);
    });
    for (const mesh of [wm, lm]) {
      mesh.name = near ? 'Site trees nearby' : 'Site trees distant'; mesh.castShadow = near; mesh.receiveShadow = true;
      mesh.computeBoundingSphere(); mesh.matrixAutoUpdate = false; scene.add(mesh);
      triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3 * trees.length;
    }
  }
  scene.userData.treeBudget = { trees: list.length, batches: groups.size * 2, triangles };
}

// ---------- cars ----------
const CAR_PAINT = [0xd9dde2, 0xc9ccd0, 0x23272d, 0xa82a2a, 0xece8df, 0x5b6b7c, 0x1d2a44];

function carGeometries() {
  // side profile of a saloon, x along the car, extruded across (z), 4.5 m long
  const body = new THREE.Shape([
    [-2.25, 0.32], [2.2, 0.32], [2.3, 0.55], [2.22, 0.8], [1.15, 0.92], [0.55, 1.36], [-0.85, 1.4],
    [-1.55, 0.98], [-2.2, 0.92], [-2.3, 0.6],
  ].map(([x, y]) => new THREE.Vector2(x, y)));
  const bodyG = new THREE.ExtrudeGeometry(body, { depth: 1.62, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 });
  bodyG.translate(0, 0, -0.81);
  const glass = new THREE.Shape([[1.08, 0.95], [0.53, 1.33], [-0.83, 1.37], [-1.47, 0.99]].map(([x, y]) => new THREE.Vector2(x, y)));
  const glassG = new THREE.ExtrudeGeometry(glass, { depth: 1.74, bevelEnabled: false }).translate(0, 0, -0.87);
  const wheels = [];
  for (const x of [-1.42, 1.42]) {
    for (const z of [-0.78, 0.78]) {
      wheels.push(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 16).rotateX(Math.PI / 2).translate(x, 0.33, z).toNonIndexed());
    }
  }
  const lights = [];
  for (const z of [-0.6, 0.6]) {
    lights.push(new THREE.BoxGeometry(0.06, 0.12, 0.34).translate(2.34, 0.66, z).toNonIndexed());
  }
  const rear = [];
  for (const z of [-0.62, 0.62]) rear.push(new THREE.BoxGeometry(0.06, 0.12, 0.34).translate(-2.36, 0.72, z).toNonIndexed());
  return {
    body: bodyG,
    glass: glassG,
    wheels: mergeGeometries(wheels),
    front: mergeGeometries(lights),
    rear: mergeGeometries(rear),
  };
}

export function addCars(scene, list, toScene) {
  const G = carGeometries();
  const n = list.length;
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.15 });
  const meshes = [
    new THREE.InstancedMesh(G.body, paint, n),
    new THREE.InstancedMesh(G.glass, new THREE.MeshStandardMaterial({ color: 0x1a2129, roughness: 0.08, metalness: 0.6 }), n),
    new THREE.InstancedMesh(G.wheels, new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.8 }), n),
    new THREE.InstancedMesh(G.front, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3d8, emissiveIntensity: 0.6 }), n),
    new THREE.InstancedMesh(G.rear, new THREE.MeshStandardMaterial({ color: 0x8a1010, emissive: 0x6a0000, emissiveIntensity: 0.6 }), n),
  ];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
  list.forEach(([x, y, z, r, k], i) => {
    const w = toScene(x, y);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r);
    m4.compose(p.set(w.x, z, w.z), q, one);
    meshes.forEach((m) => m.setMatrixAt(i, m4));
    meshes[0].setColorAt(i, c.setHex(CAR_PAINT[(k + i) % CAR_PAINT.length]));
  });
  for (const m of meshes) {
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  }
}

// ---------- people ----------
const CLOTHES = [0x2f3b52, 0xb33a3a, 0xe8e2d6, 0x3d6b4f, 0x7a5c99, 0xd4a03a, 0x22252a];
const SKIN = [0xe0b48f, 0xc69472, 0x9c6b4a];

export function addPeople(scene, list, toScene) {
  const rnd = rng(5);
  const legs = new THREE.CapsuleGeometry(0.11, 0.7, 3, 6).translate(0, 0.46, 0);
  const torso = new THREE.CapsuleGeometry(0.17, 0.42, 3, 8).translate(0, 1.18, 0);
  const head = new THREE.SphereGeometry(0.12, 10, 8).translate(0, 1.66, 0);
  const n = list.length;
  const mk = (g, color) => new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }), n);
  const L = mk(legs, 0xffffff), T = mk(torso, 0xffffff), H = mk(head, 0xffffff);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  list.forEach(([x, y, z], i) => {
    const w = toScene(x, y);
    const h = 0.92 + rnd() * 0.16;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI * 2);
    m4.compose(p.set(w.x, z, w.z), q, s.set(1, h, 1));
    for (const m of [L, T, H]) m.setMatrixAt(i, m4);
    L.setColorAt(i, c.setHex([0x2a2f3a, 0x3b4a63, 0x4a3f35, 0x1e1f22][Math.floor(rnd() * 4)]));
    T.setColorAt(i, c.setHex(CLOTHES[Math.floor(rnd() * CLOTHES.length)]));
    H.setColorAt(i, c.setHex(SKIN[Math.floor(rnd() * SKIN.length)]));
  });
  for (const m of [L, T, H]) {
    m.castShadow = true;
    scene.add(m);
  }
}
