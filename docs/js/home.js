// Home screen extras: "make a card" always starts fresh, and a fan of example cards
// (like a freshly opened pack) shows first-time visitors what this is.
// In the New Year season: a banner for the zodiac characters, and the fan shows them.

import { t, getLang } from './i18n.js';
import { loadJSON } from './data.js';
import { isNewYear } from './newyear.js';
import { renderCard, CARD_W, CARD_H } from './render-card.js';
import { startNewCard } from './builder.js';

// Fan cards are drawn once at full size, then copied down to this width (memory on phones).
const FAN_W = 432;

// "New Year specials are here!" banner above the buttons; tapping it starts a new card.
function showNewYearBanner(container, types, lang) {
  if (container.querySelector('.ny-banner')) return;
  let date = types.zodiac.to;
  try {
    const [y, m, d] = types.zodiac.to.split('-').map(Number);
    date = new Intl.DateTimeFormat(lang, { month: 'long', day: 'numeric' }).format(new Date(y, m - 1, d));
  } catch { /* keep the plain date */ }
  const banner = document.createElement('a');
  banner.className = 'ny-banner';
  banner.href = '#/make';
  const title = document.createElement('strong');
  title.textContent = t('home.newYearTitle');
  const text = document.createElement('span');
  text.textContent = t('home.newYearText', { date });
  banner.append(title, text);
  banner.addEventListener('click', () => startNewCard(''));
  const actions = container.querySelector('.actions');
  if (actions) actions.before(banner);
  else container.querySelector('.home')?.append(banner);
}

export async function mountHome(container) {
  container.querySelector('a[href="#/make"]')?.addEventListener('click', () => startNewCard(''));
  const box = container.querySelector('.home-fan');
  if (!box) return;
  const lang = getLang();
  try {
    const [config, types, skills, descriptions, sample] = await Promise.all([
      loadJSON('data/config.json'),
      loadJSON('data/types.json'),
      loadJSON(`data/skills/${lang}.json`),
      loadJSON(`data/descriptions/${lang}.json`),
      loadJSON('data/sample-card.json'),
    ]);
    const newYear = Boolean(config.newYear?.theme) && isNewYear(types);
    if (newYear) showNewYearBanner(container, types, lang);
    // New Year: each fan card wears a zodiac character (config.json → newYear.fan).
    const zodiacScene = (spot) => {
      const i = types.zodiac.items.findIndex((item) => item.id === config.newYear.fan?.[spot]);
      return i < 0 ? {} : { scene: types.zodiac.firstScene + i };
    };
    const named = (entry, spot) => ({
      ...entry.card,
      name: entry.names[lang] ?? entry.names.en,
      ...(newYear ? zodiacScene(spot) : {}),
    });
    // Back cards first (left, right), the main example card last so it sits on top.
    const fan = [
      sample.rival && { card: named(sample.rival, 'left'), spot: 'left' },
      sample.more?.[0] && { card: named(sample.more[0], 'right'), spot: 'right' },
      { card: named(sample, 'front'), spot: 'front' },
    ].filter(Boolean);
    const scratch = document.createElement('canvas');
    const nodes = [];
    for (const { card, spot } of fan) {
      await renderCard(scratch, card, { config, types, skills, descriptions });
      const canvas = document.createElement('canvas');
      canvas.width = FAN_W;
      canvas.height = Math.round((FAN_W * CARD_H) / CARD_W);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(scratch, 0, 0, canvas.width, canvas.height);
      canvas.className = `card-canvas home-fan-card ${spot}`;
      if (spot === 'front') {
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', t('home.exampleLabel'));
      } else {
        canvas.setAttribute('aria-hidden', 'true');
      }
      nodes.push(canvas);
    }
    scratch.width = scratch.height = 0;
    box.replaceChildren(...nodes);
  } catch (err) {
    console.error(err);
    box.remove();
  }
}
