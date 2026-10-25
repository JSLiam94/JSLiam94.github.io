'use strict';
const filters = document.querySelectorAll('[data-filter]');
// Fetch only the next small batch; filters have independent batches.
const list = document.querySelector('.publication-list');
const moreButton = document.getElementById('show-more');
let manifestPromise;
let activeFilter = 'All';
let nextBatch = 1;
let busy = false;
async function loadPublications(filter, reset = false) {
  if (busy) return;
  busy = true;
  moreButton.disabled = true;
  filters.forEach(b => b.disabled = true);
  const status = document.getElementById('load-status');
  status.textContent = 'Loading…';
  try {
    manifestPromise ||= fetch('publication-data/manifest.json').then(r => { if (!r.ok) throw Error('Manifest unavailable'); return r.json(); });
    const manifest = await manifestPromise;
    const batch = reset ? 0 : nextBatch;
    const response = await fetch(manifest[filter].chunks[batch]);
    if (!response.ok) throw Error('Batch unavailable');
    const content = await response.text();
    if (reset) list.innerHTML = '';
    list.insertAdjacentHTML('beforeend', content);
    const authorNote = document.querySelector('.first-author-note');
    if (authorNote) authorNote.hidden = filter !== 'First Author';
    activeFilter = filter;
    nextBatch = batch + 1;
    filters.forEach(b => {const active = b.dataset.filter === filter; b.classList.toggle('selected',active); b.setAttribute('aria-pressed',String(active));});
    const count = list.querySelectorAll('.publication').length;
    document.getElementById('publication-count').textContent = `Showing ${count} of ${manifest[filter].count} publications`;
    moreButton.hidden = nextBatch >= manifest[filter].chunks.length;
    status.textContent = '';
    updateReadingProgress();
  } catch (_) {
    manifestPromise = undefined;
    status.textContent = 'Unable to load. Please try again.';
  } finally {
    busy = false;
    moreButton.disabled = false;
    filters.forEach(b => b.disabled = false);
  }
}
if (list && moreButton) {
  moreButton.addEventListener('click', () => loadPublications(activeFilter));
  filters.forEach(b => b.addEventListener('click', () => loadPublications(b.dataset.filter, true)));
}
const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...document.querySelectorAll('nav a')];
function updateNavigation() {
  if (!sections.length) return;
  let current = sections[0].id;
  for (const section of sections) if (section.getBoundingClientRect().top <= 180) current = section.id;
  navLinks.forEach(link => {
    const active = link.hash === '#' + current && (document.body.dataset.page !== 'publications' || link.getAttribute('href').startsWith('#'));
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
let scheduled = false;
window.addEventListener('scroll', () => {
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(() => { updateNavigation(); scheduled = false; });
  }
}, { passive: true });
updateNavigation();

// Remember the user's chosen theme; storage can be unavailable in private browsing.
const themeButton = document.querySelector('.theme-toggle');
function updateThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const label = `Switch to ${dark ? 'light' : 'dark'} mode`;
  themeButton.setAttribute('aria-label', label);
  themeButton.setAttribute('title', label);
}
if (themeButton) {
  themeButton.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('shuo-theme', theme); } catch (_) { /* Keep the in-page choice. */ }
    updateThemeButton();
  });
  updateThemeButton();
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
if (!reducedMotion.matches && 'IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.addEventListener('animationend', () => entry.target.classList.remove('reveal-enter'), { once: true });
        entry.target.classList.add('reveal-enter');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.06 });
  document.querySelectorAll('.profile, .about, .updates, .section-heading, .project, .contact').forEach((item, index) => {
    // The first two regions enter in sequence; scrolling regions enter immediately.
    if (index < 2) item.style.setProperty('--reveal-delay', `${index * 100}ms`);
    revealObserver.observe(item);
  });
}
const progressBar = document.querySelector('.reading-progress span');
const header = document.querySelector('.header');
function updateReadingProgress() {
  const extent = document.documentElement.scrollHeight - innerHeight;
  const progress = extent > 0 ? Math.min(1, Math.max(0, scrollY / extent)) : 0;
  if (progressBar) progressBar.style.transform = `scaleX(${progress})`;
  header.classList.toggle('is-scrolled', scrollY > 20);
}
let progressScheduled = false;
window.addEventListener('scroll', () => {
  if (!progressScheduled) {
    progressScheduled = true;
    requestAnimationFrame(() => { updateReadingProgress(); progressScheduled = false; });
  }
}, { passive: true });
window.addEventListener('resize', updateReadingProgress);
window.addEventListener('load', updateReadingProgress);
updateReadingProgress();

// Native dialog supplies keyboard focus management and Escape-to-close behavior.
const figureViewer = document.getElementById('figure-viewer');
if (figureViewer && typeof figureViewer.showModal === 'function') {
  document.addEventListener('click', event => {
    const link = event.target.closest('.project-figure, .pub-figure');
    if (!link) return;
    event.preventDefault();
    const source = link.querySelector('img');
    const image = figureViewer.querySelector('img');
    image.src = source.src;
    image.alt = source.alt;
    document.getElementById('figure-title').textContent = `${link.closest('.project, .publication').querySelector('h3').textContent} · Research framework`;
    figureViewer.showModal();
    document.body.classList.add('figure-open');
  });
  figureViewer.querySelector('.figure-close').addEventListener('click', () => figureViewer.close());
  figureViewer.addEventListener('close', () => document.body.classList.remove('figure-open'));
  figureViewer.addEventListener('click', event => {
    if (event.target !== figureViewer) return;
    const box = figureViewer.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) figureViewer.close();
  });
}

