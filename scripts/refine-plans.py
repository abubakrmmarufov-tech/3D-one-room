"""Recover room partitions from the approved October vector drawing.
Run extract_pdf.py with the upstream frames first, then pass the October PDF here.
Only the residential web data is repaired; the original GLB and hotel stay intact.
"""
import json, math, pathlib, re, subprocess, sys
import fitz
from shapely.geometry import Polygon, Point, box
from shapely.ops import unary_union
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'blender/plans'))
from build_plans import polys_of, STRUCT
from derive_doors import infer_doors
from terrace_doors import terrace_doors
pdf=fitz.open(sys.argv[1])
previous=json.loads((ROOT/'src/model/plans.json').read_text())
original=json.loads(subprocess.check_output(['git','show','fef012a:src/model/plans.json'],cwd=ROOT))
frames={'V':(6,(1005,510,1535,930),1269.3,721.1,1,0),'B':(6,(925,1150,1525,1660),1222,1432.6,406.3,181.2),'V23':(7,(780,385,1310,815),1044.45,598.8,1,0),'V24':(7,(780,1390,1310,1820),1044.45,1602.9,1,0)}
names={'Хонаи хоб':('Bedroom','bedroom'),'Хонаи умумӣ':('Family room','living'),'Ҳуҷраи умумӣ':('Family room','living'),'Меҳмонхона':('Living room','living'),'Ошхона':('Kitchen','kitchen'),'Даҳлез':('Hall','hall'),'Ҳамом':('Bathroom','bath'),'Ҳаммом':('Bathroom','bath'),'Ҳоҷатхона':('WC','bath'),'Ташноб':('WC','bath'),'Помещение':('Room','bedroom')}
# These otherwise unnamed areas contain sanitary fixtures in the source drawing.
# Values were checked visually on sheets 7 and 8, rather than inferred from size.
sanitary={'V':{1.8,4.24,9.14,9.26,9.86,4.01,1.6,4.77,1.91,3.96,4.2,1.43,4.12},'B':{4.48,2.28,1.96,4.75,6.19,10.14,9.28,9.46,4.16,2.1,5.64,2.56,4.35},'V23':{4.76,2.08,9.08,9.26,8.89,3.92,1.57,5.32,3.7,3.86,4.12,1.43},'V24':{6.32,9.08,9.26,8.89,3.92,1.57,5.32,2.08,3.27,3.7,1.58,4.14}}
def poly(r):return Polygon(r['poly']).buffer(0)
def parts(p):return list(p.geoms) if p.geom_type=='MultiPolygon' else [p] if p.geom_type=='Polygon' else [q for q in getattr(p,'geoms',[]) if q.geom_type=='Polygon']
def ring(p):
 p=max(parts(p),key=lambda g:g.area)
 return [[round(x,3),round(y,3)] for x,y in list(p.simplify(.012).exterior.coords)[:-1]]
