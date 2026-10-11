// "My album" page (#/album) and the card picker used by the challenge screen.
// Cards are stored on this phone only (mycards.js); Stage 3 adds filters and export.

import { t } from './i18n.js';
import { loadCardData } from './carddata.js';
import { isCardValid } from './card.js';
import { renderCard, CARD_W, CARD_H } from './render-card.js';
import { listMyCards, cardKey } from './mycards.js';
import { startNewCard } from './builder.js';
import { startChallenge } from './challenge.js';

let mountToken = 0;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Small card images, drawn one at a time through one full-size scratch canvas
// (20 full-size canvases would use too much memory on phones).
let scratch = null;
let queue = Promise.resolve();
export function renderThumb(card, data, width = 360) {
  const job = queue.then(async () => {
    scratch ??= document.createElement('canvas');
    await renderCard(scratch, card, data);
    const thumb = document.createElement('canvas');
    thumb.width = width;
    thumb.height = Math.round((width * CARD_H) / CARD_W);
    thumb.getContext('2d').drawImage(scratch, 0, 0, thumb.width, thumb.height);
    return thumb;
  });
  queue = job.catch(() => {});
  return job;
}

export function myValidCards(data) {
  return listMyCards((card) => isCardValid({ ...card, from: card.from ?? '' }, data));
}

// Grid of card buttons. onPick(item) is called on tap; selectedKey marks the chosen card.
export function cardPicker(items, data, { selectedKey = null, onPick, isAlive = () => true }) {
  const grid = el('div', 'card-grid');
  const buttons = items.map((item) => {
    const button = el('button', 'card-pick');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(cardKey(item.card) === selectedKey));
    button.setAttribute('aria-label', `${item.card.name} · ${t(`album.${item.source}`)}`);
    const art = el('span', 'card-pick-art');
    const label = el('span', 'card-pick-label', item.card.name);
    const source = el('span', 'card-pick-source', t(`album.${item.source}`));
    button.append(art, label, source);
    button.addEventListener('click', () => {
      for (const b of buttons) b.setAttribute('aria-pressed', String(b === button));
      onPick(item);
    });
    grid.append(button);
    return button;
  });
  // Draw thumbnails after the grid is on screen.
  (async () => {
    for (const [i, item] of items.entries()) {
      if (!isAlive()) return;
      try {
        const thumb = await renderThumb(item.card, data);
        if (!isAlive()) return;
        thumb.className = 'card-pick-canvas';
        buttons[i].querySelector('.card-pick-art').append(thumb);
      } catch (err) {
        console.error(err);
      }
    }
  })();
  return grid;
}

export async function mountMyCards(container) {
  const token = ++mountToken;
  let data;
  try {
    data = await loadCardData();
  } catch (err) {
    console.error(err);
    container.replaceChildren(el('p', 'load-error', t('error.load')));
    return;
  }
  if (token !== mountToken) return;
  const items = myValidCards(data);
  const section = el('section', 'album');
  section.append(el('h1', null, t('album.title')), el('p', 'hint', t('album.hint', { max: data.config.myCards.max })));
  const make = el('a', 'btn btn-primary', t('home.make'));
  make.href = '#/make';
  make.addEventListener('click', () => startNewCard(''));
  if (items.length === 0) {
    section.append(el('p', 'album-empty', t('album.empty')), make);
  } else {
    section.append(
      el('p', 'album-tap', t('album.tapHint')),
      cardPicker(items, data, {
        onPick: (item) => { startChallenge(item.card); location.hash = '#/challenge'; },
        isAlive: () => token === mountToken,
      }),
      make,
    );
  }
  const home = el('a', 'btn btn-secondary', t('nav.back'));
  home.href = '#/';
  section.append(home);
  container.replaceChildren(section);
}
