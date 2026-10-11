// Seeded random numbers: the same seed always gives the same sequence on every device.
// No DOM access. Uses only integer maths (Math.imul), so results match across browsers.

// Text → 32-bit number (FNV-1a over UTF-16 code units).
export function hashString(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Returns rand() → [0, 1). Seed may be a number or a string (mulberry32).
export function createRng(seed) {
  let s = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;
  return function rand() {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// A fresh random seed for a new challenge (not seeded itself).
export function randomSeed(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function chance(rand, p) {
  return rand() < p;
}

export function between(rand, min, max) {
  return min + rand() * (max - min);
}
