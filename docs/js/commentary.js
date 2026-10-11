// Battle commentary: turns battle events into funny lines. No DOM access.
// Uses its own RNG stream, so changing the wording never changes who wins.
// Line pools live in data/commentary/<lang>.json.

import { createRng } from './rng.js';

const HAN = /[㐀-鿿豈-﫿]/;
const LATIN = /[A-Za-z0-9]/;

// ctx = { names: [a, b], types: [label, label], typeIds: [id, id], skills: [{ move, trait, weakness }, …] }
// (skill names already resolved in the current language).
// Returns one array of lines per battle event (some events have none).
export function commentate(result, ctx, lines, seed) {
  const rand = createRng(`talk|${seed}`);
  const unused = {};
  const lastPick = {};

  // Use every line in a pool once before repeating, and never the same line twice in a row.
  function pick(key) {
    const pool = lines[key];
    if (!pool || pool.length === 0) return null;
    if (!unused[key]?.length) {
      unused[key] = pool.map((_, i) => i).filter((i) => pool.length === 1 || i !== lastPick[key]);
    }
    const [i] = unused[key].splice(Math.floor(rand() * unused[key].length), 1);
    lastPick[key] = i;
    return pool[i];
  }

  function vars(side, extra) {
    const other = 1 - side;
    const mine = ctx.skills[side];
    const theirs = ctx.skills[other];
    return {
      actor: ctx.names[side], opponent: ctx.names[other],
      type: ctx.types[side], oppType: ctx.types[other],
      move: mine.move, trait: mine.trait, weakness: mine.weakness,
      oppMove: theirs.move, oppTrait: theirs.trait, oppWeakness: theirs.weakness,
      ...extra,
    };
  }

  // Fill {placeholders}. A value starting/ending with a Latin letter or digit gets a space
  // where it touches a Chinese character ("阿明中招", "Jessica 中招", "扣 22 點").
  const fill = (template, v) => template.replace(/\{(\w+)\}/g, (match, key, at) => {
    if (!(key in v)) return match;
    let text = String(v[key]);
    if (HAN.test(template[at - 1] ?? '') && LATIN.test(text[0])) text = ` ${text}`;
    if (HAN.test(template[at + match.length] ?? '') && LATIN.test(text[text.length - 1])) text = `${text} `;
    return text;
  });

  function say(out, keys, side, extra = {}) {
    for (const key of [].concat(keys)) {
      const template = pick(key);
      if (template) {
        out.push(fill(template, vars(side, extra)));
        return;
      }
    }
  }

  function attackLines(out, e) {
    const target = 1 - e.side;
    if (e.missed) return say(out, 'attack.missed', e.side);
    if (e.dodged) return say(out, e.dodged === 'trait' ? 'attack.dodgeTrait' : 'attack.dodgeLuck', e.side);
    const extra = { dmg: e.dmg };
    if (e.via === 'normal') {
      say(out, e.crit ? 'attack.crit' : 'attack.hit', e.side, extra);
    } else {
      say(out, e.via === 'delayed' ? 'attack.delayed' : 'attack.moveHit', e.side, extra);
      if (e.crit) say(out, 'attack.critExtra', e.side, extra);
    }
    if (e.effective) say(out, [`effective.${ctx.typeIds[e.side]}`, 'effective'], e.side, extra);
    for (const trigger of e.triggers) say(out, `trigger.${trigger.kind}`, trigger.side, extra);
    if (e.saved) say(out, 'trait.surviveOnce', target, extra);
    return undefined;
  }

  return result.events.map((e) => {
    const out = [];
    switch (e.t) {
      case 'start':
        say(out, 'start', 0);
        break;
      case 'round':
        say(out, e.round === ctx.rounds ? 'finalRound' : 'round', 0, { n: e.round });
        break;
      case 'skip':
        say(out, e.cause === 'stun' ? 'skip.stun' : `skip.${e.kind}`, e.side);
        break;
      case 'move': {
        let key = `move.${e.kind}`;
        if (e.kind === 'gambleHeal') key = e.ok ? 'move.gambleHeal.ok' : 'move.gambleHeal.fail';
        if (e.kind === 'heal' && e.heal === 0) key = 'move.healFull';
        say(out, key, e.side, { heal: e.heal });
        break;
      }
      case 'attack':
        attackLines(out, e);
        break;
      case 'trait':
        say(out, `trait.${e.kind}`, e.side, { dmg: e.dmg, heal: e.heal });
        break;
      case 'end':
        if (e.winner === null) say(out, 'end.draw', 0);
        else say(out, e.reason === 'ko' ? 'end.ko' : 'end.points', e.winner);
        break;
      default:
        break;
    }
    return out;
  });
}
