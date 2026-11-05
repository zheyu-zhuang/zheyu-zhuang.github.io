// Recorded comparisons share a video so their rollout timing stays synchronized.
(() => {
  document.querySelectorAll('[data-mirror-demo], [data-recorded-demo]').forEach(demo => {
    const name = demo.dataset.demoName || 'MirrorDuo animation';
    const video = demo.querySelector('video');
    const button = demo.querySelector('button');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false, choice = null;
    function sync() {
      const enabled = choice ?? !motion.matches;
      button.textContent = enabled ? 'Pause animation' : 'Play animation';
      button.setAttribute('aria-label', `${enabled ? 'Pause' : 'Play'} ${name}`);
      if (enabled && visible && !document.hidden && !document.querySelector('dialog[open]')) {
        video.play().catch(error => {
          if (error.name === 'AbortError') return;
          if (video.paused && visible && !document.hidden && !document.querySelector('dialog[open]')) {
            choice = false;
            button.textContent = 'Play animation';
            button.setAttribute('aria-label', `Play ${name}`);
          }
        });
      } else video.pause();
    }
    button.addEventListener('click', () => {
      choice = !(choice ?? !motion.matches);
      sync();
    });
    motion.addEventListener('change', () => { choice = null; sync(); });
    document.addEventListener('visibilitychange', sync);
    document.addEventListener('media-dialog-change', sync);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        sync();
      }, {threshold: .2}).observe(demo);
    } else visible = true;
    button.hidden = false;
    sync();
  });
})();
