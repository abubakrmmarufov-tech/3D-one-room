import {bounds,interiorPoint} from './geometry.js';

// Uses the same architect polygons and unit IDs as the 3D cutaway.
export function floorPreview(list,selectedId=null,matches=()=>true){
 const b=bounds(list.flatMap(a=>a.data.outline)),pad=12,width=320,height=166;
 const scale=Math.min((width-2*pad)/(b.x1-b.x0),(height-2*pad)/(b.y1-b.y0));
 const px=x=>(width-(b.x1-b.x0)*scale)/2+(x-b.x0)*scale;
 const py=y=>(height-(b.y1-b.y0)*scale)/2+(b.y1-y)*scale;
 return `<div class="floor-preview"><div class="floor-preview-heading"><span>Схема этажа</span><span>Нажмите на квартиру</span></div><svg viewBox="0 0 ${width} ${height}" role="group" aria-label="Расположение квартир на этаже">${list.map(a=>{
  const selected=a.id===selectedId,enabled=matches(a),[x,y]=interiorPoint(a.data.outline);
  return `<g class="floor-unit ${selected?'is-selected':''} ${enabled?'':'is-muted'}" role="button" tabindex="${enabled?0:-1}" aria-label="${a.towerLabel}, этаж ${a.floor}, квартира ${a.number}" aria-pressed="${selected}" ${enabled?`data-apt="${a.id}"`:'aria-disabled="true"'}><polygon points="${a.data.outline.map(([x,y])=>`${px(x).toFixed(2)},${py(y).toFixed(2)}`).join(' ')}"/><text x="${px(x).toFixed(2)}" y="${py(y).toFixed(2)}">${a.number}</text></g>`;
 }).join('')}</svg><p>${selectedId?'Выбранная квартира выделена цветом.':'Контуры соответствуют планировке этого этажа.'}</p></div>`;
}
