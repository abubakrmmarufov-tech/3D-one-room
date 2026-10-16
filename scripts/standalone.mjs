import{readFileSync,writeFileSync,readdirSync}from'node:fs';
let html=readFileSync('dist/index.html','utf8');
const jsPath=html.match(/<script type="module" crossorigin src="([^"]+)"/)[1];
const cssPath=html.match(/<link rel="stylesheet" crossorigin href="([^"]+)"/)[1];
let js=readFileSync('dist/'+jsPath.replace(/^\.\//,''),'utf8');
// Vite emits texture URLs relative to the module. Embed them for a single-file build.
for(const name of readdirSync('dist/assets'))if(/\.(jpg|png|webp)$/.test(name)){
  const mime=name.endsWith('.jpg')?'image/jpeg':name.endsWith('.png')?'image/png':'image/webp';
  const data='data:'+mime+';base64,'+readFileSync('dist/assets/'+name).toString('base64');
  js=js.replaceAll('"'+name+'"',JSON.stringify(data)).replaceAll('"./'+name+'"',JSON.stringify(data)).replaceAll('"./assets/'+name+'"',JSON.stringify(data));
}
const css=readFileSync('dist/'+cssPath.replace(/^\.\//,''),'utf8');
const plan='data:image/svg+xml;base64,'+Buffer.from(readFileSync('public/assets/residence-plan.svg','utf8')).toString('base64');
const icon='data:image/svg+xml;base64,'+Buffer.from(readFileSync('public/mark.svg','utf8')).toString('base64');
html=html.replace(/<script type="module" crossorigin src="[^"]+"><\/script>/,'').replace(/<link rel="stylesheet" crossorigin href="[^"]+">/,`<style>${css}</style>`).replace(/href="(?:\.\/|\/)mark.svg"/g,`href="${icon}"`).replace(/src="(?:\.\/|\/)assets\/residence-plan.svg"/g,`src="${plan}"`).replace(/href="(?:\.\/|\/)assets\/residence-plan.svg"/g,`href="${plan}"`);
const license=readFileSync('node_modules/three/LICENSE','utf8');
html=html.replace('</body>',()=>`<!-- Bundled Three.js license:\n${license}\n--><script>window.__PLAN_DATA__=${JSON.stringify(plan)};</script><script type="module">${js.replaceAll('</script','<\\/script')}</script></body>`);
writeFileSync('Shakhrofar.html',html);
console.log('Standalone offline file: Shakhrofar.html');