const wechatViewer = document.getElementById('wechat-viewer');
if (wechatViewer) {
  document.querySelectorAll('.wechat-link').forEach(button => button.addEventListener('click', () => {
    const image = wechatViewer.querySelector('img');
    image.src = image.dataset.src;
    wechatViewer.showModal();
    document.body.classList.add('figure-open');
  }));
  wechatViewer.querySelector('.wechat-close').addEventListener('click', () => wechatViewer.close());
  wechatViewer.addEventListener('close', () => document.body.classList.remove('figure-open'));
  wechatViewer.addEventListener('click', event => {
    if (event.target !== wechatViewer) return;
    const b = wechatViewer.getBoundingClientRect();
    if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) wechatViewer.close();
  });
}

// Citation totals are rendered from the manually maintained data/scholar.json at build time.
// Discard cached values from the retired automatic updater.
try { localStorage.removeItem('shuo-scholar'); } catch (_) {}

// GoatCounter records new views; the verified historical baseline is rendered
// into each footer at build time. Refreshing the number never records a new view.
(() => {
  const counter = document.querySelector('.site-views');
  if (!counter || counter.dataset.initialized) return;
  counter.dataset.initialized = 'true';
  const value = counter.querySelector('#site-views-count');
  const status = counter.querySelector('.views-status');
  if (!value || !status) return;
  const hostname = location.hostname;
  const preview = !['http:', 'https:'].includes(location.protocol)
    || hostname === 'localhost' || hostname.endsWith('.localhost')
    || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)
    || ['::1', '[::1]', '0.0.0.0'].includes(hostname);
  if (preview) {
    value.textContent = 'Local preview';
    status.textContent = '';
    counter.dataset.state = 'preview';
    counter.title = 'Visits are counted on the published website only.';
    return;
  }

  const endpoint = 'https://jsliam94.goatcounter.com';
  const history = Number(counter.dataset.historyTotal);
  if (!Number.isSafeInteger(history) || history < 0) return;
  // A separate cache prevents adding the baseline to an old Busuanzi total.
  const storageKey = `shuo-site-views:goatcounter:${hostname}:history-${history}`;
  const description = `Includes ${history} historical views confirmed on 26 October 2026, plus new views recorded by GoatCounter. Public counts may be cached for up to four hours.`;
  const number = input => {
    if (typeof input === 'string') {
      // GoatCounter formats thousands according to the account's locale.
      if (!/^(?:\d+|\d{1,3}(?:[, .\u00a0\u202f]\d{3})+)$/.test(input)) return null;
      input = input.replace(/[, .\u00a0\u202f]/g, '');
    } else if (typeof input !== 'number') return null;
    const result = Number(input);
    return Number.isSafeInteger(result) && result >= 0 && Number.isSafeInteger(result + history) ? result : null;
  };
  let lastKnown = null;
  let pending = false;
  let trackerRequested = false;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && number(saved.newViews) !== null && Number.isFinite(saved.updated) && saved.updated > 0) {
      lastKnown = { newViews: number(saved.newViews), updated: saved.updated };
    }
  } catch (_) { /* Storage failures must not prevent a live request. */ }

  function showKnown() {
    value.textContent = lastKnown ? (history + lastKnown.newViews).toLocaleString('en-US') : `${history.toLocaleString('en-US')}+`;
    counter.title = description + (lastKnown ? ` Last retrieved: ${new Date(lastKnown.updated).toLocaleString()}.` : ' The new count has not yet been retrieved.');
  }

  function unavailable(offline = false, permission = false) {
    counter.dataset.state = offline ? 'offline' : 'unavailable';
    counter.setAttribute('aria-busy', 'false');
    showKnown();
    status.textContent = lastKnown ? ' · Last known' : ' · Historical baseline';
    if (permission) status.append(' · Enable public counter');
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'views-retry';
    retry.textContent = 'Retry';
    retry.setAttribute('aria-label', 'Refresh total views without recording another visit');
    retry.addEventListener('click', refresh);
    status.append(' · ', retry);
  }

  function startTracking() {
    if (trackerRequested) return;
    trackerRequested = true;
    const script = document.createElement('script');
    script.src = 'https://gc.zgo.at/count.js';
    script.async = true;
    script.dataset.goatcounter = `${endpoint}/count`;
    // Keep preview query strings out of the stats and disable click events.
    script.dataset.goatcounterSettings = JSON.stringify({ path: location.pathname || '/', no_events: true });
    document.head.append(script);
  }

  async function refresh() {
    if (pending) return;
    if (navigator.onLine === false) {
      unavailable(true);
      return;
    }
    pending = true;
    counter.dataset.state = 'loading';
    counter.setAttribute('aria-busy', 'true');
    showKnown();
    status.textContent = ' · Updating…';
    startTracking();
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 10000);
    try {
      const response = await fetch(`${endpoint}/counter/TOTAL.json`, {
        signal: controller.signal, credentials: 'omit'
      });
      if (!response.ok) {
        unavailable(false, response.status === 403);
        return;
      }
      const data = await response.json();
      const newViews = number(data?.count);
      if (timedOut || newViews === null) throw new Error('Invalid counter response');
      // A delayed upstream cache must not make the displayed total go backwards.
      lastKnown = { newViews: Math.max(newViews, lastKnown?.newViews ?? 0), updated: Date.now() };
      try { localStorage.setItem(storageKey, JSON.stringify(lastKnown)); } catch (_) {}
      showKnown();
      status.textContent = '';
      counter.dataset.state = 'fresh';
      counter.setAttribute('aria-busy', 'false');
    } catch (_) {
      unavailable(navigator.onLine === false);
    } finally {
      clearTimeout(timer);
      pending = false;
    }
  }

  window.addEventListener('online', () => {
    if (counter.dataset.state === 'offline') refresh();
  });
  refresh();
})();
