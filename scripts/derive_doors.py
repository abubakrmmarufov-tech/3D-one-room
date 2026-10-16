"""Decorative door heads fitted to paired wall faces, with the passage left open."""
from shapely.geometry import Polygon,box
from shapely.ops import unary_union

def infer_doors(plan):
 walls=unary_union([Polygon(w)for w in plan['walls']+plan['struct']]);glass=unary_union([Polygon(w)for w in plan['windows']+plan['glazing']]);result=[]
 for vertical in [False,True]:
  lines={}
  for poly in ([walls] if walls.geom_type=='Polygon' else walls.geoms):
   coords=list(poly.exterior.coords)
   for (x,y),(u,v)in zip(coords,coords[1:]):
    if vertical:x,y,u,v=y,x,v,u
    if abs(v-y)>.015 or abs(u-x)<.12:continue
    key=round((y+v)/2,2);lines.setdefault(key,[]).append((min(x,u),max(x,u)))
  gaps=[]
  for y,segments in lines.items():
   merged=[]
   for a,b in sorted(segments):
    if merged and a<=merged[-1][1]+.035:merged[-1]=(merged[-1][0],max(b,merged[-1][1]))
    else:merged.append((a,b))
   for a,b in zip(merged,merged[1:]):
    if .62<b[0]-a[1]<1.32:gaps.append((y,a[1],b[0]))
  for y,a,b in gaps:
   for z,c,d in gaps:
    if not .085<z-y<.4 or abs(a-c)>.06 or abs(b-d)>.06:continue
    low,high=max(a,c),min(b,d);q=box(y,low,z,high)if vertical else box(low,y,high,z)
    if glass.intersection(q).area>.01 or walls.intersection(q).area>.015:continue
    if any(q.symmetric_difference(p).area<.025 for p in result):continue
    result.append(q)
 return [[[round(x,3),round(y,3)]for x,y in list(q.exterior.coords)[:-1]]for q in result]
