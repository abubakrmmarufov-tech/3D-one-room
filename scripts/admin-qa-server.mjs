// Local-only browser fixture. Never bundled, deployed or connected to real sales data.
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('dist'),port=4179;
let data={version:1,updatedAt:null,units:{}},publicData=structuredClone(data),sha='fixture-initial';
const respond=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
const body=async req=>{let text='';for await(const chunk of req){text+=chunk;if(text.length>300000)throw Error('too large');}return JSON.parse(text||'{}');};
createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,`http://127.0.0.1:${port}`);
  if(url.pathname==='/__qa/control'&&req.method==='POST'){
   const next=await body(req);if(next.reset){data={version:1,updatedAt:null,units:{}};publicData=structuredClone(data);sha='fixture-reset';}
   if(next.units){data={version:1,updatedAt:new Date().toISOString(),units:next.units};sha='fixture-other-editor';}
   respond(res,200,{ok:true});return;
  }
  if(url.pathname.startsWith('/__qa/github')){
   if(req.headers.authorization!=='Bearer test-only-token')return respond(res,401,{message:'Bad test credential'});
   const path=url.pathname.replace('/__qa/github','');
   if(path==='/user')return respond(res,200,{login:'qa-owner'});
   if(path.includes('/contents/')){
    if(req.method==='PUT'){
     const next=await body(req);if(next.sha!==sha)return respond(res,409,{});
     data=JSON.parse(Buffer.from(next.content,'base64').toString('utf8'));sha='fixture-'+Date.now();
     setTimeout(()=>{publicData=structuredClone(data);},2500);
     return respond(res,200,{content:{sha},commit:{sha:'fixture-commit',html_url:'https://github.com/fixture/test/commit/fixture'}});
    }
    return respond(res,200,{type:'file',encoding:'base64',size:JSON.stringify(data).length,sha,content:Buffer.from(JSON.stringify(data)).toString('base64')});
   }
   return respond(res,404,{});
  }
  if(url.pathname==='/inventory.json')return respond(res,200,publicData);
  const path=resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
  if(!path.startsWith(root+'/')||!existsSync(path))return respond(res,404,{});
  const ext=extname(path),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.glb':'model/gltf-binary'}[ext]??'application/octet-stream';
  let bytes=readFileSync(path);
  if(ext==='.js')bytes=bytes.toString().replaceAll('https://api.github.com',`http://127.0.0.1:${port}/__qa/github`);
  res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store'});res.end(bytes);
 }catch{respond(res,500,{message:'Test fixture error'});}
}).listen(port,'127.0.0.1',()=>console.log(`LOCAL QA ONLY: http://127.0.0.1:${port}/admin.html (test-only-token; no GitHub traffic)`));
