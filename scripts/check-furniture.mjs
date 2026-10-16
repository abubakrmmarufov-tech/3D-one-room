import fs from 'node:fs';import assert from 'node:assert/strict';
import{collectFurniture}from'../src/furniture-layout.js';import{createNavigation}from'../src/navigation.js';
const plans=JSON.parse(fs.readFileSync('src/model/plans.json')),report=[];
for(const[key,p]of Object.entries(plans))for(const[i,a]of p.apartments.entries()){
 const obstacles=a.rooms.flatMap(r=>collectFurniture(r,2.8).obstacles),nav=createNavigation(p,a,obstacles),missing=[];
 for(const r of nav.rooms){const path=r.point&&nav.spawn&&nav.route(nav.spawn,r.point);if(!path)missing.push({room:r.index,kind:r.room.kind,area:r.room.area});}
 report.push({plan:key,unit:i,missing,obstacles:obstacles.length});
}fs.writeFileSync('docs/qa/furniture.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.filter(r=>r.missing.length),null,2));console.log('unreachable',report.reduce((n,r)=>n+r.missing.length,0));

assert.equal(report.reduce((n,r)=>n+r.missing.length,0),0,"Every interior room must be reachable");
