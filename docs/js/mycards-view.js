// My album (#/album): filter and sort the cards on this phone, open one big (#/album/<n>),
// make a "Friend Collection" image (#/album/collection), export the album (#/album/export).
// Also the card picker used by the challenge screens.
// Cards are stored on this phone only (mycards.js).

import { t } from './i18n.js';
import { loadCardData } from './carddata.js';
import { isCardValid } from './card.js';
import { renderCard, CARD_W, CARD_H } from './render-card.js';
import { renderCollection } from './render-collection.js';
import { listMyCards, cardKey, canStoreCards, removeMyCard, importMyCards } from './mycards.js';
import { encodeAlbum, decodeAlbum, CodecError } from './codec.js';
import { showError } from './cardview.js';
import { createSharePanel, copyText } from './share.js';
import { startNewCard } from './builder.js';
import { startChallenge } from './challenge.js';
import { typeBadge } from './typebadge.js';
import { attachTilt } from './tilt.js';

const NAME_KEY = 'fc.myName';

// Filters and picks survive a language switch while the page is open.
const view = { source: 'all', type: 'all', rarity: 'all', sort: 'new', picked: [] };
let mountToken = 0;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function link(text, href, cls = 'btn btn-secondary') {
  const a = el('a', cls, text);
  a.href = href;
  return a;
}

