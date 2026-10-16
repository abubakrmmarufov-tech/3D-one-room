import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const out=resolve(process.env.QA_OUT||'docs/qa');await mkdir(out,{recursive:true});
const executablePath=process.env.CHROME_PATH;
const url=process.env.TEST_URL||pathToFileURL(resolve('Shakhrofar.html')).href;
if(!executablePath||!existsSync(executablePath))throw new Error('Set CHROME_PATH to an installed Chromium or Chrome executable before running browser QA. See README.md.');
const browser=await chromium.launch({executablePath,headless:true,args:['--disable-gpu-sandbox']});
const offline=process.env.OFFLINE==='1';
const report={url,networkOffline:offline,date:new Date().toISOString(),errors:[],warnings:[],requests:[],desktop:[],mobile:[],checks:[]};
const ctx=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1,acceptDownloads:true,offline});
await ctx.addInitScript(()=>{Element.prototype.requestPointerLock=()=>Promise.resolve();Element.prototype.setPointerCapture=()=>{};Element.prototype.releasePointerCapture=()=>{};});
const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());if(m.type()==='warning')report.warnings.push(m.text());});page.on('requestfailed',r=>report.requests.push({url:r.url(),error:r.failure()}));
await page.goto(url);await page.waitForFunction(()=>window.__residence?.ready,null,{timeout:60000});await page.waitForTimeout(1000);
async function seek(p,filename,list){
  await page.evaluate(p=>{scrollTo({top:p*(document.documentElement.scrollHeight-innerHeight),behavior:'instant'});},p);
  await page.waitForFunction(p=>{const s=window.__residence.getState();return Math.abs(s.scrollProgress-p)<.002&&Math.abs(s.progress-s.scrollProgress)<.000001;},p,{timeout:30000});
  await page.screenshot({path:resolve(out,filename)});const state=await page.evaluate(()=>window.__residence.getState());list.push({file:filename,...state});return state;
}
const samples=[0,.12,.16,.20,.25,.32,.365,.425,.465,.51,.57,.63,.665,.70,.74,.785,.82,.86,.91,.96,1];
for(const p of samples){await seek(p,`desktop-${String(Math.round(p*100)).padStart(3,'0')}.png`,report.desktop);console.log('desktop',p);}
const check=(name,pass,details)=>{report.checks.push({name,pass,details});if(!pass)console.log('FAIL',name,details);};
check('zero runtime/shader errors',report.errors.length===0,report.errors);
check('no failed network requests',report.requests.length===0,report.requests);
check('WebGL active',report.desktop.every(s=>!s.contextLost));
check('Russian document language',await page.locator('html').getAttribute('lang')==='ru');
check('all five room records are Russian',await page.evaluate(()=>window.__residence.rooms.every(r=>/[А-Яа-яЁё]/.test(r.name)&&/[А-Яа-яЁё]/.test(r.description))));
const bedroomView=report.desktop.find(s=>Math.abs(s.progress-.57)<.002);
check('bedroom camera enters through the portal',bedroomView?.room===3&&bedroomView.camera[0]<6.2&&bedroomView.camera[2]<-8.3);
check('all five spaces visited by continuous scrolling',[1,2,3,4,5].every(room=>report.desktop.some(s=>s.room===room)));
check('no English room interface text',await page.evaluate(()=>!/[A-Za-z]{3,}/.test([...document.querySelectorAll('.room-card,.hud,#spec-drawer,.masthead,.opening-copy')].map(e=>e.textContent).join(' '))));
check('opening exact nadir camera',JSON.stringify(report.desktop[0].camera)===JSON.stringify([10,85,-6.25]));
check('opening paper CAD visible',report.desktop[0].cad===1&&report.desktop[0].fov===14);
await page.locator('#inspect-plan').click();check('full-size CAD viewer opens',await page.locator('#plan-viewer').evaluate(d=>d.open));await page.screenshot({path:resolve(out,'full-size-drawing.png')});await page.keyboard.press('Escape');check('CAD viewer Escape and focus return',await page.locator('#inspect-plan').evaluate(b=>b===document.activeElement));
check('walls reach full height at 25%',Math.abs(report.desktop.find(s=>Math.abs(s.progress-.25)<.003)?.clipHeight-3.3)<.001);
check('walk eye height preserved',report.desktop.filter(s=>s.progress>=.249).every(s=>Math.abs(s.camera[1]-1.65)<.001));
check('upcoming living room stays ink through kitchen',report.desktop.filter(s=>s.progress<=.58).every(s=>s.waves[3]===0));
check('hero materials fully revealed by 82%',report.desktop.find(s=>Math.abs(s.progress-.82)<.003)?.waves[3]===1);
check('sliding glass fully opens',report.desktop.at(-1).glass===1);
check('exact terrace final point',report.desktop.at(-1).camera.every((n,i)=>Math.abs(n-[19.15,1.65,-8.8][i])<1e-8));
for(const room of [1,2,3,4,5]){await page.locator(`[data-room="${room}"]`).click();await page.waitForFunction(room=>{const s=window.__residence.getState();return s.room===room&&Math.abs(s.scrollProgress-window.__residence.rooms[room-1].jump)<.002&&Math.abs(s.progress-s.scrollProgress)<.000001;},room);check(`room ${room} jump`,await page.locator(`[data-room="${room}"]`).getAttribute('aria-current')==='true');await page.locator('#open-file').click();check(`room ${room} drawer`,await page.locator('#spec-drawer').evaluate(d=>d.open)&&await page.locator('#swatches .swatch').count()===3);check(`room ${room} clear height`,await page.locator('#spec-height').textContent()===(room===5?'Открытое небо':'3,30 м'));await page.keyboard.press('Escape');check(`room ${room} Escape closes drawer`,!(await page.locator('#spec-drawer').evaluate(d=>d.open)));}
await page.locator('#open-file').click();const dl=page.waitForEvent('download');await page.locator('.download-link').click();const download=await dl;check('drawing download',download.suggestedFilename().endsWith('.svg'));await page.screenshot({path:resolve(out,'specification-drawer.png')});await page.keyboard.press('Escape');
await page.locator('#home').click();await page.waitForFunction(()=>window.__residence.getState().progress<.001);check('return resets ink and glass',await page.evaluate(()=>{const s=window.__residence.getState();return s.waves.every(v=>v===0)&&s.glass===0&&s.cad===1;}));
for(const viewport of [{width:390,height:844},{width:360,height:640}]){await page.setViewportSize(viewport);for(const p of [0,.25,.425,.57,.785,1]){await seek(p,`mobile-${viewport.width}-${Math.round(p*100)}.png`,report.mobile);check(`no overflow ${viewport.width} at ${p}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}}
await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForFunction(()=>window.__residence?.ready);check('reduced motion recognized',await page.evaluate(()=>window.__residence.getState().reduced));
await page.evaluate(()=>scrollTo({top:.78*(document.documentElement.scrollHeight-innerHeight),behavior:'instant'}));await page.waitForFunction(()=>window.__residence.getState().progress===.785);await page.screenshot({path:resolve(out,'reduced-motion.png')});check('reduced motion uses static room frame',await page.evaluate(()=>window.__residence.getState().progress===.785));
const fallbackUrl=new URL(url);fallbackUrl.searchParams.set('no-webgl','1');await page.goto(fallbackUrl.href);await page.waitForFunction(()=>window.__residence?.ready);check('no-WebGL drawing fallback',await page.locator('.fallback-image').count()===1);await page.screenshot({path:resolve(out,'no-webgl.png')});await page.locator('#index-button').click();check('no-WebGL specs work',await page.locator('#spec-drawer').evaluate(d=>d.open));
report.summary={checks:report.checks.length,failed:report.checks.filter(c=>!c.pass).length,errors:report.errors.length,warnings:report.warnings.length};
await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));await browser.close();
if(report.summary.failed||report.errors.length)process.exitCode=1;
