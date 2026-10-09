// Avatar: compose an SVG string from part indices (data/avatar.json). No DOM access.
// A stored avatar is [styleIndex, ...one option index per part in that style's partOrder].
// The head is its own <g class="head"> so it can be swapped later (e.g. for a local
// photo) without touching the body.

export function avatarStyle(def, indices) {
  return def.styles[indices[0]];
}

export function optionCount(def, part) {
  return def.parts[part].options.length;
}

// Position of a part inside the stored array (-1 if the style has no such part).
export function partIndex(style, part) {
  const i = style.partOrder.indexOf(part);
  return i < 0 ? -1 : i + 1;
}

export function isAvatarValid(def, indices) {
  if (!Array.isArray(indices)) return false;
  const style = Number.isInteger(indices[0]) ? def.styles[indices[0]] : null;
  return (
    Boolean(style) &&
    indices.length === style.partOrder.length + 1 &&
    style.partOrder.every((part, i) => {
      const v = indices[i + 1];
      return Number.isInteger(v) && v >= 0 && v < optionCount(def, part);
    })
  );
}

export function baseAvatar(def, styleIndex) {
  return [styleIndex, ...def.styles[styleIndex].base];
}

// Option 0 of a part listed in the style's randomNoneChance means "none" and gets that chance.
export function randomAvatar(def, styleIndex, rand = Math.random) {
  const style = def.styles[styleIndex];
  return [styleIndex, ...style.partOrder.map((part) => {
    const count = optionCount(def, part);
    const none = style.randomNoneChance?.[part];
    if (none != null) {
      return rand() < none ? 0 : 1 + Math.floor(rand() * (count - 1));
    }
    return Math.floor(rand() * count);
  })];
}

// Copy of indices with one part changed.
export function withPart(def, indices, part, value) {
  const next = [...indices];
  next[partIndex(avatarStyle(def, indices), part)] = value;
  return next;
}

// Mix a hex colour toward a target (0 = black, 255 = white); amount 0..1.
function mix(hex, target, amount) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift) => {
    const v = (n >> shift) & 255;
    return Math.round(v + (target - v) * amount);
  };
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}
const shade = (hex, amount) => mix(hex, 0, amount);
const tint = (hex, amount) => mix(hex, 255, amount);

function slot(option, name) {
  if (option == null) return '';
  if (typeof option === 'string') return name === 'main' ? option : '';
  return option[name] || '';
}

// Returns a standalone SVG string. Fragments come only from our own data file.
// Pass viewBox (e.g. def.headViewBox) to zoom in on part of the avatar.
export function avatarSvg(def, indices, { label = '', viewBox = def.viewBox } = {}) {
  const style = avatarStyle(def, indices);
  const pick = (part) => {
    const i = partIndex(style, part);
    return i < 0 ? null : def.parts[part].options[indices[i]];
  };
  const skin = pick('skin');
  const hair = pick('hairColor');
  const shirt = pick('shirt');
  const colors = {
    skin,
    skinShade: shade(skin, 0.1),
    hair,
    hairLight: tint(hair, 0.3),
    shirt,
    shirtShade: shade(shirt, 0.15),
    shirtLight: tint(shirt, 0.25),
    line: def.line,
  };
  const fill = (svg) => svg.replace(/\{(\w+)\}/g, (match, key) => colors[key] ?? match);
  const draw = (layers) => layers.map(([part, name]) => slot(pick(part), name)).join('');
  const aria = label ? `role="img" aria-label="${label.replace(/[&<>"]/g, '')}"` : 'aria-hidden="true"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" ${aria}>`
    + `<g class="body">${fill(def.neck + draw(def.bodyLayers))}</g>`
    + `<g class="head">${fill(draw(def.headLayers))}</g></svg>`;
}
