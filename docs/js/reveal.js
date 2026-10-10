// Pack opening + card reveal after the rarity roll.
// Animations are CSS (transform/opacity only); reduced motion skips straight to the card.

import { t } from './i18n.js';
import { renderCard } from './render-card.js';

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// opened: the pack was already opened (e.g. after a language switch), so show the card at once.
export function showReveal(container, card, data, { opened = false, onOpened, onAgain }) {
  const frame = data.config.rarity.frames[card.rarity];

  const canvas = el('canvas', 'card-canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', t('reveal.cardLabel', { name: card.name, rarity: card.rarity }));
  const cardBox = el('div', frame.sparkle ? 'reveal-card holo' : 'reveal-card');
  cardBox.append(canvas);
  if (frame.sparkle) cardBox.append(el('div', 'holo-shine'));

  const pack = el('button', 'pack');
  pack.type = 'button';
  pack.setAttribute('aria-label', t('reveal.tap'));
  pack.append(el('span', 'pack-name', t('app.name')), el('span', 'pack-q', '?'));

  const stage = el('div', 'reveal-stage');
  stage.style.setProperty('--glow', frame.badgeText[0]);
  stage.append(pack, el('div', 'reveal-flash'), cardBox);

  const tapHint = el('p', 'reveal-tap', t('reveal.tap'));
  const reaction = el('p', 'reveal-reaction', t(`reveal.reaction.${card.rarity}`, { name: card.name }));
  reaction.setAttribute('aria-live', 'polite');

  const again = el('button', 'btn btn-primary', t('reveal.again'));
  again.type = 'button';
  again.addEventListener('click', onAgain);
  const home = el('a', 'btn btn-secondary', t('reveal.home'));
  home.href = '#/';
  const actions = el('div', 'reveal-actions');
  actions.append(el('p', 'hint center', t('reveal.shareSoon')), again, home);

  const section = el('section', 'reveal');
  section.append(el('h1', null, t('reveal.title')), stage, tapHint, reaction, actions);
  container.replaceChildren(section);

  // Start drawing straight away so the card is ready when the pack opens.
  const drawn = renderCard(canvas, card, data).catch((err) => console.error(err));
  const finish = () => {
    section.classList.add('revealed');
    onOpened?.();
  };

  if (opened || reducedMotion()) {
    section.classList.add('opened');
    drawn.then(finish);
    return;
  }
  pack.addEventListener('click', async () => {
    pack.disabled = true;
    section.classList.add('opening');
    await Promise.all([drawn, wait(700)]);
    section.classList.add('opened');
    finish();
  }, { once: true });
}
