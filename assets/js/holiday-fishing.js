// A bite, then a gentle pull: scrubbed by scrolling, with no added page height.
(() => {
  const decoration = document.querySelector('.holiday-arm');
  if (!decoration) return;
  const parts = Object.fromEntries([...decoration.querySelectorAll('[data-holiday]')].map(el => [el.dataset.holiday,el]));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0,Math.min(1,value));
  const ease = value => { const t=clamp(value); return t*t*(3-2*t); };
  const point = p => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  const base = {x:240,y:340};
  const upper = 125, lower = 115;
  let frame = 0, previous = -1;

  function draw(progress) {
    const bite = ease((progress-.14)/.28);
    const pull = ease((progress-.43)/.45);
    const wrist = {x:310+12*bite-54*pull,y:204+12*bite-42*pull};
    const dx=wrist.x-base.x,dy=wrist.y-base.y,distance=Math.hypot(dx,dy);
    const spread=Math.acos(Math.max(-1,Math.min(1,(upper*upper+distance*distance-lower*lower)/(2*upper*distance))));
    const bend=Math.atan2(dy,dx)-spread;
    const elbow={x:base.x+upper*Math.cos(bend),y:base.y+upper*Math.sin(bend)};
    const arm=`M${point(base)}L${point(elbow)}L${point(wrist)}`;
    for (const key of ['outline','arm','highlight']) parts[key].setAttribute('d',arm);
    for (const key of ['elbow','pin']) {
      parts[key].setAttribute('cx',elbow.x.toFixed(2));
      parts[key].setAttribute('cy',elbow.y.toFixed(2));
    }
    const angle=-25+8*bite-35*pull,radians=angle*Math.PI/180;
    const grip={x:wrist.x+22*Math.cos(radians),y:wrist.y+22*Math.sin(radians)};
    const handle={x:grip.x-9,y:grip.y+29};
    const tip={x:438+6*bite-16*pull,y:148+78*bite-12*pull};
    const control={x:grip.x+32,y:Math.max(112,grip.y-90-20*pull)};
    const float={x:438+6*bite-6*pull,y:338+22*bite-9*pull};
    // The rod stays in the gripper while its tip yields to the taut fishing line.
    parts.rod.setAttribute('d',`M${point(handle)}L${point(grip)}Q${point(control)} ${point(tip)}`);
    parts.line.setAttribute('d',`M${point(tip)}Q${(tip.x+13*(1-bite)).toFixed(2)} ${((tip.y+float.y)/2).toFixed(2)} ${point(float)}`);
    parts.float.setAttribute('d',`M${float.x.toFixed(2)} ${(float.y-7).toFixed(2)}v14`);
    parts.float.setAttribute('opacity',(1-.6*bite*(1-pull*.8)).toFixed(3));
    parts.hand.setAttribute('transform',`translate(${point(wrist)}) rotate(${angle.toFixed(2)})`);
    parts.hat.setAttribute('transform',`translate(${(elbow.x-196.55).toFixed(2)} ${(elbow.y-222.8).toFixed(2)}) rotate(${(-12-8*pull).toFixed(2)} 196 204)`);
    const splash=Math.sin(Math.PI*clamp((progress-.16)/.55));
    parts.splash.setAttribute('opacity',(.65*splash).toFixed(3));
    parts.ripple.setAttribute('rx',(10+15*splash).toFixed(2));
    parts.ripple.setAttribute('ry',(3+2*splash).toFixed(2));
  }

  function update() {
    frame=0;
    const box=decoration.getBoundingClientRect();
    const header=document.querySelector('.site-header').getBoundingClientRect().height;
    const start=innerHeight*.86,end=header+box.height/2+32;
    const progress=motion.matches?0:clamp((start-(box.top+box.height/2))/Math.max(1,start-end));
    if (progress===previous) return;
    previous=progress;
    draw(progress);
  }
  function schedule() { if (!frame&&!document.hidden) frame=requestAnimationFrame(update); }
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  window.addEventListener('pageshow',schedule);
  document.addEventListener('visibilitychange',schedule);
  motion.addEventListener('change',schedule);
  document.fonts.ready.then(schedule);
  update();
})();
