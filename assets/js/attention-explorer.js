// Loop the six recorded snapshots without generating intermediate frames.
(() => {
  const desktop = matchMedia('(min-width:1101px) and (hover:hover) and (pointer:fine)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-attention-demo]').forEach(demo => {
    const controls = demo.querySelector('.attention-controls');
    const button = controls.querySelector('button');
    const output = controls.querySelector('output');
    const count = Number(demo.style.getPropertyValue('--frame-count'));
    let index = 0, timer = 0, visible = false, choice = null;
    function render() {
      demo.style.setProperty('--frame-index', index);
      output.value = `${index + 1} / ${count}`;
    }
    function sync() {
      clearTimeout(timer);
      timer = 0;
      const enabled = choice ?? (!motion.matches && desktop.matches);
      button.textContent = enabled ? 'Pause animation' : 'Play animation';
      button.setAttribute('aria-label', `${enabled ? 'Pause' : 'Play'} FocusPool animation`);
      if (enabled && visible && !document.hidden) {
        timer = setTimeout(() => {
          index = (index + 1) % count;
          render();
          sync();
        }, 850);
      }
    }
    button.addEventListener('click', () => {
      choice = !(choice ?? (!motion.matches && desktop.matches));
      sync();
    });
    desktop.addEventListener('change', sync);
    motion.addEventListener('change', () => { choice = null; sync(); });
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        sync();
      }, {threshold: .2}).observe(demo);
    } else visible = true;
    render();
    controls.hidden = false;
    sync();
  });
})();
