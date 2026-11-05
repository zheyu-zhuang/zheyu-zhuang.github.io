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
    bounds: element.querySelector('[data-room-body]').getBBox(),
    target: {x:Number(element.dataset.roomX),y:Number(element.dataset.roomY),angle:Number(element.dataset.roomAngle)*Math.PI/180}
  }));
  const base = {x:240, y:340};
  const home = {x:310, y:204, angle:Math.PI*.6};
  const upper = 125, lower = 115;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const difference = (a,b) => Math.atan2(Math.sin(a-b),Math.cos(a-b));
  let goal = {...home}, position = {...home}, velocity = {x:0,y:0,angle:0};
  let frame = 0, previousTime = 0, visible = true, focusedLink = null;
  let previewTimer = 0, returnTimer = 0, welcomed = false;
  let previewHint = null;
  let activeObject = null, rewarded = false;
  let rewardTimers = [];

  function clearReward() {
    rewardTimers.forEach(clearTimeout);
    rewardTimers = [];
    activeObject?.element.classList.remove('is-rewarded','is-pouring');
    demo.classList.remove('is-watering');
    activeObject = null;
    rewarded = false;
  }

  function reward() {
    rewarded = true;
    activeObject.element.classList.add('is-rewarded');
    const name = activeObject.element.dataset.roomObject;
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
    clearTimeout(returnTimer);
    previewTimer = returnTimer = 0;
    previewHint?.cancel();
    previewHint = null;
  }

  function preview() {
    stopPreview();
    welcomed = true;
    if (reduced.matches || document.hidden || !visible) return;
    // The raised fingertips sit beside the cabinet's lower corner. Briefly show
    // that real object, so the fading outline hints at a room worth exploring.
    const cabinet = roomObjects.find(object => object.element.dataset.roomObject === 'cabinet');
    const hint = cabinet.element.animate([
      {opacity:0},
      {opacity:.5,offset:.22},
      {opacity:.5,offset:.45},
      {opacity:0}
    ], {duration:2400,easing:'ease-in-out'});
    previewHint = hint;
    hint.onfinish = () => { if (previewHint === hint) previewHint = null; };
    move({x:326,y:178,angle:-Math.PI/5});
    // Let the outline finish fading while the arm settles back into its pose.
    returnTimer = setTimeout(() => { returnTimer = 0; move({...home}); },1100);
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
    if (activeObject && !rewarded && Math.hypot(position.x-goal.x,position.y-goal.y)<2 && Math.abs(difference(position.angle,goal.angle))<.04) reward();
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
    clearReward();
    stopPreview();
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
    if (event.pointerType !== 'mouse' || reduced.matches || !finePointer.matches || document.hidden || !visible || focusedLink) return;
    // A visitor's first movement takes priority over the short arrival preview.
    stopPreview();
    welcomed = true;
    const link = event.target.closest('a');
    if (link) { discover(null); guide(link); }
    else {
      const point = localPoint(event.clientX,event.clientY);
      const target = discover(point);
      if (target) reach(target);
      else attend(point);
    }
  }, {passive:true});
  room.addEventListener('pointerdown',event => {
    if (event.pointerType === 'mouse' || reduced.matches || document.hidden || !visible || event.target.closest('button')) return;
    stopPreview();
    welcomed = true;
    const point = localPoint(event.clientX,event.clientY);
    const target = discover(point);
    if (target) reach(target);
    else attend(point);
  }, {passive:true});
  intro.addEventListener('pointerleave',() => { if (!focusedLink) rest(); });
  intro.addEventListener('focusin',event => {
    stopPreview();
    welcomed = true;
    const link = event.target.closest('a');
    if (!link) return;
    discover(null);
    focusedLink = link;
    if (!reduced.matches && visible && !document.hidden) guide(link);
  });
  intro.addEventListener('focusout',() => { focusedLink = null; rest(); });
  window.addEventListener('blur',() => rest(true));
  window.addEventListener('resize',() => rest(true),{passive:true});
  reduced.addEventListener('change',() => rest(true));
  finePointer.addEventListener('change',() => rest(true));
  document.addEventListener('visibilitychange',() => rest(true));
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) rest(true);
    else if (!welcomed && !reduced.matches && finePointer.matches && !document.hidden) {
      welcomed = true;
      previewTimer = setTimeout(preview,700);
    }
  }).observe(demo);

  draw();
  demo.classList.add('room-ready');
})();
