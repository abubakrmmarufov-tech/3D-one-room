// Choose a furniture orientation that leaves the actual circulation paths open.
// This runs offline: the viewer only reads the saved orientations.
import fs from'node:fs';import{createNavigation}from'../src/navigation.js';import{collectFurniture}from'../src/furniture-layout.js';import{inside,distToSegment}from'../src/geometry.js';
const plans=JSON.parse(fs.readFileSync('src/model/plans.json'));
for(const[key,plan]of Object.entries(plans))for(const[unit,apt]of plan.apartments.entries()){
 const nav=createNavigation(plan,apt),reserved=[];
 for(const r of nav.rooms){const route=r.point&&nav.route(nav.spawn,r.point);if(!route)continue;for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(len/.12);for(let k=0;k<=n;k++){const p=[a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n];if(Math.hypot(p[0]-r.point[0],p[1]-r.point[1])>.7)reserved.push(p);}}}
 for(const room of apt.rooms){let best=null;for(const flipU of[false,true])for(const flipV of[false,true]){const layout={flipU,flipV},f=collectFurniture(room,2.8,{},layout);let score=0;for(const p of reserved)for(const q of f.obstacles){let hit=inside(q,...p);for(let i=0;i<q.length&&!hit;i++)hit=distToSegment(...p,...q[i],...q[(i+1)%q.length]).d<.23;if(hit)score++;}if(!best||score<best.score)best={score,layout};}room.furniture=best.layout;}
 console.log(key,unit,'fit');
}fs.writeFileSync('src/model/plans.json',JSON.stringify(plans));
