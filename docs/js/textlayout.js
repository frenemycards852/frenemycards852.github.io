// Canvas text helpers: wrap and shrink text so it fits a box.
// Uses only a 2D context (no page DOM). Chinese breaks per character, English per word.

export const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", "PingFang HK", "Microsoft JhengHei", "Noto Sans TC", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

export function setFont(ctx, size, weight = 400) {
  ctx.font = `${weight} ${size}px ${FONT_STACK}`;
}

const CJK = /[⺀-鿿豈-﫿＀-￯　-〿]/u;

function tokens(text) {
  const out = [];
  let word = '';
  for (const ch of Array.from(text)) {
    if (ch === ' ' || CJK.test(ch)) {
      if (word) out.push(word);
      word = '';
      out.push(ch);
    } else {
      word += ch;
    }
  }
  if (word) out.push(word);
  return out;
}

export function wrapLines(ctx, text, maxWidth) {
  const fits = (s) => ctx.measureText(s).width <= maxWidth;
  // Split any token that is wider than a whole line into single characters.
  const parts = tokens(text).flatMap((tok) => (fits(tok) ? [tok] : Array.from(tok)));
  const lines = [];
  let line = '';
  for (const tok of parts) {
    if (line === '' && tok === ' ') continue;
    if (fits(line + tok)) {
      line += tok;
    } else {
      lines.push(line.trimEnd());
      line = tok === ' ' ? '' : tok;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

function ellipsize(ctx, text, maxWidth) {
  const chars = Array.from(text);
  while (chars.length && ctx.measureText(`${chars.join('')}…`).width > maxWidth) chars.pop();
  return `${chars.join('').trimEnd()}…`;
}

// One line: shrink from size to minSize, then cut with "…". Sets ctx.font.
export function fitSingle(ctx, text, { maxWidth, size, minSize = size, weight = 400 }) {
  for (let s = size; s >= minSize; s -= 2) {
    setFont(ctx, s, weight);
    if (ctx.measureText(text).width <= maxWidth) return { text, size: s };
  }
  setFont(ctx, minSize, weight);
  return { text: ellipsize(ctx, text, maxWidth), size: minSize };
}

// Several lines: shrink until it fits in maxLines, then cut the last line. Sets ctx.font.
export function fitLines(ctx, text, { maxWidth, maxLines, size, minSize = size, weight = 400 }) {
  for (let s = size; s >= minSize; s -= 2) {
    setFont(ctx, s, weight);
    const lines = wrapLines(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { lines, size: s };
  }
  setFont(ctx, minSize, weight);
  const lines = wrapLines(ctx, text, maxWidth).slice(0, maxLines);
  lines[maxLines - 1] = ellipsize(ctx, lines[maxLines - 1], maxWidth);
  return { lines, size: minSize };
}
