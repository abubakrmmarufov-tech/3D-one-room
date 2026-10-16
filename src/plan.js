// 2D floor plan of an apartment, drawn from the architect's plan (same orientation as the drawings).
import { PLANS } from './config.js';
import {planRoomEntries, layoutPlanMarkers, planTransform} from './plan-labels.js';
import {roomPartitions} from './interior-shell.js';
export {planTransform} from './plan-labels.js';

const FILL = {
  living: '#f6eee1', kitchen: '#f3ead8', bedroom: '#e9f0f6', hall: '#f1f0ec', bath: '#e1eef3', storage: '#ecebe7',
  loggia: '#eceae4',
};

const logicalSizes = new WeakMap();

export function drawPlan(canvas, apt, { pad = 14, labels = true } = {}) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const previous = logicalSizes.get(canvas);
  const cw = canvas.clientWidth || previous?.width || canvas.width;
  const ch = canvas.clientHeight || previous?.height || canvas.height;
  logicalSizes.set(canvas, {width:cw, height:ch});
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cw, ch);
  const T = planTransform(apt, cw, ch, pad);
  const path = (poly) => {
    g.beginPath();
    poly.forEach(([x, y], i) => (i ? g.lineTo(T.px(x), T.py(y)) : g.moveTo(T.px(x), T.py(y))));
    g.closePath();
  };

  // only this apartment: clip to its outline and balconies
  g.save();
  g.beginPath();
  for (const poly of [apt.data.outline, ...apt.data.balconies.map((b) => b.poly)]) {
    poly.forEach(([x, y], i) => (i ? g.lineTo(T.px(x), T.py(y)) : g.moveTo(T.px(x), T.py(y))));
    g.closePath();
  }
  g.clip();
  for (const b of apt.data.balconies) {
    path(b.poly);
    g.fillStyle = '#eceae4';
    g.fill();
  }
  for (const r of apt.data.rooms) {
    path(r.poly);
    g.fillStyle = FILL[r.kind] ?? '#f2f2f2';
    g.fill();
  }
  g.fillStyle = '#ffffff';
  g.strokeStyle = 'rgba(40, 45, 55, 0.45)';
  g.lineWidth = 1;
  for (const f of apt.data.fixtures) {
    path(f);
    g.fill();
    g.stroke();
  }
  g.restore();

  // Keep neighboring apartments out of the empty parts of the bounding rectangle.
  const plan = PLANS[apt.plan];
  g.save();
  g.beginPath();
  for (const poly of [apt.data.outline, ...apt.data.balconies.map(b => b.poly)]) {
    poly.forEach(([x, y], i) => (i ? g.lineTo(T.px(x), T.py(y)) : g.moveTo(T.px(x), T.py(y))));
    g.closePath();
  }
  g.clip();
  g.fillStyle = '#2b2f36';
  for (const w of [...plan.walls, ...plan.struct, ...roomPartitions(plan)]) {
    path(w);
    g.fill();
  }
  g.fillStyle = '#5fa4d6';
  for (const w of [...plan.windows, ...plan.glazing]) {
    path(w);
    g.fill();
  }
  g.restore();

  // apartment outline
  path(apt.data.outline);
  g.strokeStyle = '#1f5f8b';
  g.lineWidth = 2;
  g.stroke();

  if (labels) {
    const markers = layoutPlanMarkers(planRoomEntries(apt), T, cw, ch);
    g.lineWidth = 1.5;
    // Leaders go behind all markers; their endpoint identifies the tiny room.
    for (const m of markers) if (m.anchor) {
      g.strokeStyle = '#68766f';
      g.beginPath(); g.moveTo(...m.anchor); g.lineTo(m.x, m.y); g.stroke();
      g.fillStyle = '#344d45'; g.beginPath(); g.arc(...m.anchor, 2, 0, Math.PI * 2); g.fill();
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '600 11px system-ui, -apple-system, sans-serif';
    for (const m of markers) {
      g.fillStyle = '#ffffff'; g.strokeStyle = '#345b56';
      g.beginPath(); g.arc(m.x, m.y, m.radius, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#24433e'; g.fillText(String(m.number), m.x, m.y + .5);
    }
  }
  return T;
}
