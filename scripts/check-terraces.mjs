import fs from'node:fs';import{createNavigation}from'../src/navigation.js';import{inside,interiorPoint}from'../src/geometry.js';
const plans=JSON.parse(fs.readFileSync('src/model/plans.json'));let report=[];
for(const[key,p]of Object.entries(plans))for(const[i,a]of p.apartments.entries())if(a.balconies.length){const nav=createNavigation(p,{...a,rooms:[...a.rooms,...a.balconies]});for(const [bi,b] of a.balconies.entries()){const target=nav.rooms[a.rooms.length+bi].point;const route=target&&nav.route(nav.spawn,target);report.push({plan:key,unit:i,area:b.area,doors:a.exteriorDoorways.length,reachable:!!route});}}
fs.writeFileSync('docs/qa/terraces.json',JSON.stringify(report,null,2));console.log(report);
