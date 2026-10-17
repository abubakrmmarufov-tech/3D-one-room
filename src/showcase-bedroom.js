import {showcaseFrame} from './showcase-room.js';

// A small, deterministic cloth surface. Edges roll off the mattress while the
// weave uses metres; neither cloth nor detail needs another download.
export function bedTextile({u0,u1,v0,v1,z,dropU=.16,dropV=.18,folds=5},uv){
 const positions=[],uvs=[],indices=[],nx=48,ny=36;
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
  const s=i/nx,t=j/ny,u=u0+(u1-u0)*s,v=v0+(v1-v0)*t;
  const envelope=Math.sin(Math.PI*s)*Math.sin(Math.PI*t);
  const ripple=envelope*(.012*Math.sin(s*Math.PI*folds+t*7)+.007*Math.sin(t*21-s*9));
  const height=z-dropU*(Math.exp(-s/.035)+Math.exp(-(1-s)/.035))-dropV*Math.exp(-t/.04)+ripple;
  const [x,y]=uv(u,v);positions.push(x,height,-y);uvs.push(u,v);
 }
 const a=uv(u0,v0),b=uv(u1,v0),c=uv(u0,v1),up=(b[1]-a[1])*(c[0]-a[0])-(b[0]-a[0])*(c[1]-a[1])<0;
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const a=j*(nx+1)+i,b=a+nx+1;
  if(up)indices.push(a,a+1,b,a+1,b+1,b);else indices.push(a,b,a+1,a+1,b,b+1);
 }
 return{positions,uvs,indices};
}

// Proposal for the 20.21 m² bedroom in apartment 57. The bed faces across the
// narrow dimension, leaving the real west windows and east entry clear.
export function furnishShowcaseBedroom(B,room,H,M){
 const{L,S,uv}=showcaseFrame(room),cu=L*.46,bw=1.8,head=S+.14,foot=head-2.16,left=cu-bw/2,right=cu+bw/2;
 const box=(m,u0,v0,u1,v1,z0,z1,soft=false)=>B.box(m,...uv(u0,v0),...uv(u1,v1),z0,z1,soft);
 const cyl=(m,u,v,r,z0,z1)=>B.cyl(m,...uv(u,v),r,z0,z1);
 const surface=(m,options)=>B.surface(m,bedTextile(options,uv));
 box(M.rug,left-.55,Math.max(.02,foot-.22),right+.55,S-.08,.025,.038,.012);
 box(M.dark,left+.12,foot+.12,right-.12,head-.12,.055,.19,.035);
 box(M.walnut,left-.045,foot-.045,right+.045,head,.16,.34,.065);
 box(M.linen,left,foot,right,head-.08,.33,.58,.085);
 box(M.seam,left-.004,foot-.004,right+.004,head-.08,.385,.398,.006);
 box(M.walnut,left-.28,head-.015,right+.28,head+.065,.12,1.37,.025);
 for(let k=0;k<3;k++)box(M.fabric,left-.25+k*.76,head-.085,left+.49+k*.76,head+.012,.42,1.34,.065);
 surface(M.bedding,{u0:left-.10,u1:right+.10,v0:foot-.095,v1:head-.55,z:.652});
 surface(M.throw,{u0:left-.115,u1:right+.115,v0:foot-.105,v1:foot+.55,z:.675,dropU:.18,dropV:.20,folds:9});
 box(M.bedding,left-.065,head-.68,right+.065,head-.48,.647,.692,.023);
 for(let k=0;k<2;k++){
  const u=left+.055+k*.87;
  box(M.linen,u,head-.52,u+.81,head-.10,.59,.83,{radius:.10,tilt:[-.13,k?-.035:.035]});
  box(M.bedding,u+.05,head-.71,u+.76,head-.32,.66,.82,{radius:.085,tilt:[-.08,k?.045:-.045]});
 }
 const lamps=[];
 for(const side of[-1,1]){
  const u=cu+side*(bw/2+.40),v=head-.28;
  box(M.walnut,u-.25,v-.25,u+.25,v+.23,.16,.51,.035);
  box(M.travertine,u-.265,v-.265,u+.265,v+.245,.51,.535,.014);
  box(M.dark,u-.20,v-.266,u+.20,v-.257,.335,.344);
  box(M.bronze,u-.075,v-.28,u+.075,v-.265,.40,.411,.004);
  cyl(M.ceramic,u,v+.04,.075,.535,.72);cyl(M.bronze,u,v+.04,.012,.70,.83);
  cyl(M.linen,u,v+.04,.16,.77,1.02);cyl(M.lamp,u,v+.04,.136,.773,.787);
  lamps.push({point:uv(u,v+.04),height:.81,power:5});
  if(side<0){
   box(M.olive,u-.15,v-.19,u+.10,v-.025,.537,.565,.004);
   box(M.linen,u-.14,v-.18,u+.09,v-.03,.566,.578,.003);
  }else{
   cyl(M.travertine,u+.12,v-.15,.055,.537,.57);
   cyl(M.ceramic,u+.12,v-.15,.042,.571,.63);
  }
 }
 // Storage is on the solid east wall, beyond the bedroom entry passage.
 const back=L+.20,front=back-.62,from=.94,to=S-.03;
 box(M.walnut,front+.05,from,back,to,.07,Math.min(H-.20,2.40));
 const count=3,door=(to-from)/count;
 for(let k=0;k<count;k++){
  const v=from+k*door;
  box(M.linen,front,v+.012,front+.04,v+door-.012,.14,Math.min(H-.24,2.36),.009);
  box(M.bronze,front-.017,v+door-.075,front-.005,v+door-.057,1.02,1.30,.004);
 }
 const bedFootprint=[uv(left-.115,foot-.105),uv(right+.115,foot-.105),uv(right+.115,head+.065),uv(left-.115,head+.065)];
 B.obstacle(bedFootprint);
 return{standing:uv(L-1.25,.50),focus:uv(cu,head-.65),pitch:-.24,lamps,bedFootprint};
}
