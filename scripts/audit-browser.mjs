import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const out=resolve(process.env.QA_OUT||'docs/qa/production');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--disable-gpu-sandbox']});
const offline=process.env.OFFLINE==='1';
const page=await browser.newPage({viewport:{width:1440,height:960},offline});
const report={url,date:new Date().toISOString(),networkOffline:offline,scope:'Browser automation and axe scans. Lab timing on this machine; no field INP, screen-reader or physical-device certification.',errors:[],httpFailures:[],externalRequests:[],checks:[],accessibility:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400)report.httpFailures.push({url:r.url(),status:r.status()});});
page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(url).origin)report.externalRequests.push(r.url());});
await page.addInitScript(()=>{
  window.__metrics={lcp:0,cls:0};
  new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__metrics.lcp=e.startTime)).observe({type:'largest-contentful-paint',buffered:true});
  new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput)window.__metrics.cls+=e.value;})).observe({type:'layout-shift',buffered:true});
});
try{
  await page.goto(url);await page.waitForFunction(()=>window.__residence?.ready,null,{timeout:60000});await page.waitForTimeout(1000);
  report.metrics=await page.evaluate(()=>({...window.__metrics,measuredAtMs:performance.now(),renderer:(()=>{const gl=document.querySelector('canvas').getContext('webgl2');const ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);})()}));
  await page.addScriptTag({path:resolve('node_modules/axe-core/axe.min.js')});
  const check=(name,pass,details)=>report.checks.push({name,pass,details});
  async function seek(p){await page.evaluate(p=>scrollTo({top:p*(document.documentElement.scrollHeight-innerHeight),behavior:'instant'}),p);try{await page.waitForFunction(p=>Math.abs(window.__residence.getState().progress-p)<.0002,p);}catch(error){report.seekFailure=await page.evaluate(p=>({requested:p,state:window.__residence.getState(),scrollY,range:document.documentElement.scrollHeight-innerHeight,viewport:[innerWidth,innerHeight],dialogs:[...document.querySelectorAll('dialog')].map(d=>({id:d.id,open:d.open}))}),p);console.log(JSON.stringify(report.seekFailure));throw error;}}
  async function scan(name){const r=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));report.accessibility.push({name,violations:r.violations,incomplete:r.incomplete.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}))});check(`axe ${name}`,r.violations.length===0,r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));}
  await scan('desktop opening');await seek(.785);await scan('desktop living');
  await page.locator('#open-file').click();await scan('specifications');
  const focus=[];for(let i=0;i<8;i++){await page.keyboard.press('Tab');focus.push(await page.evaluate(()=>({id:document.activeElement.id,inDialog:!!document.activeElement.closest('#spec-drawer')})));}
  check('specification focus stays in dialog',focus.every(f=>f.inDialog),focus);await page.keyboard.press('Escape');check('specification returns keyboard focus',await page.locator('#open-file').evaluate(b=>b===document.activeElement));
  await page.locator('#inspect-plan').click();await scan('drawing viewer');await page.locator('#plan-viewer figure').focus();const before=await page.locator('#plan-viewer figure').evaluate(f=>f.scrollTop);await page.keyboard.press('PageDown');await page.waitForTimeout(150);check('drawing scrolls by keyboard',await page.locator('#plan-viewer figure').evaluate(f=>f.scrollTop)>before);await page.keyboard.press('Escape');
  for(const viewport of [{width:768,height:1024},{width:390,height:844},{width:360,height:640}]){
    await page.setViewportSize(viewport);await seek(0);await scan(`opening ${viewport.width}`);await page.screenshot({path:resolve(out,`audit-opening-${viewport.width}.png`)});await seek(.785);await scan(`living ${viewport.width}`);await page.screenshot({path:resolve(out,`audit-living-${viewport.width}.png`)});
    check(`HUD and card do not overlap at ${viewport.width}`,await page.evaluate(()=>{const a=document.querySelector('.room-card').getBoundingClientRect(),b=document.querySelector('.hud').getBoundingClientRect();return a.bottom+4<b.top&&a.top>90;}));
    check(`no horizontal overflow at ${viewport.width}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.setViewportSize({width:1440,height:960});await seek(.70);
  report.frameTiming=await page.evaluate(async()=>{
    const times=[];let previous=performance.now();
    for(let i=0;i<75;i++){await new Promise(requestAnimationFrame);const now=performance.now();if(i>5)times.push(now-previous);previous=now;scrollTo({top:(.7+i/75*.08)*(document.documentElement.scrollHeight-innerHeight),behavior:'instant'});}
    times.sort((a,b)=>a-b);return{samples:times.length,medianMs:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],maxMs:times.at(-1)};
  });
  await page.locator('#motion-toggle').click();await page.waitForFunction(()=>window.__residence.getState().reduced);check('motion button enables static viewpoints',await page.evaluate(()=>window.__residence.getState().reduced));
  await page.reload();await page.waitForFunction(()=>window.__residence?.ready);check('motion preference persists on reload',await page.evaluate(()=>window.__residence.getState().reduced));
  await page.locator('#motion-toggle').click();await page.waitForFunction(()=>!window.__residence.getState().reduced);check('motion button restores continuous journey',await page.evaluate(()=>!window.__residence.getState().reduced));
  // No-JS is a separate context, so its fallback is actually exercised.
  const noJs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844},offline});await noJs.goto(url);check('no-JavaScript drawing is visible',await noJs.locator('noscript img').isVisible());await noJs.screenshot({path:resolve(out,'no-javascript.png')});await noJs.close();
  await page.evaluate(()=>document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.waitForSelector('.fallback-image');check('actual WebGL context loss retains drawing',await page.locator('.fallback-image').isVisible());
  await page.locator('#index-button').click();check('context-loss room archive remains usable',await page.locator('#spec-drawer').evaluate(d=>d.open));
  if(/^https?:/.test(url)){
    const boot=await browser.newPage({viewport:{width:390,height:844}}),bootErrors=[];
    boot.on('pageerror',e=>bootErrors.push(e.stack||e.message));
    await boot.route('**/*.jpg',async route=>{await new Promise(r=>setTimeout(r,800));await route.continue();});
    await boot.goto(url,{waitUntil:'commit'});await boot.waitForSelector('#world canvas');
    await boot.evaluate(()=>scrollTo({top:.7*(document.documentElement.scrollHeight-innerHeight),behavior:'instant'}));
    await boot.setViewportSize({width:360,height:640});
    await boot.waitForFunction(()=>window.__residence?.ready,null,{timeout:60000});
    check('scroll and resize before texture loading completes are safe',bootErrors.length===0,bootErrors);await boot.close();
  }
  check('no runtime errors',report.errors.length===0,report.errors);check('no HTTP failures',report.httpFailures.length===0,report.httpFailures);check('no external asset requests',report.externalRequests.length===0,report.externalRequests);
  report.summary={checks:report.checks.length,failed:report.checks.filter(c=>!c.pass).length,axeViolations:report.accessibility.reduce((sum,r)=>sum+r.violations.length,0)};
  console.log(JSON.stringify({summary:report.summary,metrics:report.metrics,frameTiming:report.frameTiming,failures:report.checks.filter(c=>!c.pass)},null,2));if(report.summary.failed)process.exitCode=1;
}finally{await writeFile(resolve(out,'audit-report.json'),JSON.stringify(report,null,2));await browser.close();}
