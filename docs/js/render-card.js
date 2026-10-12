// Draws a finished card onto a canvas (1080×1512). Layout is original to this project:
// full-card illustration for the type + gender (or a type burst placeholder), type medallion,
// rarity plate, name plate, see-through glass stat panel (radar + skills), quote strip, footer.
// card: { name, gender, type, stats, move, trait, weakness, desc, rarity }
// data: { config, types, skills, descriptions } loaded in the current language.

import { setFont, fitSingle, fitLines } from './textlayout.js';
import { SKILL_KINDS, resolveSkill, resolveDesc, cardArt, cardScene } from './card.js';
import { t, getLang } from './i18n.js';

export const CARD_W = 1080;
export const CARD_H = 1512;

const NIGHT = '#0f1223';
const PLATE = ['#1a1f3d', '#2c3366', '#1a1f3d'];
const LIGHT_TEXT = '#ffffff';
const SOFT_TEXT = '#a9b6d6';
const SKILL_COLORS = { move: '#e0465a', trait: '#3f8fe6', weakness: '#8a5cf6' };

// ---------- drawing helpers ----------

function mix(hex, target, amount, alpha = 1) {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(target.slice(1), 16);
  const ch = (s) => Math.round(((a >> s) & 255) + ((((b >> s) & 255) - ((a >> s) & 255)) * amount));
  return `rgba(${ch(16)}, ${ch(8)}, ${ch(0)}, ${alpha})`;
}

function gradient(ctx, colors, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  colors.forEach((c, i) => g.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), c));
  return g;
}

// Rectangle with cut (chamfered) corners.
function chamfer(ctx, x, y, w, h, c) {
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Small seeded random so a card's effect looks the same every time it is drawn.
function seededRandom(text) {
  let s = 7;
  for (const ch of text) s = (s * 31 + ch.codePointAt(0)) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function sparkle(ctx, x, y, r) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.restore();
}

// ---------- type energy effects (drawn around the edges of the art) ----------

function bolt(ctx, rand, x0, y0, x1, y1, glow) {
  const pts = [[x0, y0]];
  for (let i = 1; i < 9; i++) {
    const f = i / 9;
    pts.push([x0 + (x1 - x0) * f + (rand() - 0.5) * 70, y0 + (y1 - y0) * f + (rand() - 0.5) * 40]);
  }
  pts.push([x1, y1]);
  const path = () => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  };
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = glow;
  ctx.shadowBlur = 30;
  ctx.strokeStyle = glow;
  ctx.lineWidth = 14;
  path();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  path();
  ctx.stroke();
  ctx.restore();
}

function heart(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y - s * 0.1, x - s * 0.5, y + s * 0.25);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.55, x, y + s * 0.75, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.75, x + s * 0.5, y + s * 0.55, x + s * 0.5, y + s * 0.25);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 0.1, x, y, x, y + s * 0.3);
  ctx.closePath();
}

const SPOTS = [[150, 330], [930, 300], [120, 640], [960, 620], [260, 200], [820, 180], [110, 860], [970, 860]];

