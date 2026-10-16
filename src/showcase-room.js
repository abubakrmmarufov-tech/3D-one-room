// Locally modelled furnishing proposal for B12-0. Coordinates stay inside the source room.
import {innerRect} from './geometry.js';

export function showcaseFrame(room){
 const r=innerRect(room.poly,.22),along=r.x1-r.x0>=r.y1-r.y0,L=Math.max(r.x1-r.x0,r.y1-r.y0),S=Math.min(r.x1-r.x0,r.y1-r.y0),layout=room.furniture??{};
 const uv=(u,v)=>{if(layout.flipU)u=L-u;if(layout.flipV)v=S-v;return along?[r.x0+u,r.y0+v]:[r.x0+v,r.y0+u];};
 return{L,S,uv};
}

export function furnishShowcase(B,room,H,M){
 const{L,S,uv}=showcaseFrame(room),len=Math.min(2.85,L-.7),u=(L-len)/2;
 const box=(m,u0,v0,u1,v1,z0,z1,soft=false)=>B.box(m,...uv(u0,v0),...uv(u1,v1),z0,z1,soft);
 const cyl=(m,u,v,r,z0,z1)=>B.cyl(m,...uv(u,v),r,z0,z1);
 const ball=(m,u,v,r,z,sx=1,sy=1,sz=1)=>B.ball(m,...uv(u,v),r,z,sx,sy,sz);
 // A low woven rug, separate seat/back cushions, generous rounded arms and timber feet.
 box(M.rug,u-.18,.50,u+len+.18,Math.min(S-.66,2.8),.025,.039,.016);
 for(const du of [.16,len-.16])for(const v of [.20,.87])cyl(M.walnut,u+du,v,.045,.03,.22);
 box(M.fabric,u,.08,u+len,1.03,.20,.49,.10);
 box(M.fabric,u,.10,u+.22,1.05,.42,.79,.09);
 box(M.fabric,u+len-.22,.10,u+len,1.05,.42,.79,.09);
 for(let k=0;k<3;k++){
  const x=u+.23+k*(len-.46)/3,ww=(len-.46)/3-.018;
  box(M.fabric,x,.13,x+ww,.37,.49,1.01,.07);
  box(M.fabric,x,.38,x+ww,1.005,.49,.65,.075);
  box(M.seam,x+.035,.98,x+ww-.035,.992,.575,.588,.006);
 }
 // Soft pillows and a draped, folded linen throw over one arm.
 box(M.olive,u+.25,.39,u+.72,.60,.65,1.10,{radius:.09,tilt:[-.16,.12]});
 box(M.linen,u+len-.74,.38,u+len-.28,.60,.66,1.10,{radius:.09,tilt:[-.12,-.13]});
 box(M.throw,u+len-.40,.53,u+len+.02,.94,.675,.704,.014);
 box(M.throw,u+len-.025,.53,u+len+.025,.94,.35,.69,.016);
 for(let k=0;k<8;k++)box(M.seam,u+len-.38+k*.05,.55,u+len-.37+k*.05,.92,.705,.708);
 // Travertine oval coffee table and useful small-scale details.
 const cv=1.98;
 cyl(M.stone,L*.5,cv,.32,.04,.35);
 ball(M.travertine,L*.5,cv,.58,.385,1.22,.085,.8);
 box(M.olive,L*.5-.31,cv-.12,L*.5+.04,cv+.12,.435,.468,.008);
 box(M.linen,L*.5-.29,cv-.105,L*.5+.02,cv+.11,.468,.479,.005);
 cyl(M.ceramic,L*.5+.24,cv+.08,.095,.435,.49);
 cyl(M.dark,L*.5+.24,cv+.08,.072,.491,.496);
 cyl(M.bronze,L*.5+.24,cv+.08,.026,.497,.51);
 // A freestanding media credenza. No fixture is attached to an unverified wall.
 const mediaV=S-.22;
 box(M.walnut,L/2-1.12,mediaV-.25,L/2+1.12,mediaV+.14,.16,.58,.035);
 for(let k=0;k<34;k++){
  const x=L/2-1.08+k*.064;
  box(M.walnut,x,mediaV-.272,x+.025,mediaV-.25,.20,.54,.009);
 }
 for(const x of [-.99,.99])cyl(M.bronze,L/2+x,mediaV-.04,.027,.02,.17);
 box(M.dark,L/2-.75,mediaV-.04,L/2+.75,mediaV+.005,.90,1.77,.012);
 box(M.screen,L/2-.72,mediaV-.047,L/2+.72,mediaV-.041,.93,1.74);
 cyl(M.bronze,L/2,mediaV-.02,.027,.58,.94);
 box(M.bronze,L/2-.27,mediaV-.17,L/2+.27,mediaV+.09,.58,.60,.008);
 cyl(M.ceramic,L/2+.94,mediaV-.07,.10,.58,.88);
 ball(M.ceramic,L/2+.94,mediaV-.07,.13,.72,.8,1.1,.8);
 // A proper floor lamp: slim stem, opaque linen shade and warm diffuser.
 const lx=L-.30,lv=1.15;
 cyl(M.bronze,lx,lv,.16,.02,.045);cyl(M.bronze,lx,lv,.016,.04,1.62);
 cyl(M.linen,lx,lv,.22,1.42,1.75);cyl(M.lamp,lx,lv,.19,1.421,1.435);
 // Pendant cluster, suspended above circulation height.
 for(const [du,dv,z]of[[-.36,.02,H-.48],[.10,.08,H-.68],[.42,-.12,H-.43]]){
  cyl(M.bronze,L/2+du,1.9+dv,.008,z,H-.02);
  ball(M.lamp,L/2+du,1.9+dv,.14,z,1.15,.85,1.15);
 }
 cyl(M.bronze,L/2,1.9,.28,H-.035,H-.008);
 // Wall art only where the actual solid wall supports its whole width.
 if(B.canMountAt&&[.1,.65,1.2].every(t=>B.canMountAt(...uv(u+.55+t,.04)))){
  box(M.walnut,u+.55,.04,u+1.85,.08,1.28,2.12,.012);
  box(M.art,u+.59,.083,u+1.81,.087,1.32,2.08);
 }
 return{standing:uv(.50,2.85),focus:uv(L*.54,.72),lamp:uv(lx,lv),pendant:uv(L/2,1.9)};
}
