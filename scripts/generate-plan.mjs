import {writeFileSync,mkdirSync} from 'node:fs';
let lines=[];
const line=(x1,y1,x2,y2,extra='')=>lines.push(`<path d="M${x1} ${y1}L${x2} ${y2}" ${extra}/>`);
const text=(x,y,t,size=.22,extra='')=>lines.push(`<text x="${x}" y="${y}" font-size="${size}" ${extra}>${t}</text>`);
const rect=(x,y,w,h,extra='')=>lines.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" ${extra}/>`);
const ellipse=(x,y,rx,ry,extra='')=>lines.push(`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${extra}/>`);
function dim(x1,y1,x2,y2,label){line(x1,y1,x2,y2);line(x1-.09,y1+.11,x1+.09,y1-.11,'stroke-width=".035"');line(x2-.09,y2+.11,x2+.09,y2-.11,'stroke-width=".035"');if(y1===y2)text((x1+x2)/2,y1-.12,label,.32,'text-anchor="middle"');else text(x1-.14,(y1+y2)/2,label,.32,`text-anchor="middle" transform="rotate(-90 ${x1-.14} ${(y1+y2)/2})"`);}
function stamp(x,y,n,ru,en,area){rect(x-.3,y-.24,.6,.48,'fill="#f5f2eb" stroke-width=".025"');text(x,y+.10,n,.28,'text-anchor="middle"');text(x,y+.61,ru,.23,'text-anchor="middle"');text(x,y+.98,en,.17,'text-anchor="middle" letter-spacing=".015"');text(x,y+1.32,area,.2,'text-anchor="middle"');}
// Grid and excluded cores.
for(const x of [0,7,13.7,20])line(x,-1.45,x,14.1,'stroke="#88877c" stroke-width=".013" stroke-dasharray=".22 .08 .04 .08"');
for(const y of [0,6.5,12.5])line(-1.95,y,22.5,y,'stroke="#88877c" stroke-width=".013" stroke-dasharray=".22 .08 .04 .08"');
rect(0,6,6.7,6.5,'fill="url(#hatch)" stroke="#aaa79b" stroke-width=".015"');rect(7,0,6.7,3.3,'fill="url(#hatch)" stroke="#aaa79b" stroke-width=".015"');
text(3.3,9.5,'ЗА ПРЕДЕЛАМИ КВАРТИРЫ',.18,'text-anchor="middle" fill="#8b8a7e"');text(3.3,9.85,'ОБЩАЯ ЗОНА',.15,'text-anchor="middle" fill="#8b8a7e"');text(10.35,1.6,'ИНЖЕНЕРНОЕ ЯДРО',.18,'text-anchor="middle" fill="#8b8a7e"');text(10.35,1.92,'ТЕХНИЧЕСКАЯ ЗОНА',.15,'text-anchor="middle" fill="#8b8a7e"');
// Terrace silhouette and facade.
lines.push('<path d="M20 12.5A6.3 12.5 0 0 0 13.7 0L13.7 -1.8A8.1 14.3 0 0 1 21.8 12.5Z" fill="#f5f2eb" stroke-width=".045"/>');
for(let i=0;i<=100;i++){const t=i/100*Math.PI/2;line(13.7+7.9*Math.cos(t),12.5-14.1*Math.sin(t),13.7+8.1*Math.cos(t),12.5-14.3*Math.sin(t),'stroke-width=".018"');}
// Residence outlines.
lines.push('<path d="M0 0H7V3.3H13.7V0A6.3 12.5 0 0 1 20 12.5H11V12.63H9V12.5H6.7V9.3H7V6H0Z" fill="#f5f2eb" stroke-width=".09"/>');
lines.push('<path d="M.12 .12H6.88V3.42H13.58V.12M19.88 12.38H11M9 12.38H6.82V9.42H7.12V5.88H.12V.12" fill="none" stroke-width=".02"/>');
// The bedroom window matches the opening in the live model.
rect(.96,-.09,5.04,.18,'fill="#f5f2eb" stroke="none"');
line(.96,-.045,6,-.045,'stroke-width=".018"');line(.96,.045,6,.045,'stroke-width=".018"');
for(const x of [.98,3.48,5.98])line(x,-.10,x,.10,'stroke-width=".025"');
// West and east portals.
line(7,3.3,7,3.6,'stroke-width=".12"');line(7,5.5,7,9.3,'stroke-width=".12"');line(13.7,0,13.7,3.65,'stroke-width=".12"');line(13.7,7.1,13.7,12.5,'stroke-width=".12"');line(7,9.3,9,9.3,'stroke-width=".12"');line(11.5,9.3,13.7,9.3,'stroke-width=".12"');
for(let i=0;i<=28;i++){const t=i/28*Math.PI/2;const x=13.7+6.3*Math.cos(t),y=12.5-12.5*Math.sin(t);ellipse(x,y,.055,.055,'fill="#30382e" stroke="none"');}
for(const i of [2,9,21,27]){const t=i/28*Math.PI/2;ellipse(13.7+6.14*Math.cos(t),12.5-12.34*Math.sin(t),.16,.16,'fill="#f5f2eb" stroke-width=".035"');}
// Door swing arcs at entrance, master and gallery.
lines.push('<path d="M9 12.5V10.5M9 10.5A2 2 0 0 1 11 12.5M7 5.5H5.1M5.1 5.5A1.9 1.9 0 0 1 7 3.6M9 9.3V7.9M9 7.9A1.4 1.4 0 0 1 10.4 9.3" fill="none" stroke-width=".018"/>');
// Bed, nightstands, wardrobe, linen and chair.
rect(2.15,1.0,2.3,2.6,'rx=".07"');rect(2, .65,2.6,.25,'rx=".08"');rect(2.26,1.1,.94,.5,'rx=".10"');rect(3.38,1.1,.94,.5,'rx=".10"');rect(2.12,2.75,2.35,.65);rect(1.05,.8,.65,.65,'rx=".08"');rect(4.75,.8,.65,.65,'rx=".08"');rect(.2,3.5,.7,2.3);for(let i=0;i<4;i++)line(.2,3.5+i*.58,.9,3.5+i*.58);rect(1.7,4.75,.65,.7,'rx=".2" transform="rotate(-20 2 5.1)"');ellipse(3.1,5.15,.26,.26);
// Kitchen cabinetry, appliances, island and sink.
rect(7.2,3.45,6.3,.55);for(let i=0;i<8;i++)line(7.2+i*.78,3.45,7.2+i*.78,4);rect(10.45,6.025,3.1,1.35,'rx=".04"');rect(10.82,6.4,.65,.45,'rx=".05"');ellipse(12.9,6.65,.23,.23);ellipse(11.7,7.67,.23,.23);ellipse(12.7,7.67,.23,.23);
rect(7.85,6.35,1.2,2.1,'rx=".45"');for(const x of [7.1,9.25])for(const y of [6.55,7.75])rect(x,y,.5,.55,'rx=".12"');rect(8.2,8.6,.5,.55,'rx=".1"');rect(8.2,5.7,.5,.55,'rx=".1"');
// Foyer console, rug and entry axis.
rect(6.88,10,.45,1.7,'rx=".02"');rect(9.5,9.7,1.3,2.3,'stroke-dasharray=".04 .04"');
// Curved sofa modules / travertine table / two lounge chairs.
for(let i=0;i<9;i++){const t=.85+.6*(i+.5)/9,nx=Math.cos(t)/6.3,nz=-Math.sin(t)/12.5,n=Math.hypot(nx,nz);const x=13.7+6.3*Math.cos(t)-nx/n*1.22,y=12.5-12.5*Math.sin(t)-nz/n*1.22,a=-Math.atan2(nx,nz)*180/Math.PI;rect(x-.295,y-.47,.59,.94,`rx=".13" transform="rotate(${a} ${x} ${y})"`);}
ellipse(16.2,5.95,2.25,3.0,'stroke-dasharray=".02 .06" stroke-width=".014"');rect(15.225,3.85,1.55,1.1,'rx=".25"');rect(14.05,2.875,.9,.85,'rx=".22" transform="rotate(-30 14.5 3.3)"');rect(14.55,7.3,.9,.85,'rx=".22" transform="rotate(30 15 7.7)"');rect(13.78,8.95,.3,2.8);ellipse(14.9,11.5,.4,.4);
// Stamps kept in clear paper zones.
stamp(12,10.1,'01','ВХОДНАЯ ГАЛЕРЕЯ','КАМЕНЬ · ДУБ','22,4 м²');stamp(11.6,4.4,'02','КУХНЯ · СТОЛОВАЯ','ОРЕХ · ТРАВЕРТИН','40,2 м²');stamp(3.5,4.2,'03','ГЛАВНАЯ СПАЛЬНЯ','ТИХАЯ ЧАСТЬ ДОМА','42,0 м²');stamp(15.8,9.4,'04','ПАНОРАМНАЯ ГОСТИНАЯ','СВЕТ · ПАНОРАМА','61,8 м²');
text(19.1,1.3,'05',.32,'transform="rotate(55 19.1 1.3)"');text(19.45,1.2,'ВИДОВАЯ ТЕРРАСА',.17,'transform="rotate(55 19.45 1.2)"');
// Chained dimensions and axis circles.
for(const x of [0,7,13.7,20])line(x,-.2,x,-1.55,'stroke-width=".013"');dim(0,-.65,7,-.65,'7000');dim(7,-.65,13.7,-.65,'6700');dim(13.7,-.65,20,-.65,'6300');dim(0,-1.32,20,-1.32,'20000');
for(const y of [0,6.5,12.5])line(-1.6,y,-.2,y,'stroke-width=".013"');dim(-.68,0,-.68,6.5,'6500');dim(-.68,6.5,-.68,12.5,'6000');dim(-1.4,0,-1.4,12.5,'12500');
for(const [x,l]of [[0,"Д′"],[7,"Г′"],[13.7,"В′"],[20,"Б′"]]){ellipse(x,13.75,.38,.38,'fill="#f5f2eb" stroke-width=".025"');text(x,13.87,l,.32,'text-anchor="middle"');}
for(const [y,l]of [[0,'39'],[6.5,'38'],[12.5,'37']]){ellipse(-2.05,y,.38,.38,'fill="#f5f2eb" stroke-width=".025"');text(-2.05,y+.11,l,.30,'text-anchor="middle"');}
line(21.6,-.6,21.6,-1.5,'stroke-width=".035"');lines.push('<path d="M21.45 -1.2L21.6 -1.6L21.75 -1.2" fill="none" stroke-width=".025"/>');text(21.6,-1.83,'С',.22,'text-anchor="middle"');
text(0,15.0,'ШАХРОФАР · Блок В-24 · План 24-го этажа · М 1:200',.26);text(0,15.45,'АР–8 / АРХИТЕКТУРНАЯ КОНЦЕПЦИЯ · ОТМЕТКА +75,000 м',.17,'letter-spacing=".015"');line(0,14.55,21.8,14.55,'stroke-width=".025"');text(21.8,15.05,'24 / 186 м²',.25,'text-anchor="end"');text(21.8,15.45,'КОНЦЕПЦИЯ / НЕ РАБОЧИЙ ЧЕРТЁЖ',.14,'text-anchor="end"');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="2080" height="1512" viewBox="-2.5 -2.6 26 18.9"><title>Шахрофар · Блок В-24 · Архитектурный план</title><desc>Четыре помещения и терраса. Криволинейная гостиная, терраса шириной 1,8 м. Размеры номинальные. Не рабочий чертёж.</desc><defs><pattern id="hatch" patternUnits="userSpaceOnUse" width=".16" height=".16" patternTransform="rotate(45)"><path d="M0 0V.16" stroke="#c9c5b9" stroke-width=".015"/></pattern></defs><g stroke="#34382f" stroke-width=".022" fill="none" stroke-linecap="square" stroke-linejoin="round">${lines.join('\n')}</g><style>text{font-family:Arial,sans-serif;fill:#34382f;stroke:none;font-weight:400}</style></svg>`;
mkdirSync('public/assets',{recursive:true});writeFileSync('public/assets/residence-plan.svg',svg);