const EFFECTS = {
  savage(ctx, rand) {
    bolt(ctx, rand, 60, 300, 380, 520, '#9fd8ff');
    bolt(ctx, rand, 1020, 220, 720, 470, '#9fd8ff');
    bolt(ctx, rand, 980, 760, 760, 600, '#c8a6ff');
    bolt(ctx, rand, 90, 820, 300, 640, '#c8a6ff');
  },
  late(ctx, rand) {
    ctx.save();
    for (const [x, y] of SPOTS) {
      const r = 34 + rand() * 30;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#1d1412';
      ctx.stroke();
      const a = rand() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75);
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a + 2) * r * 0.5, y + Math.sin(a + 2) * r * 0.5);
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.restore();
  },
  foodie(ctx, rand, type) {
    // Different foods floating around, slightly tilted, with a soft white halo.
    const items = type.effectItems ?? ['🍔'];
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    SPOTS.forEach(([x, y], i) => {
      const s = 84 + rand() * 30;
      ctx.beginPath();
      ctx.arc(x, y, s * 0.62, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fill();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rand() - 0.5) * 0.7);
      setFont(ctx, s, 400);
      ctx.fillStyle = '#000000'; // opaque, so colour emoji are not faded
      ctx.fillText(items[i % items.length], 0, 4);
      ctx.restore();
    });
    ctx.restore();
  },
  slacker(ctx, rand) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const [x, y] of SPOTS) {
      const s = 50 + rand() * 40;
      setFont(ctx, s, 900);
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#1d1412';
      ctx.strokeText('Z', x, y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Z', x, y);
    }
    ctx.restore();
  },
  work(ctx, rand) {
    ctx.save();
    for (const [x, y] of SPOTS) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rand() - 0.5) * 1.2);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1d1412';
      ctx.lineWidth = 5;
      ctx.fillRect(-36, -46, 72, 92);
      ctx.strokeRect(-36, -46, 72, 92);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#9aa4b8';
      for (let i = -26; i <= 26; i += 13) {
        ctx.beginPath();
        ctx.moveTo(-24, i);
        ctx.lineTo(24, i);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  },
  love(ctx, rand, type) {
    const colors = type.effectColors ?? ['#ff8fb8'];
    ctx.save();
    SPOTS.forEach(([x, y], i) => {
      const s = 60 + rand() * 40;
      heart(ctx, x, y - s / 2, s);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#1d1412';
      ctx.stroke();
    });
    ctx.restore();
  },
};

// ---------- card parts ----------

async function drawArt(ctx, card, data, type) {
  let art = null; // where the illustration landed, for the photo sticker
  ctx.save();
  chamfer(ctx, 40, 40, 1000, 1432, 52); // art fills the whole card; lower panels are see-through
  ctx.clip();
  // Burst lines in the type colour
  const cx = 540;
  const cy = 520;
  ctx.fillStyle = type.color;
  ctx.fillRect(40, 40, 1000, 1432);
  ctx.fillStyle = mix(type.color, '#ffffff', 0.35);
  for (let i = 0; i < 40; i += 2) {
    const a0 = (i / 40) * Math.PI * 2;
    const a1 = ((i + 1) / 40) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * 1400, cy + Math.sin(a0) * 1400);
    ctx.lineTo(cx + Math.cos(a1) * 1400, cy + Math.sin(a1) * 1400);
    ctx.closePath();
    ctx.fill();
  }
  const glow = ctx.createRadialGradient(cx, cy, 30, cx, cy, 480);
  glow.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(40, 40, 1000, 1432);
  const src = cardArt(data.types, card.type, card.gender, card.scene);
  const img = src ? await loadImage(new URL(`../${src}`, import.meta.url).href).catch(() => null) : null;
  if (img) {
    // Illustration covers the whole card, anchored to the top (faces live in the upper half).
    const scale = Math.max(1000 / img.naturalWidth, 1432 / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, 540 - w / 2, 40, w, h);
    art = { x: 540 - w / 2, y: 40, w, h };
  } else {
    // No illustration yet: type burst + energy effect + "coming soon".
    EFFECTS[type.id]?.(ctx, seededRandom(`${card.name}${card.type}`), type);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setFont(ctx, 200, 400);
    ctx.fillStyle = '#000000';
    ctx.fillText(type.emoji, 540, 480);
    const label = fitSingle(ctx, t('card.artSoon'), { maxWidth: 760, size: 64, minSize: 36, weight: 900 });
    ctx.lineJoin = 'round';
    ctx.lineWidth = 12;
    ctx.strokeStyle = NIGHT;
    ctx.strokeText(label.text, 540, 680);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label.text, 540, 680);
  }
  ctx.restore();
  return art;
}

