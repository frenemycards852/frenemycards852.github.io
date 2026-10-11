// Challenge received (#x=...): see the challenger's card and the penalty, pick your card
// (or make one on the spot) and a tactic, then fight. Result image, replay link and
// rematch are on the result. One fight per challenge on each phone (matches.js).

import { t } from './i18n.js';
import { loadCardData } from './carddata.js';
import { TACTICS } from './battle.js';
import { decodeChallenge, CodecError } from './codec.js';
import { isChallengeValid, penaltyText, battleSeed } from './challenge-model.js';
import { cardKey } from './mycards.js';
import { cardPicker, myValidCards } from './mycards-view.js';
import { renderCard } from './render-card.js';
import { showError } from './cardview.js';
import { startNewCard } from './builder.js';
import { radio, group, startChallenge } from './challenge.js';
import { loadBattleData, showBattle, resultSharePanel } from './battleview.js';
import { lockFight, lockedFight } from './matches.js';
import { isCardValid } from './card.js';

const NAME_KEY = 'fc.myName';

// Kept in memory for the challenge being answered (survives a language switch).
let state = null;
let pendingCard = null;
let mountToken = 0;

// Called from the reveal screen after making a card on the spot.
export function acceptWithCard(card) {
  pendingCard = card;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function myName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export async function mountChallengeReceived(container, payload) {
  const token = ++mountToken;
  const isAlive = () => token === mountToken && document.body.contains(container) && location.hash === `#x=${payload}`;
  let data;
  try {
    const [cardData, battleData] = await Promise.all([loadCardData(), loadBattleData()]);
    data = { ...cardData, ...battleData };
  } catch (err) {
    console.error(err);
    container.replaceChildren(el('p', 'load-error', t('error.load')));
    return;
  }
  let challenge;
  try {
    challenge = await decodeChallenge(payload);
    if (!isChallengeValid(challenge, data)) throw new CodecError('corrupt', 'invalid challenge');
  } catch (err) {
    if (token !== mountToken) return;
    console.warn('Challenge link could not be opened:', err.message);
    showError(container, err instanceof CodecError ? err.code : 'corrupt');
    return;
  }
  if (token !== mountToken) return;

  if (state?.payload !== payload) state = { payload, cardKey: null, tactic: 'chaos', fought: false, locked: null };
  // Already fought on this phone: show that same fight again, no new picks.
  const locked = lockedFight(challenge.nonce);
  if (locked && isCardValid(locked.card, data) && TACTICS.includes(locked.tactic)) {
    const reopened = !state.fought;
    state.fought = true;
    state.locked = locked;
    fight(container, challenge, [], data, { animate: false, isAlive, notice: reopened ? t('result.locked') : '' });
    return;
  }
  const items = myValidCards(data);
  if (pendingCard) {
    if (!items.some((item) => cardKey(item.card) === cardKey(pendingCard))) {
      items.unshift({ card: pendingCard, source: 'made', at: Date.now() });
    }
    state.cardKey = cardKey(pendingCard);
    pendingCard = null;
  }
  if (!items.some((item) => cardKey(item.card) === state.cardKey)) state.cardKey = items[0] ? cardKey(items[0].card) : null;

  if (state.fought) {
    fight(container, challenge, items, data, { animate: false, isAlive });
    return;
  }
  showAccept(container, payload, challenge, items, data, isAlive);
}

function showAccept(container, payload, challenge, items, data, isAlive) {
  const name = challenge.name.trim();
  const section = el('section', 'accept');
  section.append(el('h1', null, name ? t('challenge.imageTitle', { name }) : t('challenge.imageTitleAnon')));

  const canvas = el('canvas', 'card-canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', t('reveal.cardLabel', { name: challenge.card.name, rarity: challenge.card.rarity }));
  const cardBox = el('div', 'accept-card');
  cardBox.append(canvas);
  renderCard(canvas, challenge.card, data).catch((err) => console.error(err));

  const penalty = el('div', 'penalty-box');
  penalty.append(el('p', 'penalty-label', t('challenge.imageLoser')), el('p', 'penalty-text', penaltyText(challenge.penalty, data.penalties)));

  // Your card
  const pickBox = group(t('accept.pickCard'));
  const makeNew = el('a', 'btn btn-secondary', t('accept.makeNew'));
  makeNew.href = '#/make';
  makeNew.addEventListener('click', () => startNewCard('', `#x=${payload}`));
  if (items.length === 0) {
    pickBox.append(el('p', 'album-empty', t('accept.noCards')));
  } else {
    pickBox.append(cardPicker(items, data, {
      selectedKey: state.cardKey,
      onPick: (item) => { state.cardKey = cardKey(item.card); update(); },
      isAlive,
    }));
  }
  pickBox.append(makeNew);

  // Your tactic
  const tacticBox = group(t('challenge.tactic'), t('accept.tacticHint'));
  const options = el('div', 'options');
  for (const id of TACTICS) {
    const { label, input } = radio('tactic', id, state.tactic === id, t(`tactics.${id}.name`), t(`tactics.${id}.desc`));
    input.addEventListener('change', () => { state.tactic = id; });
    options.append(label);
  }
  tacticBox.append(options);

  const go = el('button', 'btn btn-primary btn-block btn-fight', t('accept.fight'));
  go.type = 'button';
  go.addEventListener('click', () => {
    const mine = items.find((item) => cardKey(item.card) === state.cardKey);
    if (!mine) return;
    state.fought = true;
    lockFight(challenge.nonce, { card: mine.card, tactic: state.tactic, name: myName().trim() });
    fight(container, challenge, items, data, { animate: true, isAlive });
    window.scrollTo(0, 0);
  });
  const update = () => { go.disabled = !state.cardKey; };
  update();

  section.append(cardBox, penalty, pickBox, tacticBox, go);
  container.replaceChildren(section);
}

function fight(container, challenge, items, data, { animate, isAlive, notice = '' }) {
  // The locked fight (if any) wins over the current picks.
  const mine = state.locked
    ? { card: state.locked.card, tactic: state.locked.tactic, name: state.locked.name ?? myName() }
    : { ...items.find((item) => cardKey(item.card) === state.cardKey), tactic: state.tactic, name: myName() };
  if (!mine.card) {
    state.fought = false;
    mountChallengeReceived(container, state.payload);
    return;
  }
  const match = {
    cards: [challenge.card, mine.card],
    tactics: [challenge.tactic, mine.tactic],
    seed: battleSeed(challenge.nonce, mine.card, mine.tactic),
    nonce: challenge.nonce,
    penalty: challenge.penalty,
    people: [challenge.name.trim(), (mine.name ?? '').trim()],
  };
  showBattle(container, match, data, {
    viewer: 1,
    animate,
    isAlive,
    notice,
    actions: (result) => [resultActions(match, result, data, 1, () => {
      fight(container, challenge, items, data, { animate: true, isAlive });
      window.scrollTo(0, 0);
    })],
  });
}

// Buttons under a result: send it (image + replay link), rematch, watch again, home.
export function resultActions(match, result, data, viewer, onReplay, { send = true } = {}) {
  const box = el('div', 'challenge-actions');
  if (send) box.append(resultSharePanel(match, result, data, { primary: true }));
  if (viewer !== null) {
    const rematch = el('a', `btn ${send ? 'btn-secondary' : 'btn-primary'}`, t('result.rematch'));
    rematch.href = '#/challenge';
    rematch.addEventListener('click', () => startChallenge(match.cards[viewer], match.penalty));
    box.append(rematch);
  }
  const replay = el('button', 'btn btn-secondary', t('result.replay'));
  replay.type = 'button';
  replay.addEventListener('click', onReplay);
  const home = el('a', 'btn btn-secondary', t('reveal.home'));
  home.href = '#/';
  box.append(replay, home);
  return box;
}
