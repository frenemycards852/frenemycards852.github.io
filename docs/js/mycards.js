// "My cards": cards this phone made or received, newest first, kept in localStorage.
// Storage may be missing or full; everything still works, the list is just empty.

const KEY = 'fc.myCards';
const STORE_VERSION = 1;

// Same card, same key (so opening a link twice doesn't add it twice).
export function cardKey(card) {
  const { name, gender, type, stats, move, trait, weakness, desc, rarity } = card;
  return JSON.stringify([name, gender, type, stats, move, trait, weakness, desc, rarity]);
}

function read() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (stored?.v !== STORE_VERSION || !Array.isArray(stored.items)) return [];
    return stored.items.filter((item) => item && typeof item.card === 'object' && item.card);
  } catch {
    return [];
  }
}

function write(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: STORE_VERSION, items }));
    return true;
  } catch {
    return false;
  }
}

// Entries: { card, source: "made" | "received", at: timestamp }.
// isValid(card) drops anything that no longer passes the card checks.
export function listMyCards(isValid = () => true) {
  return read().filter((item) => {
    try {
      return isValid(item.card);
    } catch {
      return false;
    }
  });
}

// Whether this browser lets us keep the album (private modes and some in-app browsers don't).
export function canStoreCards() {
  try {
    const probe = '__fc_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function removeMyCard(card) {
  const key = cardKey(card);
  return write(read().filter((item) => cardKey(item.card) !== key));
}

// Adds imported cards after the ones already here (existing cards keep their place).
// Returns how many were new.
export function importMyCards(items, max) {
  const current = read();
  const keys = new Set(current.map((item) => cardKey(item.card)));
  const added = [];
  for (const item of items) {
    const key = cardKey(item.card);
    if (keys.has(key)) continue;
    keys.add(key);
    added.push({ card: item.card, source: item.source, at: Date.now() });
  }
  write([...added, ...current].slice(0, max));
  return added.length;
}

export function saveMyCard(card, source, max) {
  const key = cardKey(card);
  const items = read().filter((item) => cardKey(item.card) !== key);
  items.unshift({ card, source, at: Date.now() });
  return write(items.slice(0, max));
}
