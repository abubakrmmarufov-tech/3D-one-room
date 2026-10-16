const names={bedroom:'Спальня',living:'Гостиная',kitchen:'Кухня',hall:'Прихожая',bath:'Ванная',storage:'Кладовая',balcony:'Терраса',loggia:'Лоджия'};
export const roomName=r=>r.name==='WC'?'Санузел':r.name==='Room'?'Комната':names[r.kind]??'Комната';
export const areaText=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n);
export const roomCount=n=>`${n}-комнатная`;

export const plural=(n,one,few,many)=>n%100>=11&&n%100<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many;
export const roomTotal=n=>`${n} ${plural(n,'помещение','помещения','помещений')}`;
