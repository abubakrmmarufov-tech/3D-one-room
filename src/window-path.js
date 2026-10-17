import {bounds,polygonArea} from './geometry.js';

// Follow the imported window ribbon, including curved corner bays. Averaging the
// two boundary chains keeps frames on the glazing rather than across the room.
export function windowPath(poly){
 const b=bounds(poly),dx=b.x1-b.x0,dy=b.y1-b.y0;
 if(polygonArea(poly)>.95*dx*dy)return dx>dy?[[b.x0,(b.y0+b.y1)/2],[b.x1,(b.y0+b.y1)/2]]:[[(b.x0+b.x1)/2,b.y0],[(b.x0+b.x1)/2,b.y1]];
 const caps=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],z=poly[(i+1)%poly.length],d=Math.hypot(a[0]-z[0],a[1]-z[1]);
  const edge=([v,w],lo,hi)=>Math.abs(v-w)<.002&&(Math.abs(v-lo)<.002||Math.abs(v-hi)<.002);
  if(d>=.08&&d<=.35&&(edge([a[0],z[0]],b.x0,b.x1)||edge([a[1],z[1]],b.y0,b.y1)))caps.push(i);
 }
 if(caps.length!==2)return null;
 const [i,j]=caps,chain=(start,end)=>{const out=[];for(let k=start;;k=(k+1)%poly.length){out.push(poly[k]);if(k===end)return out;}};
 const a=chain((i+1)%poly.length,j),z=chain((j+1)%poly.length,i).reverse();
 const length=p=>p.slice(1).reduce((s,v,k)=>s+Math.hypot(v[0]-p[k][0],v[1]-p[k][1]),0);
 const at=(p,t)=>{let d=t*length(p);for(let k=1;k<p.length;k++){const u=p[k-1],v=p[k],l=Math.hypot(v[0]-u[0],v[1]-u[1]);if(d<=l)return[u[0]+(v[0]-u[0])*d/l,u[1]+(v[1]-u[1])*d/l];d-=l;}return p.at(-1);};
 const steps=Math.ceil(Math.max(length(a),length(z))/.65);
 return Array.from({length:steps+1},(_,k)=>{const u=at(a,k/steps),v=at(z,k/steps);return[(u[0]+v[0])/2,(u[1]+v[1])/2];});
}
