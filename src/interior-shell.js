import {bounds, inside} from './geometry.js';

const partitions = new WeakMap();
const probes = poly => {
 const b=bounds(poly),x=(b.x0+b.x1)/2,y=(b.y0+b.y1)/2,along=b.x1-b.x0>b.y1-b.y0;
 const offset=(along?b.y1-b.y0:b.x1-b.x0)/2+.18;
 return {b,x,y,along,sides:[-1,1].map(sign=>[x+(along?0:sign*offset),y+(along?sign*offset:0)])};
};

// The drawing extraction called every long blue member a beam. Where its two
// sides belong to different rooms, the architectural boundary needs an opaque
// infill below it. Exterior lintels and members within one room remain overhead.
export function roomPartitions(plan){
 if(!partitions.has(plan))partitions.set(plan,(plan.beams??[]).filter(poly=>{
  const {sides}=probes(poly),rooms=sides.map(p=>plan.apartments.flatMap(a=>a.rooms).find(r=>inside(r.poly,...p)));
  return rooms[0]&&rooms[1]&&rooms[0]!==rooms[1];
 }));
 return partitions.get(plan);
}

export function apartmentEntrance(plan,apartment){
 for(const poly of plan.doorways??[]){
  const probe=probes(poly),{x,y,along,b}=probe,offset=(along?b.y1-b.y0:b.x1-b.x0)/2+.30;
  const sides=[-1,1].map(sign=>[x+(along?0:sign*offset),y+(along?sign*offset:0)]);
  const halls=sides.map(p=>apartment.rooms.some(r=>r.kind==='hall'&&inside(r.poly,...p)));
  for(let i=0;i<2;i++)if(halls[i]&&!inside(apartment.outline,...sides[1-i]))return{poly,...probe,inward:i===0?-1:1};
 }
 return null;
}

// The coloured room fills stop short of the wall faces in the source drawing.
// For a small rectangular WC, extend its tile finish to the surrounding walls
// and stop at the doorway threshold, so the hall keeps its own floor finish.
export function wetRoomFinish(plan,room){
 if(room.kind!=='bath'||room.area>=2.7)return room.poly;
 const b=bounds(room.poly),cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,edges={...b};
 for(const [axis,centre,keys,cross]of[[0,cx,['x0','x1'],['y0','y1']],[1,cy,['y0','y1'],['x0','x1']]]){
  const lows=[],highs=[];
  // Sample near both corners too: a source structural wall has a shallow step.
  for(const t of[.04,.25,.5,.75,.96]){
   const across=b[cross[0]]+(b[cross[1]]-b[cross[0]])*t,hits=[];
   for(const poly of[...plan.walls,...plan.struct,...roomPartitions(plan),...(plan.doorways??[])])for(let i=0;i<poly.length;i++){
    const a=poly[i],z=poly[(i+1)%poly.length],j=1-axis;
    if((a[j]<=across&&z[j]>across)||(z[j]<=across&&a[j]>across))hits.push(a[axis]+(z[axis]-a[axis])*(across-a[j])/(z[j]-a[j]));
   }
   lows.push(Math.max(...hits.filter(v=>v<centre)));highs.push(Math.min(...hits.filter(v=>v>centre)));
  }
  for(const [key,values,extreme]of[[keys[0],lows,Math.min],[keys[1],highs,Math.max]]){
   const nearby=values.filter(v=>Number.isFinite(v)&&Math.abs(v-b[key])<.4);
   if(nearby.length)edges[key]=extreme(...nearby);
  }
 }
 return[[edges.x0,edges.y0],[edges.x1,edges.y0],[edges.x1,edges.y1],[edges.x0,edges.y1]];
}
