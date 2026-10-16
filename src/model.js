import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createMaterialSystem, rng } from './materials.js';
import { smooth } from './timeline.js';
import { buildPanorama } from './panorama.js';

const H=3.3, PI=Math.PI;
const arc=(t,offset=0)=>{
  const x=6.3*Math.cos(t), z=-12.5*Math.sin(t);
  const n=new THREE.Vector2(Math.cos(t)/6.3,-Math.sin(t)/12.5).normalize();
  return new THREE.Vector3(13.7+x+n.x*offset,0,z+n.y*offset);
};

export function buildResidence(renderer,options={}){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#f5f2eb');
  const materials=createMaterialSystem(options.textureMaps);
  const root=new THREE.Group();scene.add(root);
  const wallGroups=[], ceilingGroups=[], sliding=[], shadowContacts=[];
  const cache=new Map();
  const material=(kind,zone,extra)=>{if(extra)return materials.make(kind,zone,extra);const key=`${kind}/${zone}`;if(!cache.has(key))cache.set(key,materials.make(kind,zone));return cache.get(key);};
  function add(geometry,kind,zone=0,position=[0,0,0],parent=root,extra={},edges=true){
    // Geometry UVs use metres, so a cabinet and a wall share the same grain scale.
    if(geometry instanceof RoundedBoxGeometry||['BoxGeometry','ExtrudeGeometry','PlaneGeometry'].includes(geometry.type)){
      const pos=geometry.attributes.position,norm=geometry.attributes.normal,uv=geometry.attributes.uv;
      if(uv&&norm)for(let i=0;i<pos.count;i++){
        const nx=Math.abs(norm.getX(i)),ny=Math.abs(norm.getY(i)),nz=Math.abs(norm.getZ(i));
        if(ny>nx&&ny>nz)uv.setXY(i,pos.getX(i),pos.getZ(i));
        else if(nx>nz)uv.setXY(i,pos.getZ(i),pos.getY(i));
        else uv.setXY(i,pos.getX(i),pos.getY(i));
      }
    }
    const mesh=new THREE.Mesh(geometry,material(kind,zone,Object.keys(extra).length?extra:undefined));mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={kind,zone};parent.add(mesh);
    if(edges){const e=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,32),materials.edgeMaterials[zone]);e.userData.zone=zone;mesh.add(e);}
    if(geometry instanceof RoundedBoxGeometry||(geometry.type==='CylinderGeometry'&&geometry.parameters.radiusTop>=.015)){
      const outline=new THREE.Mesh(geometry,materials.outlineMaterials[zone]);outline.userData={zone,inkContour:true};outline.renderOrder=10;mesh.add(outline);
    }
    return mesh;
  }
  function box(x,y,z,w,h,d,kind,zone=0,radius=0,parent=root,extra={}){
    const geom=radius?new RoundedBoxGeometry(w,h,d,3,Math.min(radius,Math.min(w,h,d)*.48)):new THREE.BoxGeometry(w,h,d);
    return add(geom,kind,zone,[x,y,z],parent,extra);
  }
  function cyl(x,y,z,r,h,kind,zone=0,parent=root,rTop=r){return add(new THREE.CylinderGeometry(rTop,r,h,32),kind,zone,[x,y,z],parent);}
  function sphere(x,y,z,sx,sy,sz,kind,zone=0,parent=root){const m=add(new THREE.SphereGeometry(1,20,14),kind,zone,[x,y,z],parent,{},false);m.scale.set(sx,sy,sz);return m;}
  function tube(points,r,kind,zone=0,parent=root){return add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(12,points.length*2),r,7,false),kind,zone,[0,0,0],parent,{},false);}
  function piping(w,d,r,y,z,zone,parent){const points=[];for(let corner=0;corner<4;corner++){const a=corner*PI/2,cx=(corner===0||corner===3?1:-1)*(w/2-r),cz=(corner<2?1:-1)*(d/2-r);for(let i=0;i<=6;i++){const t=a+i/6*PI/2;points.push(new THREE.Vector3(cx+Math.cos(t)*r,y,z+cz+Math.sin(t)*r));}}points.push(points[0].clone());tube(points,.0035,'linen',zone,parent);}
  function wall(x,z,w,d,kind,zone=0){const g=new THREE.Group();g.position.set(x,0,z);root.add(g);box(0,H/2,0,w,H,d,kind,zone,.015,g);wallGroups.push(g);return g;}
  function ceiling(x,z,w,d,zone){const m=box(x,H+.04,z,w,.12,d,'white',zone);m.castShadow=false;ceilingGroups.push(m);return m;}
  function rug(x,z,w,d,zone){const m=box(x,.012,z,w,.022,d,'rug',zone,.02);m.castShadow=false;contact(x,z,w+1,d+1,zone);return m;}
  const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=128;const cctx=contactCanvas.getContext('2d');const grad=cctx.createRadialGradient(64,64,5,64,64,64);grad.addColorStop(0,'rgba(37,28,16,.42)');grad.addColorStop(.5,'rgba(37,28,16,.22)');grad.addColorStop(1,'rgba(37,28,16,0)');cctx.fillStyle=grad;cctx.fillRect(0,0,128,128);const contactMap=new THREE.CanvasTexture(contactCanvas);
  function contact(x,z,w,d,zone){const mat=new THREE.MeshBasicMaterial({map:contactMap,transparent:true,depthWrite:false,opacity:0});const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat);m.rotation.x=-PI/2;m.position.set(x,.018,z);root.add(m);shadowContacts.push({mat,zone});return m;}
  function floorRect(x,z,w,d,zone){const m=box(x,-.085,z,w,.16,d,'oak',zone);m.material=materials.make('oak',zone);return m;}

  // The four residence spaces surround two excluded service/core cut-outs.
  floorRect(10.2,-1.6,7,3.2,0);floorRect(10.35,-6.2,6.7,6,1);floorRect(3.5,-9.5,7,6,2);
  box(10,-.08,.55,2.2,.16,1.1,'travertine',0);
  const livingShape=new THREE.Shape();livingShape.moveTo(13.7,0);livingShape.lineTo(20,0);livingShape.absellipse(13.7,0,6.3,12.5,0,PI/2,false,0);livingShape.lineTo(13.7,0);
  const livingFloor=add(new THREE.ExtrudeGeometry(livingShape,{depth:.16,bevelEnabled:false,curveSegments:64}),'oak',3,[0,-.16,0]);livingFloor.rotation.x=-PI/2;livingFloor.material=materials.make('oak',3);

  // Foyer: front door is open on the northbound walking line.
  wall(7.85,0,2.3,.22,'travertine',0);wall(12.4,0,2.6,.22,'travertine',0);wall(6.72,-1.6,.2,3.2,'travertine',0);
  wall(8.05,-3.2,2.3,.18,'travertine',0);wall(12.8,-3.2,1.8,.18,'travertine',0);
  // Lintel over the 2.3 m kitchen portal.
  box(10.5,3.05,-3.2,2.5,.5,.18,'travertine',0);
  const door=new THREE.Group();door.position.set(9.0,0,0);door.rotation.y=PI*.48;root.add(door);box(.85,1.5,0,1.7,3,.08,'walnut',0,.02,door);box(1.48,1.1,.075,.03,.55,.03,'bronze',0,0,door);
  ceiling(10.2,-1.6,7,3.2,0);
  // Floating console, bronze-rimmed mirror and restrained objects.
  box(7.08,.86,-1.75,.48,.16,1.7,'walnut',0,.035);box(6.9,1.9,-1.75,.035,1.55,1.1,'bronze',0,.04);box(6.928,1.9,-1.75,.01,1.44,1.0,'glass',0,.03,root,{opacity:.52,metalness:.9,roughness:.12});
  cyl(7.15,1.03,-2.2,.12,.18,'clay',0);tube([new THREE.Vector3(7.15,1.12,-2.2),new THREE.Vector3(7.18,1.7,-2.2),new THREE.Vector3(7.4,1.85,-2.3)],.008,'leaf',0);sphere(7.38,1.85,-2.3,.14,.045,.09,'leaf',0);
  rug(10.15,-1.5,1.3,2.3,0);
  [1.1,2.5].forEach(z=>{cyl(10.1,3.265,-z,.065,.025,'bronze',0);cyl(10.1,3.248,-z,.045,.006,'white',0,root,.045).material=materials.make('white',0,{emissive:0xfff1ca,emissiveIntensity:.35});});

  // Kitchen & dining, with open west portal to the master suite.
  wall(10.35,-9.2,6.7,.2,'walnut',1);wall(7,-5.2,.18,4.0,'travertine',1);wall(7,-10.9,.18,3.2,'travertine',2);
  wall(13.7,-3.85,.18,1.3,'travertine',3);wall(13.7,-10.7,.18,3.6,'travertine',3);box(13.7,3.08,-7,.18,.44,3.7,'travertine',3);
  ceiling(10.35,-6.2,6.7,6,1);
  // Full height joinery, recessed shelves, stone backsplash and brass pulls.
  for(let i=0;i<8;i++){
    const x=7.44+i*.78;box(x,1.5,-8.88,.75,3,.5,'walnut',1,.014);
    box(x+.25,1.3,-8.602,.012,.34,.018,'bronze',1,.003);
    if(i===5||i===6){box(x,1.38,-8.58,.66,1.0,.025,'black',1,.025);box(x,1.7,-8.555,.49,.025,.015,'bronze',1);}
  }
  box(9.2,1.5,-8.56,2.9,.65,.025,'travertine',1);box(9.2,1.13,-8.35,3,.07,.5,'travertine',1,.012);
  // Island is east of the promenade so the exact northbound camera route stays clear.
  const islandStart=root.children.length;
  contact(12.0,-6.8,3.7,2.2,1);box(12.0,.46,-6.8,2.75,.91,1.1,'walnut',1,.04);box(12.0,.965,-6.8,3.1,.12,1.35,'travertine',1,.035);box(10.5,.49,-6.8,.12,.94,1.35,'travertine',1);box(13.5,.49,-6.8,.12,.94,1.35,'travertine',1);
  box(11.15,1.031,-6.8,.65,.012,.44,'bronze',1,.05);box(11.15,1.04,-6.8,.57,.01,.36,'black',1,.05);
  tube([new THREE.Vector3(11.15,1.03,-7.13),new THREE.Vector3(11.15,1.45,-7.13),new THREE.Vector3(11.15,1.5,-6.94),new THREE.Vector3(11.15,1.35,-6.9)],.018,'bronze',1);
  cyl(12.9,1.09,-6.9,.22,.1,'clay',1);sphere(12.86,1.18,-6.88,.08,.075,.08,'clay',1);sphere(13.01,1.18,-6.94,.07,.07,.07,'clay',1);
  for(let i=0;i<2;i++){const x=11.7+i*1.0;cyl(x,.67,-5.83,.25,.11,'walnut',1);for(const [dx,dz]of [[-.15,-.15],[.15,-.15],[-.15,.15],[.15,.15]])cyl(x+dx,.31,-5.83+dz,.02,.62,'bronze',1);}
  root.children.slice(islandStart).forEach(part=>part.position.z+=1.0);
  // A capsule-shaped dining table, six sculptural upholstered chairs.
  rug(8.45,-5.1,2.7,3.4,1);box(8.45,.77,-5.1,1.2,.10,2.1,'walnut',1,.28);cyl(8.45,.36,-5.7,.28,.72,'walnut',1);cyl(8.45,.36,-4.5,.28,.72,'walnut',1);
  function chair(x,z,angle,zone=1,outdoor=false){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=angle;root.add(g);box(0,.44,0,.55,.11,.54,outdoor?'linen':'boucle',zone,.09,g);box(0,.78,.21,.58,.5,.13,outdoor?'linen':'boucle',zone,.08,g);for(const dx of [-.20,.20])for(const dz of [-.2,.2])cyl(dx,.22,dz,.022,.44,'walnut',zone,g);return g;
  }
  chair(7.35,-5.7,-PI/2);chair(7.35,-4.5,-PI/2);chair(9.5,-5.7,PI/2);chair(9.5,-4.5,PI/2);chair(8.45,-3.65,0);chair(8.45,-6.55,PI);
  for(let i=0;i<3;i++){const z=-5.75+i*.65;cyl(8.45,3.02,z,.008,.54,'bronze',1);sphere(8.45,2.63,z,.27,.08,.27,'bronze',1);sphere(8.45,2.6,z,.23,.018,.23,'white',1).material=materials.make('white',1,{emissive:0xffddaa,emissiveIntensity:.45});}
  cyl(8.45,.9,-5.1,.08,.19,'clay',1);tube([new THREE.Vector3(8.45,.97,-5.1),new THREE.Vector3(8.5,1.27,-5.1),new THREE.Vector3(8.35,1.38,-5.07)],.006,'leaf',1);

  // Master suite: portal frames a bed, upholstered headboard and reading alcove.
  wall(.48,-12.5,.96,.24,'travertine',2);wall(6.48,-12.5,1.04,.24,'travertine',2);
  box(3.48,.38,-12.5,5.04,.76,.24,'travertine',2);box(3.48,3.10,-12.5,5.04,.40,.24,'travertine',2);
  box(3.48,.785,-12.44,5.14,.06,.34,'travertine',2,.015);
  box(3.48,1.85,-12.52,4.95,2.12,.015,'glass',2);
  for(const x of [.98,3.48,5.98])box(x,1.85,-12.49,.045,2.18,.055,'bronze',2);
  for(const y of [.78,2.93])box(3.48,y,-12.49,5.06,.04,.055,'bronze',2);
  function curtain(x,width,zone){
    const geom=new THREE.PlaneGeometry(width,2.36,40,30),p=geom.attributes.position;
    for(let i=0;i<p.count;i++){const xx=p.getX(i),yy=p.getY(i);p.setZ(i,Math.sin(xx/width*Math.PI*18)*.046+Math.sin(yy*2+xx)*.009);}
    geom.computeVertexNormals();return add(geom,'linen',zone,[x,1.79,-12.27],root,{side:THREE.DoubleSide,roughness:1},false);
  }
  curtain(1.08,.52,2);curtain(5.84,.52,2);wall(0,-9.5,.24,6,'travertine',2);wall(3.5,-6.5,7,.2,'travertine',2);ceiling(3.5,-9.5,7,6,2);
  for(let i=0;i<12;i++)box(.2+i*.54,.37,-12.31,.52,.70,.12,'walnut',2,.008);
  rug(3.2,-9.8,4.7,4.4,2);contact(3.3,-10.1,4.2,4.7,2);box(3.3,.25,-10.0,2.2,.42,2.5,'walnut',2,.08);box(3.3,.55,-10.0,2.18,.32,2.42,'linen',2,.11);box(3.3,1.1,-11.34,2.7,1.3,.2,'boucle',2,.15);
  const duvetGeo=new THREE.PlaneGeometry(2.36,1.94,54,48),duvetPos=duvetGeo.attributes.position;
  for(let i=0;i<duvetPos.count;i++){
    const x=duvetPos.getX(i),z=duvetPos.getY(i),edge=Math.max(0,(Math.abs(x)-1.03)/.15);
    const folds=.013*Math.sin(x*17+z*3)+.009*Math.sin(z*20-x*2)+.014*Math.sin(x*7+z*6);
    duvetPos.setXYZ(i,x,z,folds-.14*edge*edge);
  }
  duvetGeo.computeVertexNormals();const duvet=add(duvetGeo,'linen',2,[3.3,.80,-9.72],root,{side:THREE.DoubleSide},false);duvet.rotation.x=-PI/2;box(3.3,.84,-9.07,2.23,.10,.65,'rug',2,.05);
  for(const x of [2.75,3.85]){const p=box(x,.9,-10.75,.91,.25,.51,'boucle',2,.15);p.rotation.x=-.15;}
  for(const x of [1.35,5.2]){cyl(x,.32,-11.1,.37,.64,'walnut',2);cyl(x,.7,-11.1,.18,.12,'bronze',2);sphere(x,.99,-11.1,.22,.25,.22,'linen',2).material=materials.make('linen',2,{emissive:0x776347,emissiveIntensity:.5});}
  for(let i=0;i<5;i++){box(.47,1.48,-7.03-i*.72,.7,2.95,.69,'walnut',2,.01);box(.84,1.2,-7.02-i*.72,.015,.4,.02,'bronze',2);}
  chair(2.0,-7.4,PI/5,2);cyl(3.1,.38,-7.35,.26,.05,'travertine',2);cyl(3.1,.18,-7.35,.06,.35,'bronze',2);

  // Joinery shadow gaps and restrained architectural trim.
  for(let i=0;i<8;i++){const x=7.44+i*.78;box(x,.09,-8.61,.73,.14,.025,'black',1);}
  box(9.2,1.85,-8.53,2.9,.018,.025,'bronze',1);
  const underCabinet=new THREE.PointLight(0xffe3bd,2.0,3.8,2);underCabinet.position.set(9.2,1.81,-8.35);scene.add(underCabinet);
  box(3.5,.055,-6.38,6.9,.09,.025,'white',2,.008);
  box(.14,.055,-9.5,.025,.09,5.8,'white',2,.008);
  // Grand quarter-ellipse living room and media/fireplace monolith.
  const livingCeil=add(new THREE.ExtrudeGeometry(livingShape,{depth:.12,bevelEnabled:false,curveSegments:64}),'white',3,[0,H,0]);livingCeil.rotation.x=-PI/2;livingCeil.castShadow=false;ceilingGroups.push(livingCeil);
  wall(16.8,0,6.4,.22,'travertine',3);wall(13.7,-1.7,.22,3.4,'travertine',3);
  box(13.88,1.58,-2.1,.32,3.16,2.9,'stone',3,.02);box(14.06,1.73,-2.08,.025,.95,1.65,'black',3,.025);box(14.08,.4,-2.08,.025,.22,2.1,'black',3);
  for(let i=0;i<17;i++){const flame=sphere(14.103,.4+Math.sin(i)*.02,-3.02+i*.115,.015,.045+Math.abs(Math.sin(i*3))*.04,.045,'clay',3);flame.material=materials.make('clay',3,{emissive:0xe49c4d,emissiveIntensity:1.5});}
  // Custom sofa follows the room's arc. The modules have individual cushions and rounded backs.
  const sofaStart=.85,sofaEnd=1.45;
  for(let i=0;i<9;i++){
    const t=sofaStart+(sofaEnd-sofaStart)*(i+.5)/9;const p=arc(t,-1.22);const n=new THREE.Vector2(Math.cos(t)/6.3,-Math.sin(t)/12.5).normalize();
    const g=new THREE.Group();g.position.copy(p);g.rotation.y=Math.atan2(n.x,n.y);root.add(g);
    box(0,.26,0,.59,.29,.94,'boucle',3,.14,g);box(0,.48,-.10,.57,.18,.78,'boucle',3,.11,g);box(0,.78,.34,.60,.53,.22,'boucle',3,.13,g);
    piping(.574,.784,.086,.48,-.10,3,g);
    if(i%3===1){const pillow=box(.2,.7,.14,.45,.4,.16,i===4?'clay':'linen',3,.13,g);pillow.rotation.z=.2;pillow.rotation.x=-.15;}
    contact(p.x,p.z,1.8,1.6,3);
  }
  const carpet=add(new THREE.CircleGeometry(2.7,64),'rug',3,[16.2,.02,-6.55]);carpet.rotation.x=-PI/2;carpet.scale.set(.95,1.32,1);carpet.castShadow=false;
  contact(16,-8.1,3.3,2.8,3);box(16,.28,-8.1,1.55,.22,1.1,'travertine',3,.24);box(16,.12,-8.1,1.06,.23,.68,'travertine',3,.12);
  box(15.8,.405,-7.95,.47,.04,.33,'walnut',3,.01).rotation.y=.16;box(15.8,.438,-7.95,.44,.025,.30,'linen',3,.005).rotation.y=.16;
  cyl(16.35,.45,-8.24,.15,.11,'clay',3);cyl(16.35,.509,-8.24,.115,.006,'black',3);
  function lounge(x,z,angle,zone=3){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=angle;root.add(g);box(0,.38,0,.91,.2,.9,'boucle',zone,.22,g);box(0,.74,.32,.94,.64,.22,'boucle',zone,.18,g);for(const dx of [-.46,.46]){box(dx,.58,.05,.13,.35,.82,'walnut',zone,.055,g);box(dx,.24,.1,.07,.45,.7,'walnut',zone,.02,g);}contact(x,z,1.7,1.7,zone);return g;}
  lounge(14.5,-9.2,-.7);lounge(15.0,-4.6,PI*.8);
  cyl(14.45,.43,-8.15,.34,.05,'travertine',3);cyl(14.45,.21,-8.15,.14,.42,'bronze',3);
  // Fluted radial structural columns and dark bronze curtain wall mullions.
  const panels=28;
  for(let i=0;i<=panels;i++){
    const t=i/panels*PI/2;const p=arc(t);const group=new THREE.Group();root.add(group);
    cyl(p.x,H/2,p.z,.025,H,'bronze',3,group);
    if(i>=12&&i<=16){const tangent=arc(t+.01).sub(p).normalize();sliding.push({group,dir:tangent.multiplyScalar(i<14?-1:1),travel:i<14?1.5:1.8});}
    if([2,9,21,27].includes(i)){
      const cp=arc(t,-.18);cyl(cp.x,H/2,cp.z,.16,H,'travertine',3);
      for(let j=0;j<20;j++){const a=j/20*PI*2;cyl(cp.x+.15*Math.cos(a),H/2,cp.z+.15*Math.sin(a),.017,H,'travertine',3);}
    }
    if(i<panels){
      const p2=arc((i+1)/panels*PI/2);const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute([p.x,.04,p.z,p2.x,.04,p2.z,p2.x,H-.03,p2.z,p.x,H-.03,p.z],3));geom.setIndex([0,1,2,0,2,3]);geom.computeVertexNormals();
      const pane=add(geom,'glass',3,[0,0,0],root);pane.castShadow=false;
      if(i>=12&&i<16){const sg=new THREE.Group();root.add(sg);sg.add(pane);const tangent=p2.clone().sub(p).normalize();sliding.push({group:sg,dir:tangent.multiplyScalar(i<14?-1:1),travel:i<14?1.5:1.8});}
    }
  }
  for(const y of [.04,H-.03]){const pts=Array.from({length:65},(_,i)=>{const p=arc(i/64*PI/2);p.y=y;return p;});tube(pts,.035,'bronze',3);}
  // Full-width terrace deck, white slab bands and architectural vertical louvers.
  const terraceShape=new THREE.Shape();let p=arc(0,-.32);terraceShape.moveTo(p.x,-p.z);for(let i=1;i<=64;i++){p=arc(i/64*PI/2,-.32);terraceShape.lineTo(p.x,-p.z);}for(let i=64;i>=0;i--){p=arc(i/64*PI/2,1.8);terraceShape.lineTo(p.x,-p.z);}terraceShape.closePath();
  const deck=add(new THREE.ExtrudeGeometry(terraceShape,{depth:.22,bevelEnabled:false}),'stone',4,[0,-.22,0]);deck.rotation.x=-PI/2;
  for(const y of [-.2,1.03]){const pts=Array.from({length:81},(_,i)=>{const p=arc(i/80*PI/2,1.8);p.y=y;return p;});tube(pts,y<0?.12:.045,'white',4);}
  for(let i=0;i<=115;i++){
    const t=i/115*PI/2,p=arc(t,1.8);const m=box(p.x,.5,p.z,.045,1.04,.13,'white',4,.005);m.rotation.y=Math.atan2(Math.cos(t)/6.3,-Math.sin(t)/12.5);
  }
  const t1=arc(.41,.65);lounge(t1.x,t1.z,-.35,4);const t2=arc(.28,.65);lounge(t2.x,t2.z,-.2,4);const tp=arc(.34,.9);cyl(tp.x,.39,tp.z,.29,.06,'stone',4);cyl(tp.x,.18,tp.z,.08,.36,'bronze',4);
  // Small olive tree, with modeled stems and leaves rather than a billboard.
  function plant(x,z,zone){cyl(x,.28,z,.27,.55,'clay',zone,root,.34);tube([new THREE.Vector3(x,.4,z),new THREE.Vector3(x+.06,1.2,z),new THREE.Vector3(x-.06,2,z+.06)],.024,'walnut',zone);const random=rng(145);for(let i=0;i<37;i++){const a=random()*PI*2,r=random()*.5,yy=1.1+random()*1.0;const leaf=sphere(x+Math.cos(a)*r,yy,z+Math.sin(a)*r,.12,.025,.055,'leaf',zone);leaf.rotation.set(random(),a,random());}}
  plant(14.9,-.9,3);const pp=arc(1.35,.85);plant(pp.x,pp.z,4);

  // Photometric-style lighting. The roof receives no sun shadow; facade structure does.
  const hemi=new THREE.HemisphereLight(0xdde8ed,0x786f60,.5);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffefd9,3.6);sun.position.set(37,20,-44);sun.target.position.set(11,0,-6);scene.add(sun,sun.target);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);sun.shadow.camera.left=-19;sun.shadow.camera.right=19;sun.shadow.camera.top=18;sun.shadow.camera.bottom=-18;sun.shadow.camera.near=1;sun.shadow.camera.far=100;sun.shadow.normalBias=.009;sun.shadow.bias=-.00012;sun.shadow.radius=4;
  const fill=new THREE.DirectionalLight(0xdbe8f0,.24);fill.position.set(-10,8,6);scene.add(fill);
  const entryLight=new THREE.PointLight(0xffd6a3,12,8,2);entryLight.position.set(9.3,2.9,-1.5);scene.add(entryLight);
  const pendant=new THREE.PointLight(0xffd7a2,16,7,2);pendant.position.set(10.5,2.4,-4.4);scene.add(pendant);
  if(!options.analysisOnly){const pmrem=new THREE.PMREMGenerator(renderer);const environment=new RoomEnvironment();scene.environment=pmrem.fromScene(environment,.04).texture;scene.environmentIntensity=.38;environment.dispose();pmrem.dispose();}

  // Local cool fill approximates window bounce alongside the warm sun and room environment.
  const bedroomDaylight=new THREE.PointLight(0xe6efff,36,8,2);bedroomDaylight.position.set(3.5,1.9,-12.12);scene.add(bedroomDaylight);
  const livingDaylight=new THREE.PointLight(0xe9f0ff,34,10,2);livingDaylight.position.set(19,1.8,-6);scene.add(livingDaylight);
  const bedroomFill=new THREE.PointLight(0xffdfb9,8,5,2);bedroomFill.position.set(4.9,1.05,-10.95);scene.add(bedroomFill);
  const panorama=buildPanorama(scene);
  let shadowWalls=-1,shadowGlass=-1;
  return {scene,materials,root,panorama,counts:{meshes:root.children.length,panels,sofaModules:9},update(state){
    root.visible=state.progress>.12;
    materials.update(state);wallGroups.forEach(g=>g.scale.y=Math.max(.015,state.walls));ceilingGroups.forEach(g=>g.visible=state.progress>.244);
    if(renderer?.shadowMap&&(shadowWalls!==state.walls||shadowGlass!==state.glass)){renderer.shadowMap.needsUpdate=true;sun.shadow.needsUpdate=true;shadowWalls=state.walls;shadowGlass=state.glass;}
    root.traverse(object=>{if(object.isLineSegments||object.userData.inkContour)object.visible=state.waves[object.userData.zone]<.9999;});
    sliding.forEach(s=>s.group.position.copy(s.dir).multiplyScalar(s.travel*state.glass));
    shadowContacts.forEach(({mat,zone})=>mat.opacity=state.waves[zone]);
    panorama.update(state);
    entryLight.intensity=10*state.waves[0];pendant.intensity=13*state.waves[1];bedroomFill.intensity=8*state.waves[2];
    scene.background.set('#f5f2eb');
  }};
}
