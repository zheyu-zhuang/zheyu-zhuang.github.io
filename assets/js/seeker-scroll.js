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
  const desktop = matchMedia('(min-width:1101px) and (hover:hover) and (pointer:fine)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, current = -1, manual = 0, top = 96, travel = 1, anchor = track;
  let enabled = false, playChoice = null, pending = false;
  const clamp = value => Math.max(0, Math.min(1, value));
  function select(index) {
    if (index === current) return;
    current = index;
    viewer.dataset.scene = index;
    scenes.forEach((scene, i) => {
      scene.classList.toggle('is-active', i === index);
      scene.setAttribute('aria-hidden', String(i !== index));
      scene.inert = i !== index;
    });
    choices.forEach(choice => choice.setAttribute('aria-pressed', String(Number(choice.dataset.seekerCase) === (index === 2 && choice.closest('.application-picker') ? 3 : index))));
  }
  function playback(visible) {
    if (!visible || !(playChoice ?? (!motion.matches && desktop.matches)) || document.hidden || document.querySelector('dialog[open]')) video.pause();
    else if (video.paused && !pending) {
      pending = true;
      video.play().catch(() => {}).finally(() => { pending = false; });
    }
  }
  function update() {
    frame = 0;
    const progress = enabled ? clamp((top - anchor.getBoundingClientRect().top) / travel) : 0;
    const index = enabled ? (progress < .30 ? 0 : progress < .55 ? 1 : progress < .75 ? 2 : 3) : manual;
    select(index);
    // Finish the zoom before the pin ends, leaving a short hold on the result.
    const zoom = enabled ? clamp((progress - .75) / .19) : 1;
    viewer.style.setProperty('--cloud-scale', (.6 + .4 * zoom * zoom * (3 - 2 * zoom)).toFixed(4));
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
    } else update();
  }));
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
  document.addEventListener('visibilitychange', schedule);
  document.fonts.ready.then(configure);
  configure();
})();
