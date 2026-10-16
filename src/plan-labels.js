import {bounds, centroid, inside, interiorPoint, distToSegment} from './geometry.js';
import {roomName, areaText} from './locale.js';

// One numbering source for the drawing and its accessible HTML key. No source
// room is dropped because of its size; duplicate names are explicitly numbered.
export function planRoomEntries(apt) {
  const rooms = [...apt.data.rooms, ...apt.data.balconies];
  const totals = {}, seen = {};
  for (const room of rooms) totals[roomName(room)] = (totals[roomName(room)] ?? 0) + 1;
  return rooms.map((room, index) => {
    const name = roomName(room), count = seen[name] = (seen[name] ?? 0) + 1;
    return {room, number:index + 1, name:totals[name] > 1 ? `${name} ${count}` : name};
  });
}

export function planTransform(apt, cw, ch, pad = 16) {
  const b = bounds([...apt.data.outline, ...apt.data.balconies.flatMap(room => room.poly)]);
  const s = Math.min((cw - 2 * pad) / (b.x1 - b.x0), (ch - 2 * pad) / (b.y1 - b.y0));
  const ox = (cw - (b.x1 - b.x0) * s) / 2, oy = (ch - (b.y1 - b.y0) * s) / 2;
  return {s, px:x => ox + (x - b.x0) * s, py:y => oy + (b.y1 - y) * s, b};
}

function clearance(poly, x, y) {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    d = Math.min(d, distToSegment(x, y, ...poly[j], ...poly[i]).d);
  }
  return d;
}

export function layoutPlanMarkers(entries, T, width, height) {
  const radius = 10, gap = 5, placed = [];
  const free = (x, y) => x >= radius + 3 && x <= width - radius - 3 && y >= radius + 3 && y <= height - radius - 3 &&
    placed.every(p => Math.hypot(p.x - x, p.y - y) >= radius * 2 + gap);
  // Reserve the constrained spaces first. Larger rooms can accept more positions.
  for (const entry of [...entries].sort((a, b) => a.room.area - b.room.area)) {
    const poly = entry.room.poly, b = bounds(poly), anchor = interiorPoint(poly);
    const candidates = [anchor, centroid(poly)];
    for (let i = 1; i < 16; i++) for (let j = 1; j < 16; j++) {
      candidates.push([b.x0 + (b.x1 - b.x0) * i / 16, b.y0 + (b.y1 - b.y0) * j / 16]);
    }
    let best, score = -Infinity;
    for (const [px, py] of candidates) {
      if (!inside(poly, px, py)) continue;
      const x = T.px(px), y = T.py(py), edge = clearance(poly, px, py) * T.s;
      if (edge < radius + 2 || !free(x, y)) continue;
      const value = Math.min(edge, 22) - Math.hypot(px - anchor[0], py - anchor[1]) * T.s * .25;
      if (value > score) { best = {x, y}; score = value; }
    }
    const ax = T.px(anchor[0]), ay = T.py(anchor[1]);
    if (!best) {
      // A narrow utility room gets a short callout rather than a shrunken label
      // or a badge obscuring its walls. Search outward, avoiding other rooms.
      let cost = Infinity;
      const screenPolys = entries.map(e => e.room.poly.map(([x, y]) => [T.px(x), T.py(y)]));
      for (let y = radius + 4; y <= height - radius - 4; y += 5) {
        for (let x = radius + 4; x <= width - radius - 4; x += 5) {
          if (!free(x, y)) continue;
          const occupied = screenPolys.some(p => inside(p, x, y) || clearance(p, x, y) < radius + 3);
          const value = Math.hypot(x - ax, y - ay) + (occupied ? 160 : 0);
          if (value < cost) { best = {x, y, anchor:[ax, ay]}; cost = value; }
        }
      }
    }
    if (!best) throw new Error('Plan card is too small for its room markers');
    placed.push({...entry, ...best, radius});
  }
  return placed.sort((a, b) => a.number - b.number);
}

export function planFigure(apt) {
  const entries = planRoomEntries(apt);
  return `<figure class="apartment-plan" aria-labelledby="plan-title"><figcaption><h3 id="plan-title">План квартиры</h3><p id="plan-instruction">Номера на схеме — в списке ниже.</p></figcaption><canvas class="plan" role="img" aria-label="План квартиры № ${apt.number}, комнаты и террасы" aria-describedby="plan-room-key"></canvas><ol class="plan-room-key" id="plan-room-key">${entries.map(e => `<li><span class="room-number" aria-hidden="true">${e.number}</span><span><span class="room-key-name">${e.name}</span><span class="room-key-area">${areaText(e.room.area)} м²</span></span></li>`).join('')}</ol></figure>`;
}
