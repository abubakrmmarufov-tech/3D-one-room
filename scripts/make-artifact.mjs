// Portable copy for artifact hosts that serve JSON but do not serve GLB files.
import {readFileSync,writeFileSync,cpSync}from'node:fs';
cpSync('dist','publish',{recursive:true});
const html=readFileSync('dist/index.html','utf8'),entry=html.match(/<script[^>]+src="\.\/([^"]+)"/)[1];
const app=readFileSync(`dist/${entry}`,'utf8');
if(!app.includes('models/shahrofar.glb'))throw new Error('Model URL missing');
writeFileSync(`publish/${entry}`,app.replaceAll('models/shahrofar.glb','models/shahrofar.glb.json'));
writeFileSync('publish/models/shahrofar.glb.json',JSON.stringify({glb:readFileSync('dist/models/shahrofar.glb').toString('base64')}));
console.log('publish/ contains the viewer and its local assets');
