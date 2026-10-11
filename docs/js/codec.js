// Cards, challenges and replays ⇄ link payloads (after "#c=" / "#x=" / "#r="). No DOM access.
//
// Payload = "<version><format><base64url bytes>"
//   version 1, format "j" = plain JSON bytes, "z" = deflate-raw compressed JSON bytes.
// v1 JSON is a compact array:
//   [name, gender ("b"|"g"), type id, [5 stats], move, trait, weakness, desc, rarity, from]
//   skills: preset number (m3 → 3) or [customName, customDesc]
//   desc: preset number (d2 → 2) or custom text
// Old versions must keep decoding forever; add a new version instead of changing v1.

export const CODEC_VERSION = 1;

const SKILL_PREFIX = { move: 'm', trait: 't', weakness: 'w' };
const GENDER_CODE = { boy: 'b', girl: 'g' };
const GENDER_FROM_CODE = { b: 'boy', g: 'girl' };

export class CodecError extends Error {
  // code: "corrupt" (broken link), "version" (made by a newer app), "unsupported" (old browser)
  constructor(code, message) {
    super(message ?? code);
    this.code = code;
  }
}

// ---------- bytes ⇄ base64url ----------

function toBase64Url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new CodecError('corrupt', 'bad characters');
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  let binary;
  try {
    binary = atob(padded);
  } catch {
    throw new CodecError('corrupt', 'bad base64');
  }
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

const canCompress = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

// ---------- card ⇄ compact array ----------

function packSkill(entry, kind) {
  if (entry.id === 'custom') return [entry.name.trim(), entry.desc.trim()];
  return Number(entry.id.slice(SKILL_PREFIX[kind].length));
}

function unpackSkill(value, kind) {
  if (Number.isInteger(value)) return { id: `${SKILL_PREFIX[kind]}${value}`, name: '', desc: '' };
  if (Array.isArray(value) && value.length === 2 && value.every((v) => typeof v === 'string')) {
    return { id: 'custom', name: value[0], desc: value[1] };
  }
  throw new CodecError('corrupt', `bad ${kind}`);
}

function pack(card) {
  return [
    card.name,
    GENDER_CODE[card.gender],
    card.type,
    card.stats,
    packSkill(card.move, 'move'),
    packSkill(card.trait, 'trait'),
    packSkill(card.weakness, 'weakness'),
    card.desc.id === 'custom' ? card.desc.text.trim() : Number(card.desc.id.slice(1)),
    card.rarity,
    card.from ?? '',
  ];
}

function unpack(list) {
  if (!Array.isArray(list) || list.length < 10) throw new CodecError('corrupt', 'bad shape');
  const [name, gender, type, stats, move, trait, weakness, desc, rarity, from] = list;
  if (typeof name !== 'string' || typeof type !== 'string' || typeof rarity !== 'string' || typeof from !== 'string') {
    throw new CodecError('corrupt', 'bad fields');
  }
  if (!Array.isArray(stats)) throw new CodecError('corrupt', 'bad stats');
  let descEntry;
  if (Number.isInteger(desc)) descEntry = { id: `d${desc}`, text: '' };
  else if (typeof desc === 'string') descEntry = { id: 'custom', text: desc };
  else throw new CodecError('corrupt', 'bad desc');
  return {
    name,
    gender: GENDER_FROM_CODE[gender] ?? null,
    type,
    stats: [...stats],
    move: unpackSkill(move, 'move'),
    trait: unpackSkill(trait, 'trait'),
    weakness: unpackSkill(weakness, 'weakness'),
    desc: descEntry,
    rarity,
    from,
  };
}

// ---------- payload framing (shared by all link kinds) ----------

async function encodeList(list, version) {
  const json = new TextEncoder().encode(JSON.stringify(list));
  let format = 'j';
  let bytes = json;
  if (canCompress()) {
    try {
      const zipped = await pipe(json, new CompressionStream('deflate-raw'));
      if (zipped.length < json.length) {
        format = 'z';
        bytes = zipped;
      }
    } catch {
      // Keep plain JSON if compression fails.
    }
  }
  return `${version}${format}${toBase64Url(bytes)}`;
}

async function decodeList(payload, currentVersion) {
  if (typeof payload !== 'string' || payload.length < 3) throw new CodecError('corrupt', 'empty');
  const version = Number(payload[0]);
  if (!Number.isInteger(version) || version < 1) throw new CodecError('corrupt', 'no version');
  if (version > currentVersion) throw new CodecError('version', `version ${version}`);
  const format = payload[1];
  let bytes = fromBase64Url(payload.slice(2));
  if (format === 'z') {
    if (!canCompress()) throw new CodecError('unsupported', 'no DecompressionStream');
    try {
      bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    } catch {
      throw new CodecError('corrupt', 'bad compression');
    }
  } else if (format !== 'j') {
    throw new CodecError('corrupt', 'bad format');
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new CodecError('corrupt', 'bad json');
  }
}

