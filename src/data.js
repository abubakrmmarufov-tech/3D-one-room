// Apartments of the residential towers, as drawn on the floor plans (model/plans.json).
import { PLANS, RESIDENTIAL } from './config.js';
import { polygonArea } from './geometry.js';

export const apartments = [];
for (const tower of RESIDENTIAL) {
  let number = 0;
  for (const fl of tower.floors) {
    PLANS[fl.plan].apartments.forEach((a, i) => {
      const balcony = a.balconies.reduce((s, b) => s + b.area, 0) + a.rooms.filter((r) => r.kind === 'loggia').reduce((s, r) => s + r.area, 0);
      apartments.push({
        id: `${tower.key}${fl.floor}-${i}`,
        tower: tower.key,
        towerLabel: tower.label,
        number: ++number,
        floor: fl.floor,
        floors: tower.levels,
        unit: i,
        plan: fl.plan,
        data: a, // outline, rooms, balconies, fixtures (plan coordinates)
        baseY: fl.z + tower.slab,
        ceiling: Math.round((fl.h - 0.5) * 10) / 10,
        rooms: a.rooms_count,
        area: a.area,
        balcony: Math.round(balcony * 10) / 10,
        outlineArea: polygonArea(a.outline),
      });
    });
  }
}

export const aptsOnFloor = (tower, floor) => apartments.filter((a) => a.tower === tower && a.floor === floor);
