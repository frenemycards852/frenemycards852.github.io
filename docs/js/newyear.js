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

// Adds the "new-year" class to <html> during the season (config.json → newYear.theme).
export async function applyNewYearTheme() {
  const [config, types] = await Promise.all([loadJSON('data/config.json'), loadJSON('data/types.json')]);
  const on = Boolean(config.newYear?.theme) && isNewYear(types);
  document.documentElement.classList.toggle('new-year', on);
  if (on && config.newYear.themeColor) {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', config.newYear.themeColor);
  }
}
