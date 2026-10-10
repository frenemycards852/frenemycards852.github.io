// Home screen extras: draws the example card so first-time visitors see what this is.

import { t, getLang } from './i18n.js';
import { loadJSON } from './data.js';
import { renderCard } from './render-card.js';

export async function mountHomeCard(container) {
  const box = container.querySelector('.home-card');
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
    const card = { ...sample.card, name: sample.names[lang] ?? sample.names.en };
    const canvas = document.createElement('canvas');
    canvas.className = 'card-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', t('home.exampleLabel'));
    await renderCard(canvas, card, { config, types, skills, descriptions });
    box.replaceChildren(canvas);
  } catch (err) {
    console.error(err);
    box.remove();
  }
}
