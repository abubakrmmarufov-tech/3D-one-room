const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// Measure the route in seconds of comfortable travel. Translation, gaze and
// lens changes share this clock, so a short doorway turn cannot become a spin.
export function createRouteClock(sample,divisions=2048){
  const times=[0];let previous=sample(0);
  for(let i=1;i<=divisions;i++){
    const next=sample(i/divisions),flying=next.progress<=.25;
    const translation=next.eye.distanceTo(previous.eye)/(flying?24:1.8);
    const rotation=next.quaternion.angleTo(previous.quaternion)/(Math.PI/3);
    const lens=Math.abs(Math.log(next.fov/previous.fov))/.65;
    times.push(times.at(-1)+Math.max(1/divisions/.18,translation,rotation,lens));
    previous=next;
  }
  const duration=times.at(-1);
  return {
    duration,
    toTime(progress){
      const index=clamp(progress,0,1)*divisions,i=Math.min(Math.floor(index),divisions-1);
      return times[i]+(times[i+1]-times[i])*(index-i);
    },
    toProgress(time){
      const t=clamp(time,0,duration);let lo=0,hi=divisions;
      while(hi-lo>1){const mid=(lo+hi)>>1;if(times[mid]<=t)lo=mid;else hi=mid;}
      return (lo+(t-times[lo])/(times[hi]-times[lo]))/divisions;
    },
  };
}

// One interruptible, acceleration-limited arrival controller for every input.
// Small integration steps keep 30/60/120 Hz behaviour consistent. A long frame
// may slow the journey, but never causes a large camera leap to catch up.
export class JourneyMotion{
  constructor(clock){this.clock=clock;this.position=0;this.velocity=0;this.target=0;this.paused=false;}
  get progress(){return this.clock.toProgress(this.position);}
  get moving(){return Math.abs(this.target-this.position)>1e-5||Math.abs(this.velocity)>1e-4;}
  setTarget(progress){this.target=this.clock.toTime(progress);}
  reset(progress){this.position=this.target=this.clock.toTime(progress);this.velocity=0;}
  advance(delta){
    if(this.paused||!this.moving)return this.progress;
    const dt=clamp(delta,0,.064),steps=Math.max(1,Math.ceil(dt*240)),h=dt/steps,acceleration=2;
    for(let i=0;i<steps;i++){
      const distance=this.target-this.position;
      const desired=Math.sign(distance)*Math.min(1,Math.sqrt(2*acceleration*Math.abs(distance))*.72,Math.abs(distance)*4);
      this.velocity+=clamp((desired-this.velocity)*16,-acceleration,acceleration)*h;
      const next=clamp(this.position+this.velocity*h,0,this.clock.duration);
      if((next===0&&this.velocity<0)||(next===this.clock.duration&&this.velocity>0))this.velocity=0;
      this.position=next;
    }
    if(!this.moving){this.position=this.target;this.velocity=0;}
    return this.progress;
  }
}
