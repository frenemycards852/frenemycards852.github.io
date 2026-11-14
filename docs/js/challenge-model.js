// Challenge rules: checks and display text for challenges. No DOM access.

import { TACTICS, ACTIONS, isPlanValid } from './battle.js';
import { hashString } from './rng.js';
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
    && (challenge.plan ? isPlanValid(challenge.plan, config.planBattle) : TACTICS.includes(challenge.tactic))
    && isPenaltyValid(challenge.penalty, data)
    && textLength(challenge.name) <= config.card.nameMax
    && !isBlocked(challenge.name, blocklist.terms)
    && NONCE.test(challenge.nonce);
}

// Checks a replay that arrived in a link.
export function isReplayValid(replay, data) {
  const { config, blocklist } = data;
  return replay.cards.every((card) => isCardValid(card, data))
    && (replay.plans
      ? replay.plans.length === 2 && replay.plans.every((plan) => isPlanValid(plan, config.planBattle))
      : replay.tactics.every((tactic) => TACTICS.includes(tactic)))
    && isPenaltyValid(replay.penalty, data)
    && replay.people.every((name) => textLength(name) <= config.card.nameMax && !isBlocked(name, blocklist.terms))
    && NONCE.test(replay.nonce);
}

// How a side fights, as text: a tactic id (rules v2) or the plan letters joined (rules v3).
export const strategyText = (tactic, plan) => (plan ? plan.join(',') : tactic);

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

// An older challenge (tactic, rules v2) answered with plan battles: the challenger's tactic becomes a
// plan (config.json → planBattle.fromTactic); "chaos" gets one valid plan picked from the challenge's
// nonce, so every phone converts it the same way.
export function planFromTactic(tactic, nonce, rules) {
  const fixed = rules.fromTactic?.[tactic];
  if (fixed && isPlanValid(fixed, rules)) return [...fixed];
  const plans = [];
  const build = (plan) => {
    if (plan.length === rules.rounds) {
      if (isPlanValid(plan, rules)) plans.push(plan);
      return;
    }
    for (const action of ACTIONS) build([...plan, action]);
  };
  build([]);
  return plans[hashString(`plan|${nonce}`) % plans.length];
}
