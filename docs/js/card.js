// Card model: defaults, stat rules, text checks, random picks. No DOM access.

export const SKILL_KINDS = ['move', 'trait', 'weakness'];
export const CUSTOM = 'custom';

// A fresh draft: avatar waits for a boy/girl choice; first preset of each kind.
export function createDraft({ config, types, skills, descriptions }) {
  const draft = {
    name: '',
    avatar: null,
    type: types.types[0].id,
    stats: [...config.stats.default],
    desc: { id: descriptions.items[0].id, text: '' },
  };
  for (const kind of SKILL_KINDS) {
    draft[kind] = { id: skills[kind][0].id, name: '', desc: '' };
  }
  return draft;
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
