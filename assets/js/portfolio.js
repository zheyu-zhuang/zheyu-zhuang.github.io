(() => {
  const themeButtons = document.querySelectorAll('.theme-toggle,.room-lamp-control');
  function syncTheme() {
    const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    themeButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', `${button.matches('.room-lamp-control') ? 'Let the robot pull the lamp cord to switch to' : 'Switch to'} ${dark ? 'light' : 'dark'} theme`);
    });
    document.querySelector('[data-room-object=lamp]').dataset.lit = String(!dark);
    document.querySelector('#theme-color').content = dark ? '#172522' : '#faf7ef';
    document.querySelectorAll('img[data-theme-light]').forEach(img => {
      const source = dark ? img.dataset.themeDark : img.dataset.themeLight;
      // Keep unopened demo dialogs lazy when the colour theme changes.
      if (img.hasAttribute('data-src')) img.dataset.src = source;
      else if (img.getAttribute('src') !== source) img.src = source;
    });
  }
  function toggleTheme() {
    const dark = document.querySelector('.theme-toggle').getAttribute('aria-pressed') === 'true';
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', document.documentElement.dataset.theme); } catch (_) {}
    syncTheme();
  }
  themeButtons.forEach(button => button.addEventListener('click', () => {
    // The room's switch waits for the robot's physical pull. The navigation
    // switch and reduced-motion fallback stay immediate.
    if (button.matches('.room-lamp-control') && !document.dispatchEvent(new Event('room-lamp-pull', {cancelable:true}))) return;
    toggleTheme();
  }));
  document.addEventListener('room-lamp-toggle', toggleTheme);
  syncTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme);
  document.querySelectorAll('[aria-haspopup="dialog"]').forEach(button => {
    button.addEventListener('click', () => {
      const dialog = document.getElementById(button.getAttribute('aria-controls'));
      dialog.querySelectorAll('img[data-src]').forEach(img => { img.src = img.dataset.src; delete img.dataset.src; });
      dialog.showModal();
      document.dispatchEvent(new Event('media-dialog-change'));
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        dialog.querySelectorAll('video').forEach(video => { video.currentTime = 0; video.play().catch(() => {}); });
      }
      dialog.addEventListener('close', () => button.focus({preventScroll:true}), {once:true});
    });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) document.querySelectorAll('dialog video').forEach(video => video.pause());
  });
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('close', () => {
      dialog.querySelectorAll('video').forEach(video => video.pause());
      document.dispatchEvent(new Event('media-dialog-change'));
    });
    dialog.querySelector('.media-dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });
})();
