// Challenge setup (#/challenge): pick a card, a penalty and a tactic, then send a challenge link.
// The friend's side (#x=...) lives in accept.js.

import { t } from './i18n.js';
import { loadCardData } from './carddata.js';
import { CUSTOM, clipText, textLength, isBlocked, sampleIds, resolveSkill } from './card.js';
import { TACTICS } from './battle.js';
import { randomSeed } from './rng.js';
import { isPenaltyValid, penaltyText } from './challenge-model.js';
import { cardKey } from './mycards.js';
import { rememberSent } from './matches.js';
import { cardPicker, myValidCards } from './mycards-view.js';
import { renderChallenge } from './render-challenge.js';
import { createSharePanel, challengeLink } from './share.js';
import { nameField } from './reveal.js';
import { startNewCard } from './builder.js';
import { planPicker, DEFAULT_PLAN } from './planpicker.js';
import { isTestServer } from './newyear.js';

// Kept in memory while the page is open (survives a language switch).
let state = null;
let pendingCard = null;
let pendingPenalty = null;
let mountToken = 0;

// Open the challenge screen next time with this card (and penalty, for a rematch) already picked.
export function startChallenge(card = null, penalty = null) {
  state = null;
  pendingCard = card;
  pendingPenalty = penalty;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function radio(name, value, checked, title, desc) {
  const label = el('label', 'option');
  const input = el('input');
  Object.assign(input, { type: 'radio', name, value, checked });
  const body = el('span', 'option-body');
  body.append(el('span', 'option-title', title));
  if (desc) body.append(el('span', 'option-desc', desc));
  label.append(input, body);
  return { label, input };
}

export function group(title, hint) {
  const box = el('fieldset', 'group');
  box.append(el('legend', null, title));
  if (hint) box.append(el('p', 'hint', hint));
  return box;
}

function newState(items) {
  const first = pendingCard ? cardKey(pendingCard) : items[0] && cardKey(items[0].card);
  pendingCard = null;
  const penalty = pendingPenalty ? { ...pendingPenalty } : { id: 'p1', text: '' };
  pendingPenalty = null;
  return { cardKey: first, penalty, tactic: 'chaos', plan: [...DEFAULT_PLAN], sent: null };
}

// New challenges use plan battles (rules v3) when config.json → planBattle.enabled is on,
// or on a local test server with ?plans in the address.
export function plansOn(config) {
  if (config.planBattle?.enabled) return true;
  try {
    return isTestServer() && new URLSearchParams(location.search).has('plans');
  } catch {
    return false;
  }
}

// Name of a card's signature move, for the plan picker.
export const moveName = (card, data) => resolveSkill(card.move, data.skills.move).name;

export async function mountChallenge(container) {
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
  // A card picked from the reveal screen is saved first, but keep it even if storage is off.
  if (pendingCard && !items.some((item) => cardKey(item.card) === cardKey(pendingCard))) {
    items.unshift({ card: pendingCard, source: 'made', at: Date.now() });
  }
  state ??= newState(items);
  if (state.sent) {
    showSent(container, data, token);
    return;
  }
  showSetup(container, data, items, token);
}

function showSetup(container, data, items, token) {
  const section = el('section', 'challenge');
  section.append(el('h1', null, t('challenge.title')));

  // 1. Card
  const cardBox = group(t('challenge.pickCard'));
  if (items.length === 0) {
    const make = el('a', 'btn btn-primary', t('home.make'));
    make.href = '#/make';
    make.addEventListener('click', () => startNewCard(''));
    cardBox.append(el('p', 'album-empty', t('challenge.noCards')), make);
    section.append(cardBox);
    container.replaceChildren(section);
    return;
  }
  const usePlans = plansOn(data.config);
  let picker = null;
  if (!items.some((item) => cardKey(item.card) === state.cardKey)) state.cardKey = cardKey(items[0].card);
  cardBox.append(cardPicker(items, data, {
    selectedKey: state.cardKey,
    onPick: (item) => {
      state.cardKey = cardKey(item.card);
      picker?.setMoveName(moveName(item.card, data));
    },
    isAlive: () => token === mountToken,
  }));

  // 2. Penalty
  const penaltyBox = group(t('challenge.penalty'));
  const options = el('div', 'options');
  const max = data.config.challenge.penaltyMax;
  // Only a few penalties at a time (config.json → choices.shown); "🔄 Show others" swaps the batch.
  const byId = new Map(data.penalties.items.map((item) => [item.id, item]));
  const ids = [...byId.keys()];
  const shownMax = data.config.choices?.shown ?? ids.length;
  const now = state.shownPenalties;
  if (!now || now.some((id) => !ids.includes(id)) || (ids.includes(state.penalty.id) && !now.includes(state.penalty.id))) {
    state.shownPenalties = sampleIds(ids, shownMax, { keep: state.penalty.id });
  }
  const custom = radio('penalty', CUSTOM, state.penalty.id === CUSTOM, t('challenge.customPenalty'));
  custom.input.addEventListener('change', () => { state.penalty.id = CUSTOM; update(); textInput.focus(); });
  const fillPenalties = () => {
    options.replaceChildren(...state.shownPenalties.map((id) => {
      const item = byId.get(id);
      const { label, input } = radio('penalty', id, state.penalty.id === id, `${item.emoji} ${item.text}`);
      input.addEventListener('change', () => { state.penalty.id = id; update(); });
      return label;
    }), custom.label);
  };
  fillPenalties();
  let morePenalties = null;
  if (ids.length > shownMax) {
    morePenalties = el('button', 'btn btn-secondary btn-more', t('choices.more'));
    morePenalties.type = 'button';
    morePenalties.addEventListener('click', () => {
      state.shownPenalties = sampleIds(ids, shownMax, { keep: state.penalty.id, avoid: state.shownPenalties });
      fillPenalties();
    });
  }
  const customFields = el('div', 'custom-fields');
  const fieldHead = el('div', 'field-head');
  const inputLabel = el('label', null, t('challenge.customLabel'));
  inputLabel.htmlFor = 'f-penalty';
  const count = el('span', 'count');
  fieldHead.append(inputLabel, count);
  const textInput = el('input', 'text-input');
  Object.assign(textInput, { id: 'f-penalty', type: 'text', value: state.penalty.text, autocomplete: 'off' });
  const error = el('p', 'field-error');
  error.setAttribute('role', 'alert');
  textInput.addEventListener('input', () => {
    const clipped = clipText(textInput.value, max);
    if (clipped !== textInput.value) textInput.value = clipped;
    state.penalty.text = clipped;
    update();
  });
  customFields.append(fieldHead, textInput, error);
  penaltyBox.append(...[options, morePenalties, customFields].filter(Boolean));

  // 3. Plan for the 3 rounds (rules v3), or the older tactic — both hidden from the opponent
  let tacticBox;
  if (usePlans) {
    picker = planPicker({ plan: state.plan, rules: data.config.planBattle, hint: t('plan.hint') });
    const chosen = items.find((x) => cardKey(x.card) === state.cardKey);
    if (chosen) picker.setMoveName(moveName(chosen.card, data));
    tacticBox = picker.el;
  } else {
    tacticBox = group(t('challenge.tactic'), t('challenge.tacticHint'));
    const tactics = el('div', 'options');
    for (const id of TACTICS) {
      const { label, input } = radio('tactic', id, state.tactic === id, t(`tactics.${id}.name`), t(`tactics.${id}.desc`));
      input.addEventListener('change', () => { state.tactic = id; });
      tactics.append(label);
    }
    tacticBox.append(tactics);
  }

  // 4. Your name (shown on the challenge)
  const maker = nameField(data);

  const create = el('button', 'btn btn-primary btn-block', t('challenge.create'));
  create.type = 'button';
  const reason = el('p', 'hint center');
  create.addEventListener('click', () => {
    const item = items.find((x) => cardKey(x.card) === state.cardKey);
    if (!item || !isPenaltyValid(state.penalty, data)) return;
    state.sent = {
      card: { ...item.card, from: item.card.from ?? '' },
      ...(usePlans ? { plan: [...state.plan] } : { tactic: state.tactic }),
      penalty: state.penalty.id === CUSTOM ? { id: CUSTOM, text: state.penalty.text.trim() } : { id: state.penalty.id, text: '' },
      name: maker.value(),
      nonce: randomSeed(10),
    };
    rememberSent(state.sent.nonce);
    showSent(container, data, token);
    window.scrollTo(0, 0);
  });

  function update() {
    const isCustom = state.penalty.id === CUSTOM;
    customFields.hidden = !isCustom;
    count.textContent = t('builder.count', { n: textLength(state.penalty.text), max });
    error.textContent = isCustom && isBlocked(state.penalty.text, data.blocklist.terms) ? t('builder.blocked') : '';
    const ok = isPenaltyValid(state.penalty, data);
    create.disabled = !ok;
    reason.textContent = ok ? '' : t('challenge.needPenalty');
  }
  update();

  section.append(cardBox, penaltyBox, tacticBox, maker.el, create, reason);
  container.replaceChildren(section);
}

async function showSent(container, data, token) {
  const challenge = state.sent;
  const canvas = el('canvas', 'card-canvas');
  canvas.setAttribute('role', 'img');
  const penalty = penaltyText(challenge.penalty, data.penalties);
  canvas.setAttribute('aria-label', `${t('challenge.imageLoser')} ${penalty}`);
  const share = createSharePanel({
    canvas,
    getCard: () => challenge.card,
    getLink: () => challengeLink(challenge),
    message: () => t('challenge.shareMessage', { penalty }),
    hasPhoto: Boolean(challenge.card.photo),
  });
  const edit = el('button', 'btn btn-secondary', t('challenge.edit'));
  edit.type = 'button';
  edit.addEventListener('click', () => {
    state.sent = null;
    mountChallenge(container);
  });
  const home = el('a', 'btn btn-secondary', t('reveal.home'));
  home.href = '#/';

  const section = el('section', 'challenge-sent');
  const box = el('div', 'challenge-image');
  box.append(canvas);
  const actions = el('div', 'challenge-actions');
  actions.append(share, el('p', 'hint', t('challenge.sentHint')), edit, home);
  section.append(el('h1', null, t('challenge.sentTitle')), box, actions);
  container.replaceChildren(section);
  try {
    await renderChallenge(canvas, challenge, penalty, data);
  } catch (err) {
    if (token === mountToken) console.error(err);
  }
}
