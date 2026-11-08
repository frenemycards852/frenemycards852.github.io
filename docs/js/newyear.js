// New Year season: zodiac characters in the builder and the festive theme.
// Open between types.json → zodiac.from / to (local dates).

import { isZodiacOpen } from './card.js';
import { loadJSON } from './data.js';

// Testing only: on a local test server (this computer or the home Wi-Fi), adding ?newyear
// to the address opens the New Year season on any date. Has no effect on the real site.
function isTestServer() {
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.localhost')
    || /^192\.168\./.test(h) || /^10\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
}

export function isNewYear(types) {
  try {
    if (isTestServer() && new URLSearchParams(location.search).has('newyear')) return true;
  } catch { /* ignore */ }
  return isZodiacOpen(types);
}

// Decoration pictures (drawn inline, no image files).
const SVG = {
  lantern: `<svg viewBox="0 0 40 112" width="30" height="84"><line x1="20" y1="0" x2="20" y2="44" stroke="#7a1a10" stroke-width="1.5"/><rect x="13" y="42" width="14" height="6" rx="1.5" fill="#ffc93c" stroke="#5a1410" stroke-width="1.5"/><ellipse cx="20" cy="66" rx="18" ry="19" fill="#e0261c" stroke="#5a1410" stroke-width="2"/><path d="M20 47Q6 66 20 85M20 47Q34 66 20 85" fill="none" stroke="#a3140e" stroke-width="1.5"/><ellipse cx="13" cy="60" rx="4" ry="7" fill="#ff7a5c" opacity=".6"/><rect x="13" y="84" width="14" height="6" rx="1.5" fill="#ffc93c" stroke="#5a1410" stroke-width="1.5"/><path d="M16.5 90h7l1.5 20h-10z" fill="#ffc93c" stroke="#5a1410" stroke-width="1.2"/></svg>`,
  petal: `<svg viewBox="-12 -12 24 24" width="24" height="24"><g fill="#ffb3c7" stroke="#e5708f" stroke-width="1">${[0, 72, 144, 216, 288].map((a) => `<circle r="5" cx="${(5.5 * Math.sin((a * Math.PI) / 180)).toFixed(2)}" cy="${(-5.5 * Math.cos((a * Math.PI) / 180)).toFixed(2)}"/>`).join('')}</g><circle r="2.6" fill="#ffd45a"/></svg>`,
  cracker: `<svg viewBox="0 0 16 42" width="16" height="42"><path d="M8 7q3-3 0-5.5" fill="none" stroke="#5a1410" stroke-width="1.5"/><circle cx="8" cy="1.8" r="1.8" fill="#ffd45a"/><rect x="2" y="7" width="12" height="32" rx="3" fill="#e0261c" stroke="#5a1410" stroke-width="1.5"/><rect x="2.8" y="11" width="10.4" height="3.5" fill="#ffc93c"/><rect x="2.8" y="31" width="10.4" height="3.5" fill="#ffc93c"/><rect x="4.5" y="9" width="2.5" height="28" rx="1.2" fill="#ff7a5c" opacity=".55"/></svg>`,
};

const rand = (min, max) => min + Math.random() * (max - min);

// Hanging lanterns plus falling blossoms and firecrackers, behind all content (taps pass through).
function addDecor({ petals = 0, firecrackers = 0 }) {
  if (document.querySelector('.ny-decor')) return;
  const layer = document.createElement('div');
  layer.className = 'ny-decor';
  layer.setAttribute('aria-hidden', 'true');
  for (const side of ['left', 'right']) {
    const lantern = document.createElement('span');
    lantern.className = `ny-lantern ${side}`;
    lantern.innerHTML = SVG.lantern;
    layer.append(lantern);
  }
  const fall = (kind, count, [dMin, dMax], [sMin, sMax]) => {
    for (let i = 0; i < count; i++) {
      const item = document.createElement('span');
      item.className = `ny-fall ${kind}`;
      const d = rand(dMin, dMax);
      // Spread across the width; a negative delay means the first frame is already full.
      item.style.cssText = `--x:${((i + Math.random()) / count) * 100}%;--y:${rand(5, 90)}%;--d:${d.toFixed(1)}s;--delay:${(-rand(0, d)).toFixed(1)}s;--size:${rand(sMin, sMax).toFixed(2)};--spin:${Math.random() < 0.5 ? '-' : ''}${Math.round(rand(180, 540))}deg`;
      const sway = document.createElement('span');
      sway.className = 'ny-sway';
      sway.style.animationDelay = `${(-rand(0, 3)).toFixed(1)}s`;
      sway.innerHTML = SVG[kind];
      item.append(sway);
      layer.append(item);
    }
  };
  fall('petal', petals, [10, 16], [0.6, 1]);
  fall('cracker', firecrackers, [7, 11], [0.7, 1]);
  document.body.prepend(layer);
}

// Adds the "new-year" class to <html> during the season (config.json → newYear.theme).
export async function applyNewYearTheme() {
  const [config, types] = await Promise.all([loadJSON('data/config.json'), loadJSON('data/types.json')]);
  const on = Boolean(config.newYear?.theme) && isNewYear(types);
  document.documentElement.classList.toggle('new-year', on);
  if (!on) return;
  if (config.newYear.themeColor) {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', config.newYear.themeColor);
  }
  addDecor(config.newYear.decor ?? {});
}
