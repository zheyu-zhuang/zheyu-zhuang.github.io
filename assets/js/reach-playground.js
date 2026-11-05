// A quiet guide: the arm discovers nearby room objects and presents the site's links.
(() => {
  const demo = document.querySelector('#reach-demo');
  if (!demo) return;
  const intro = demo.closest('.about-intro');
  const room = demo.closest('.about-room');
  const svg = demo.querySelector('.reach-drawing');
  const parts = Object.fromEntries([...demo.querySelectorAll('[data-reach]')].map(el => [el.dataset.reach, el]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const roomObjects = [...svg.querySelectorAll('[data-room-object]')].map(element => ({
    element,
    presence: 0,
    bounds: element.querySelector('[data-room-body]').getBBox(),
    target: {x:Number(element.dataset.roomX),y:Number(element.dataset.roomY),angle:Number(element.dataset.roomAngle)*Math.PI/180}
  }));
  const lamp = roomObjects.find(object => object.element.dataset.roomObject === 'lamp');
  const lampControl = room.querySelector('.room-lamp-control');
  const lampCord = lamp.element.querySelector('.room-lamp-cord');
  const lampHandle = lamp.element.querySelector('.room-lamp-handle');
  const base = {x:240, y:340};
  const home = {x:310, y:204, angle:Math.PI*.6};
  const upper = 125, lower = 115;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const difference = (a,b) => Math.atan2(Math.sin(a-b),Math.cos(a-b));
  let goal = {...home}, position = {...home}, velocity = {x:0,y:0,angle:0};
  let frame = 0, previousTime = 0, visible = true, focusedLink = null;
  let previewTimer = 0, welcomed = false;
  let activeObject = null, rewarded = false;
  let rewardTimers = [];
  let lampPhase = '', lampGrip = false;
  let roomLit = false, lampTargetLight = false, lampAutomatic = false;

  function setRoomLight(on) {
    roomLit = on;
    room.dataset.lit = lamp.element.dataset.lit = String(on);
    lampControl.setAttribute('aria-pressed', String(on));
    lampControl.setAttribute('aria-label', `Turn ${on ? 'off' : 'on'} the room light`);
  }

  function resetCord() {
    lampCord.setAttribute('d','M145 80V132');
    lampHandle.removeAttribute('transform');
  }

  function clearReward() {
    lampPhase = '';
    lampGrip = false;
    lampAutomatic = false;
    resetCord();
    rewardTimers.forEach(clearTimeout);
    rewardTimers = [];
    activeObject?.element.classList.remove('is-rewarded','is-pouring');
    demo.classList.remove('is-watering');
    activeObject = null;
    rewarded = false;
  }

  function reward() {
    rewarded = true;
    const name = activeObject.element.dataset.roomObject;
    if (name === 'lamp') {
      // The welcome or a later click requests a pull after the fingers arrive.
      if (lampPhase === 'reaching') {
        lampGrip = true;
        lampPhase = 'pulling';
        move({x:145,y:183,angle:-Math.PI/2});
      }
      return;
    }
    activeObject.element.classList.add('is-rewarded');
    if (name === 'plant') {
      demo.classList.add('is-watering');
      // Grip first, tip the whole wrist, then pour vertically from the lowered spout.
      // The stream waits for the can to tip and ends before the wrist tips back.
      const object = activeObject;
      rewardTimers.push(setTimeout(() => {
        if (activeObject !== object) return;
        object.element.classList.add('is-pouring');
        move({x:342,y:201,angle:28*Math.PI/180});
      },300));
      rewardTimers.push(setTimeout(() => {
        if (activeObject !== object) return;
        object.element.classList.remove('is-pouring');
        move({x:342,y:201,angle:0});
      },2900));
    }
    // Follow the cabinet handle as its door swings toward the hinge.
    if (name === 'cabinet') move({x:219.6,y:147,angle:-Math.PI/2});
  }

  function stopPreview() {
    clearTimeout(previewTimer);
    previewTimer = 0;
  }

  function preview() {
    stopPreview();
    if (document.hidden || !visible) return;
    pullLamp(true);
  }

  function scheduleWelcome() {
    if (welcomed || previewTimer || document.hidden || !visible) return;
    if (reduced.matches) {
      welcomed = true;
      setRoomLight(true);
    } else previewTimer = setTimeout(preview,700);
  }

  function pullLamp(automatic = false) {
    if (lampPhase) return;
    stopPreview();
    welcomed = true;
    if (reduced.matches || document.hidden || !visible) {
      setRoomLight(automatic || !roomLit);
      return;
    }
    focusedLink = null;
    clearReward();
    discover(lamp.target);
    reach(lamp);
    lampPhase = 'reaching';
    lampTargetLight = automatic || !roomLit;
    lampAutomatic = automatic;
  }

  function discover(point) {
    let nearest = null, nearestDistance = Infinity;
    for (const object of roomObjects) {
      const box = object.bounds;
      const distance = point ? Math.hypot(
        Math.max(box.x-point.x,0,point.x-box.x-box.width),
        Math.max(box.y-point.y,0,point.y-box.y-box.height)
      ) : Infinity;
      const presence = clamp(1-distance/90,0,1);
      object.presence = presence*.85;
      object.element.style.setProperty('--room-presence',(presence*.85).toFixed(3));
      if (presence > .35 && distance < nearestDistance) {
        nearest = object;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  function draw() {
    const dx = position.x-base.x, dy = position.y-base.y;
    const distance = Math.hypot(dx,dy);
    const spread = Math.acos(clamp((upper*upper+distance*distance-lower*lower)/(2*upper*distance),-1,1));
    const bend = Math.atan2(dy,dx)-spread;
    const elbow = {x:base.x+upper*Math.cos(bend),y:base.y+upper*Math.sin(bend)};
    const d = `M${base.x} ${base.y}L${elbow.x.toFixed(2)} ${elbow.y.toFixed(2)}L${position.x.toFixed(2)} ${position.y.toFixed(2)}`;
    for (const name of ['outline','arm','highlight']) parts[name].setAttribute('d',d);
    for (const name of ['elbow','pin']) {
      parts[name].setAttribute('cx',elbow.x.toFixed(2));
      parts[name].setAttribute('cy',elbow.y.toFixed(2));
    }
    parts.hand.setAttribute('transform',`translate(${position.x.toFixed(2)} ${position.y.toFixed(2)}) rotate(${(position.angle*180/Math.PI).toFixed(2)})`);
    // A cursor over the introduction can point the hand toward the upper-left
    // corner even outside the drawing. Let the nearby cord reveal there too.
    const tip = {x:position.x+27*Math.cos(position.angle),y:position.y+27*Math.sin(position.angle)};
    const hint = clamp(1-Math.hypot(tip.x-145,tip.y-132)/75,0,1)*.85;
    lamp.element.style.setProperty('--room-presence',Math.max(lamp.presence,hint).toFixed(3));
    if (lampGrip) {
      const drop = clamp(tip.y-132,0,24);
      lampCord.setAttribute('d',`M145 80V${(132+drop).toFixed(2)}`);
      lampHandle.setAttribute('transform',`translate(0 ${drop.toFixed(2)})`);
    }
  }

  function tick(time) {
    frame = 0;
    const dt = previousTime ? Math.min(.04,(time-previousTime)/1000) : 1/60;
    previousTime = time;
    let settled = true;
    // Analytic critically damped springs preserve velocity when the target changes.
    // The wrist is lighter than the arm, so it turns first without a rubbery bounce.
    for (const key of ['x','y','angle']) {
      const omega = key === 'angle' ? 12 : 8;
      const offset = key === 'angle' ? difference(position[key],goal[key]) : position[key]-goal[key];
      const decay = Math.exp(-omega*dt);
      const impulse = velocity[key]+omega*offset;
      position[key] = goal[key]+(offset+impulse*dt)*decay;
      velocity[key] = (velocity[key]-omega*impulse*dt)*decay;
      const tolerance = key === 'angle' ? .002 : .06;
      if (Math.abs(offset)>tolerance || Math.abs(velocity[key])>tolerance) settled = false;
    }
    if (settled) {
      position = {...goal};
      velocity = {x:0,y:0,angle:0};
      previousTime = 0;
    } else frame = requestAnimationFrame(tick);
    draw();
    const atGoal = Math.hypot(position.x-goal.x,position.y-goal.y)<(activeObject === lamp ? .5 : 2) && Math.abs(difference(position.angle,goal.angle))<.04;
    if (activeObject && !rewarded && atGoal) reward();
    else if (lampPhase === 'pulling' && atGoal) {
      setRoomLight(lampTargetLight);
      lampPhase = 'returning';
      move({x:145,y:159,angle:-Math.PI/2});
    } else if (lampPhase === 'returning' && atGoal) {
      lampPhase = '';
      lampGrip = false;
      resetCord();
      if (lampAutomatic || (!room.matches(':hover') && document.activeElement !== lampControl)) rest();
    }
  }

  function move(next) {
    goal = next;
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function localPoint(x,y) {
    const matrix = svg.getScreenCTM();
    return matrix ? new DOMPoint(x,y).matrixTransform(matrix.inverse()) : null;
  }

  function attend(point) {
    clearReward();
    if (!point) return;
    // A safe, rounded workspace keeps the elbow above its base, away from text.
    const dy = clamp((point.y-base.y)*.48,-200,-122);
    const horizontalReach = Math.sqrt(216*216-dy*dy);
    const dx = clamp((point.x-base.x)*.48,-horizontalReach,horizontalReach);
    const x = base.x+dx;
    const y = base.y+dy;
    // The tool faces the actual point of interest, including down and sideways.
    const angle = Math.atan2(point.y-y,point.x-x);
    move({x,y,angle});
  }

  function reach(object) {
    if (activeObject === object) return;
    clearReward();
    activeObject = object;
    const target = object.target;
    // The fingertips, 27 units beyond the wrist, meet the handle or pot edge.
    // Each prop has a deliberate approach angle and sits inside the bent-arm workspace.
    const toolLength = 27;
    const x = target.x-toolLength*Math.cos(target.angle);
    const y = target.y-toolLength*Math.sin(target.angle);
    move({x,y,angle:target.angle});
  }

  function guide(link) {
    const box = link.getBoundingClientRect();
    attend(localPoint(box.left+box.width/2,box.top+box.height/2));
  }

  function rest(immediate = false) {
    const retryWelcome = lampAutomatic && !roomLit;
    clearReward();
    stopPreview();
    if (retryWelcome) welcomed = false;
    discover(null);
    goal = {...home};
    if (immediate || reduced.matches || document.hidden || !visible) {
      cancelAnimationFrame(frame);
      frame = 0; previousTime = 0;
      position = {...home}; velocity = {x:0,y:0,angle:0};
      draw();
    } else move(goal);
  }

  intro.addEventListener('pointermove',event => {
    if (event.pointerType !== 'mouse' || reduced.matches || !finePointer.matches || document.hidden || !visible || focusedLink || !welcomed || lampPhase) return;
    const link = event.target.closest('a');
    if (link) { discover(null); guide(link); }
    else {
      const point = localPoint(event.clientX,event.clientY);
      const target = discover(point);
      if (target) reach(target);
      else attend(point);
    }
  }, {passive:true});
  let touchStart = null;
  room.addEventListener('pointerdown',event => {
    if (event.pointerType !== 'mouse') touchStart = {id:event.pointerId,x:event.clientX,y:event.clientY};
  }, {passive:true});
  room.addEventListener('pointercancel',() => { touchStart = null; }, {passive:true});
  room.addEventListener('pointerup',event => {
    const start = touchStart;
    touchStart = null;
    if (!start || start.id !== event.pointerId || Math.hypot(event.clientX-start.x,event.clientY-start.y)>10) return;
    if (event.pointerType === 'mouse' || reduced.matches || document.hidden || !visible || !welcomed || lampPhase || event.target.closest('button')) return;
    const point = localPoint(event.clientX,event.clientY);
    const target = discover(point);
    if (target) reach(target);
    else attend(point);
  }, {passive:true});
  lampControl.addEventListener('click',() => pullLamp());
  intro.addEventListener('click',event => {
    if (event.target.closest('a,button,input,textarea,select,summary,label') || lampPhase || reduced.matches || !finePointer.matches || !visible || document.hidden || window.getSelection()?.toString()) return;
    const tip = {x:position.x+27*Math.cos(position.angle),y:position.y+27*Math.sin(position.angle)};
    // The cursor may be over the text while the hand is beside the cord.
    // A click there cues the same deliberate grip-and-pull interaction.
    if (Math.hypot(tip.x-145,tip.y-132)<42) lampControl.click();
  });
  intro.addEventListener('pointerleave',() => { if (welcomed && !focusedLink && !lampPhase) rest(); });
  intro.addEventListener('focusin',event => {
    if (!welcomed || lampPhase) return;
    if (event.target === lampControl) {
      discover(lamp.target);
      if (!reduced.matches && visible && !document.hidden) reach(lamp);
      return;
    }
    const link = event.target.closest('a');
    if (!link) return;
    discover(null);
    focusedLink = link;
    if (!reduced.matches && visible && !document.hidden) guide(link);
  });
  intro.addEventListener('focusout',() => { focusedLink = null; if (welcomed && !lampPhase) rest(); });
  window.addEventListener('blur',() => rest(true));
  window.addEventListener('focus',scheduleWelcome);
  const resetView = () => { rest(true); scheduleWelcome(); };
  // Mobile browser bars change viewport height during a swipe; the room's
  // geometry only changes with its width. Keep the welcome steady while scrolling.
  let viewportWidth = innerWidth;
  window.addEventListener('resize',() => {
    if (innerWidth === viewportWidth) return;
    viewportWidth = innerWidth;
    resetView();
  },{passive:true});
  reduced.addEventListener('change',resetView);
  finePointer.addEventListener('change',resetView);
  document.addEventListener('visibilitychange',resetView);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) rest(true);
    else scheduleWelcome();
  }).observe(demo);

  draw();
  demo.classList.add('room-ready');
})();
