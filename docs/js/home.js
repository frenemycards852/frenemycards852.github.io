// Home screen extras: "make a card" always starts fresh, and a fan of example cards
// (like a freshly opened pack) shows first-time visitors what this is.

import { t, getLang } from './i18n.js';
import { loadJSON } from './data.js';
import { renderCard, CARD_W, CARD_H } from './render-card.js';
import { startNewCard } from './builder.js';

// Fan cards are drawn once at full size, then copied down to this width (memory on phones).
const FAN_W = 432;

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
    const named = (entry) => ({ ...entry.card, name: entry.names[lang] ?? entry.names.en });
    // Back cards first (left, right), the main example card last so it sits on top.
    const fan = [
      sample.rival && { card: named(sample.rival), spot: 'left' },
      sample.more?.[0] && { card: named(sample.more[0]), spot: 'right' },
      { card: named(sample), spot: 'front' },
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