// Friend's photo as a round "sticker head" on the illustration's head
// (types.json → art.<gender>[scene].head = [x, y, r, angle]: fractions of the picture, degrees).
// card.photo is a square image already cropped by the maker; it never goes into links.
async function drawPhoto(ctx, card, data, art) {
  const head = cardScene(data.types, card.type, card.gender, card.scene)?.head;
  if (!card.photo || !art || !head) return;
  const photo = await loadImage(card.photo).catch(() => null);
  if (!photo) return;
  const [hx, hy, hr, angle] = head;
  const x = art.x + hx * art.w;
  const y = art.y + hy * art.h;
  const r = hr * art.w;
  ctx.save();
  chamfer(ctx, 40, 40, 1000, 1432, 52);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate((angle * Math.PI) / 180);
  // White sticker edge with a soft shadow, then the photo inside.
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.14, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 4;
  ctx.strokeStyle = NIGHT;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(photo, -r, -r, r * 2, r * 2);
  ctx.restore();
}

function drawFrame(ctx, trim) {
  // Chamfered metal band (colour by rarity) with dark edges and a thin highlight
  chamfer(ctx, 20, 20, CARD_W - 40, CARD_H - 40, 60);
  ctx.lineWidth = 40;
  ctx.strokeStyle = gradient(ctx, trim, 0, 0, CARD_W, CARD_H);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#05060c';
  chamfer(ctx, 2, 2, CARD_W - 4, CARD_H - 4, 70);
  ctx.stroke();
  chamfer(ctx, 40, 40, CARD_W - 80, CARD_H - 80, 52);
  ctx.stroke();
  chamfer(ctx, 12, 12, CARD_W - 24, CARD_H - 24, 64);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.stroke();
}

function drawMedallion(ctx, type, trim) {
  ctx.beginPath();
  ctx.arc(140, 140, 62, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(130, 125, 10, 140, 140, 62);
  g.addColorStop(0, mix(type.color, '#ffffff', 0.4));
  g.addColorStop(1, mix(type.color, '#000000', 0.35));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = gradient(ctx, trim, 80, 80, 200, 200);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = NIGHT;
  ctx.stroke();
  setFont(ctx, 64, 400);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000000'; // iOS skips colour emoji drawn with a gradient fill
  ctx.fillText(type.emoji, 140, 146);
}

function drawRarityPlate(ctx, card, frame, trim) {
  chamfer(ctx, 820, 92, 190, 80, 20);
  ctx.fillStyle = NIGHT;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = gradient(ctx, trim, 820, 92, 1010, 172);
  ctx.stroke();
  const label = fitSingle(ctx, card.rarity, { maxWidth: 160, size: 58, minSize: 40, weight: 900 });
  ctx.fillStyle = gradient(ctx, frame.badgeText, 840, 100, 990, 160);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.text, 915, 134);
}

function drawNamePlate(ctx, card, type, trim) {
  chamfer(ctx, 80, 870, 920, 108, 34);
  ctx.fillStyle = gradient(ctx, PLATE, 80, 870, 1000, 978);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = gradient(ctx, trim, 80, 870, 1000, 978);
  ctx.stroke();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  const typeLabel = fitSingle(ctx, `${type.emoji} ${t(`types.${type.id}.name`)}`, { maxWidth: 260, size: 34, minSize: 24, weight: 800 });
  const typeW = ctx.measureText(typeLabel.text).width;
  ctx.fillStyle = mix(type.color, '#ffffff', 0.45);
  ctx.fillText(typeLabel.text, 962, 926);
  ctx.textAlign = 'left';
  const name = fitSingle(ctx, card.name, { maxWidth: 962 - typeW - 40 - 126, size: 72, minSize: 38, weight: 900 });
  ctx.fillStyle = LIGHT_TEXT;
  ctx.fillText(name.text, 126, 926);
}

