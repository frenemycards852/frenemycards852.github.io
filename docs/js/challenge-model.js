// Challenge rules: checks and display text for challenges. No DOM access.

import { TACTICS } from './battle.js';
import { CUSTOM, isCardValid, isBlocked, textLength } from './card.js';
import { cardKey } from './mycards.js';

const NONCE = /^[a-z0-9]{6,16}$/;

export function isPenaltyValid(penalty, { config, penalties, blocklist }) {
  if (penalty.id !== CUSTOM) return penalties.items.some((x) => x.id === penalty.id);
  const text = penalty.text ?? '';
  return text.trim().length > 0
    && textLength(text) <= config.challenge.penaltyMax
    && !isBlocked(text, blocklist.terms);
}

// Checks a challenge that arrived in a link. data: card data + penalties.
export function isChallengeValid(challenge, data) {
  const { config, blocklist } = data;
  return isCardValid(challenge.card, data)
    && TACTICS.includes(challenge.tactic)
    && isPenaltyValid(challenge.penalty, data)
    && textLength(challenge.name) <= config.card.nameMax
    && !isBlocked(challenge.name, blocklist.terms)
    && NONCE.test(challenge.nonce);
}

// Battle seed: the challenger's random nonce + the defender's card and tactic,
// so the challenger can't know the result before sending. Plain JSON (not the
// compressed link), so every browser builds exactly the same text.
export function battleSeed(nonce, defenderCard, defenderTactic) {
  return `${nonce}|${cardKey(defenderCard)}|${defenderTactic}`;
}

// Penalty with its emoji, e.g. "🧋 請對方飲珍奶".
export function penaltyText(penalty, penalties) {
  if (penalty.id === CUSTOM) return `${penalties.customEmoji} ${penalty.text.trim()}`;
  const item = penalties.items.find((x) => x.id === penalty.id);
  return item ? `${item.emoji} ${item.text}` : '';
}
