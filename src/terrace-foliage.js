import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { crownGeometry, leafTexture } from './foliage.js';

// Work in the GLB's local coordinates, including its quantized decode scale.
// Weld face seams before finding each original terrace shrub's bounds.
function shrubBounds(geometry) {
  const p = geometry.attributes.position, index = geometry.index;
  const parents = Array.from({ length: p.count }, (_, i) => i), weld = new Map();
  const find = i => { while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; } return i; };
  const join = (a, b) => { parents[find(a)] = find(b); };
  for (let i = 0; i < p.count; i++) {
    const key = [p.getX(i), p.getY(i), p.getZ(i)].map(v => Math.round(v * 1e5)).join('/');
    if (weld.has(key)) join(i, weld.get(key)); else weld.set(key, i);
  }
  for (let i = 0; i < (index?.count ?? p.count); i += 3) {
    const a = index ? index.getX(i) : i;
    join(a, index ? index.getX(i + 1) : i + 1); join(a, index ? index.getX(i + 2) : i + 2);
  }
  const groups = new Map(), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    const key = find(i); if (!groups.has(key)) groups.set(key, new THREE.Box3());
    groups.get(key).expandByPoint(v.fromBufferAttribute(p, i));
  }
  return [...groups.values()];
}

export function terraceCrownGeometry(source) {
  const pieces = shrubBounds(source).map((box, i) => {
    const g = crownGeometry(3, 60, 919 + i); g.computeBoundingBox();
    const size = box.getSize(new THREE.Vector3()), original = g.boundingBox.getSize(new THREE.Vector3());
    const center = g.boundingBox.getCenter(new THREE.Vector3()), target = box.getCenter(new THREE.Vector3());
    g.translate(-center.x, -center.y, -center.z);
    g.scale(size.x / original.x, size.y / original.y, size.z / original.z);
    g.translate(target.x, target.y, target.z); return g;
  });
  const merged = mergeGeometries(pieces); pieces.forEach(g => g.dispose());
  merged.computeBoundingBox(); merged.computeBoundingSphere(); return merged;
}

export function replaceTerraceShrubs(root) {
  const cache = new Map(); let material, count = 0;
  root.traverse(mesh => {
    const floor = mesh.parent?.userData;
    if (!mesh.isMesh || mesh.material?.name !== 'Shrub' || floor?.part !== 'slab' || !['V', 'B'].includes(floor.tower)) return;
    if (!cache.has(mesh.geometry)) cache.set(mesh.geometry, terraceCrownGeometry(mesh.geometry));
    material ??= new THREE.MeshStandardMaterial({ map: leafTexture(), vertexColors: true, alphaTest: .28, side: THREE.DoubleSide, roughness: .94, envMapIntensity: .35 });
    mesh.geometry = cache.get(mesh.geometry); mesh.material = material; count++;
  });
  return count;
}
