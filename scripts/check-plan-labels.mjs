import fs from 'node:fs';
import assert from 'node:assert/strict';
import {planRoomEntries, planTransform, layoutPlanMarkers, planFigure} from '../src/plan-labels.js';
import {createServer} from 'vite';

const {B:plan} = JSON.parse(fs.readFileSync('src/model/plans.json'));
const sizes = [[256,230],[272,230],[288,230],[300,250],[320,250],[360,250],[600,250],[790,230],[376,210],[278,230]];
let checks = 0;
for (const [index, data] of plan.apartments.entries()) {
  const apt = {data, number:57 + index}, before = JSON.stringify(data), entries = planRoomEntries(apt);
  assert.equal(entries.length, data.rooms.length + data.balconies.length);
  assert.equal(new Set(entries.map(e => e.name)).size, entries.length, 'Repeated room names must be distinguished');
  assert.deepEqual(entries.map(e => e.room.area), [...data.rooms, ...data.balconies].map(r => r.area));
  const html = planFigure(apt);
  assert.equal((html.match(/<li>/g) ?? []).length, entries.length);
  assert(html.includes('aria-describedby="plan-room-key"'));
  for (const [width, height] of sizes) {
    const T = planTransform(apt, width, height, 16), markers = layoutPlanMarkers(entries, T, width, height);
    assert.equal(markers.length, entries.length);
    assert.deepEqual(markers.map(m => m.number), entries.map(e => e.number));
    for (const [i, m] of markers.entries()) {
      assert(Number.isFinite(m.x) && Number.isFinite(m.y));
      assert(m.x - m.radius >= 0 && m.x + m.radius <= width);
      assert(m.y - m.radius >= 0 && m.y + m.radius <= height);
      for (const n of markers.slice(i + 1)) {
        assert(Math.hypot(m.x - n.x, m.y - n.y) >= m.radius + n.radius + 4.9, `Markers overlap: layout ${index}, ${width}×${height}, rooms ${m.number}/${n.number}`);
      }
    }
    checks++;
  }
  assert.equal(JSON.stringify(data), before, 'Presentation must not mutate the source plan');
}
console.log(`Plan labels: ${plan.apartments.length} layouts, ${checks} viewport cases; every room present, no overlapping markers.`);

// The mobile sheet hides the canvas between openings. Its drawing buffer must
// retain its logical size rather than multiplying an old DPR-scaled size.
const server = await createServer({server:{middlewareMode:true}, appType:'custom'});
try {
  const {drawPlan} = await server.ssrLoadModule('/src/plan.js');
  const context = new Proxy({}, {get:() => () => {}});
  const canvas = {width:256,height:230,clientWidth:0,clientHeight:0,getContext:() => context};
  globalThis.devicePixelRatio = 2;
  for (let i = 0; i < 12; i++) drawPlan(canvas, {data:plan.apartments[0],plan:'B'});
  assert.equal(canvas.width, 512);
  assert.equal(canvas.height, 460);
  console.log('Hidden plan redraw: drawing buffer stays 512×460 after 12 redraws at DPR 2.');
} finally {
  delete globalThis.devicePixelRatio;
  await server.close();
}
