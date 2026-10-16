"""Open terrace passages only where the approved PDF contains a door swing.
CAD quarter circles are six-segment polylines. Fit their circle in plan metres,
then retain only a leaf position separating an apartment from its own terrace.
"""
import math
import numpy as np
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import unary_union

def terrace_doors(page,clip,local,apartments,plan):
 arcs=[]
 for sh in page.get_drawings():
  if sh['fill'] is not None or not sh['color'] or max(sh['color'])>.7 or not clip.contains(sh['rect']):continue
  items=sh['items']
  if not 3<=len(items)<=36 or any(it[0]!='l'for it in items):continue
  pts=[local(*items[0][1])]+[local(*it[2])for it in items]
  xy=np.array(pts);sol=np.linalg.lstsq(np.c_[2*xy,np.ones(len(xy))],(xy*xy).sum(axis=1),rcond=None)[0];cx,cy=sol[:2]
  rr=np.linalg.norm(xy-[cx,cy],axis=1);rad=float(rr.mean())
  if not .58<rad<1.42 or max(abs(rr-rad))>.018:continue
  aa=np.unwrap(np.arctan2(xy[:,1]-cy,xy[:,0]-cx));sweep=abs(aa[-1]-aa[0])
  if not 1.3<sweep<1.8:continue
  arcs.append(((cx,cy),pts[0],pts[-1]))
 struct=unary_union([Polygon(w)for w in plan['struct']]);openings=[]
 for a in apartments:
  inner=unary_union([Polygon(r['poly'])for r in a['rooms']]);outdoor=unary_union([Polygon(b['poly'])for b in a['balconies']]);a['exteriorDoorways']=[]
  if outdoor.is_empty:continue
  for center,*ends in arcs:
   for end in ends:
    dx,dy=end[0]-center[0],end[1]-center[1];length=math.hypot(dx,dy);mx,my=(center[0]+end[0])/2,(center[1]+end[1])/2;nx,ny=-dy/length,dx/length
    valid=False
    for distance in [.45,.8,1.15]:
     probes=[Point(mx+nx*distance,my+ny*distance),Point(mx-nx*distance,my-ny*distance)]
     if any(inner.distance(probes[k])<.14 and outdoor.distance(probes[1-k])<.14 for k in [0,1]):valid=True
    if not valid:continue
    # The leaf lies in the facade, rather than inside either room.
    leaf=LineString([center,end]);q=leaf.buffer(.65,cap_style='flat')
    if any(q.symmetric_difference(z).area<.05 for z in openings):continue
    openings.append(q);a['exteriorDoorways'].append([[round(x,3),round(y,3)]for x,y in list(q.exterior.coords)[:-1]])
 if openings:
  cut=unary_union(openings)
  for key in ['walls','windows','glazing']:
   shape=unary_union([Polygon(w)for w in plan[key]]).difference(cut)
   pieces=list(shape.geoms)if hasattr(shape,'geoms')else[shape]
   plan[key]=[[[round(x,3),round(y,3)]for x,y in list(q.exterior.coords)[:-1]]for q in pieces if q.geom_type=='Polygon'and q.area>.003]
 return len(openings)