// ---------- public: cards (#c=) ----------

// card: the finished card (see card.js toCard) plus optional `from` (maker's name).
export async function encodeCard(card) {
  return encodeList(pack(card), CODEC_VERSION);
}

export async function decodeCard(payload) {
  return unpack(await decodeList(payload, CODEC_VERSION));
}

// ---------- public: challenges (#x=) ----------
//
// Challenge v1 JSON: [card array (as above), tactic ("a"|"d"|"c"), penalty, challenger name, nonce]
//   penalty: preset number (p2 → 2) or custom text

export const CHALLENGE_VERSION = 1;

const TACTIC_CODE = { attack: 'a', defend: 'd', chaos: 'c' };
const TACTIC_FROM_CODE = { a: 'attack', d: 'defend', c: 'chaos' };

// challenge = { card, tactic, penalty: { id, text }, name, nonce }
export async function encodeChallenge(challenge) {
  const { card, tactic, penalty, name, nonce } = challenge;
  const packedPenalty = penalty.id === 'custom' ? penalty.text.trim() : Number(penalty.id.slice(1));
  return encodeList([pack(card), TACTIC_CODE[tactic], packedPenalty, name ?? '', nonce], CHALLENGE_VERSION);
}

export async function decodeChallenge(payload) {
  const list = await decodeList(payload, CHALLENGE_VERSION);
  if (!Array.isArray(list) || list.length < 5) throw new CodecError('corrupt', 'bad shape');
  const [card, tactic, penalty, name, nonce] = list;
  if (!(tactic in TACTIC_FROM_CODE)) throw new CodecError('corrupt', 'bad tactic');
  if (typeof name !== 'string' || typeof nonce !== 'string') throw new CodecError('corrupt', 'bad fields');
  let penaltyEntry;
  if (Number.isInteger(penalty)) penaltyEntry = { id: `p${penalty}`, text: '' };
  else if (typeof penalty === 'string') penaltyEntry = { id: 'custom', text: penalty };
  else throw new CodecError('corrupt', 'bad penalty');
  return { card: unpack(card), tactic: TACTIC_FROM_CODE[tactic], penalty: penaltyEntry, name, nonce };
}

// ---------- public: replays (#r=) ----------
//
// Replay v1 JSON: [card A, card B, tactic A, tactic B, penalty, name A, name B, nonce, battle rules version]
// The battle seed is rebuilt from the nonce + card B + tactic B, exactly like when it was fought.

export const REPLAY_VERSION = 1;

const packPenalty = (penalty) => (penalty.id === 'custom' ? penalty.text.trim() : Number(penalty.id.slice(1)));

function unpackPenalty(value) {
  if (Number.isInteger(value)) return { id: `p${value}`, text: '' };
  if (typeof value === 'string') return { id: 'custom', text: value };
  throw new CodecError('corrupt', 'bad penalty');
}

// replay = { cards: [a, b], tactics: [ta, tb], penalty, people: [nameA, nameB], nonce, rules }
export async function encodeReplay(replay) {
  const { cards, tactics, penalty, people, nonce, rules } = replay;
  return encodeList([
    pack(cards[0]), pack(cards[1]), TACTIC_CODE[tactics[0]], TACTIC_CODE[tactics[1]],
    packPenalty(penalty), people[0] ?? '', people[1] ?? '', nonce, rules,
  ], REPLAY_VERSION);
}

export async function decodeReplay(payload) {
  const list = await decodeList(payload, REPLAY_VERSION);
  if (!Array.isArray(list) || list.length < 9) throw new CodecError('corrupt', 'bad shape');
  const [a, b, ta, tb, penalty, nameA, nameB, nonce, rules] = list;
  if (!(ta in TACTIC_FROM_CODE) || !(tb in TACTIC_FROM_CODE)) throw new CodecError('corrupt', 'bad tactic');
  if ([nameA, nameB, nonce].some((x) => typeof x !== 'string') || !Number.isInteger(rules)) {
    throw new CodecError('corrupt', 'bad fields');
  }
  return {
    cards: [unpack(a), unpack(b)],
    tactics: [TACTIC_FROM_CODE[ta], TACTIC_FROM_CODE[tb]],
    penalty: unpackPenalty(penalty),
    people: [nameA, nameB],
    nonce,
    rules,
  };
}
