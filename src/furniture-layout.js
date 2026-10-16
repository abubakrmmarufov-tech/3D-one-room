import { furnishRoom } from './furnishings.js';
import {furnishShowcase} from './showcase-room.js';
export function furnitureObstacle(x0,y0,x1,y1,z0,z1){const w=Math.abs(x1-x0),d=Math.abs(y1-y0);return z0<.85&&z1>.28&&w>.25&&d>.25?[[Math.min(x0,x1),Math.min(y0,y1)],[Math.max(x0,x1),Math.min(y0,y1)],[Math.max(x0,x1),Math.max(y0,y1)],[Math.min(x0,x1),Math.max(y0,y1)]]:null;}
export function collectFurniture(room,H,materials={},layout=room.furniture??{}){const commands=[],obstacles=[];
 const add=(type,args)=>commands.push({type,args});
 const B={obstacle(poly){obstacles.push(poly);},box(...args){add('box',args);const o=furnitureObstacle(...args.slice(1,7));if(o)obstacles.push(o);},cyl(...args){add('cyl',args);const[,x,y,r,z0,z1]=args;if(r>.2&&z0<.85&&z1>.28)obstacles.push(Array.from({length:12},(_,i)=>[x+r*Math.cos(i*Math.PI/6),y+r*Math.sin(i*Math.PI/6)]));},ball(...args){add('ball',args);},leaf(...args){add('leaf',args);}};
 const presentation=layout.showcase?furnishShowcase(B,room,H,materials):null;
 if(!layout.showcase)furnishRoom(B,room,H,materials,layout);return{commands,obstacles,presentation};
}
