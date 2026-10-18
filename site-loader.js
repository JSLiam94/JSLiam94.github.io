'use strict';
(() => {
  const root = document.documentElement;
  const screen = document.querySelector('.site-loader');
  const main = document.getElementById('main');
  if (!screen || !root.hasAttribute('data-loading')) return;
  const bar = screen.querySelector('[role="progressbar"]');
  const fill = screen.querySelector('.loader-fill');
  const skip = screen.querySelector('.loader-skip');
  let finished = false;
  main?.setAttribute('aria-busy', 'true');
  function enter() {
    if (finished) return;
    finished = true;
    clearTimeout(window.siteLoaderDeadline);
    root.dataset.loading = 'done';
    main?.removeAttribute('aria-busy');
    if (document.activeElement === skip) document.querySelector('.skip-link')?.focus();
    setTimeout(() => { root.removeAttribute('data-loading'); screen.remove(); }, 220);
  }
  skip.addEventListener('click', enter);
  const deadline = setTimeout(enter, 4000);
  // Reuse the exact image URLs used by the page and its figure previews.
  // Respect data-saving connections and avoid downloading the full publication archive.
  const connection = navigator.connection;
  const limited = connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '');
  const sources = limited ? ['assets/portrait.png'] : [
    'assets/portrait.png', 'assets/gleve.png', 'assets/erecu.png',
    'assets/copath.png', 'assets/featproto.png', 'assets/nomodality.png'
  ];
  let completed = 0;
  let next = 0;
  async function worker() {
    while (next < sources.length && !finished) {
      const src = sources[next++];
      try {
        const image = new Image();
        image.decoding = 'async';
        await new Promise(resolve => {
          image.onload = image.onerror = resolve;
          image.src = src;
        });
        if (image.naturalWidth && image.decode) await image.decode();
      } catch (_) { /* A missing image must never block entry. */ }
      completed++;
      if (!finished) {
        const progress = Math.round(completed / sources.length * 100);
        fill.style.width = progress + '%';
        bar.setAttribute('aria-valuenow', String(progress));
      }
    }
  }
  Promise.all([worker(), worker(), worker(), document.fonts?.ready]).finally(() => {
    clearTimeout(deadline);
    enter();
  });
  window.addEventListener('pageshow', event => { if (event.persisted) enter(); });
})();
