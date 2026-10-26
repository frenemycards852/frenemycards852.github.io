// Battle engine: two cards + tactics + seed → event list and result. No DOM access.
// Same inputs always give the same battle (seeded RNG), so both players see the same fight.
// Numbers live in data/config.json → battle; skill effects in data/effects.json.

import { createRng, hashString, chance, between } from './rng.js';
import { CUSTOM } from './card.js';

export const TACTICS = ['attack', 'defend', 'chaos'];
const KINDS = ['move', 'trait', 'weakness'];

// Effect for a card's move/trait/weakness. Custom entries get a pool effect picked from their name.
export function resolveEffect(entry, kind, effects) {
  const preset = entry.id !== CUSTOM && effects[kind][entry.id];
  if (preset) return { ...preset };
  const pool = effects.custom[kind];
  return { ...pool[hashString(`${kind}:${(entry.name ?? '').trim()}`) % pool.length] };
}

function makeFighter(card, tacticId, side, { rules, statKeys, effects }) {
  const stat = Object.fromEntries(statKeys.map((key, i) => [key, card.stats[i]]));
  const maxHp = Math.round(rules.hpBase + stat.hp * rules.hpScale);
  const fighter = {
    side, type: card.type, stat, maxHp, hp: maxHp,
    tactic: rules.tactics[tacticId] ?? rules.tactics.chaos,
    moveUsed: false, stunned: false, nextMiss: false, pendingStrike: 0, survived: false, turns: 0, slow: false,
  };
  for (const kind of KINDS) fighter[kind] = resolveEffect(card[kind], kind, effects);
  return fighter;
}

