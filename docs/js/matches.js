// Challenges this phone sent, and challenges it already fought (locked: one fight per
// challenge, so a reload can't be used to retry with another card or tactic).
// Kept in localStorage; without storage nothing is locked and everything still works.

const KEY = 'fc.matches';
const STORE_VERSION = 1;
const MAX = 50;

function read() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (stored?.v !== STORE_VERSION) return { sent: [], fought: [] };
    return {
      sent: Array.isArray(stored.sent) ? stored.sent.filter((x) => typeof x === 'string') : [],
      fought: Array.isArray(stored.fought) ? stored.fought.filter((x) => x && typeof x.nonce === 'string') : [],
    };
  } catch {
    return { sent: [], fought: [] };
  }
}

function write(store) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: STORE_VERSION, sent: store.sent.slice(0, MAX), fought: store.fought.slice(0, MAX) }));
  } catch {
    // Storage unavailable: nothing is remembered.
  }
}

export function rememberSent(nonce) {
  const store = read();
  store.sent = [nonce, ...store.sent.filter((x) => x !== nonce)];
  write(store);
}

export function wasSent(nonce) {
  return read().sent.includes(nonce);
}

// fight = { card, tactic, name } chosen by this phone to answer the challenge.
export function lockFight(nonce, fight) {
  const store = read();
  if (store.fought.some((x) => x.nonce === nonce)) return;
  // The photo stays in the album only (withAlbumPhoto brings it back); this list stays small.
  const { photo, ...card } = fight.card;
  store.fought.unshift({ nonce, card, tactic: fight.tactic, name: fight.name ?? '', at: Date.now() });
  write(store);
}

export function lockedFight(nonce) {
  return read().fought.find((x) => x.nonce === nonce) ?? null;
}
