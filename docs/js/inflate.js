// Raw DEFLATE (RFC 1951) decoder for links made with CompressionStream('deflate-raw').
// Used when the browser can't decompress by itself (iOS before 16.4, Chrome before 103).
// No DOM access. Throws on broken data.

const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

// Canonical Huffman table: how many codes of each bit length, and the symbols in code order.
function buildTable(lengths) {
  const counts = new Uint16Array(16);
  for (const len of lengths) counts[len]++;
  counts[0] = 0;
  const offsets = new Uint16Array(16);
  for (let i = 1; i < 16; i++) offsets[i] = offsets[i - 1] + counts[i - 1];
  const symbols = new Uint16Array(lengths.length);
  for (let sym = 0; sym < lengths.length; sym++) {
    if (lengths[sym]) symbols[offsets[lengths[sym]]++] = sym;
  }
  return { counts, symbols };
}

const FIXED_LIT = buildTable(Uint8Array.from({ length: 288 }, (_, i) => (i < 144 ? 8 : i < 256 ? 9 : i < 280 ? 7 : 8)));
const FIXED_DIST = buildTable(new Uint8Array(30).fill(5));

export function inflateRaw(input) {
  let pos = 0;
  let bitBuf = 0;
  let bitCount = 0;
  let out = new Uint8Array(Math.max(1024, input.length * 4));
  let outLen = 0;

  const push = (byte) => {
    if (outLen === out.length) {
      const bigger = new Uint8Array(out.length * 2);
      bigger.set(out);
      out = bigger;
    }
    out[outLen++] = byte;
  };
  const bits = (n) => {
    while (bitCount < n) {
      if (pos >= input.length) throw new Error('inflate: unexpected end');
      bitBuf |= input[pos++] << bitCount;
      bitCount += 8;
    }
    const value = bitBuf & ((1 << n) - 1);
    bitBuf >>>= n;
    bitCount -= n;
    return value;
  };
  // Read one symbol, one bit at a time (codes are stored most significant bit first).
  const decode = ({ counts, symbols }) => {
    let code = 0;
    let first = 0;
    let index = 0;
    for (let len = 1; len < 16; len++) {
      code |= bits(1);
      const count = counts[len];
      if (code - first < count) return symbols[index + code - first];
      index += count;
      first = (first + count) << 1;
      code <<= 1;
    }
    throw new Error('inflate: bad code');
  };
  const dynamicTables = () => {
    const litCount = bits(5) + 257;
    const distCount = bits(5) + 1;
    const codeLenCount = bits(4) + 4;
    const codeLens = new Uint8Array(19);
    for (let i = 0; i < codeLenCount; i++) codeLens[CODE_LENGTH_ORDER[i]] = bits(3);
    const codeLenTable = buildTable(codeLens);
    const lens = new Uint8Array(litCount + distCount);
    for (let i = 0; i < lens.length;) {
      const sym = decode(codeLenTable);
      if (sym < 16) {
        lens[i++] = sym;
        continue;
      }
      let repeat;
      let value = 0;
      if (sym === 16) {
        if (i === 0) throw new Error('inflate: repeat with nothing before');
        value = lens[i - 1];
        repeat = 3 + bits(2);
      } else if (sym === 17) {
        repeat = 3 + bits(3);
      } else {
        repeat = 11 + bits(7);
      }
      if (i + repeat > lens.length) throw new Error('inflate: too many lengths');
      while (repeat--) lens[i++] = value;
    }
    return [buildTable(lens.subarray(0, litCount)), buildTable(lens.subarray(litCount))];
  };

  let last = 0;
  while (!last) {
    last = bits(1);
    const type = bits(2);
    if (type === 0) {
      // Stored block: drop the rest of the current byte, then LEN, NLEN and raw bytes.
      bitBuf = 0;
      bitCount = 0;
      if (pos + 4 > input.length) throw new Error('inflate: unexpected end');
      const len = input[pos] | (input[pos + 1] << 8);
      pos += 4;
      if (pos + len > input.length) throw new Error('inflate: unexpected end');
      for (let i = 0; i < len; i++) push(input[pos++]);
    } else if (type === 1 || type === 2) {
      const [lit, dist] = type === 1 ? [FIXED_LIT, FIXED_DIST] : dynamicTables();
      for (;;) {
        const sym = decode(lit);
        if (sym < 256) {
          push(sym);
        } else if (sym === 256) {
          break;
        } else {
          const li = sym - 257;
          if (li >= 29) throw new Error('inflate: bad length');
          const len = LENGTH_BASE[li] + bits(LENGTH_EXTRA[li]);
          const di = decode(dist);
          if (di >= 30) throw new Error('inflate: bad distance');
          const distance = DIST_BASE[di] + bits(DIST_EXTRA[di]);
          if (distance > outLen) throw new Error('inflate: distance too far');
          for (let i = 0; i < len; i++) push(out[outLen - distance]);
        }
      }
    } else {
      throw new Error('inflate: bad block type');
    }
  }
  return out.slice(0, outLen);
}