function button(text, cls, onClick) {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

// Small card images, drawn one at a time through one full-size scratch canvas
// (many full-size canvases would use too much memory on phones).
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

// Grid of card buttons. onPick(item, on) is called on tap.
// Single choice by default; with multi, each tap toggles and onPick returns whether it's allowed.
export function cardPicker(items, data, { selectedKey = null, selectedKeys = null, multi = false, onPick, isAlive = () => true }) {
  const grid = el('div', 'card-grid');
  const buttons = items.map((item) => {
    const key = cardKey(item.card);
    const b = el('button', 'card-pick');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(multi ? selectedKeys.has(key) : key === selectedKey));
    b.setAttribute('aria-label', `${item.card.name} · ${t(`album.${item.source}`)}`);
    b.append(
      el('span', 'card-pick-art'),
      el('span', 'card-pick-label', item.card.name),
      el('span', 'card-pick-source', `${item.card.rarity} · ${t(`album.${item.source}`)}`),
    );
    b.addEventListener('click', () => {
      if (multi) {
        const on = b.getAttribute('aria-pressed') !== 'true';
        if (onPick(item, on) !== false) b.setAttribute('aria-pressed', String(on));
        return;
      }
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === b));
      onPick(item, true, b);
    });
    grid.append(b);
    return b;
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

// ---------- album page ----------

export async function mountMyCards(container, param) {
  const token = ++mountToken;
  const isAlive = () => token === mountToken;
  let data;
  try {
    data = await loadCardData();
  } catch (err) {
    console.error(err);
    container.replaceChildren(el('p', 'load-error', t('error.load')));
    return;
  }
  if (!isAlive()) return;
  const items = myValidCards(data);
  if (param === 'collection') showCollection(container, items, data, isAlive);
  else if (param === 'export') showExport(container, items, data);
  else if (/^\d+$/.test(param ?? '') && items[Number(param)]) showDetail(container, items, Number(param), data);
  else showList(container, items, data, isAlive);
}

const RARITY_RANK = (data, rarity) => data.config.rarity.order.indexOf(rarity);

function filtered(items, data) {
  const list = items
    .map((item, index) => ({ ...item, index }))
    .filter((item) => view.source === 'all' || item.source === view.source)
    .filter((item) => view.type === 'all' || item.card.type === view.type)
    .filter((item) => view.rarity === 'all' || item.card.rarity === view.rarity);
  if (view.sort === 'rarity') list.sort((a, b) => RARITY_RANK(data, b.card.rarity) - RARITY_RANK(data, a.card.rarity));
  if (view.sort === 'name') list.sort((a, b) => a.card.name.localeCompare(b.card.name));
  return list;
}

// A row of toggle chips; onChange(value) re-renders.
function chips(label, options, current, onChange) {
  const row = el('div', 'chip-row');
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', label);
  for (const [value, text, icon] of options) {
    const chip = button(text, 'chip', () => onChange(value));
    if (icon) chip.prepend(icon);
    chip.setAttribute('aria-pressed', String(value === current));
    row.append(chip);
  }
  return row;
}

function showList(container, items, data, isAlive) {
  const section = el('section', 'album');
  section.append(el('h1', null, t('album.title')));
  const max = data.config.myCards.max;
  if (!canStoreCards()) {
    section.append(el('p', 'album-warn', t('album.noStorage')));
  } else {
    section.append(el('p', 'hint', t('album.hint', { max })));
    // iPhone keeps Safari and the home-screen app's storage apart; say so where it matters.
    if (isIOS()) section.append(el('p', 'hint', t('album.iosNote')));
  }

  const make = link(t('home.make'), '#/make', 'btn btn-primary');
  make.addEventListener('click', () => startNewCard(''));
  const home = link(t('nav.back'), '#/');

  if (items.length === 0) {
    section.append(el('p', 'album-empty', t('album.empty')), make, home);
    container.replaceChildren(section);
    return;
  }

  const ssr = items.filter((item) => item.card.rarity === 'SSR').length;
  section.append(el('p', 'album-stats', t('album.stats', { n: items.length, max, ssr })));

  const rerender = () => showList(container, items, data, isAlive);
  const set = (key) => (value) => { view[key] = value; rerender(); };
  const filters = el('div', 'album-filters');
  filters.append(
    chips(t('album.filterSource'), [['all', t('album.all')], ['made', t('album.made')], ['received', t('album.received')]], view.source, set('source')),
    chips(t('album.filterType'), [['all', t('album.allTypes')], ...data.types.types.map((type) => [type.id, t(`types.${type.id}.name`), typeBadge(type)])], view.type, set('type')),
    chips(t('album.filterRarity'), [['all', t('album.allRarity')], ...data.config.rarity.order.map((r) => [r, r])], view.rarity, set('rarity')),
    chips(t('album.sort'), [['new', t('album.sortNew')], ['rarity', t('album.sortRarity')], ['name', t('album.sortName')]], view.sort, set('sort')),
  );
  section.append(filters);

  const shown = filtered(items, data);
  if (shown.length === 0) {
    section.append(el('p', 'album-empty', t('album.none')));
  } else {
    section.append(
      el('p', 'album-tap', t('album.tapHint')),
      cardPicker(shown, data, {
        onPick: (item, on, button) => {
          rememberZoom(item.index, button.querySelector('canvas') ?? button);
          location.hash = `#/album/${item.index}`;
        },
        isAlive,
      }),
    );
  }

  section.append(
    link(t('album.collection'), '#/album/collection', 'btn btn-primary'),
    link(t('album.export'), '#/album/export'),
    make,
    home,
  );
  // "Make a card" is secondary once the album has cards.
  make.className = 'btn btn-secondary';
  container.replaceChildren(section);
}

// ---------- one card, big ----------

// The tapped thumbnail's place on the page, so the big card can grow out of it.
let zoom = null;
function rememberZoom(index, node) {
  const r = node.getBoundingClientRect();
  zoom = { index, at: Date.now(), left: r.left + window.scrollX, top: r.top + window.scrollY, width: r.width };
}

function zoomIn(cardBox, index) {
  const from = zoom;
  zoom = null;
  if (!from || from.index !== index || Date.now() - from.at > 1500) return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !cardBox.animate) return false;
  const to = cardBox.getBoundingClientRect();
  if (!to.width) return false;
  const scale = from.width / to.width;
  const dx = from.left - window.scrollX - to.left;
  const dy = from.top - window.scrollY - to.top;
  cardBox.style.animation = 'none'; // replaces the flip-in used when a pack is opened
  cardBox.animate(
    [
      { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.7 },
      { transformOrigin: '0 0', transform: 'none', opacity: 1 },
    ],
    { duration: 380, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.1)' },
  );
  return true;
}

