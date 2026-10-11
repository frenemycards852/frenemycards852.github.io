// Card ⇄ link payload (the part after "#c="). No DOM access.
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

// ---------- public ----------

// card: the finished card (see card.js toCard) plus optional `from` (maker's name).
export async function encodeCard(card) {
  const json = new TextEncoder().encode(JSON.stringify(pack(card)));
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
  return `${CODEC_VERSION}${format}${toBase64Url(bytes)}`;
}

export async function decodeCard(payload) {
  if (typeof payload !== 'string' || payload.length < 3) throw new CodecError('corrupt', 'empty');
  const version = Number(payload[0]);
  if (!Number.isInteger(version) || version < 1) throw new CodecError('corrupt', 'no version');
  if (version > CODEC_VERSION) throw new CodecError('version', `version ${version}`);
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
  let list;
  try {
    list = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new CodecError('corrupt', 'bad json');
  }
  return unpack(list);
}