report=[]
for key,plan in original.items():
 page,region,cx,cy,ux,uy=frames[key];clip=fitz.Rect(region);ang=math.atan2(-uy,ux);c,s=math.cos(-ang),math.sin(-ang)
 def local(x,y):
  dx,dy=(x-cx)*6.3/85,(cy-y)*6.3/85
  return c*dx-s*dy,s*dx+c*dy
 lines=[]
 for b in pdf[page].get_text('dict')['blocks']:
  for l in b.get('lines',[]):
   if not clip.contains(fitz.Rect(l['bbox'])):continue
   x0,y0,x1,y1=l['bbox'];lines.append((*local((x0+x1)/2,(y0+y1)/2),''.join(z['text'] for z in l['spans']).strip()))
 # The floor-24 PDF uses a different brown for internal walls, omitted by upstream's exact colour match.
 if key=='V24':
  raw=json.loads((ROOT/'build/plans/V24.json').read_text())
  extra=[p for sh in raw['shapes'] if sh['fill']==[.76,.58,.39] for p in polys_of(sh)]
  plan['walls']=[ring(p) for p in parts(unary_union([Polygon(w).buffer(0) for w in plan['walls']]+extra)) if p.area>.01]
 # Long blue members with apartment space on both sides are overhead beams,
 # not floor-to-ceiling walls. Keep the short structural columns solid.
 base=original['V']['apartments'] if key=='V24' else plan['apartments']
 bounds=[Polygon(a['outline']).buffer(0) for a in base]
 columns=[];beams=[]
 raw=json.loads((ROOT/f'build/plans/{key}.json').read_text())
 blue=[p for sh in raw['shapes'] if sh['fill'] and tuple(sh['fill']) in STRUCT for p in polys_of(sh)]
 for q in blue:
  w=ring(q);x0,y0,x1,y1=q.bounds;dx,dy=x1-x0,y1-y0
  along=dx>dy;length=max(dx,dy);thickness=min(dx,dy);cx2,cy2=q.centroid.coords[0]
  sides=[Point(cx2,cy2-thickness/2-.28),Point(cx2,cy2+thickness/2+.28)] if along else [Point(cx2-thickness/2-.28,cy2),Point(cx2+thickness/2+.28,cy2)]
  internal=any(all(a.covers(pt) for pt in sides) for a in bounds)
  (beams if internal and thickness<.62 and length>1.5 and length/max(thickness,.01)>4 else columns).append(w)
 if beams:
  blue_solid=unary_union([Polygon(w) for w in plan['struct']]).difference(unary_union([Polygon(w) for w in beams]))
  plan['struct']=[ring(q) for q in parts(blue_solid) if q.area>.01]
 plan['beams']=beams
 oldrooms=[r for a in plan['apartments'] for r in a['rooms']]
 solid=unary_union([Polygon(w).buffer(0) for k in ['walls','struct','windows','glazing'] for w in plan[k]])
 roomspace=unary_union([poly(r) for r in oldrooms]+[Polygon(a['outline']).buffer(0) for a in plan['apartments']]).buffer(.025).difference(solid.buffer(.008))
 cores=[p for p in parts(roomspace.buffer(-.44)) if p.area>.025]
 cells=[p.buffer(.445).intersection(roomspace) for p in cores]
 area_labels=[(Point(x,y),float(t)) for x,y,t in lines if re.fullmatch(r'\d+\.\d\d',t)]
 name_labels=[(Point(x,y),t) for x,y,t in lines if t in names]
 base=original['V']['apartments'] if key=='V24' else plan['apartments']
 outlines=[Polygon(a['outline']).buffer(0) for a in base]
 groups=[[] for _ in base]
 for cell in cells:
  ars=[(p,v) for p,v in area_labels if cell.distance(p)<.23]
  nms=[(p,t) for p,t in name_labels if cell.distance(p)<.23]
  if not ars and not nms:continue  # fill holes, beams and facade fragments are not extra rooms
  # If a wide doorway survives the opening, the original room fill supplies its partition.
  subcells=[]
  if len(ars)>1:
   for pt,value in ars:
    candidate=[poly(r) for r in oldrooms if poly(r).buffer(.04).covers(pt)]
    q=cell.intersection(min(candidate,key=lambda p:p.area)) if candidate else cell
    if any(q.symmetric_difference(z[0]).area<.1 for z in subcells):continue
    subcells.append((q,[(pt,value)],[(p,t)for p,t in nms if q.distance(p)<.23]))
  else:subcells=[(cell,ars,nms)]
  for q,ar,nm in subcells:
   if q.is_empty:continue
   q=max(parts(q),key=lambda p:p.area)
   if q.area<.5:continue
   pt,value=ar[0] if ar else (q.representative_point(),round(q.area,2))
   name=min(nm,key=lambda p:p[0].distance(pt))[1] if nm else None
   if name:en,kind=names[name]
   elif value in sanitary[key]:en,kind=('WC' if value<2.7 else 'Bathroom'),'bath'
   else:
    old=max(oldrooms,key=lambda r:q.intersection(poly(r)).area)
    en,kind=old['name'],old['kind']
    if kind=='hall' and value<6:en,kind='Storage','storage'
   scores=[q.intersection(p).area for p in outlines];owner=max(range(len(base)),key=lambda i:scores[i])
   # The yellow bedroom by the north stair belongs to the green one-room flat, as sheet 7 shows.
   if key=='B' and name=='Хонаи хоб' and not ar and q.distance(Point(-8.56,12.05))<.4:owner=1
   groups[owner].append(dict(name=en,kind=kind,tj=name or '',area=value,area_source='drawing' if ar else 'geometry',poly=ring(q)))
 # Restore narrow sanitary compartments that disappear during the wider doorway opening.
 small=[q.buffer(.355).intersection(roomspace) for q in parts(roomspace.buffer(-.35)) if q.area>.005]
 for pt,value in area_labels:
  if value not in sanitary[key] or any(poly(r).distance(pt)<.24 for g in groups for r in g):continue
  q=min(small,key=lambda p:p.distance(pt))
  if q.distance(pt)>.25 or not .6<q.area<12:continue
  q=max(parts(q),key=lambda p:p.area);owner=max(range(len(base)),key=lambda i:q.intersection(outlines[i]).area)
  groups[owner].append(dict(name='WC' if value<2.7 else 'Bathroom',kind='bath',tj='',area=value,area_source='drawing',poly=ring(q)))
 # Two narrow top-floor sanitary compartments share an open doorway with the
 # hall and survive the morphological opening. Their bounds follow the vector
 # wall faces on sheet 8; keep the doorway open for navigation.
 if key in ['V23','V24']:
  compartments=[(5,3.86,(8.,-8.88,9.63,-6.51))] if key=='V23' else [(3,1.57,(6.25,2.18,7.56,3.38)),(7,1.58,(-10.287,-1.78,-9.09,-.53))]
  for owner,value,rect in compartments:
   q=box(*rect)
   for r in groups[owner]:
    if r['kind']=='hall' and poly(r).intersection(q).area>.1:r['poly']=ring(poly(r).difference(q))
   if not any(r['kind']=='bath' and r['area']==value for r in groups[owner]):
    groups[owner].append(dict(name='WC' if value<2.7 else 'Bathroom',kind='bath',tj='',area=value,area_source='drawing',poly=ring(q)))
 # The unlabelled curved room and the rectangular kitchen on block B are on opposite sides of a structural wall.
 if key=='B':
  kitchen=next(r for r in groups[3] if r['area']==47.41)
  groups[3].remove(kitchen);groups[2].append(kitchen)
  unused=[q for q in cells if q.area>15 and not any(q.intersection(poly(r)).area>q.area*.4 for g in groups for r in g)]
  if unused:
   q=max(unused,key=lambda q:q.area)
   groups[3].append(dict(name='Living room',kind='living',tj='',area=round(q.area,2),area_source='geometry',poly=ring(q)))
 # Upper floors have repeated colours; use their eight corresponding positions on the typical floor.
 result=[]
 for i,rooms in enumerate(groups):
  a=dict(base[i]);a['rooms']=rooms
  if key=='V24':
   shape=unary_union([poly(r) for r in rooms]);outline=shape.buffer(.9,join_style='mitre').buffer(-.72,join_style='mitre').intersection(Polygon(plan['enclosure']))
   if i in [2,3,4,5,6]:outline=outline.union(outlines[i].intersection(Polygon(plan['enclosure'])))
   a.update(outline=ring(outline),label_rooms=None,rooms_count=max(1,sum(r['kind'] in ['living','bedroom'] for r in rooms)),area=round(sum(r['area'] for r in rooms),2),area_source='room-sum',balconies=[],fixtures=[])
  result.append(a)
 if key=='B':
  bedroom=next(r for r in result[1]['rooms'] if r['kind']=='bedroom')
  addition=poly(bedroom).buffer(.18)
  result[1]['outline']=ring(Polygon(result[1]['outline']).union(addition).buffer(.3).buffer(-.3))
  result[0]['outline']=ring(Polygon(result[0]['outline']).difference(addition.buffer(.05)))
  kitchen=poly(next(r for r in result[2]['rooms'] if r['area']==47.41)).buffer(.18)
  result[2]['outline']=ring(Polygon(result[2]['outline']).union(kitchen).buffer(.3).buffer(-.3))
  result[3]['outline']=ring(Polygon(result[3]['outline']).difference(kitchen))
 # Balcony ownership follows the doors and labels on the drawing, rather
 # than assigning the same nearby slab to multiple unrelated apartments.
 inherited=[b for a in plan['apartments'] for b in a['balconies']]
 interior=unary_union([poly(r) for a in result for r in a['rooms'] if r['kind'] not in ['balcony','loggia']])
 def raw_terrace(value):
  pt=next((pt for pt,v in area_labels if v==value),None)
  if pt is None:raise ValueError(f'Missing terrace label {key}/{value}')
  filled=[(sh['fill'],q)for sh in raw['shapes'] if sh['fill'] and max(sh['fill'])-min(sh['fill'])>.015 for q in polys_of(sh) if q.area>.25]
  seeds=[(color,q) for color,q in filled if q.buffer(.08).covers(pt)]
  if not seeds:raise ValueError(f'Missing terrace fill {key}/{value}')
  color,q=min(seeds,key=lambda z:z[1].area)
  candidates=[z for c,z in filled if c==color and z.intersection(interior).area<z.area*.35]
  for _ in range(5):
   near=[z for z in candidates if z.distance(q)<.45]
   q=unary_union([q]+near).buffer(.18,join_style='mitre').buffer(-.18,join_style='mitre')
  return dict(name='Terrace',kind='balcony',tj='Терраса',area=value,area_source='drawing',poly=ring(q))
 owners={'V':[(1,17.54),(2,23.17),(3,9.74),(4,23.4),(7,17.55)],
         'B':[(0,17.1),(3,16.46),(4,10.4),(5,23.53),(5,5.5),(6,16.78)],
         'V23':[(0,49.42),(1,49.42),(2,23.17),(3,9.83),(4,13.5),(4,9.03),(5,5.83),(6,51.41),(7,51.41)],
         'V24':[(0,19.64),(1,24),(2,23.16),(3,9.83),(4,13.5),(4,10.41),(5,5.83),(6,24.46),(7,19.54)]}
 for a in result:a['balconies']=[]
 for owner,value in owners[key]:
  existing=next((b for b in inherited if b['area']==value),None) if key!='V24' else None
  balcony=dict(existing) if existing else raw_terrace(value)
  result[owner]['balconies'].append(balcony)
  result[owner]['rooms']=[r for r in result[owner]['rooms'] if r['kind'] not in ['balcony','loggia'] or poly(r).intersection(poly(balcony)).area<poly(r).area*.5]
 door_count=terrace_doors(pdf[page],clip,local,result,plan)
 # Facade door swings cross blue lintels on sheets 7/8. These long thin
 # members sit over the passage; short columns and core walls stay solid.
 passages=unary_union([Polygon(d)for a in result for d in a['exteriorDoorways']])
 facade_beams=[]
 for q in blue:
  rect=list(q.minimum_rotated_rectangle.exterior.coords);edges=[math.dist(rect[i],rect[i+1])for i in range(4)];length=max(edges);thickness=min(edges)
  if length>1.2 and thickness<.65 and length/max(thickness,.01)>3.2 and q.intersection(passages).area>.015:facade_beams.append(q)
 if facade_beams:
  shape=unary_union([Polygon(w)for w in plan['struct']]).difference(unary_union(facade_beams))
  plan['struct']=[ring(q)for q in parts(shape)if q.area>.01]
  plan['beams'] += [ring(q)for q in facade_beams if not any(q.symmetric_difference(Polygon(w)).area<.02 for w in plan['beams'])]
 solid=unary_union([Polygon(w).buffer(0)for k in ['walls','struct','windows','glazing']for w in plan[k]])
 for a in result:
  threshold=unary_union([Polygon(a['outline']).buffer(.65).intersection(poly(b).buffer(.65)) for b in a['balconies']]).difference(solid)
  threshold=threshold.union(unary_union([Polygon(w).buffer(.12)for w in a['exteriorDoorways']])).difference(solid)
  a['thresholds']=[ring(q)for q in parts(threshold) if q.area>.01]
 for i,a in enumerate(result):
  prior=previous[key]['apartments'][i]['rooms'] if i<len(previous[key]['apartments']) else []
  for r in a['rooms']:
   old=next((z for z in prior if z['kind']==r['kind'] and z['area']==r['area'] and 'furniture'in z and poly(z).centroid.distance(poly(r).centroid)<.7),None)
   if old:r['furniture']=old['furniture']
 if key=='V23':
  for r in result[7]['rooms']:
   if r['area']==2.64:r.update(name='Storage',kind='storage')
 # One 18.91 label falls between two recovered hall sections on sheet 8.
 # Use measured polygons for both sections rather than counting that label twice.
 if key=='V24':
  for r in result[2]['rooms']:
   if r['kind']=='hall' and r['area']==18.91:r.update(area=round(poly(r).area,2),area_source='geometry')
 for a in result:
  if key=='V24':a['area']=round(sum(r['area']for r in a['rooms']),2)
 plan['doorways']=infer_doors(plan)
 plan['apartments']=result
 report.append({'plan':key,'terrace_doors':door_count,'apartments':len(result),'rooms':sum(len(a['rooms'])for a in result),'room_counts':[len(a['rooms'])for a in result]})
(ROOT/'src/model/plans.json').write_text(json.dumps(original,separators=(',',':')))
(ROOT/'docs/qa/plan-corrections.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
