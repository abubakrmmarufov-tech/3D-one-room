import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createNavigation } from '../src/navigation.js';
const plans = JSON.parse(fs.readFileSync('src/model/plans.json'));
const report=[];
for (const [key, plan] of Object.entries(plans)) for (const [unit, apt] of plan.apartments.entries()) {
 const nav=createNavigation(plan,apt), missing=[];
 assert(nav.spawn,`No spawn ${key}/${unit}`);
 for(const r of nav.rooms) {
  const path=r.point&&nav.route(nav.spawn,r.point);
  if(!path) missing.push({room:r.index,name:r.room.name,area:r.room.area});
  else for(let i=1;i<path.length;i++) assert(nav.visible(path[i-1],path[i]),`Unsafe route ${key}/${unit}/${r.index}`);
 }
 report.push({plan:key,unit,rooms:nav.rooms.length,missing});
}
console.log(JSON.stringify(report.filter(r=>r.missing.length),null,2));
fs.mkdirSync('docs/qa',{recursive:true});fs.writeFileSync('docs/qa/navigation.json',JSON.stringify(report,null,2));
console.log(`${report.length} apartment variants; ${report.reduce((s,r)=>s+r.rooms,0)} rooms; ${report.reduce((s,r)=>s+r.missing.length,0)} unreachable rooms`);

assert.equal(report.reduce((n,r)=>n+r.missing.length,0),0,"Every interior room must be reachable");
