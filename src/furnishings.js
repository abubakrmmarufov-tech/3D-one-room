// Furniture is a design proposal fitted to the source room polygons, in metres.
import { innerRect } from './geometry.js';
import { interiorMaterials } from './interior-materials.js';

export function furnishRoom(B, room, H, materials = null, layout = room.furniture ?? {}) {
 const M=materials??interiorMaterials(),r=innerRect(room.poly,.16),w=r.x1-r.x0,d=r.y1-r.y0;
 if(w<(room.kind==='bath'?.65:.85)||d<(room.kind==='bath'?.65:.85))return;
 const along=w>=d,L=Math.max(w,d),S=Math.min(w,d);
 const uv=(u,v)=>{u=layout.flipU?L-u:u;v=layout.flipV?S-v:v;return along?[r.x0+u,r.y0+v]:[r.x0+v,r.y0+u];};
 const box=(m,u0,v0,u1,v1,z0,z1,soft=false)=>{const a=uv(u0,v0),b=uv(u1,v1);B.box(m,...a,...b,z0,z1,soft);};
 const cyl=(m,u,v,rad,z0,z1)=>B.cyl(m,...uv(u,v),rad,z0,z1);
 const ball=(m,u,v,rad,z,sx=1,sy=1,sz=1)=>B.ball(m,...uv(u,v),rad,z,along?sx:sz,sy,along?sz:sx);
 const legs=(u,v,l,d,z)=>{for(const a of [-1,1])for(const b of [-1,1])cyl(M.bronze,u+a*(l/2-.07),v+b*(d/2-.07),.025,.03,z);};
 const plant=(u,v)=>{
  cyl(0x9d8569,u,v,.18,.02,.38);cyl(0x3c3628,u,v,.155,.37,.385);
  cyl(M.walnut,u,v,.015,.38,1.18);
  for(let k=0;k<13;k++){
   const a=k*2.39996,rr=.03+.02*(k%3),height=.48+k*.049;
   const p=uv(u+Math.cos(a)*rr,v+Math.sin(a)*rr),end=uv(u+Math.cos(a)*.2,v+Math.sin(a)*.2);
   B.leaf(k%3?0x49613a:0x6e814b,...p,height,.22+.025*(k%4),.095,Math.atan2(end[0]-p[0],-(end[1]-p[1])),-.22+(k%3)*.2);
  }
 };
 const lamp=(u,v)=>{cyl(M.bronze,u,v,.13,.0,.035);cyl(M.bronze,u,v,.016,.03,.45);cyl(M.linen,u,v,.14,.39,.62);cyl(M.lamp,u,v,.11,.40,.42);};
 const rug=(u0,v0,u1,v1)=>box(0xbeb09a,u0,v0,u1,v1,.009,.018,true);
 const artwork=(u,v,len)=>{if(B.canMountAt&&![.1,len/2,len-.1].every(t=>B.canMountAt(...uv(u+t,v))))return;box(M.walnut,u,v,u+len,v+.035,1.15,1.85);box(0xe6dcc7,u+.035,v+.036,u+len-.035,v+.042,1.185,1.815);box(0x9c8469,u+.1,v+.043,u+len*.46,v+.046,1.28,1.67);box(0x6f7966,u+len*.55,v+.043,u+len-.1,v+.046,1.4,1.76);};
 const chairs=(cu,cv)=>{for(const du of [-.42,.42])for(const s of [-1,1]){const u=cu+du,v=cv+s*.67;box(M.walnut,u-.21,v-.2,u+.21,v+.2,.43,.47,true);box(M.fabric,u-.19,v-.18,u+.19,v+.18,.47,.51,true);box(M.walnut,u-.21,v+s*.17,u+.21,v+s*.21,.47,.88,true);legs(u,v,.4,.4,.43);}};
 switch(room.kind){
 case 'bedroom':{
  const bw=S>2.7?1.7:1.1,bl=2.12,v=(S-bw)/2;
  if(L<2.7)break;
  rug(.45,Math.max(.05,v-.45),Math.min(L-.1,2.75),Math.min(S-.05,v+bw+.45));
  box(M.walnut,.03,v-.04,bl,v+bw+.04,.12,.36,true);
  box(M.fabric,0,v-.12,.12,v+bw+.12,.12,1.15,true);
  box(M.linen,.12,v,bl-.04,v+bw,.34,.57,true);
  box(0xb5aa91,.74,v-.025,bl+.02,v+bw+.025,.56,.63,true);
  // Folded throw and two generous pillows, with visible separate layers.
  box(M.linen,.13,v+.08,.57,v+bw/2-.035,.56,.70,true);
  if(bw>1.3)box(M.linen,.13,v+bw/2+.035,.57,v+bw-.08,.56,.70,true);
  box(0x787d6d,1.57,v-.035,1.93,v+bw+.035,.63,.65,true);
  for(const vv of [v-.50,v+bw+.06])if(vv>.02&&vv+.43<S){box(M.walnut,.05,vv,.49,vv+.43,.04,.5,true);cyl(M.bronze,.27,vv+.22,.03,.5,.71);cyl(M.linen,.27,vv+.22,.11,.66,.83);}
  if(L>5&&S>4){box(M.walnut,L-.58,.06,L,S-.06,.05,2.28);for(let vv=.08;vv<S-.15;vv+=.55){box(0xb5a38b,L-.59,vv,L-.575,Math.min(S-.06,vv+.52),.12,2.22);box(M.bronze,L-.61,vv+.14,L-.59,vv+.16,1,1.24);}}
  artwork(.45,.035,1.0);break;
 }
 case 'living':{
  if(S<2.1)break;
  const len=Math.min(2.75,L-1.05),u=(L-len)/2;
  rug(Math.max(.03,u-.28),.65,Math.min(L-.03,u+len+.28),Math.min(S-.35,2.65));
  box(M.fabric,u,.08,u+len,1.01,.17,.49,true);
  box(M.fabric,u,.04,u+len,.25,.4,.96,true);
  for(const x of [u,u+len-.16])box(M.fabric,x,.1,x+.16,1.02,.4,.76,true);
  for(let k=0;k<3;k++)box(M.fabric,u+.18+k*(len-.36)/3,.27,u+.18+(k+1)*(len-.36)/3-.025,.95,.49,.60,true);
  box(0x8c927c,u+.23,.26,u+.66,.5,.60,.89,true);box(M.linen,u+len-.72,.27,u+len-.26,.52,.60,.86,true);
  legs(u+len/2,.54,len-.2,.8,.17);
  const cv=Math.min(S-.8,1.85);cyl(M.walnut,L/2,cv,.46,.32,.38);cyl(M.bronze,L/2,cv,.24,.02,.32);
  box(M.linen,L/2-.2,cv-.14,L/2+.08,cv+.04,.38,.41);cyl(M.ceramic,L/2+.17,cv,.07,.38,.49);
  if(S>2.8){box(M.walnut,L/2-1,S-.38,L/2+1,S-.03,.12,.46,true);cyl(M.bronze,L/2,S-.10,.025,.46,1.05);box(M.bronze,L/2-.25,S-.27,L/2+.25,S-.03,.46,.48);box(M.dark,L/2-.72,S-.08,L/2+.72,S-.04,.90,1.75);box(0x1b2926,L/2-.69,S-.083,L/2+.69,S-.081,.93,1.72);}
  if(L>4.5){plant(.25,S-.3);lamp(L-.35,.4);}
  artwork(u+.5,.05,Math.min(1.15,len-1));break;
 }
 case 'kitchen':{
  const kl=Math.min(L-.85,3.6);if(kl<1.2)break;
  box(M.walnut,.03,.03,kl,.62,.1,.86);box(M.stone,0,0,kl+.025,.67,.86,.91,true);
  box(M.stone,.02,.02,kl,.035,.91,1.46);
  for(let u=.04;u<kl-.1;u+=.6){box(0xd3c7b2,u,.625,Math.min(kl-.02,u+.57),.645,.15,.82);box(M.bronze,u+.1,.65,Math.min(kl-.1,u+.4),.67,.72,.735);if(!B.canMountAt||[u+.05,Math.min(kl,u+.52)].every(t=>B.canMountAt(...uv(t,.02))))box(M.walnut,u,.02,Math.min(kl,u+.57),.35,1.5,2.22);}
  if(!B.canMountAt||[.1,kl/2,kl-.1].every(t=>B.canMountAt(...uv(t,.02))))box(M.lamp,.04,.34,kl,.36,1.49,1.51);
  box(M.dark,kl*.5,.08,kl*.5+.57,.58,.91,.922);
  for(const du of [.12,.4])for(const dv of [.13,.39])cyl(M.bronze,kl*.5+du,.08+dv,.075,.922,.925);
  box(M.bronze,.2,.14,.75,.48,.912,.92,true);box(M.dark,.24,.18,.71,.44,.92,.924,true);cyl(M.bronze,.55,.12,.018,.91,1.17);
  box(M.dark,kl+.06,.03,kl+.75,.69,.05,2.25);box(0xc3beb0,kl+.07,.70,kl+.74,.72,.10,2.20);box(M.bronze,kl+.62,.72,kl+.64,.75,1.0,1.4);
  if(S>2.65&&L>3){const cu=L*.5,cv=.68+(S-.68)*.54;box(M.walnut,cu-.77,cv-.42,cu+.77,cv+.42,.73,.77,true);legs(cu,cv,1.45,.75,.73);chairs(cu,cv);cyl(M.ceramic,cu,cv,.12,.77,.96);cyl(M.bronze,cu,cv,.008,1.9,H-.03);cyl(M.linen,cu,cv,.24,1.85,2.02);cyl(M.lamp,cu,cv,.19,1.85,1.87);}
  break;
 }
 case 'bath':{
  if(room.name==='WC'||room.area<2.7){
   // These small WCs have their doorway on the north edge of the source plan.
   // Use the full usable depth, with the cistern against the opposite wall.
   const q=innerRect(room.poly,.07),width=q.x1-q.x0,depth=q.y1-q.y0,cx=(q.x0+q.x1)/2,back=q.y0+.02;
   const wcbox=(m,x0,y0,x1,y1,z0,z1,soft=true)=>B.box(m,q.x0+x0,q.y0+y0,q.x0+x1,q.y0+y1,z0,z1,soft);
   B.ball(M.ceramic,cx,back+.34,.25,.23,.62,.76,.91,true);
   B.ball(M.ceramic,cx,back+.37,.25,.405,.76,.21,1.08,true);
   B.ball(0xd6d5ce,cx,back+.37,.25,.444,.77,.045,1.08,true);
   B.ball(M.ceramic,cx,back+.37,.25,.461,.79,.045,1.10,true);
   B.box(M.ceramic,cx-.18,back,cx+.18,back+.16,.38,.81,.035);
   B.box(M.ceramic,cx-.185,back-.005,cx+.185,back+.165,.81,.835,.018);
   B.cyl(M.bronze,cx,back+.085,.026,.836,.841,16);
   B.obstacle([[cx-.205,back],[cx+.205,back],[cx+.205,back+.66],[cx-.205,back+.66]]);
   // Floating compact vanity on the side wall, clear of the entrance and bowl.
   const vy=depth-.29,vw=Math.min(.34,width*.4);
   wcbox(M.walnut,0,vy,vw,depth-.015,.49,.77);
   wcbox(M.ceramic,-.008,vy-.015,vw+.012,depth,.77,.815);
   wcbox(0xc6cbc5,.035,vy+.03,vw-.035,depth-.04,.816,.820);
   wcbox(M.ceramic,.055,vy+.05,vw-.055,depth-.06,.820,.824);
   B.cyl(M.bronze,q.x0+.06,q.y1-.055,.012,.82,1.00,12);
   wcbox(M.bronze,.05,depth-.12,.15,depth-.045,.975,1.00);
   wcbox(M.bronze,-.035,vy-.015,-.012,depth,1.06,1.75,false);
   wcbox(0xa8b6af,-.011,vy+.005,-.006,depth-.02,1.08,1.73,false);
   wcbox(M.bronze,vw+.015,vy+.04,vw+.035,depth-.04,.69,.71);
   wcbox(M.linen,vw+.036,vy+.07,vw+.05,depth-.07,.51,.69);
   break;
  }

  const len=Math.min(L-.1,1.3);
  box(M.walnut,.04,.04,len,.53,.3,.78,true);box(M.stone,.02,.02,len+.02,.56,.78,.82,true);
  box(M.ceramic,.15,.12,Math.min(len-.08,.75),.46,.82,.87,true);cyl(M.bronze,.3,.08,.018,.86,1.05);
  box(M.bronze,.1,.025,len-.04,.05,1.05,1.98);box(0x9faeaa,.13,.052,len-.07,.058,1.08,1.95);
  if(L>2.1&&S>1.5){box(M.stone,L-.94,.03,L-.03,Math.min(S-.05,1.05),.01,.06);box(M.glass,L-.93,.03,L-.91,Math.min(S-.05,1.02),.08,2.05);cyl(M.bronze,L-.2,.12,.017,1.05,2.05);box(M.bronze,L-.4,.08,L-.1,.34,2.02,2.05);}
  if(S>1.3){cyl(M.ceramic,.45,S-.38,.22,.04,.40);box(M.ceramic,.22,S-.59,.68,S-.16,.39,.43,true);box(M.ceramic,.23,S-.18,.66,S-.05,.4,.75,true);}
  break;
 }
 case 'hall':{
  // A shallow console leaves the entrance circulation clear.
  if(L>2.5&&S>2.1){box(M.walnut,.2,.02,1.45,.33,.60,.66,true);legs(.825,.175,1.2,.3,.6);cyl(M.ceramic,.45,.17,.10,.66,.9);artwork(.3,.025,.95);}
  break;
 }
 case 'storage':box(M.walnut,.02,.02,L-.02,Math.min(.4,S*.4),.04,2.1);break;
 case 'loggia':case 'balcony':if(L>1.3&&S>1){cyl(M.walnut,L/2,S/2,.3,.69,.73);cyl(M.bronze,L/2,S/2,.03,.03,.69);plant(.25,.25);}break;
 }
}
