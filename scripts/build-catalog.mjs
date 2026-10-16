import {readFileSync,writeFileSync} from 'node:fs';
export function apartmentCatalog(complex,plans){
 const rows=[];
 for(const tower of complex.towers.filter(t=>!t.hotel)){
  let number=0;
  for(const fl of tower.floors)for(const [unit,a] of plans[fl.plan].apartments.entries())rows.push({id:`${tower.key}${fl.floor}-${unit}`,tower:tower.key,number:++number,floor:fl.floor,rooms:a.rooms_count,area:a.area});
 }
 return rows;
}
export function currentCatalog(){return apartmentCatalog(JSON.parse(readFileSync('src/model/complex.json')),JSON.parse(readFileSync('src/model/plans.json')));}
if(process.argv[1]?.endsWith('build-catalog.mjs')){
 writeFileSync('src/model/apartment-catalog.json',JSON.stringify(currentCatalog())+'\n');
 console.log('Apartment catalog generated from the approved model');
}
