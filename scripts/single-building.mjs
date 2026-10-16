// One-time cleanup, also safe on a future full-complex export. Never hide removed geometry.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {prune} from '@gltf-transform/functions';
import {MeshoptDecoder,MeshoptEncoder} from 'meshoptimizer';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {derivePathLights} from './site-light-data.mjs';

await Promise.all([MeshoptDecoder.ready,MeshoptEncoder.ready]);
const path='public/models/shahrofar.glb',before=fs.statSync(path).size;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
const doc=await io.read(path),removed=[];
for(const node of doc.getRoot().listNodes()){
 const name=node.getName(),tower=node.getExtras().tower;
 if(['A','V'].includes(tower)||/^[AV] (base|roof)/.test(name)||name.startsWith('Hotel terrace')||/^Sign [EHLOT]$/.test(name)){
  removed.push(name);node.dispose();
 }
}
await doc.transform(prune({keepAttributes:true}));
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});
await io.write(path,doc);
const complex=JSON.parse(fs.readFileSync('src/model/complex.json'));
complex.towers=complex.towers.filter(t=>t.key==='B');
fs.writeFileSync('src/model/complex.json',JSON.stringify(complex)+'\n');
for(const name of ['src/model/plans.json','blender/plans/plans.json']){
 const plans=JSON.parse(fs.readFileSync(name)),used=new Set(complex.towers.flatMap(t=>t.floors.map(f=>f.plan)));
 fs.writeFileSync(name,JSON.stringify(Object.fromEntries(Object.entries(plans).filter(([key])=>used.has(key))))+'\n');
}
const bytes=fs.readFileSync(path),hash=createHash('sha256').update(bytes).digest('hex').slice(0,16);
const configPath='src/config.js';fs.writeFileSync(configPath,fs.readFileSync(configPath,'utf8').replace(/shahrofar\.glb\?v=[a-f0-9]+/,`shahrofar.glb?v=${hash}`));
const {scene}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
fs.writeFileSync('src/model/site-lights.json',JSON.stringify(derivePathLights(scene))+'\n');
console.log(JSON.stringify({removedNodes:removed.length,before,after:bytes.length,hash}));
