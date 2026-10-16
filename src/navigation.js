// Navigation is derived from the same plan polygons used by the renderer.
import { bounds, inside, distToSegment, interiorPoint } from './geometry.js';

export function createNavigation(plan, apartment, obstacles = [], { step = 0.16, radius = 0.18 } = {}) {
  const outlines = [apartment.outline, ...apartment.balconies.map(b => b.poly), ...(apartment.thresholds??[])];
  const box = bounds(outlines.flat());
  const solids = [...plan.walls, ...plan.struct, ...plan.windows, ...plan.glazing, ...obstacles];
  const shapes = solids.map(poly => ({ poly, ...bounds(poly) }));
  const clear = (x, y) => {
    if (!outlines.some(p => inside(p, x, y))) return false;
    for (const s of shapes) {
      if (x < s.x0 - radius || x > s.x1 + radius || y < s.y0 - radius || y > s.y1 + radius) continue;
      if (inside(s.poly, x, y)) return false;
      for (let i = 0, j = s.poly.length - 1; i < s.poly.length; j = i++) {
        if (distToSegment(x, y, ...s.poly[j], ...s.poly[i]).d < radius) return false;
      }
    }
    return true;
  };
  const nx = Math.ceil((box.x1 - box.x0) / step) + 1, ny = Math.ceil((box.y1 - box.y0) / step) + 1;
  const point = i => [box.x0 + (i % nx) * step, box.y0 + Math.floor(i / nx) * step];
  const free = new Uint8Array(nx * ny);
  for (let i = 0; i < free.length; i++) free[i] = clear(...point(i)) ? 1 : 0;
  const nearest = (x, y, predicate = null) => {
    let best = -1, dist = Infinity;
    for (let i = 0; i < free.length; i++) {
      if (!free[i]) continue;
      const p = point(i);
      if (predicate && !predicate(...p)) continue;
      const d = (p[0] - x) ** 2 + (p[1] - y) ** 2;
      if (d < dist) { dist = d; best = i; }
    }
    return best;
  };
  const visible = (a, b) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (radius * 0.45)));
    for (let k = 0; k <= n; k++) if (!clear(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n)) return false;
    return true;
  };
  const neighbours = i => {
    const x = i % nx, y = Math.floor(i / nx), out = [];
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      if (x + dx < 0 || x + dx >= nx || y + dy < 0 || y + dy >= ny) continue;
      const j = i + dx + dy * nx;
      if (!free[j] || (dx && dy && (!free[i + dx] || !free[i + dy * nx]))) continue;
      const p=point(i),q=point(j); if (clear((p[0]+q[0])/2,(p[1]+q[1])/2)) out.push(j);
    }
    return out;
  };
  function route(from, to) {
    const start = nearest(...from), end = nearest(...to);
    if (start < 0 || end < 0) return null;
    // A priority queue keeps even the largest apartment responsive.
    const heap = [], cost = new Float64Array(free.length).fill(Infinity), prev = new Int32Array(free.length).fill(-1);
    const push = item => { heap.push(item); let k = heap.length - 1; while (k) { const p = (k - 1) >> 1; if (heap[p][1] <= item[1]) break; heap[k] = heap[p]; k = p; } heap[k] = item; };
    const pop = () => { const first = heap[0], last = heap.pop(); if (heap.length) { let k = 0; while (2*k+1 < heap.length) { let c = 2*k+1; if (c+1 < heap.length && heap[c+1][1] < heap[c][1]) c++; if (heap[c][1] >= last[1]) break; heap[k] = heap[c]; k = c; } heap[k] = last; } return first; };
    const ep = point(end), h = i => { const p = point(i); return Math.hypot(p[0] - ep[0], p[1] - ep[1]); };
    cost[start] = 0; push([start,h(start)]);
    const done = new Uint8Array(free.length);
    while (heap.length) {
      const [i] = pop(); if (done[i]) continue; done[i] = 1;
      if (i === end) break;
      for (const j of neighbours(i)) {
        const p = point(i), q = point(j), c = cost[i] + Math.hypot(q[0]-p[0],q[1]-p[1]);
        if (c < cost[j]) { cost[j] = c; prev[j] = i; push([j,c+h(j)]); }
      }
    }
    if (!done[end]) return null;
    const path = []; for (let i = end; i !== -1; i = prev[i]) path.push(point(i)); path.reverse();
    const result = [clear(...from) ? from : path[0]];
    let at = 0;
    while (at < path.length - 1) {
      let next = at + 1;
      while (next + 1 < path.length && visible(result[result.length - 1], path[next + 1])) next++;
      result.push(path[next]); at = next;
    }
    if (clear(...to) && visible(result[result.length-1],to)) result.push(to);
    return result;
  }
  // Pick targets in the circulation component, rather than an isolated gap
  // between furniture and a wall near the geometric centre of a room.
  const seeds = apartment.rooms.map((room, index) => {
    const centre = interiorPoint(room.poly), i = nearest(...centre,(x,y) => inside(room.poly,x,y));
    return { room, index, centre, i };
  });
  const hall = seeds.find(r => r.i >= 0 && r.room.tj === 'Даҳлез') ?? seeds.find(r => r.i >= 0 && r.room.kind === 'hall') ?? seeds.find(r => r.i >= 0);
  let spawnIndex = hall?.i ?? -1;
  const connected = new Uint8Array(free.length);
  const flood = start => {
    const queue = [start]; connected[start] = 1;
    for (let at=0; at<queue.length; at++) for (const j of neighbours(queue[at])) if (!connected[j]) { connected[j]=1; queue.push(j); }
    return queue.length;
  };
  if(spawnIndex>=0) {
    const size=flood(spawnIndex);
    // A console can divide the hall into small pockets. Prefer its main open area.
    if(size<free.reduce((n,v)=>n+v,0)*.35) {
      let best=size, bestStart=spawnIndex;
      for(let i=0;i<free.length;i++) if(free[i]&&!connected[i]&&inside(hall.room.poly,...point(i))) {
        const n=flood(i);if(n>best){best=n;bestStart=i;}
      }
      spawnIndex=bestStart;connected.fill(0);flood(spawnIndex);
    }
  }
  const rooms=seeds.map(({room,index,centre})=>{
    const i=nearest(...centre,(x,y)=>inside(room.poly,x,y)&&connected[Math.round((y-box.y0)/step)*nx+Math.round((x-box.x0)/step)]);
    return{room,index,point:i<0?null:point(i)};
  });
  const spawn=spawnIndex<0?null:point(spawnIndex);
  // Substeps prevent crossing thin walls on slow frames. Axis slides permit smooth wall following.
  function move(from, to) {
    let p = [...from];
    const n = Math.max(1, Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1]) / 0.06));
    const dx=(to[0]-from[0])/n, dy=(to[1]-from[1])/n;
    for (let k=0;k<n;k++) {
      if (clear(p[0]+dx,p[1]+dy)) p=[p[0]+dx,p[1]+dy];
      else if (clear(p[0]+dx,p[1])) p[0]+=dx;
      else if (clear(p[0],p[1]+dy)) p[1]+=dy;
    }
    return p;
  }
  return { clear, route, move, rooms, spawn, visible, point, free, nearest, step, radius };
}
