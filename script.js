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

// Busuanzi aggregates page views for the hosted domain. Keep the last confirmed
// total when the service is slow; local previews never contact the counter.
(() => {
  const counter = document.querySelector('.site-views');
  if (!counter || counter.dataset.initialized) return;
  counter.dataset.initialized = 'true';
  const value = counter.querySelector('#busuanzi_value_site_pv');
  const status = counter.querySelector('.views-status');
  if (!value || !status) return;
  const hostname = location.hostname;
  const preview = !['http:', 'https:'].includes(location.protocol)
    || hostname === 'localhost' || hostname.endsWith('.localhost')
    || /^127\./.test(hostname) || ['::1', '[::1]'].includes(hostname);
  if (preview) {
    value.textContent = 'Local preview';
    counter.dataset.state = 'preview';
    counter.title = 'Visits are counted on the published website only.';
    return;
  }

  const storageKey = `shuo-site-views:${hostname}`;
  const description = 'Total page views across this site, including repeat visits.';
  const number = input => {
    if (typeof input !== 'number' && !(typeof input === 'string' && /^\d+$/.test(input))) return null;
    const result = Number(input);
    return Number.isSafeInteger(result) && result >= 0 ? result : null;
  };
  let lastKnown = null;
  let pending = false;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && number(saved.total) !== null && Number.isFinite(saved.updated) && saved.updated > 0) {
      lastKnown = { total: number(saved.total), updated: saved.updated };
    }
  } catch (_) { /* A blocked or damaged cache must not prevent a live request. */ }

  function showLastKnown() {
    value.textContent = lastKnown.total.toLocaleString('en-US');
    counter.title = `${description} Last confirmed: ${new Date(lastKnown.updated).toLocaleString()}.`;
  }

  function unavailable(offline = false) {
    counter.dataset.state = offline ? 'offline' : 'unavailable';
    counter.setAttribute('aria-busy', 'false');
    if (lastKnown) {
      showLastKnown();
      status.textContent = ' · Last known';
    } else {
      value.textContent = offline ? 'Offline' : 'Unavailable';
      status.textContent = '';
      counter.title = 'The visit counter is temporarily unavailable.';
    }
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'views-retry';
    retry.textContent = 'Retry';
    retry.setAttribute('aria-label', 'Retry loading total views');
    retry.addEventListener('click', refresh);
    status.append(' · ', retry);
  }

  function refresh() {
    if (pending) return;
    if (navigator.onLine === false) {
      unavailable(true);
      return;
    }
    pending = true;
    counter.dataset.state = 'loading';
    counter.setAttribute('aria-busy', 'true');
    status.textContent = lastKnown ? ' · Updating…' : '';
    if (lastKnown) showLastKnown();
    else value.textContent = 'Loading…';

    // Use the same endpoint and referrer policy as the provider's official
    // library, with one request instead of loading another remote script first.
    const callback = `ShuoViews_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    script.src = `https://busuanzi.ibruce.info/busuanzi?jsonpCallback=${callback}`;
    script.referrerPolicy = 'no-referrer-when-downgrade';
    script.async = true;
    let finished = false;
    const timer = setTimeout(() => finish(null), 10000);

    function finish(total) {
      if (finished) return;
      finished = true;
      pending = false;
      clearTimeout(timer);
      script.remove();
      if (total === null) {
        // A late JSONP reply must not replace the result of a newer attempt.
        window[callback] = () => {};
        setTimeout(() => { delete window[callback]; }, 60000);
        unavailable(navigator.onLine === false);
        return;
      }
      delete window[callback];
      lastKnown = { total, updated: Date.now() };
      try { localStorage.setItem(storageKey, JSON.stringify(lastKnown)); } catch (_) {}
      showLastKnown();
      status.textContent = '';
      counter.dataset.state = 'fresh';
      counter.setAttribute('aria-busy', 'false');
    }

    window[callback] = response => finish(number(response?.site_pv));
    script.onerror = () => finish(null);
    script.onload = () => { if (!finished) finish(null); };
    document.head.append(script);
  }

  // Do not automatically repeat timed-out requests: the service might already
  // have counted them. Reconnect automatically only after an offline failure.
  window.addEventListener('online', () => {
    if (counter.dataset.state === 'offline') refresh();
  });
  refresh();
})();
