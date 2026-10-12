// Pack opening + card reveal after the rarity roll.
// Animations are CSS (transform/opacity only); reduced motion skips straight to the card.

import { t } from './i18n.js';
import { renderCard } from './render-card.js';
import { createSharePanel } from './share.js';
import { clipText, isBlocked } from './card.js';
import { saveMyCard } from './mycards.js';
import { startChallenge } from './challenge.js';
import { acceptWithCard } from './accept.js';

const NAME_KEY = 'fc.myName';

function readName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveName(value) {
  try {
    localStorage.setItem(NAME_KEY, value);
  } catch {
    // Storage unavailable: the name just isn't remembered.
  }
}

// "What's your name?" so the friend can strike back at the right person. Optional.
export function nameField(data) {
  const wrap = el('div', 'field maker-field');
  const label = el('label', null, t('reveal.yourName'));
  label.htmlFor = 'f-maker';
  const input = el('input', 'text-input');
  Object.assign(input, { id: 'f-maker', type: 'text', autocomplete: 'nickname', value: readName() });
  input.placeholder = t('builder.name.placeholder');
  const hint = el('p', 'hint', t('reveal.yourNameHint'));
  const error = el('p', 'field-error');
  error.setAttribute('role', 'alert');
  const max = data.config.card.nameMax;
  const value = () => {
    const v = input.value.trim();
    return v && !isBlocked(v, data.blocklist.terms) ? v : '';
  };
  input.addEventListener('input', () => {
    const clipped = clipText(input.value, max);
    if (clipped !== input.value) input.value = clipped;
    error.textContent = isBlocked(clipped, data.blocklist.terms) ? t('builder.blocked') : '';
    saveName(value());
  });
  wrap.append(label, input, hint, error);
  return { el: wrap, value };
}

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// opened: the pack was already opened (e.g. after a language switch), so show the card at once.
export function showReveal(container, card, data, { opened = false, returnTo = null, onOpened, onAgain }) {
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

  const again = el('button', 'btn btn-secondary', t('reveal.again'));
  again.type = 'button';
  again.addEventListener('click', onAgain);
  const home = el('a', 'btn btn-secondary', t('reveal.home'));
  home.href = '#/';
  const maker = nameField(data);
  const share = createSharePanel({
    canvas,
    getCard: () => ({ ...card, from: maker.value() }),
    message: () => t('share.message'),
    hasPhoto: Boolean(card.photo),
  });
  const challenge = el('a', 'btn btn-secondary', t('reveal.challenge'));
  challenge.href = '#/challenge';
  challenge.addEventListener('click', () => startChallenge(card));
  const actions = el('div', 'reveal-actions');
  if (returnTo) {
    // Made on the spot to answer a challenge: going back to it is the main action.
    const accept = el('a', 'btn btn-primary btn-fight', t('accept.useThis'));
    accept.href = returnTo;
    accept.addEventListener('click', () => acceptWithCard(card));
    actions.append(accept, maker.el, share, again, home);
  } else {
    actions.append(maker.el, share, challenge, again, home);
  }

  const section = el('section', 'reveal');
  section.append(el('h1', null, t('reveal.title')), stage, tapHint, reaction, actions);
  container.replaceChildren(section);

  // Start drawing straight away so the card is ready when the pack opens.
  const drawn = renderCard(canvas, card, data).catch((err) => console.error(err));
  const finish = () => {
    saveMyCard(card, 'made', data.config.myCards.max);
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
