// Zoom through the exact crop coordinates from PALM's original figure.
(() => {
  const viewer = document.querySelector('[data-palm-zoom]');
  if (!viewer) return;
  const heading = viewer.querySelector('.palm-comparison-heading');
  const scenes = viewer.querySelector('.palm-scenes');
  const panels = [...viewer.querySelectorAll('[data-palm-crop]')].map(panel => {
    const [x,y,width,height,sceneWidth,sceneHeight] = panel.dataset.palmCrop.split(',').map(Number);
    return {image:panel.querySelector('img'),x,y,width,height,sceneWidth,sceneHeight};
  });
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0,Math.min(1,value));
  let enabled = false, frame = 0, start = 0, end = 0;

  function update() {
    frame = 0;
    // Follow the section's natural passage through the viewport, without a spacer or pin.
    const fraction = enabled ? clamp((start-scenes.getBoundingClientRect().top)/(start-end)) : 0;
    const zoom = fraction*fraction*(3-2*fraction);
    for (const panel of panels) {
      if (!enabled) { panel.image.style.removeProperty('transform'); continue; }
      const scaleX = 1+(panel.sceneWidth/panel.width-1)*zoom;
      const scaleY = 1+(panel.sceneHeight/panel.height-1)*zoom;
      const x = -panel.x/panel.width*100*zoom;
      const y = -panel.y/panel.height*100*zoom;
      panel.image.style.transform = `translate(${x.toFixed(5)}%,${y.toFixed(5)}%) scale(${scaleX.toFixed(5)},${scaleY.toFixed(5)})`;
    }
    const closeup = enabled && fraction >= .8;
    viewer.dataset.closeup = String(closeup);
    viewer.style.setProperty('--palm-zoom',zoom.toFixed(4));
    heading.textContent = closeup ? 'Similar views near the gripper' : 'Different settings';
  }

  function schedule() { if (!frame) frame = requestAnimationFrame(update); }

  function configure() {
    const top = Math.ceil(document.querySelector('.site-header').getBoundingClientRect().height)+16;
    const available = innerHeight-top-16;
    enabled = !motion.matches && innerHeight>=560;
    viewer.classList.toggle('is-zooming',enabled);
    if (viewer.getBoundingClientRect().height>available) {
      enabled = false;
      viewer.classList.remove('is-zooming');
    }
    // Keep the entire zoom in the reading area, before the images approach the header.
    start = innerHeight*.5;
    end = Math.max(top+24,innerHeight*.3);
    update();
  }

  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',configure);
  window.addEventListener('pageshow',configure);
  motion.addEventListener('change',configure);
  document.fonts.ready.then(configure);
  configure();
})();
