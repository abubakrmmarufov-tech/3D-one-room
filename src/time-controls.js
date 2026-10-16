import { formatHour, hourDelta, wrapHour } from './daylight.js';

export function createTimeControls(onChange) {
  const $=s=>document.querySelector(s), panel=$('#time-panel'), toggle=$('#time-toggle'), slider=$('#time-hour');
  let target=13;try{const saved=Number(localStorage.getItem('shahrofar-hour'));if(localStorage.getItem('shahrofar-hour')!==null&&Number.isFinite(saved))target=wrapHour(saved);}catch{}
  let hour=target, playing=false, uiTimer=1, previous=-1;
  function open(value){panel.hidden=!value;toggle.setAttribute('aria-expanded',String(value));if(value)slider.focus({preventScroll:true});}
  function save(){try{localStorage.setItem('shahrofar-hour',String(target));}catch{}}
  function syncUI(){
    const text=formatHour(hour);$('#clock').textContent=text;$('#time-value').textContent=text;
    slider.setAttribute('aria-valuetext',formatHour(target));
    if(document.activeElement!==slider)slider.value=String(Math.min(23.75,Math.round(hour*4)/4));
    for(const b of panel.querySelectorAll('[data-hour]')){const selected=Math.abs(hourDelta(hour,Number(b.dataset.hour)))<.2;b.classList.toggle('on',selected);b.setAttribute('aria-pressed',String(selected));}
    $('#time-play').setAttribute('aria-pressed',String(playing));$('#time-play').textContent=playing?'Ⅱ Остановить смену суток':'▷ Смена суток';
  }
  function choose(value){target=wrapHour(value);playing=false;save();syncUI();}
  toggle.onclick=()=>open(panel.hidden);
  $('#time-close').onclick=()=>{open(false);toggle.focus({preventScroll:true});};
  slider.oninput=e=>choose(Number(e.target.value));
  panel.querySelector('.time-presets').onclick=e=>{const b=e.target.closest('[data-hour]');if(b)choose(Number(b.dataset.hour));};
  $('#time-play').onclick=()=>{playing=!playing;target=hour;save();syncUI();};
  document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!toggle.contains(e.target))open(false);});
  syncUI();
  return { close(){const wasOpen=!panel.hidden;open(false);return wasOpen;},
    update(dt){
      if(playing){hour=wrapHour(hour+dt/10);target=hour;}
      else{const delta=hourDelta(hour,target);hour=Math.abs(delta)<.002?target:wrapHour(hour+delta*(1-Math.exp(-3*dt)));}
      const changed=hour!==previous;if(changed){onChange(hour);previous=hour;}
      uiTimer+=dt;if(changed&&uiTimer>.2){syncUI();uiTimer=0;}
      return changed;
    },
  };
}
