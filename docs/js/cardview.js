// Card view: what a friend sees when they open a card link (#c=...).
// Bad, old or newer links show a friendly message instead of breaking.

import { t, getLang } from './i18n.js';
import { loadJSON } from './data.js';
import { decodeCard, CodecError } from './codec.js';
import { isCardValid } from './card.js';
import { renderCard } from './render-card.js';
import { createSharePanel } from './share.js';
import { startNewCard } from './builder.js';

let mountToken = 0;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function makeOwnLink(primary = true) {
  const a = el('a', `btn ${primary ? 'btn-primary' : 'btn-secondary'}`, t('view.makeOwn'));
  a.href = '#/make';
  a.addEventListener('click', () => startNewCard(''));
  return a;
}

function showError(container, code) {
  const key = code === 'version' ? 'view.newer' : code === 'unsupported' ? 'view.unsupported' : 'view.bad';
  const section = el('section', 'card-view card-view-error');
  section.append(el('h1', null, t('view.badTitle')), el('p', null, t(key)), makeOwnLink());
  container.replaceChildren(section);
}

export async function mountCardView(container, payload) {
  const token = ++mountToken;
  const lang = getLang();
  let data;
  let card;
  try {
    const [config, types, blocklist, skills, descriptions] = await Promise.all([
      loadJSON('data/config.json'),
      loadJSON('data/types.json'),
      loadJSON('data/blocklist.json'),
      loadJSON(`data/skills/${lang}.json`),
      loadJSON(`data/descriptions/${lang}.json`),
    ]);
    data = { config, types, blocklist, skills, descriptions };
  } catch (err) {
    console.error(err);
    container.replaceChildren(el('p', 'load-error', t('error.load')));
    return;
  }
  try {
    card = await decodeCard(payload);
    if (!isCardValid(card, data)) throw new CodecError('corrupt', 'invalid card');
  } catch (err) {
    if (token !== mountToken) return;
    console.warn('Card link could not be opened:', err.message);
    showError(container, err instanceof CodecError ? err.code : 'corrupt');
    return;
  }
  if (token !== mountToken) return;

  const from = card.from.trim();
  const canvas = el('canvas', 'card-canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', t('reveal.cardLabel', { name: card.name, rarity: card.rarity }));
  const frame = data.config.rarity.frames[card.rarity];
  const cardBox = el('div', frame.sparkle ? 'reveal-card holo' : 'reveal-card');
  cardBox.append(canvas);
  if (frame.sparkle) cardBox.append(el('div', 'holo-shine'));

  // Strike back: start a new card for the person who made this one.
  const strike = el('a', 'btn btn-primary btn-strike', from ? t('view.strike', { from }) : t('view.strikeAnon'));
  strike.href = '#/make';
  strike.addEventListener('click', () => startNewCard(from));

  const soon = (key) => {
    const b = el('button', 'btn btn-secondary', `${t(key)} ${t('view.soon')}`);
    b.type = 'button';
    b.disabled = true;
    return b;
  };

  const share = createSharePanel({
    canvas,
    getCard: () => card,
    message: () => t('share.forward', { name: card.name }),
    primary: false, // "Strike back" is the main action here
  });

  const intro = el('div', 'card-view-intro');
  intro.append(el('p', null, t('view.intro')), makeOwnLink(false));

  const section = el('section', 'card-view reveal');
  section.append(
    el('h1', null, from ? t('view.title', { from }) : t('view.titleAnon')),
    el('div', 'reveal-stage view-stage'),
    el('div', 'reveal-actions view-actions'),
  );
  section.querySelector('.view-stage').append(cardBox);
  section.querySelector('.view-actions').append(strike, soon('view.challenge'), soon('view.album'), share, intro);
  container.replaceChildren(section);

  await renderCard(canvas, card, data).catch((err) => console.error(err));
  if (token !== mountToken) return;
  section.classList.add('opened', 'revealed');
}
