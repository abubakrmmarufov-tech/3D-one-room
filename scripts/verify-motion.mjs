import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const url=process.env.TEST_URL||'http://127.0.0.1:4173/',out=resolve(process.env.QA_OUT||'docs/qa/motion');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--disable-gpu-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:960},hasTouch:true,offline:process.env.OFFLINE==='1'});
const report={url,date:new Date().toISOString(),checks:[],errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
const check=(name,pass,details)=>{report.checks.push({name,pass,details});console.log(pass?'PASS':'FAIL',name,details||'');};
const state=()=>page.evaluate(()=>window.__residence.getState());
async function settled(p){await page.waitForFunction(p=>{const s=window.__residence.getState();return !s.moving&&Math.abs(s.progress-p)<.002;},p,{timeout:40000});}
async function seek(p){await page.evaluate(p=>scrollTo({top:p*(document.documentElement.scrollHeight-innerHeight),behavior:'instant'}),p);await settled(p);}
try{
  await page.goto(url);await page.waitForFunction(()=>window.__residence?.ready,null,{timeout:60000});
  await page.waitForTimeout(150);
  await page.evaluate(()=>{
    window.__motionProbe={frames:0,uiErrors:0,sceneErrors:0,maxWalkSpeed:0,maxTurnSpeed:0,maxFrameStep:0,previous:null,intervals:[]};
    const tick=()=>{
      const s=window.__residence.getState(),r=window.__motionProbe;
      if(s.displayTime&&s.displayTime!==r.previous?.displayTime){
        const expected=window.__residence.sampleTimeline(s.progress);
        const fill=Number(document.querySelector('#progress-fill').style.transform.match(/scaleX\(([^)]+)\)/)?.[1]);
        const active=document.querySelector('[data-room][aria-current="true"]');
        if(Math.abs(fill-s.progress)>1e-5||(active?Number(active.dataset.room):0)!==s.room)r.uiErrors++;
        if(s.renderCamera.some((n,i)=>Math.abs(n-expected.eye[i])>1e-10)||s.renderQuaternion.some((n,i)=>Math.abs(n-expected.quaternion[i])>1e-10)||s.waves.some((n,i)=>Math.abs(n-expected.waves[i])>1e-10)||Math.abs(s.glass-expected.glass)>1e-10)r.sceneErrors++;
        if(r.previous&&!s.reduced&&!r.previous.reduced){
          const dt=(s.displayTime-r.previous.displayTime)/1000;
          const distance=Math.hypot(...s.camera.map((n,i)=>n-r.previous.camera[i]));
          const dot=Math.min(1,Math.abs(s.quaternion.reduce((sum,n,i)=>sum+n*r.previous.quaternion[i],0)));
          if(dt>0&&dt<.2){
            r.maxFrameStep=Math.max(r.maxFrameStep,distance);
            if(s.progress>=.251&&r.previous.progress>=.251){r.maxWalkSpeed=Math.max(r.maxWalkSpeed,distance/dt);r.maxTurnSpeed=Math.max(r.maxTurnSpeed,2*Math.acos(dot)/dt*180/Math.PI);}
            if(s.moving)r.intervals.push(dt*1000);
          }
        }
        r.frames++;r.previous=s;
      }
      requestAnimationFrame(tick);
    };requestAnimationFrame(tick);
  });
  await page.locator('#enter').click();await settled(.32);
  check('enter follows one controller to foyer',!(await state()).navigating&&(await state()).room===1);
  for(const room of [5,2,4,3]){await page.locator(`[data-room="${room}"]`).click();await page.waitForTimeout(90);}
  await settled(.57);check('rapid room clicks settle at the last destination',(await state()).room===3);
  await page.screenshot({path:resolve(out,'natural-bedroom-desktop.png')});
  await page.locator('[data-room="5"]').click();await page.waitForTimeout(600);
  const beforeWheel=await state();await page.mouse.wheel(0,-320);await page.waitForTimeout(120);const afterWheel=await state();
  check('wheel cancels room transition at displayed position',!afterWheel.navigating&&afterWheel.scrollProgress<beforeWheel.progress&&afterWheel.scrollProgress<.7,{before:beforeWheel.progress,after:afterWheel.progress,target:afterWheel.scrollProgress});
  const beforeReverse=await state();await page.mouse.wheel(0,100);await page.waitForTimeout(70);const reversed=await state();
  check('ordinary wheel reversal redirects from camera instead of stale scroll target',!reversed.navigating&&reversed.scrollProgress>beforeReverse.progress,{before:beforeReverse.progress,target:reversed.scrollProgress});
  await page.waitForFunction(()=>!window.__residence.getState().moving,null,{timeout:40000});
  await page.locator('[data-room="4"]').click();await page.waitForTimeout(900);await page.locator('#open-file').click();
  const paused=await state(),title=await page.locator('#spec-title').textContent();await page.waitForTimeout(800);const frozen=await state();
  check('specification freezes camera, glass and room',paused.paused&&frozen.progress===paused.progress&&frozen.glass===paused.glass&&title===await page.evaluate(id=>window.__residence.rooms[Math.max(0,id-1)].name,paused.room));
  await page.keyboard.press('Escape');await page.waitForTimeout(100);const resumed=await state();
  check('dialog resumes without a catch-up jump',!resumed.paused&&Math.abs(resumed.progress-paused.progress)<.01);
  await settled(.785);
  await page.locator('[data-room="2"]').click();await page.waitForTimeout(500);const beforeKey=await state();
  await page.evaluate(()=>document.activeElement.blur());await page.keyboard.press('PageUp');await page.waitForTimeout(80);const keyed=await state();
  check('page key interrupts from displayed position',!keyed.navigating&&keyed.scrollProgress<beforeKey.progress,{before:beforeKey.progress,target:keyed.scrollProgress});
  await page.locator('[data-room="4"]').click();await settled(.785);
  await page.locator('[data-room="5"]').click();await page.waitForTimeout(650);const beforeResize=await state();
  await page.setViewportSize({width:390,height:844});const afterResize=await state();
  check('resize preserves active destination and camera continuity',afterResize.scrollProgress===beforeResize.scrollProgress&&Math.abs(afterResize.progress-beforeResize.progress)<.025,{before:beforeResize.progress,after:afterResize.progress,target:afterResize.scrollProgress});
  await settled(.99);await page.screenshot({path:resolve(out,'natural-terrace-mobile.png')});
  const idle=await state();await page.setViewportSize({width:844,height:390});await page.waitForTimeout(200);const rotated=await state();
  check('phone orientation preserves settled route fraction',Math.abs(rotated.progress-idle.progress)<1e-10&&rotated.scrollProgress===idle.scrollProgress);
  await page.setViewportSize({width:390,height:844});await page.locator('[data-room="4"]').click();await settled(.785);
  await page.screenshot({path:resolve(out,'natural-living-mobile.png')});
  await page.locator('[data-room="3"]').click();await page.waitForTimeout(400);const beforeTouch=await state();
  await page.touchscreen.tap(350,400);await page.waitForTimeout(100);const touched=await state();
  check('touch takes over an active transition without teleporting',!touched.navigating&&Math.abs(touched.progress-beforeTouch.progress)<.02&&Math.abs(touched.scrollProgress-beforeTouch.progress)<.02);
  await page.waitForFunction(()=>!window.__residence.getState().moving,null,{timeout:40000});
  await page.locator('#inspect-plan').click();const planState=await state();await page.waitForTimeout(300);check('drawing viewer pauses the same clock',planState.paused&&(await state()).progress===planState.progress);await page.keyboard.press('Escape');
  await page.locator('[data-room="3"]').click();await page.waitForTimeout(500);
  await page.locator('#motion-toggle').click();await page.waitForTimeout(120);const calm=await state();
  check('motion toggle stops an in-flight transition at a static room',calm.reduced&&!calm.moving&&!calm.navigating&&[0,.32,.425,.57,.785,.99].includes(calm.progress));
  await page.locator('#motion-toggle').click();await page.waitForTimeout(150);const continuous=await state();
  check('restoring motion preserves the static room view',!continuous.reduced&&Math.abs(continuous.progress-calm.progress)<1e-10);
  const idleTime=continuous.displayTime;await page.waitForTimeout(250);check('renderer sleeps when settled',(await state()).displayTime===idleTime);
  await page.setViewportSize({width:1440,height:960});await page.locator('[data-room="4"]').click();await settled(.785);await page.screenshot({path:resolve(out,'natural-living-desktop.png')});
  const probe=await page.evaluate(()=>{const {previous,intervals,...r}=window.__motionProbe;intervals.sort((a,b)=>a-b);return{...r,timing:{samples:intervals.length,medianMs:intervals[Math.floor(intervals.length*.5)],p95Ms:intervals[Math.floor(intervals.length*.95)],maxMs:intervals.at(-1)}};});
  report.motion=probe;
  check('camera, materials, glass and UI stay synchronized per rendered frame',probe.uiErrors===0&&probe.sceneErrors===0,probe);
  check('walking and turning stay within measured comfortable limits',probe.maxWalkSpeed<1.95&&probe.maxTurnSpeed<65,{metresPerSecond:probe.maxWalkSpeed,degreesPerSecond:probe.maxTurnSpeed});
  await page.locator('#motion-toggle').click();await page.waitForFunction(()=>window.__residence.getState().reduced);
  const resizeInputs=[];
  for(let i=0;i<12;i++){
    await page.locator('[data-room="4"]').click();await page.waitForFunction(()=>window.__residence.getState().progress===.785);
    await page.setViewportSize(i%2?{width:1440,height:960}:{width:768,height:1024});
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(120);
    resizeInputs.push((await state()).progress);
  }
  check('new scroll wins over pending resize in twelve alternating viewport changes',resizeInputs.every(p=>p===0),resizeInputs);
  check('zero runtime or shader errors',report.errors.length===0,report.errors);
}finally{
  report.summary={checks:report.checks.length,failed:report.checks.filter(c=>!c.pass).length,errors:report.errors.length};
  await writeFile(resolve(out,'motion-browser-report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify(report.summary));
  if(report.summary.failed||report.errors.length)process.exitCode=1;
}