async function showDetail(container, items, index, data) {
  const item = items[index];
  const { card } = item;
  const canvas = el('canvas', 'card-canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', t('reveal.cardLabel', { name: card.name, rarity: card.rarity }));
  const frame = data.config.rarity.frames[card.rarity];
  const cardBox = el('div', frame.sparkle ? 'reveal-card holo' : 'reveal-card');
  cardBox.append(canvas);
  if (frame.sparkle) cardBox.append(el('div', 'holo-shine'));
  attachTilt(cardBox, { foil: Boolean(frame.foil) });

  const challenge = link(t('album.challenge'), '#/challenge', 'btn btn-primary');
  challenge.addEventListener('click', () => startChallenge(card));
  const share = createSharePanel({
    canvas,
    getCard: () => ({ ...card, from: card.from ?? '' }),
    message: () => t('share.forward', { name: card.name }),
    primary: false,
    hasPhoto: Boolean(card.photo),
  });

  // Delete asks first, in place.
  const confirm = el('div', 'confirm');
  confirm.hidden = true;
  const actions = el('div', 'confirm-actions');
  actions.append(
    button(t('album.deleteNo'), 'btn btn-secondary', () => { confirm.hidden = true; remove.hidden = false; }),
    button(t('album.deleteYes'), 'btn btn-primary', () => {
      removeMyCard(card);
      location.hash = '#/album';
    }),
  );
  confirm.append(el('p', null, t('album.deleteConfirm', { name: card.name })), actions);
  const remove = button(t('album.delete'), 'btn btn-secondary', () => { confirm.hidden = false; remove.hidden = true; });

  const section = el('section', 'card-view reveal album-detail');
  const stage = el('div', 'reveal-stage view-stage');
  stage.append(cardBox);
  const box = el('div', 'reveal-actions view-actions');
  box.append(
    el('p', 'hint', t(`album.${item.source}`)),
    challenge,
    share,
    remove,
    confirm,
    link(t('album.back'), '#/album'),
  );
  section.append(el('h1', null, card.name), stage, box);
  container.replaceChildren(section);
  await renderCard(canvas, card, data).catch((err) => console.error(err));
  // Opened from a thumbnail: no flip-in (it would also skew the size measured for the zoom).
  if (zoom?.index === index) cardBox.style.animation = 'none';
  section.classList.add('opened', 'revealed');
  zoomIn(cardBox, index);
}

// ---------- Friend Collection image ----------

function myName() {
  try {
    return (localStorage.getItem(NAME_KEY) ?? '').trim();
  } catch {
    return '';
  }
}

function showCollection(container, items, data, isAlive) {
  const max = data.config.collection.max;
  const keys = new Set(items.map((item) => cardKey(item.card)));
  view.picked = view.picked.filter((key) => keys.has(key));
  if (view.picked.length === 0) view.picked = items.slice(0, max).map((item) => cardKey(item.card));

  const section = el('section', 'album');
  section.append(el('h1', null, t('collection.title')), el('p', 'hint', t('collection.hint', { max })));
  if (items.length === 0) {
    section.append(el('p', 'album-empty', t('album.empty')), link(t('album.back'), '#/album'));
    container.replaceChildren(section);
    return;
  }
  const count = el('p', 'album-stats');
  const make = button(t('collection.make'), 'btn btn-primary btn-block', () => showCollectionImage(container, items, data));
  const update = () => {
    count.textContent = t('collection.picked', { n: view.picked.length, max });
    make.disabled = view.picked.length === 0;
  };
  const picked = new Set(view.picked);
  section.append(
    count,
    cardPicker(items, data, {
      multi: true,
      selectedKeys: picked,
      onPick: (item, on) => {
        const key = cardKey(item.card);
        if (on && view.picked.length >= max) return false;
        view.picked = on ? [...view.picked, key] : view.picked.filter((k) => k !== key);
        update();
        return true;
      },
      isAlive,
    }),
    make,
    link(t('album.back'), '#/album'),
  );
  update();
  container.replaceChildren(section);
}

