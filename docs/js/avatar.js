// Avatar: compose an SVG string from part indices (data/avatar.json). No DOM access.
// Indices follow def.partOrder. The head is its own <g class="head"> so it can be
// swapped later (e.g. for a local photo) without touching the body.

export function partIndex(def, part) {
  return def.partOrder.indexOf(part);
}

export function optionCount(def, part) {
  return def.parts[part].options.length;
}

export function isAvatarValid(def, indices) {
  return (
    Array.isArray(indices) &&
    indices.length === def.partOrder.length &&
    def.partOrder.every((part, i) => Number.isInteger(indices[i]) && indices[i] >= 0 && indices[i] < optionCount(def, part))
  );
}

// Option 0 of a part listed in randomNoneChance means "none" and gets that chance.
// A style may limit some parts to a pool of options (e.g. hair styles).
export function randomAvatar(def, rand = Math.random, style = null) {
  return def.partOrder.map((part) => {
    const pool = style?.randomPools?.[part];
    if (pool) return pool[Math.floor(rand() * pool.length)];
    const count = optionCount(def, part);
    const none = def.randomNoneChance?.[part];
    if (none != null) {
      return rand() < none ? 0 : 1 + Math.floor(rand() * (count - 1));
    }
    return Math.floor(rand() * count);
  });
}

// Mix a hex colour toward black; amount 0..1.
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

function slot(option, name) {
  if (typeof option === 'string') return name === 'main' ? option : '';
  return option[name] || '';
}

// Returns a standalone SVG string. Fragments come only from our own data file.
// Pass viewBox (e.g. def.headViewBox) to zoom in on part of the avatar.
export function avatarSvg(def, indices, { label = '', viewBox = def.viewBox } = {}) {
  const pick = (part) => def.parts[part].options[indices[partIndex(def, part)]];
  const skin = pick('skin');
  const colors = {
    skin,
    skinShade: shade(skin, 0.12),
    hair: pick('hairColor'),
    shirt: pick('shirt'),
    line: def.line,
  };
  const fill = (svg) => svg.replace(/\{(\w+)\}/g, (match, key) => colors[key] ?? match);
  const head = def.layers.map(([part, name]) => slot(pick(part), name)).join('');
  const aria = label ? `role="img" aria-label="${label.replace(/[&<>"]/g, '')}"` : 'aria-hidden="true"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" ${aria}>`
    + `<g class="body">${fill(def.body)}</g><g class="head">${fill(head)}</g></svg>`;
}

// Copy of indices with one part changed.
export function withPart(def, indices, part, value) {
  const next = [...indices];
  next[partIndex(def, part)] = value;
  return next;
}
