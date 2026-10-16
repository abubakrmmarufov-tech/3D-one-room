import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRouteClock,JourneyMotion} from '../src/motion.js';
import {sampleTimeline} from '../src/timeline.js';
const clock=createRouteClock(sampleTimeline),checks=[],metrics=[];
function check(name,fn){try{const details=fn();checks.push({name,pass:true,details});}catch(e){checks.push({name,pass:false,details:e.message});}}
check('route clock strictly increases and round trips all 10001 samples',()=>{
  let previous=-1,maxError=0;
  for(let i=0;i<=10000;i++){const p=i/10000,t=clock.toTime(p);assert(t>previous);previous=t;maxError=Math.max(maxError,Math.abs(clock.toProgress(t)-p));}assert(maxError<1e-12);return{maxError,duration:clock.duration};
});
function travel(start,end,hz){
  const motion=new JourneyMotion(clock);motion.reset(start);motion.setTarget(end);
  let time=0,previous=sampleTimeline(start),previousProgress=start,previousVelocity=0,maxAcceleration=0,maxWalkSpeed=0,maxAngularSpeed=0,overshoot=0;
  while(motion.moving&&time<60){
    const p=motion.advance(1/hz),s=sampleTimeline(p);
    assert(Number.isFinite(p)&&p>=0&&p<=1);
    maxAcceleration=Math.max(maxAcceleration,Math.abs(motion.velocity-previousVelocity)*hz);
    overshoot=Math.max(overshoot,end>start?p-end:end-p);
    if(p>=.251&&previousProgress>=.251){maxWalkSpeed=Math.max(maxWalkSpeed,s.eye.distanceTo(previous.eye)*hz);maxAngularSpeed=Math.max(maxAngularSpeed,s.quaternion.angleTo(previous.quaternion)*hz*180/Math.PI);}
    previous=s;previousProgress=p;previousVelocity=motion.velocity;time+=1/hz;
  }
  assert(Math.abs(motion.progress-end)<1e-12);assert(time<29);assert(overshoot<1e-10);assert(maxAcceleration<=2.000001);assert(maxWalkSpeed<1.86);assert(maxAngularSpeed<61);
  return{start,end,hz,seconds:time,maxAcceleration,maxWalkSpeed,maxAngularSpeed,overshoot};
}
for(const hz of [30,60,120])for(const [a,b] of [[0,1],[1,0],[.425,.57],[.57,.785]])check(`bounded travel ${a} to ${b} at ${hz} Hz`,()=>{const r=travel(a,b,hz);metrics.push(r);return r;});
check('30/60/120 Hz arrivals agree within one 30 Hz frame',()=>{
  for(const [start,end] of [[0,1],[1,0],[.425,.57],[.57,.785]]){const values=metrics.filter(m=>m.start===start&&m.end===end).map(m=>m.seconds);assert.equal(values.length,3);assert(Math.max(...values)-Math.min(...values)<.034);}
});
check('retargeting, pause, long frames and endpoints remain continuous',()=>{
  const m=new JourneyMotion(clock);m.reset(.57);m.setTarget(.99);for(let i=0;i<90;i++)m.advance(1/60);
  const position=m.position,velocity=m.velocity;m.setTarget(.425);assert.equal(m.position,position);assert.equal(m.velocity,velocity);
  m.paused=true;for(let i=0;i<100;i++)m.advance(10);assert.equal(m.position,position);assert.equal(m.velocity,velocity);
  m.paused=false;m.advance(5);assert(Math.abs(m.position-position)<=.064001);assert(Math.abs(m.velocity-velocity)<=.128001);
  for(let i=0;i<1800&&m.moving;i++)m.advance(1/60);assert(Math.abs(m.progress-.425)<1e-12);
  m.reset(-1);assert.equal(m.progress,0);m.reset(2);assert.equal(m.progress,1);
});
const report={date:new Date().toISOString(),checks,summary:{checks:checks.length,failed:checks.filter(c=>!c.pass).length}};
await mkdir('docs/qa',{recursive:true});await writeFile('docs/qa/motion-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({summary:report.summary,failures:checks.filter(c=>!c.pass),routeDuration:clock.duration,maximumWalkingSpeed:Math.max(...metrics.map(m=>m.maxWalkSpeed)),maximumTurningSpeed:Math.max(...metrics.map(m=>m.maxAngularSpeed))},null,2));if(report.summary.failed)process.exitCode=1;