function drawPanel(ctx) {
  chamfer(ctx, 66, 996, 948, 354, 30);
  ctx.fillStyle = 'rgba(16, 20, 44, 0.82)';
  ctx.fill();
  ctx.save();
  ctx.shadowColor = '#4dd2ff';
  ctx.shadowBlur = 16;
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#4dd2ff';
  ctx.stroke();
  ctx.restore();
}

function drawRadar(ctx, card, data, type) {
  const keys = data.config.stats.keys;
  const max = data.config.stats.max;
  const cx = 276;
  const cy = 1164;
  const R = 76;
  const point = (i, r) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / keys.length;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const polygon = (r) => {
    ctx.beginPath();
    keys.forEach((_, i) => {
      const [px, py] = point(i, r);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
  };
  polygon(R);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(160, 200, 255, 0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.lineWidth = 1.5;
  for (const f of [1 / 3, 2 / 3]) {
    polygon(R * f);
    ctx.stroke();
  }
  keys.forEach((_, i) => {
    const [px, py] = point(i, R);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
  });
  ctx.beginPath();
  keys.forEach((_, i) => {
    const [px, py] = point(i, Math.max(4, (R * card.stats[i]) / max));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fillStyle = mix(type.color, '#ffffff', 0.2, 0.6);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = mix(type.color, '#ffffff', 0.45);
  ctx.stroke();

  keys.forEach((key, i) => {
    const [px, py] = point(i, R + 26);
    const dx = px - cx;
    ctx.textAlign = Math.abs(dx) < 10 ? 'center' : dx > 0 ? 'left' : 'right';
    ctx.textBaseline = 'alphabetic';
    const top = i === 0;
    const label = fitSingle(ctx, t(`stats.${key}`), { maxWidth: 112, size: 28, minSize: 20, weight: 700 });
    ctx.fillStyle = SOFT_TEXT;
    ctx.fillText(label.text, px, top ? py - 28 : py + 2);
    setFont(ctx, 40, 900);
    ctx.fillStyle = LIGHT_TEXT;
    ctx.fillText(String(card.stats[i]), px, top ? py + 4 : py + 38);
  });
}

function drawSkills(ctx, card, data) {
  // Column start can differ per language (config.json → cardLayout.skillsX).
  const x = data.config.cardLayout?.skillsX?.[getLang()] ?? 566;
  const w = 992 - x;
  let y = 1008;
  for (const kind of SKILL_KINDS) {
    const skill = resolveSkill(card[kind], data.skills[kind]);
    const chip = fitSingle(ctx, t(`card.${kind}`), { maxWidth: 220, size: 22, minSize: 16, weight: 800 });
    const chipW = ctx.measureText(chip.text).width + 28;
    roundRect(ctx, x, y + 2, chipW, 34, 17);
    ctx.fillStyle = SKILL_COLORS[kind];
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(chip.text, x + 14, y + 20);
    ctx.textBaseline = 'alphabetic';
    const name = fitSingle(ctx, skill.name, { maxWidth: w - chipW - 14, size: 40, minSize: 26, weight: 900 });
    ctx.fillStyle = LIGHT_TEXT;
    ctx.fillText(name.text, x + chipW + 14, y + 33);
    if (skill.desc) {
      // Prefer one line; wrap to two smaller lines only when needed.
      const one = fitLines(ctx, skill.desc, { maxWidth: w, maxLines: 1, size: 28, minSize: 22, weight: 500 });
      const desc = one.lines[0].endsWith('…')
        ? fitLines(ctx, skill.desc, { maxWidth: w, maxLines: 2, size: 22, minSize: 18, weight: 500 })
        : one;
      ctx.fillStyle = SOFT_TEXT;
      desc.lines.forEach((line, i) => ctx.fillText(line, x, y + (desc.lines.length > 1 ? 62 : 72) + i * (desc.size + 2)));
    }
    y += 96;
  }
}

function drawQuote(ctx, card, data, trim) {
  chamfer(ctx, 66, 1358, 948, 72, 24);
  ctx.fillStyle = 'rgba(26, 31, 61, 0.8)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = gradient(ctx, trim, 66, 1358, 1014, 1430);
  ctx.stroke();
  // Wrap in quote marks unless the line already has its own quotes.
  const desc = resolveDesc(card.desc, data.descriptions.items);
  const text = /["“”「」『』]/.test(desc) ? desc : `${t('card.quoteOpen')}${desc}${t('card.quoteClose')}`;
  const fit = fitLines(ctx, text, { maxWidth: 900, maxLines: 2, size: 36, minSize: 22, weight: 800 });
  const lineH = fit.size * 1.2;
  const top = 1394 - (lineH * (fit.lines.length - 1)) / 2;
  ctx.fillStyle = '#ffe94d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fit.lines.forEach((line, i) => ctx.fillText(line, 540, top + i * lineH));
}

// Bottom row of the panel: which type this one beats, and which type beats it.
function drawMatchups(ctx, type, data) {
  const byId = (id) => data.types.types.find((x) => x.id === id);
  const beats = byId(data.types.beats[type.id]);
  const weakTo = byId(Object.keys(data.types.beats).find((id) => data.types.beats[id] === type.id));
  ctx.strokeStyle = 'rgba(77, 210, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(96, 1298);
  ctx.lineTo(984, 1298);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const half = (label, other, color, x) => {
    if (!other) return;
    const fit = fitSingle(ctx, `${label} ${other.emoji} ${t(`types.${other.id}.name`)}`, { maxWidth: 420, size: 30, minSize: 20, weight: 800 });
    ctx.fillStyle = color;
    ctx.fillText(fit.text, x, 1326);
  };
  half(`👊 ${t('card.beats')}`, beats, '#8ff0a8', 300);
  half(`💥 ${t('card.weakTo')}`, weakTo, '#ff9a9a', 780);
  ctx.fillStyle = 'rgba(169, 182, 214, 0.6)';
  ctx.fillText('|', 540, 1326);
}

function drawFooter(ctx, data) {
  // Dark strip so the small print stays readable over any illustration.
  ctx.save();
  chamfer(ctx, 40, 40, 1000, 1432, 52);
  ctx.clip();
  ctx.fillStyle = 'rgba(10, 12, 28, 0.82)';
  ctx.fillRect(40, 1438, 1000, 40);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  setFont(ctx, 24, 900);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(t('app.name'), 92, 1464);
  ctx.textAlign = 'right';
  setFont(ctx, 22, 600);
  ctx.fillStyle = SOFT_TEXT;
  ctx.fillText(data.config.siteUrl, 988, 1464);
}

export async function renderCard(canvas, card, data) {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  const rules = data.config.rarity;
  const frame = rules.frames[card.rarity];
  const trim = frame.colors; // the rarity metal is used for the frame and all trims
  const type = data.types.types.find((x) => x.id === card.type);
  ctx.clearRect(0, 0, CARD_W, CARD_H);
  chamfer(ctx, 0, 0, CARD_W, CARD_H, 70);
  ctx.fillStyle = NIGHT;
  ctx.fill();
  const art = await drawArt(ctx, card, data, type);
  await drawPhoto(ctx, card, data, art);
  drawFrame(ctx, trim);
  drawMedallion(ctx, type, trim);
  drawRarityPlate(ctx, card, frame, trim);
  drawNamePlate(ctx, card, type, trim);
  drawPanel(ctx);
  drawRadar(ctx, card, data, type);
  drawSkills(ctx, card, data);
  drawMatchups(ctx, type, data);
  drawQuote(ctx, card, data, trim);
  drawFooter(ctx, data);
  if (frame.sparkle) {
    for (const [x, y, r] of [[70, 70, 26], [1010, 230, 20], [60, 700, 18], [1020, 960, 22], [430, 1494, 18], [1000, 1470, 26], [1046, 1290, 16]]) {
      sparkle(ctx, x, y, r);
    }
  }
  return canvas;
}