async function showCollectionImage(container, items, data) {
  const byKey = new Map(items.map((item) => [cardKey(item.card), item.card]));
  const cards = view.picked.map((key) => byKey.get(key)).filter(Boolean);
  const name = myName();
  const title = name ? t('collection.imageTitle', { name }) : t('collection.imageTitleAnon');
  const canvas = el('canvas', 'card-canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', title);
  const share = createSharePanel({
    canvas,
    getCard: () => ({ name: 'collection' }),
    getLink: async () => `${location.origin}${location.pathname}`,
    message: () => t('collection.shareMessage'),
    hasPhoto: cards.some((card) => card.photo),
  });
  const again = button(t('collection.again'), 'btn btn-secondary', () => showCollection(container, items, data, () => true));
  const section = el('section', 'challenge-sent');
  const image = el('div', 'collection-image');
  image.append(canvas);
  const actions = el('div', 'challenge-actions');
  actions.append(share, again, link(t('album.back'), '#/album'));
  section.append(el('h1', null, t('collection.title')), image, actions);
  container.replaceChildren(section);
  window.scrollTo(0, 0);
  await renderCollection(canvas, cards, title, data).catch((err) => console.error(err));
}

// ---------- export ----------

async function showExport(container, items, data) {
  const section = el('section', 'album');
  section.append(el('h1', null, t('export.title')));
  if (items.length === 0) {
    section.append(el('p', 'album-empty', t('album.empty')), link(t('album.back'), '#/album'));
    container.replaceChildren(section);
    return;
  }
  const url = `${location.origin}${location.pathname}#a=${await encodeAlbum(items)}`;
  const status = el('p', 'share-status');
  status.setAttribute('aria-live', 'polite');
  const copy = button(t('export.copy'), 'btn btn-primary', async () => {
    status.textContent = t((await copyText(url)) ? 'share.copied' : 'share.failed');
  });
  section.append(el('p', null, t('export.text', { n: items.length })), el('p', 'album-warn', t('export.warn')), copy);
  if (navigator.share) {
    section.append(button(t('export.share'), 'btn btn-secondary', async () => {
      try {
        await navigator.share({ title: t('export.title'), url });
      } catch {
        // Cancelled or not allowed: copying still works.
      }
    }));
  }
  section.append(status, link(t('album.back'), '#/album'));
  container.replaceChildren(section);
}

// ---------- import (#a=) ----------

export async function mountAlbumImport(container, payload) {
  const token = ++mountToken;
  let data;
  try {
    data = await loadCardData();
  } catch (err) {
    console.error(err);
    container.replaceChildren(el('p', 'load-error', t('error.load')));
    return;
  }
  let decoded;
  try {
    decoded = await decodeAlbum(payload);
  } catch (err) {
    if (token !== mountToken) return;
    console.warn('Album link could not be opened:', err.message);
    showError(container, err instanceof CodecError ? err.code : 'corrupt');
    return;
  }
  if (token !== mountToken) return;
  const valid = decoded.items.filter((item) => isCardValid(item.card, data));
  const broken = decoded.broken + decoded.items.length - valid.length;
  const max = data.config.myCards.max;

  const section = el('section', 'album');
  section.append(el('h1', null, t('import.title')));
  if (!canStoreCards()) {
    section.append(el('p', 'album-warn', t('album.noStorage')), link(t('nav.back'), '#/'));
    container.replaceChildren(section);
    return;
  }
  section.append(el('p', null, t('import.text', { n: valid.length })));
  if (broken > 0) section.append(el('p', 'hint', t('import.skipped', { n: broken })));
  const already = new Set(listMyCards().map((item) => cardKey(item.card)));
  const fresh = valid.filter((item) => !already.has(cardKey(item.card)));
  if (fresh.length + already.size > max) section.append(el('p', 'album-warn', t('import.full', { max })));
  const status = el('p', 'share-status');
  status.setAttribute('aria-live', 'polite');
  if (fresh.length === 0) {
    section.append(el('p', 'album-stats', t('import.already')));
  } else {
    const yes = button(t('import.yes', { n: fresh.length }), 'btn btn-primary btn-block', () => {
      const added = importMyCards(fresh, max);
      yes.disabled = true;
      status.textContent = t('import.done', { n: added });
    });
    section.append(yes);
  }
  section.append(status, link(t('import.open'), '#/album'), link(t('nav.back'), '#/'));
  container.replaceChildren(section);
}

// iPhone / iPad (iPadOS reports itself as a Mac with touch).
function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
