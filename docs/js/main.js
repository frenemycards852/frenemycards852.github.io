// App startup: load language, wire the language toggle, start the router.

import { initI18n, setLang, getLang, applyI18n, t, LANGS } from './i18n.js';
import { initRouter, render } from './router.js';

function refreshChrome() {
  applyI18n(document);
  document.title = t('app.name');
}

// Fade out the splash once the first view is on screen (or startup failed).
function hideSplash() {
  requestAnimationFrame(() => document.getElementById('splash')?.classList.add('done'));
}

// The header turns to frosted glass once the page scrolls.
function watchScroll() {
  const update = () => document.documentElement.classList.toggle('scrolled', window.scrollY > 4);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Buttons: a ripple spreads from where the finger or mouse presses.
function watchRipples() {
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest?.('.btn');
    if (!btn || reducedMotion()) return;
    const r = btn.getBoundingClientRect();
    const dot = document.createElement('span');
    dot.className = 'ripple';
    dot.style.left = `${e.clientX - r.left}px`;
    dot.style.top = `${e.clientY - r.top}px`;
    dot.style.setProperty('--ripple-scale', ((Math.max(r.width, r.height) * 2.2) / 20).toFixed(1));
    dot.addEventListener('animationend', () => dot.remove());
    btn.append(dot);
  }, { passive: true });
}

async function start() {
  await initI18n();
  refreshChrome();
  initRouter();

  document.getElementById('lang-btn').addEventListener('click', async () => {
    const next = LANGS.find((code) => code !== getLang());
    await setLang(next);
    refreshChrome();
    render(); // redraw the current view (e.g. builder presets) in the new language
  });
}

watchScroll();
watchRipples();
start().catch((err) => console.error(err)).finally(hideSplash);