// battle = { cards: [a, b], tactics: [ta, tb], seed }; data = { config, types, effects }.
export function simulateBattle({ cards, tactics, seed }, { config, types, effects }) {
  const rules = config.battle;
  const rand = createRng(`${rules.version}|${seed}`);
  const ctx = { rules, statKeys: config.stats.keys, effects };
  const f = cards.map((card, side) => makeFighter(card, tactics[side], side, ctx));
  const events = [];
  const log = (event) => events.push({ ...event, hp: [f[0].hp, f[1].hp] });
  const beats = (a, b) => types.beats[a.type] === b.type;
  let round = 0;
  let last = false;

  // One hit from attacker on defender. Returns the side that dropped to 0, or null.
  function attack(attacker, defender, via, multiplier = 1) {
    const base = { t: 'attack', via, side: attacker.side };
    if (defender.nextMiss) {
      defender.nextMiss = false;
      log({ ...base, missed: true });
      return null;
    }
    if (chance(rand, rules.dodge.base + defender.stat.luk * rules.dodge.lukScale)) {
      log({ ...base, dodged: 'luck' });
      return null;
    }
    if (defender.trait.kind === 'dodge' && chance(rand, defender.trait.chance)) {
      log({ ...base, dodged: 'trait' });
      return null;
    }
    const triggers = [];
    const crit = chance(rand, rules.crit.base + attacker.stat.luk * rules.crit.lukScale);
    const effective = beats(attacker, defender);
    const range = attacker.tactic.randomRange ?? rules.randomRange;
    let dealt = attacker.tactic.dealt * (attacker.slow ? 1 : rules.firstStrikeBonus);
    if (attacker.weakness.kind === 'lowHpWeak' && attacker.hp < attacker.maxHp * attacker.weakness.below) {
      dealt *= attacker.weakness.dealt;
      triggers.push({ side: attacker.side, slot: 'weakness', kind: 'lowHpWeak' });
    }
    let taken = defender.tactic.taken;
    // surviveOnce cards are also a little thick-skinned all battle (effects.json → taken).
    if (defender.trait.kind === 'surviveOnce') taken *= defender.trait.taken ?? 1;
    if (last && defender.trait.kind === 'finalRoundGuard') {
      taken *= defender.trait.taken;
      triggers.push({ side: defender.side, slot: 'trait', kind: 'finalRoundGuard' });
    }
    if (last && defender.weakness.kind === 'finalRoundVulnerable') {
      taken *= defender.weakness.taken;
      triggers.push({ side: defender.side, slot: 'weakness', kind: 'finalRoundVulnerable' });
    }
    if (defender.slow && defender.weakness.kind === 'slowerVulnerable') {
      taken *= defender.weakness.taken;
      triggers.push({ side: defender.side, slot: 'weakness', kind: 'slowerVulnerable' });
    }
    const raw = (rules.attackBase + attacker.stat.atk * rules.attackScale)
      * multiplier
      * (effective ? rules.typeMultiplier : 1)
      * between(rand, range[0], range[1])
      * (crit ? rules.crit.multiplier : 1)
      * dealt;
    const dmg = Math.max(rules.minDamage, Math.round((raw - defender.stat.def * rules.defenseReduce) * taken));
    defender.hp -= dmg;
    let saved = false;
    if (defender.hp <= 0 && defender.trait.kind === 'surviveOnce' && !defender.survived) {
      // Hangs on with a share of max Stamina (effects.json → keep), at least 1.
      defender.hp = Math.max(1, Math.round(defender.maxHp * (defender.trait.keep ?? 0)));
      defender.survived = true;
      saved = true;
    }
    defender.hp = Math.max(0, defender.hp);
    log({ ...base, dmg, crit, effective, triggers, saved });
    if (defender.hp === 0) return defender.side;
    if (defender.trait.kind === 'reflect') {
      const back = Math.max(1, Math.round(dmg * defender.trait.ratio));
      attacker.hp = Math.max(0, attacker.hp - back);
      log({ t: 'trait', side: defender.side, kind: 'reflect', dmg: back });
      if (attacker.hp === 0) return attacker.side;
    }
    return null;
  }

  function heal(fighter, amount) {
    const gain = Math.min(amount, fighter.maxHp - fighter.hp);
    fighter.hp += gain;
    return gain;
  }

  function wantsMove(actor) {
    if (actor.moveUsed) return false;
    const kind = actor.move.kind;
    // Moves that act on the opponent's next turn are wasted if that turn never comes.
    if ((kind === 'nextMiss' || kind === 'stun') && last && actor.slow) return false;
    if ((kind === 'heal' || kind === 'gambleHeal') && !last) {
      return actor.hp < actor.maxHp * rules.healMoveBelow;
    }
    const odds = actor.tactic.moveChance;
    return last || chance(rand, odds[Math.min(round - 1, odds.length - 1)]);
  }

  function useMove(actor, target) {
    actor.moveUsed = true;
    const move = actor.move;
    const base = { t: 'move', side: actor.side, kind: move.kind };
    switch (move.kind) {
      case 'heal':
        log({ ...base, heal: heal(actor, move.amount) });
        return null;
      case 'gambleHeal': {
        const ok = chance(rand, move.chance);
        log({ ...base, ok, heal: ok ? heal(actor, move.amount) : 0 });
        return null;
      }
      case 'nextMiss':
        // The next attack aimed at the actor misses.
        actor.nextMiss = true;
        log(base);
        return null;
      case 'stun':
        target.stunned = true;
        log(base);
        return null;
      case 'delayedStrike':
        actor.pendingStrike = move.multiplier;
        log(base);
        return null;
      case 'strike':
        log(base);
        return attack(actor, target, 'move', move.multiplier);
      default:
        return attack(actor, target, 'normal');
    }
  }

  function landPending(actor, target) {
    if (!actor.pendingStrike) return null;
    const multiplier = actor.pendingStrike;
    actor.pendingStrike = 0;
    return attack(actor, target, 'delayed', multiplier);
  }

  function takeTurn(actor, target) {
    const down = landPending(actor, target);
    if (down !== null) return down;
    const firstTurn = actor.turns === 0;
    actor.turns += 1;
    if (firstTurn && actor.weakness.kind === 'skipFirstTurn' && chance(rand, actor.weakness.chance ?? 1)) {
      log({ t: 'skip', side: actor.side, cause: 'weakness', kind: 'skipFirstTurn' });
      return null;
    }
    if (actor.stunned) {
      actor.stunned = false;
      log({ t: 'skip', side: actor.side, cause: 'stun' });
      return null;
    }
    if (actor.weakness.kind === 'distracted' && chance(rand, actor.weakness.chance)) {
      log({ t: 'skip', side: actor.side, cause: 'weakness', kind: 'distracted' });
      return null;
    }
    return wantsMove(actor) ? useMove(actor, target) : attack(actor, target, 'normal');
  }

  log({ t: 'start' });
  let down = null;
  for (round = 1; round <= rules.rounds && down === null; round++) {
    last = round === rules.rounds;
    log({ t: 'round', round });
    const [a, b] = f;
    const aFirst = a.stat.spd !== b.stat.spd ? a.stat.spd > b.stat.spd : rand() < 0.5;
    const order = aFirst ? [a, b] : [b, a];
    order[0].slow = false;
    order[1].slow = true;
    for (const actor of order) {
      down = takeTurn(actor, f[1 - actor.side]);
      if (down !== null) break;
    }
    if (down !== null) break;
    if (last) {
      for (const actor of f) {
        down = landPending(actor, f[1 - actor.side]);
        if (down !== null) break;
      }
      if (down !== null) break;
    }
    for (const fighter of f) {
      if (fighter.trait.kind !== 'regen') continue;
      const gain = heal(fighter, fighter.trait.amount);
      if (gain > 0) log({ t: 'trait', side: fighter.side, kind: 'regen', heal: gain });
    }
  }

  const pct = f.map((x) => x.hp / x.maxHp);
  let winner;
  let reason;
  if (down !== null) {
    winner = 1 - down;
    reason = 'ko';
  } else {
    // Compare in tenths of a percent so tiny float differences can't decide the fight.
    const [pa, pb] = pct.map((p) => Math.round(p * 1000));
    winner = pa === pb ? null : (pa > pb ? 0 : 1);
    reason = winner === null ? 'draw' : 'points';
  }
  log({ t: 'end', winner, reason });
  return {
    winner,
    reason,
    hp: f.map((x) => x.hp),
    maxHp: f.map((x) => x.maxHp),
    pct,
    effects: f.map((x) => ({ move: x.move, trait: x.trait, weakness: x.weakness })),
    events,
  };
}
