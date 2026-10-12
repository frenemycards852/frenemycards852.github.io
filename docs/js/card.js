// Card model: defaults, stat rules, text checks, random picks. No DOM access.

export const SKILL_KINDS = ['move', 'trait', 'weakness'];
export const CUSTOM = 'custom';

// A fresh draft: gender waits for a boy/girl choice; first preset of each kind.
export function createDraft({ config, types, skills, descriptions }) {
  const draft = {
    name: '',
    gender: null,
    type: types.types[0].id,
    stats: [...config.stats.default],
    desc: { id: descriptions.items[0].id, text: '' },
  };
  for (const kind of SKILL_KINDS) {
    draft[kind] = { id: skills[kind][0].id, name: '', desc: '' };
  }
  return draft;
}

// The finished card from a draft (what gets drawn, and later put in links).
export function toCard(draft) {
  return {
    name: draft.name.trim(),
    gender: draft.gender,
    type: draft.type,
    stats: [...draft.stats],
    move: { ...draft.move },
    trait: { ...draft.trait },
    weakness: { ...draft.weakness },
    desc: { ...draft.desc },
    rarity: draft.rarity,
    // Which character scene (only stored when not the first one).
    ...(draft.scene > 0 ? { scene: draft.scene } : {}),
    // The friend's photo stays on this phone: codec.js never puts it into a link.
    ...(draft.photo ? { photo: draft.photo } : {}),
  };
}

// Checks a card that arrived in a link. data: { config, types, skills, descriptions, blocklist }.
export function isCardValid(card, { config, types, skills, descriptions, blocklist }) {
  const terms = blocklist.terms;
  const textOk = (text, max, required) => typeof text === 'string'
    && textLength(text) <= max
    && (!required || text.trim().length > 0)
    && !isBlocked(text, terms);
  const skillOk = (entry, kind) => (entry.id === CUSTOM
    ? textOk(entry.name, Math.max(...Object.values(config.skills.customNameMax)), true) && textOk(entry.desc, config.skills.customDescMax, false)
    : skills[kind].some((x) => x.id === entry.id));
  return (
    textOk(card.name, config.card.nameMax, true)
    && isGender(config, card.gender)
    && types.types.some((x) => x.id === card.type)
    && isSceneValid(types, card)
    && isStatsValid(card.stats, config.stats)
    && SKILL_KINDS.every((kind) => skillOk(card[kind], kind))
    && (card.desc.id === CUSTOM
      ? textOk(card.desc.text, config.card.descriptionMax, true)
      : descriptions.items.some((x) => x.id === card.desc.id))
    && config.rarity.order.includes(card.rarity)
    && textOk(card.from ?? '', config.card.nameMax, false)
  );
}

// No scene (old cards) means the first one; otherwise it must exist for this type + gender.
export function isSceneValid(types, card) {
  if (card.scene === undefined) return true;
  return Number.isInteger(card.scene) && card.scene >= 0
    && card.scene < Math.max(1, cardScenes(types, card.type, card.gender).length);
}

export function isGender(config, value) {
  return config.card.genders.includes(value);
}

// Character scenes for a type + gender: [{ src, head }], the first one is the default.
// head = [x, y, r, tilt] (fractions of the picture, degrees) for the photo sticker.
export function cardScenes(types, typeId, gender) {
  return types.types.find((x) => x.id === typeId)?.art?.[gender] ?? [];
}

// The scene a card uses (falls back to the first one), or null if none is drawn yet.
export function cardScene(types, typeId, gender, scene = 0) {
  const list = cardScenes(types, typeId, gender);
  return list[scene] ?? list[0] ?? null;
}

// Illustration path (relative to docs/), or null if not drawn yet.
export function cardArt(types, typeId, gender, scene = 0) {
  return cardScene(types, typeId, gender, scene)?.src ?? null;
}

// Length in characters (code points), so emoji and Chinese count as one each.
export function textLength(text) {
  return Array.from(text).length;
}

export function clipText(text, max) {
  return Array.from(text).slice(0, max).join('');
}

function normalize(text) {
  return text.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
}

export function isBlocked(text, terms) {
  const n = normalize(text);
  return n.length > 0 && terms.some((term) => n.includes(normalize(term)));
}

// Required text: non-empty after trimming and not blocked.
export function isTextOk(text, terms) {
  return text.trim().length > 0 && !isBlocked(text, terms);
}

export function statTotal(stats) {
  return stats.reduce((sum, value) => sum + value, 0);
}

export function isStatsValid(stats, rules) {
  return (
    stats.length === rules.keys.length &&
    stats.every((v) => Number.isInteger(v) && v >= rules.min && v <= rules.max) &&
    statTotal(stats) === rules.total
  );
}

// Set one stat, clamped so it stays in range and the total never exceeds the limit.
export function setStat(stats, index, value, rules) {
  const others = statTotal(stats) - stats[index];
  const cap = Math.min(rules.max, rules.total - others);
  const next = [...stats];
  next[index] = Math.max(rules.min, Math.min(cap, Math.round(value)));
  return next;
}

// Hand out the points in steps, weighted so spreads are uneven and fun.
export function randomStats(rules, rand = Math.random) {
  const weights = rules.keys.map(() => rand() ** 2 + 0.05);
  const stats = rules.keys.map(() => rules.min);
  let left = rules.total - statTotal(stats);
  while (left >= rules.step) {
    const open = stats
      .map((value, i) => i)
      .filter((i) => stats[i] + rules.step <= rules.max);
    if (open.length === 0) break;
    let roll = rand() * open.reduce((sum, i) => sum + weights[i], 0);
    let pick = open[open.length - 1];
    for (const i of open) {
      roll -= weights[i];
      if (roll <= 0) {
        pick = i;
        break;
      }
    }
    stats[pick] += rules.step;
    left -= rules.step;
  }
  return stats;
}

// Random id from a list, different from the current one when possible.
export function pickOther(ids, current, rand = Math.random) {
  const choices = ids.length > 1 ? ids.filter((id) => id !== current) : ids;
  return choices[Math.floor(rand() * choices.length)];
}

export function isSkillOk(entry, terms) {
  if (entry.id !== CUSTOM) return true;
  return isTextOk(entry.name, terms) && !isBlocked(entry.desc, terms);
}

// Display text for a skill entry: preset text in the loaded language, or the custom text.
export function resolveSkill(entry, list) {
  if (entry.id === CUSTOM) return { name: entry.name.trim(), desc: entry.desc.trim() };
  const skill = list.find((x) => x.id === entry.id);
  return skill ? { name: skill.name, desc: skill.desc } : { name: '', desc: '' };
}

export function resolveDesc(entry, items) {
  if (entry.id === CUSTOM) return entry.text.trim();
  return items.find((x) => x.id === entry.id)?.text ?? '';
}

export function isDescOk(entry, terms) {
  return entry.id !== CUSTOM || isTextOk(entry.text, terms);
}
