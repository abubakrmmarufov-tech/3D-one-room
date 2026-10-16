import * as THREE from 'three';

export function seededRandom(seed) {
  return () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
}

// One locally drawn twig, shared by every tree. Cutouts write depth: no blended
// crown sorting, billboard rotation, downloaded atlas, or per-tree frame updates.
let sharedLeafTexture;
export function leafTexture() {
  if (sharedLeafTexture) return sharedLeafTexture;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'), rnd = seededRandom(218);
  // Dense twig patches retain alpha coverage in distant mip levels. A sparse
  // single twig vanishes when minified, leaving bare trunks in aerial views.
  for (let row = 0; row < 7; row++) for (let col = 0; col < 6; col++) {
    const x = 20 + col * 43 + (rnd() - .5) * 19, y = 17 + row * 35 + (rnd() - .5) * 18;
    const length = 46 + rnd() * 22;
    ctx.save(); ctx.translate(x, y); ctx.rotate((rnd() - .5) * Math.PI * 2);
    const gradient = ctx.createLinearGradient(0, 0, 0, -length);
    gradient.addColorStop(0, '#536b39'); gradient.addColorStop(.45, '#9aaf67'); gradient.addColorStop(1, '#6e8b45');
    ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.bezierCurveTo(-30, -length * .2, -24, -length * .72, 0, -length);
    ctx.bezierCurveTo(24, -length * .72, 30, -length * .2, 0, 8); ctx.fill();
    ctx.strokeStyle = '#bec88a'; ctx.globalAlpha = .18; ctx.lineWidth = .9;
    ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, -length * .88); ctx.stroke();
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return sharedLeafTexture = tex;
}

// Opaque curved leaf; the default has 24 triangles including its underside.
export function plantLeaf(length, width, segments = 3) {
  const positions = [], indices = [], uv = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, half = Math.sin(t * Math.PI) * width * .5;
    for (const side of [-1, 0, 1]) {
      positions.push(side * half, Math.sin(t * Math.PI) * length * .12 + Math.abs(side) * length * .025, t * length);
      uv.push((side + 1) / 2, t);
    }
  }
  for (let i = 0; i < segments; i++) for (let j = 0; j < 2; j++) {
    const a = i * 3 + j, b = a + 3; indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals();
  // Back faces are geometry, keeping this material in the existing opaque batch.
  g.setIndex([...indices, ...indices.reduce((a, _, i) => i % 3 ? a : a.concat(indices[i], indices[i + 2], indices[i + 1]), [])]);
  return g;
}

export function crownGeometry(kind, count, seed) {
  const rnd = seededRandom(seed), positions = [], normals = [], uv = [], colors = [];
  const normal = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), point = new THREE.Vector3();
  const base = new THREE.Color(kind === 1 ? 0x7f986e : kind === 3 ? 0xc5ce9a : 0xaab88c);
  for (let i = 0; i < count; i++) {
    const angle = i * 2.399963, t = rnd(), radius = Math.sqrt(rnd());
    let y, r;
    if (kind === 1) { y = 1.7 + t * 5.5; r = (1 - t) * 1.8 + .15; }
    else if (kind === 2) { y = 2.3 + t * 4.8; r = Math.sin(t * Math.PI) * 1.0 + .12; }
    else if (kind === 3) { y = 2.2 + t * 2.7; r = Math.sqrt(Math.max(0, 1 - (t * 2 - 1) ** 2)) * 1.5; }
    else { y = 2.7 + t * 3.7; r = Math.sqrt(Math.max(0, 1 - (t * 2 - 1) ** 2)) * 2.4; }
    point.set(Math.cos(angle) * r * radius, y, Math.sin(angle) * r * radius);
    normal.set(Math.cos(angle), (rnd() - .4) * 1.2, Math.sin(angle)).normalize();
    right.crossVectors(new THREE.Vector3(0, 1, 0), normal).normalize(); up.crossVectors(normal, right).normalize();
    const size = (kind === 1 ? .6 : .95) * (.75 + rnd() * .5), shade = .78 + rnd() * .3;
    for (const [x, y, u, v] of [[-1,-1,0,0],[1,-1,1,0],[1,1,1,1],[-1,-1,0,0],[1,1,1,1],[-1,1,0,1]]) {
      positions.push(point.x + (right.x * x + up.x * y) * size, point.y + (right.y * x + up.y * y) * size, point.z + (right.z * x + up.z * y) * size);
      normals.push(normal.x, normal.y, normal.z); uv.push(u, v); colors.push(base.r * shade, base.g * shade, base.b * shade);
    }
  }
  const g = new THREE.BufferGeometry();
  for (const [name, array, size] of [['position', positions, 3], ['normal', normals, 3], ['uv', uv, 2], ['color', colors, 3]]) g.setAttribute(name, new THREE.Float32BufferAttribute(array, size));
  return g;
}
