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

// Busuanzi aggregates page views for the hosted domain. Local previews do not count.
(() => {
  const counter = document.querySelector('.site-views');
  if (!counter) return;
  const status = counter.querySelector('.views-status');
  if (['localhost', '127.0.0.1'].includes(location.hostname) || location.protocol === 'file:') {
    status.textContent = ' · Local preview';
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
  script.async = true;
  script.onerror = () => { status.textContent = ' · Temporarily unavailable'; };
  document.head.append(script);
})();
