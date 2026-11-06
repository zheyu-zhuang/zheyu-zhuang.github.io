// Pin the existing layout until the four visual stages have completed.
(() => {
  const viewer = document.querySelector('[data-seeker-scroll]');
  if (!viewer) return;
  const track = viewer.closest('.seeker-pin-track');
  const layout = track.querySelector('.seeker-pin-layout');
  const visualTrack = viewer.closest('.seeker-view-track');
  const scenes = [...viewer.querySelectorAll('.seeker-scene')];
  const choices = [...document.querySelectorAll('[data-seeker-case]')];
  const video = viewer.querySelector('video');
  const button = viewer.querySelector('.seeker-play');
  const cloud = viewer.querySelector('.seeker-cloud-frame');
  const cloudBefore = cloud.querySelector('.seeker-cloud-before');
  const cloudAfter = cloud.querySelector('.seeker-cloud-after');
  const cloudLabel = viewer.querySelector('.seeker-cloud-label');
  const cloudReplay = viewer.querySelector('.seeker-cloud-replay');
  const desktop = matchMedia('(min-width:1101px) and (hover:hover) and (pointer:fine)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, current = -1, manual = 0, top = 96, travel = 1, anchor = track;
  let enabled = false, playChoice = null, pending = false;
  let cloudFrame = 0, cloudRun = 0, cloudProgress = 0;
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => { const t = clamp(value); return t*t*(3-2*t); };

  function renderCloud(progress) {
    cloudProgress = progress;
    const fade = ease((progress-.18)/.30);
    const zoom = ease((progress-.35)/.65);
    // The paper assets were independently trimmed and padded to 320px. These
    // ratios map Im9's retained points back into Im10's original workspace:
    // crops (293,242,107,132) and (96,32,399,352), with 30px x / 19px y padding.
    // Apply one camera transform to both layers so retained points stay aligned.
    const sx = .3313302561422862, sy = .33046875;
    const tx = 46.26721243262597, ty = 58.512073863636374;
    const scaleX = 1+(1/sx-1)*zoom, scaleY = 1+(1/sy-1)*zoom;
    const x = -tx/sx*zoom, y = -ty/sy*zoom;
    cloudBefore.style.transform = `translate(${x}%,${y}%) scale(${scaleX},${scaleY})`;
    cloudAfter.style.transform = `translate(${tx*scaleX+x}%,${ty*scaleY+y}%) scale(${sx*scaleX},${sy*scaleY})`;
    cloudBefore.style.opacity = String(1-fade);
    cloudAfter.style.opacity = String(fade);
    cloudLabel.textContent = fade<.5 ? 'Before filtering · workspace crop' : 'Retained points · enlarged';
    cloudReplay.textContent = motion.matches ? (progress ? 'Show before' : 'Show after') : 'Replay zoom';
    cloudReplay.setAttribute('aria-label', motion.matches ? `Show the point cloud ${progress ? 'before' : 'after'} filtering` : 'Replay the 3D filtering zoom');
    viewer.dataset.cloudProgress = progress.toFixed(4);
  }
  function stopCloud() {
    cloudRun++;
    cancelAnimationFrame(cloudFrame);
    cloudFrame = 0;
    cloud.classList.remove('is-animating');
  }
  async function playCloud() {
    stopCloud();
    if (motion.matches) { renderCloud(1); return; }
    const run = cloudRun;
    renderCloud(0);
    // Wait for both source images before starting the crossfade.
    await Promise.all([cloudBefore.decode(),cloudAfter.decode()]).catch(() => {});
    if (run !== cloudRun || enabled || current<2 || document.hidden) return;
    cloud.classList.add('is-animating');
    let start;
    const animate = time => {
      start ??= time;
      const progress = clamp((time-start)/2200);
      renderCloud(progress);
      if (progress<1) cloudFrame = requestAnimationFrame(animate);
      else { cloudFrame = 0; cloud.classList.remove('is-animating'); }
    };
    cloudFrame = requestAnimationFrame(animate);
  }
  function select(index) {
    if (index === current) return;
    current = index;
    viewer.dataset.scene = index;
    scenes.forEach((scene, i) => {
      const active = i === Math.min(index,2);
      scene.classList.toggle('is-active', active);
      scene.setAttribute('aria-hidden', String(!active));
      scene.inert = !active;
    });
    choices.forEach(choice => choice.setAttribute('aria-pressed', String(Number(choice.dataset.seekerCase) === (index>=2 ? 3 : index))));
  }
  function playback(visible) {
    if (!visible || !(playChoice ?? !motion.matches) || document.hidden || document.querySelector('dialog[open]')) video.pause();
    else if (video.paused && !pending) {
      pending = true;
      video.play().catch(() => {}).finally(() => { pending = false; });
    }
  }
  function update() {
    frame = 0;
    const progress = enabled ? clamp((top - anchor.getBoundingClientRect().top) / travel) : 0;
    const index = enabled ? (progress < .30 ? 0 : progress < .55 ? 1 : progress < .75 ? 2 : 3) : manual;
    const previous = current;
    select(index);
    if (enabled) {
      stopCloud();
      renderCloud(clamp((progress-.62)/.32));
    } else if (index<2) {
      stopCloud();
      renderCloud(0);
    } else if (previous<2) playCloud();
    const box = viewer.getBoundingClientRect();
    playback(index === 0 && box.bottom > top && box.top < innerHeight);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  function configure() {
    delete track.dataset.pin;
    track.style.removeProperty('--pin-height');
    top = Math.ceil(document.querySelector('.site-header').getBoundingClientRect().height) + 16;
    const available = innerHeight - top - 16;
    const layoutHeight = layout.getBoundingClientRect().height;
    const viewerHeight = viewer.getBoundingClientRect().height;
    enabled = desktop.matches && !motion.matches && innerHeight >= 560 && viewerHeight <= available;
    button.hidden = false;
    cloudReplay.hidden = enabled;
    if (motion.matches) { stopCloud(); renderCloud(1); }
    if (enabled) {
      const wholeBlock = innerWidth > 800 && layoutHeight <= available;
      anchor = wholeBlock ? track : visualTrack;
      const height = wholeBlock ? layoutHeight : viewerHeight;
      // Enough travel for each use, rather than rushing through in one wheel gesture.
      travel = Math.max(1800, innerHeight * 2.6);
      track.style.setProperty('--pin-top', `${top}px`);
      track.style.setProperty('--pin-height', `${height + travel}px`);
      track.dataset.pin = wholeBlock ? 'block' : 'visual';
    }
    update();
  }
  choices.forEach(choice => choice.addEventListener('click', () => {
    manual = Number(choice.dataset.seekerCase);
    if (enabled) {
      const position = [0.10, 0.42, 0.64, 0.95][manual];
      const start = anchor.getBoundingClientRect().top + scrollY - top;
      window.scrollTo({top:start + travel * position, behavior:'smooth'});
    } else {
      const replay = current>=2 && manual>=2;
      update();
      if (replay) playCloud();
    }
  }));
  cloudReplay.addEventListener('click',() => {
    if (motion.matches) renderCloud(cloudProgress ? 0 : 1);
    else playCloud();
  });
  button.addEventListener('click', () => {
    playChoice = video.paused;
    if (!playChoice) video.pause(); else playback(true);
  });
  const label = () => { button.textContent = video.paused ? 'Play animation' : 'Pause animation'; };
  video.addEventListener('play', label);
  video.addEventListener('pause', label);
  motion.addEventListener('change', configure);
  desktop.addEventListener('change', configure);
  document.addEventListener('media-dialog-change', schedule);
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', configure);
  window.addEventListener('pageshow', configure);
  document.addEventListener('visibilitychange',() => {
    if (document.hidden) {
      stopCloud();
      if (!enabled && current>=2) renderCloud(1);
    }
    schedule();
  });
  document.fonts.ready.then(configure);
  configure();
})();
