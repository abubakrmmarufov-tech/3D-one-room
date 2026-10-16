import { Vector3, Quaternion, Matrix4, CatmullRomCurve3, MathUtils } from 'three';

export const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
export const smooth = (a, b, n) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
export const rooms = [
  { id:1, label:'Помещение 01', name:'Входная галерея', ru:'Камень и тёплый свет', description:'Спокойное начало. Травертин, дуб и мягкий свет вдоль входной оси.', size:'7,00 × 3,20 м', area:'22,4 м²', jump:.32, palette:['oak','travertine','bronze'], notes:['Дубовый пол объединяет жилые помещения.','Консоль из ореха и зеркало в бронзовой раме расположены у западной стены.','Высота потолка 3,30 м. Открытый портал ведёт в кухню и столовую.'] },
  { id:2, label:'Помещение 02', name:'Кухня и столовая', ru:'Место для встреч', description:'Каменный остров, ореховые фасады и стол на шесть человек.', size:'6,70 × 6,00 м', area:'40,2 м²', jump:.425, palette:['walnut','travertine','bronze'], notes:['Размеры кухни и столовой приняты для архитектурной концепции.','Каменный остров дополнен встроенной мойкой и бронзовым смесителем.','Из столовой маршрут проходит через западный портал в спальню.'] },
  { id:3, label:'Помещение 03', name:'Главная спальня', ru:'Тихая часть дома', description:'Мягкий текстиль, тёплое дерево и дневной свет из окна.', size:'7,00 × 6,00 м', area:'42,0 м²', jump:.57, palette:['boucle','oak','walnut'], notes:['Маршрут входит в спальню через открытый портал и останавливается рядом с кроватью.','Фактурное изголовье, льняное покрывало и ореховый шкаф формируют спокойную палитру.','Размеры помещения приняты для концепции. Камера остаётся на высоте 1,65 м.'] },
  { id:4, label:'Помещение 04', name:'Панорамная гостиная', ru:'Пространство по дуге', description:'Изогнутый диван, мягкая шерсть и непрерывная линия остекления.', size:'6,30 × 12,50 м · по осям', area:'61,8 м²', jump:.785, palette:['boucle','travertine','bronze'], notes:['Контур гостиной образован четвертью эллипса с радиусами 6,30 и 12,50 м.','Остекление от пола до потолка разделено тонкими бронзовыми стойками.','Модульный диван повторяет дугу фасада. Рядом расположены каменный столик и два кресла.','На внутренней стене размещены экран и камин.'] },
  { id:5, label:'Терраса 05', name:'Терраса над городом', ru:'Открытый горизонт', description:'Стекло раздвигается. Маршрут выходит на открытую террасу.', size:'11,00 × 1,80 м · номинально', area:'19,8 м²', jump:.99, palette:['stone','bronze','boucle'], notes:['Отметка этажа +75,000 м. Номинальные размеры террасы 11,00 × 1,80 м.','В модели терраса продолжается вдоль всей криволинейной стены; длина её дуги превышает номинальную.','Город и горный горизонт созданы для этой концепции и не являются точным видом из квартиры.','Камера пересекает линию раздвижного остекления и выходит на настил террасы.'] },
];

