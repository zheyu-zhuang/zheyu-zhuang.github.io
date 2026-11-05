// Figures move on a slightly slower plane than the text; content stays visible.
(() => {
  const desktop = matchMedia('(min-width:1101px) and (hover:hover) and (pointer:fine)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const layers = [...document.querySelectorAll('.about-play, .study-media:not(.palm-comparison), .related-preview')].map(element => {
    element.classList.add('scroll-layer');
    return { element, shift: 0, depth: element.matches('.study-media') ? 22 : 12 };
  });

  const headings = [...document.querySelectorAll('.research-opening, .study-heading, .mentoring > h2, .outside-intro, .contact > h2')];
  const seen = new Set();
  const animations = new Set();
  let observer;
  let frame = 0;

  function updateLayers() {
    frame = 0;
    if (motion.matches || !desktop.matches) return;
    const scale = innerWidth <= 700 ? .55 : 1;
    // Read all geometry before writing styles; subtract our own offset to avoid feedback.
    const shifts = layers.map(layer => {
      const box = layer.element.getBoundingClientRect();
      const centre = box.top - layer.shift + box.height / 2;
      const position = (centre - innerHeight / 2) / ((innerHeight + box.height) / 2);
      return -Math.max(-1, Math.min(1, position)) * layer.depth * scale;
    });
    layers.forEach((layer, index) => {
      layer.shift = shifts[index];
      layer.element.style.setProperty('--scroll-shift', `${layer.shift.toFixed(2)}px`);
    });
  }
  function schedule() {
    if (desktop.matches && !motion.matches && !frame && !document.hidden) frame = requestAnimationFrame(updateLayers);
  }
  function configure() {
    observer?.disconnect();
    animations.forEach(animation => animation.cancel());
    animations.clear();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (motion.matches || !desktop.matches) {
      layers.forEach(layer => {
        layer.shift = 0;
        layer.element.style.removeProperty('--scroll-shift');
      });
      return;
    }
    schedule();
    if (!('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(entries => {
      if (motion.matches || !desktop.matches) return;
      entries.forEach(({ target, isIntersecting, boundingClientRect }) => {
        if (!isIntersecting || seen.has(target)) return;
        seen.add(target);
        observer.unobserve(target);
        // Anchor jumps and restored positions should settle immediately.
        if (boundingClientRect.top < 128 || typeof target.animate !== 'function') return;
        const animation = target.animate([
          { opacity: .65, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 450, easing: 'cubic-bezier(.2,.7,.2,1)' });
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      });
    }, { threshold: .15, rootMargin: '0px 0px -10% 0px' });
    headings.forEach(heading => {
      if (heading.getBoundingClientRect().top < innerHeight * .9) seen.add(heading);
      if (!seen.has(heading)) observer.observe(heading);
    });
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', schedule);
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
  motion.addEventListener('change', configure);
  desktop.addEventListener('change', configure);
  configure();
})();
