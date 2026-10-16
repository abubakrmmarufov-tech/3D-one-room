import {inside} from './geometry.js';

// Sample by metres, so a curved bay gets the same fold spacing as a straight one.
export function windowDressing(path, room, height) {
  if (!path || path.length < 2) return null;
  const distances = [0];
  for (let i = 1; i < path.length; i++) distances.push(distances[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const length = distances.at(-1);
  if (length < 1.5) return null;
  const at = distance => {
    let i = 1;
    while (i < path.length - 1 && distances[i] < distance) i++;
    const a = path[i - 1], b = path[i], span = distances[i] - distances[i - 1], t = (distance - distances[i - 1]) / span;
    const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const normal = [-(b[1] - a[1]) / span, (b[0] - a[0]) / span];
    const score = sign => [.32, .48, .64].filter(d => inside(room.poly, p[0] + normal[0] * sign * d, p[1] + normal[1] * sign * d)).length;
    const sign = score(1) >= score(-1) ? 1 : -1;
    return {p, normal: normal.map(v => v * sign)};
  };
  const offset = (distance, depth) => {const {p, normal} = at(distance);return [p[0] + normal[0] * depth, p[1] + normal[1] * depth];};
  const track = distances.map(d => offset(d, .26));
  const width = Math.min(.68, length * .16), panels = [];
  for (const end of [0, 1]) {
    const positions = [], uvs = [], indices = [], front = [], back = [], steps = 32, levels = [0, .025, .4, .95, 1];
    const start = end ? length - width : 0;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, d = start + t * width;
      const fold = Math.sin(t * Math.PI * 8) * .022;
      front.push(offset(d, .31 + fold));back.push(offset(d, .23 + fold));
      for (const level of levels) {
        const [x, y] = offset(d, .27 + fold);
        positions.push(x, .025 + level * (height - .155), -y);
        uvs.push(t * width * 1.65, level * (height - .20));
      }
    }
    for (let i = 0; i < steps; i++) for (let j = 0; j < levels.length - 1; j++) {
      const a = i * levels.length + j, b = a + levels.length;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
    // Walking follows the same dressed window footprint as the visible cloth.
    panels.push({positions, uvs, indices, footprint: [...front, ...back.reverse()]});
  }
  return {track, panels};
}