const P = (...p) => new Vector3(...p);
const entryCurve = new CatmullRomCurve3([P(10,85,-6.25),P(10,38,8.5),P(10,9,9),P(10,1.65,.8)],false,'centripetal');
const quaternion = (eye, target,up=P(0,1,0)) => new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(eye, target, up));
const northQ=quaternion(P(10,1.65,.8),P(10,1.65,-2));
// Physical waypoints describe a loop through the bedroom, then the living room.
// A single centripetal spline preserves tangent continuity across doorways.
// The monotone distance clock slows at room views without easing every segment
// to a stop. Yaw is interpolated separately, like a person looking before turning.
export const walkingStops=[
  [.25,10,.8,0,0], [.32,10,-1.75,-24,-2],
  [.365,10,-3.7,0,-3], [.425,10,-4.2,-22,-6],
  [.445,10,-6.4,-28,-4],
  [.465,9.8,-7.72,-65,-3], [.50,7.3,-7.82,-80,-4],
  [.535,6.05,-8.0,-60,-7], [.57,5.9,-8.5,-56,-9],
  [.60,6.1,-8.15,15,-4], [.63,6.5,-7.9,85,-2],
  [.665,9.3,-7.85,80,-1], [.70,12.1,-7.55,70,-1],
  [.74,14.6,-7.05,35,-3], [.785,16.5,-5.5,-12,-3],
  [.82,16.7,-6.4,4,-2], [.86,17.25,-7.4,38,0],
  [.91,18,-8.4,38,1], [.96,18.9,-8.85,35,1],
  [1,19.15,-8.8,35,1],
];
const walkCurve=new CatmullRomCurve3(walkingStops.map(s=>P(s[1],1.65,s[2])),false,'centripetal');
walkCurve.arcLengthDivisions=4096;
const lengths=walkCurve.getLengths(),totalLength=lengths.at(-1);
const distanceKnots=walkingStops.map((s,i)=>{const at=i/(walkingStops.length-1)*4096,j=Math.floor(at);return (lengths[j]+(lengths[Math.min(j+1,4096)]-lengths[j])*(at-j))/totalLength;});
function interpolate(values,p,monotone=false){
  let i=0;while(i<walkingStops.length-2&&p>walkingStops[i+1][0])i++;
  const x=walkingStops.map(s=>s[0]),h=x[i+1]-x[i],t=clamp((p-x[i])/h);
  const slope=k=>k<0||k>=values.length-1?0:(values[k+1]-values[k])/(x[k+1]-x[k]);
  const tangent=k=>{
    if(k===0||k===values.length-1)return 0;
    const a=slope(k-1),b=slope(k);
    if(monotone)return a*b<=0?0:2*a*b/(a+b);
    return (a*(x[k+1]-x[k])+b*(x[k]-x[k-1]))/(x[k+1]-x[k-1]);
  };
  return (2*t*t*t-3*t*t+1)*values[i]+(t*t*t-2*t*t+t)*h*tangent(i)+(-2*t*t*t+3*t*t)*values[i+1]+(t*t*t-t*t)*h*tangent(i+1);
}
const yaws=walkingStops.map(s=>s[3]),pitches=walkingStops.map(s=>s[4]);

export function sampleTimeline(progress) {
  const p=clamp(progress);let eye,target,quat,fov=58;
  if(p<=.12){eye=P(10,85,-6.25);target=P(10,0,-6.25);fov=14;quat=quaternion(eye,target,P(0,0,-1));}
  else if(p<.25){
    const t=smooth(.12,.25,p);eye=entryCurve.getPointAt(t);
    quat=quaternion(P(10,85,-6.25),P(10,0,-6.25),P(0,0,-1)).slerp(northQ,t);
    target=eye.clone().add(P(0,0,-1).applyQuaternion(quat));
    // Interpolating focal length logarithmically avoids a sudden wide-angle zoom.
    fov=Math.exp(MathUtils.lerp(Math.log(14),Math.log(58),smooth(.12,.25,p)));
  }else{
    eye=walkCurve.getPointAt(clamp(interpolate(distanceKnots,p,true)));eye.y=1.65;
    const yaw=interpolate(yaws,p,true)*Math.PI/180,pitch=interpolate(pitches,p,true)*Math.PI/180;
    target=eye.clone().add(P(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(10));
    quat=quaternion(eye,target);
  }
  let room=0;
  if(p>=.25){room=eye.x<7?3:eye.x<13.7?(eye.z>-3.2?1:2):4;if(p>=.935)room=5;}
  return {progress:p,eye,target,quaternion:quat,fov,room,clipHeight:MathUtils.lerp(.05,3.3,smooth(.12,.25,p)),walls:smooth(.12,.25,p),waves:[smooth(.25,.33,p),smooth(.35,.415,p),smooth(.485,.545,p),smooth(.70,.77,p),smooth(.72,.78,p)],glass:smooth(.86,.925,p),cad:1-smooth(.125,.205,p),opening:1-smooth(.09,.19,p)};
}
