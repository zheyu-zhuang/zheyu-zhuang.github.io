// Decorative reaching poses follow the outdoor section through the viewport.
(() => {
  const decoration = document.querySelector('.grip-decoration');
  if (!decoration) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const holds = [{x:86,y:84}, {x:185,y:42}, {x:274,y:100}];
  const parts = parent => Object.fromEntries([...parent.querySelectorAll('[data-part]')].map(el => [el.dataset.part, el]));
  const h = parts(decoration.querySelector('[data-body="climber"]'));
  const r = parts(decoration.querySelector('[data-body="robot"]'));
  const point = (x, y) => ({x, y});
  const mix = (a, b, t) => a + (b - a) * t;
  const path = (...points) => points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  const circle = (el, p) => { el.setAttribute('cx', p.x); el.setAttribute('cy', p.y); };
  function joint(start, end, upper, lower, bend) {
    const dx = end.x - start.x, dy = end.y - start.y;
    const distance = Math.min(upper + lower - .01, Math.max(Math.abs(upper - lower) + .01, Math.hypot(dx, dy)));
    const angle = Math.atan2(dy, dx) + bend * Math.acos(Math.max(-1, Math.min(1, (upper * upper + distance * distance - lower * lower) / (2 * upper * distance))));
    return point(start.x + upper * Math.cos(angle), start.y + upper * Math.sin(angle));
  }

  function draw(target, openness = 0) {
    const lean = (target.x - 180) * .12;
    const lift = (100 - target.y) * .08;
    const shoulder = point(180 + lean, 131 - lift);
    const hip = point(178 + lean * .6, 190 - lift);
    const leftShoulder = point(shoulder.x - 10, shoulder.y);
    const rightShoulder = point(shoulder.x + 10, shoulder.y);
    // Keep the other hand on a hold while moving the reaching hand.
    const anchor = point(86, 84);
    const leftHip = point(hip.x - 8, hip.y), rightHip = point(hip.x + 8, hip.y);
    const leftFoot = point(130, 252), rightFoot = point(229, 251);
    h['left-arm'].setAttribute('d', path(leftShoulder, joint(leftShoulder, anchor, 58, 58, -1), anchor));
    h['right-arm'].setAttribute('d', path(rightShoulder, joint(rightShoulder, target, 58, 58, 1), target));
    h['left-leg'].setAttribute('d', path(leftHip, joint(leftHip, leftFoot, 49, 49, 1), leftFoot));
    h['right-leg'].setAttribute('d', path(rightHip, joint(rightHip, rightFoot, 49, 49, -1), rightFoot));
    h.torso.setAttribute('d', path(shoulder, hip));
    h.harness.setAttribute('d', path(point(hip.x - 15, hip.y), point(hip.x + 15, hip.y)));
    circle(h.head, point(shoulder.x - 2, shoulder.y - 27));
    circle(h['left-hand'], anchor);
    circle(h['right-hand'], target);

    const base = point(176, 228), wrist = point(target.x, target.y + 24);
    const elbow = joint(base, wrist, 108, 102, -1);
    const arm = path(base, elbow, wrist);
    r.arm.setAttribute('d', arm);
    r.inlay.setAttribute('d', arm);
    circle(r.elbow, elbow);
    const gap = 19 + openness * 7;
    r.gripper.setAttribute('d', `M${target.x - gap} ${target.y}v24h${gap * 2}V${target.y}M${target.x - gap} ${target.y}h7M${target.x + gap} ${target.y}h-7`);
  }

  let frame = 0;
  let previous = -1;
  function update() {
    frame = 0;
    const box = decoration.getBoundingClientRect();
    const progress = motion.matches ? .5 : Math.max(0, Math.min(1, (innerHeight - box.top) / (innerHeight + box.height)));
    if (progress === previous) return;
    previous = progress;
    const segment = Math.min(1, Math.floor(progress * 2));
    const t = progress * 2 - segment;
    const eased = t * t * (3 - 2 * t);
    const start = holds[segment], end = holds[segment + 1];
    draw(point(mix(start.x, end.x, eased), mix(start.y, end.y, eased) - 10 * Math.sin(Math.PI * eased)), motion.matches ? 0 : Math.sin(Math.PI * t));
  }
  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  motion.addEventListener('change', () => { previous = -1; schedule(); });
  document.addEventListener('visibilitychange', schedule);
  document.fonts.ready.then(schedule);
  update();
})();
