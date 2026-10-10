// Draws a finished card onto a canvas (1080×1512). Layout is original to this project:
// large art window with a type energy effect, type medallion, rarity plate, gems,
// name plate, dark glass stat panel (radar + skills), quote strip, footer.
// card: { name, avatar, type, stats, move, trait, weakness, desc, rarity }
// data: { config, types, skills, descriptions, avatar } loaded in the current language.

import { setFont, fitSingle, fitLines } from './textlayout.js';
import { avatarSvg } from './avatar.js';
import { SKILL_KINDS, resolveSkill, resolveDesc } from './card.js';
import { t } from './i18n.js';

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

function gem(ctx, cx, cy, r, colors, trim) {
  const pts = [...Array(6)].map((_, i) => {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  const outline = () => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  ctx.save();
  // gold setting
  ctx.beginPath();
  ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
  ctx.fillStyle = gradient(ctx, trim, cx - r, cy - r, cx + r, cy + r);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = NIGHT;
  ctx.stroke();
  outline();
  ctx.fillStyle = gradient(ctx, colors, cx - r, cy - r, cx + r, cy + r);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  pts.forEach(([x, y]) => {
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
  });
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.45, cy - r * 0.35);
  ctx.lineTo(cx - r * 0.1, cy - r * 0.6);
  ctx.lineTo(cx + r * 0.05, cy - r * 0.2);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
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
  foodie(ctx, rand) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    for (const [x, y] of SPOTS) {
      ctx.lineWidth = 10 + rand() * 6;
      ctx.beginPath();
      ctx.moveTo(x, y + 60);
      ctx.bezierCurveTo(x - 30, y + 30, x + 30, y + 10, x, y - 20);
      ctx.bezierCurveTo(x - 30, y - 50, x + 20, y - 70, x + 4, y - 90);
      ctx.stroke();
    }
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
  love(ctx, rand) {
    ctx.save();
    for (const [x, y] of SPOTS) {
      const s = 60 + rand() * 40;
      heart(ctx, x, y - s / 2, s);
      ctx.fillStyle = rand() > 0.5 ? '#ffffff' : '#ff8fb8';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#1d1412';
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ---------- card parts ----------

async function drawArt(ctx, card, data, type) {
  ctx.save();
  chamfer(ctx, 40, 40, 1000, 900, 52);
  ctx.clip();
  // Burst lines in the type colour
  const cx = 540;
  const cy = 520;
  ctx.fillStyle = type.color;
  ctx.fillRect(40, 40, 1000, 900);
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
  ctx.fillRect(40, 40, 1000, 900);
  EFFECTS[type.id]?.(ctx, seededRandom(`${card.name}${card.type}`));
  const svg = avatarSvg(data.avatar, card.avatar).replace('<svg ', '<svg width="640" height="640" ');
  const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  ctx.drawImage(img, 220, 300, 640, 640);
  ctx.restore();
}

function drawFrame(ctx, frame, trim) {
  // Rarity-coloured band with gold trim on both edges
  chamfer(ctx, 20, 20, CARD_W - 40, CARD_H - 40, 60);
  ctx.lineWidth = 40;
  ctx.strokeStyle = gradient(ctx, frame.colors, 0, 0, CARD_W, CARD_H);
  ctx.stroke();
  const gold = gradient(ctx, trim, 0, 0, CARD_W, CARD_H);
  chamfer(ctx, 4, 4, CARD_W - 8, CARD_H - 8, 68);
  ctx.lineWidth = 8;
  ctx.strokeStyle = gold;
  ctx.stroke();
  chamfer(ctx, 40, 40, CARD_W - 80, CARD_H - 80, 52);
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = NIGHT;
  chamfer(ctx, 1, 1, CARD_W - 2, CARD_H - 2, 70);
  ctx.stroke();
  chamfer(ctx, 44, 44, CARD_W - 88, CARD_H - 88, 50);
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

function drawPanel(ctx, trim) {
  chamfer(ctx, 66, 996, 948, 344, 30);
  ctx.fillStyle = 'rgba(16, 20, 44, 0.96)';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = gradient(ctx, trim, 66, 996, 1014, 1340);
  ctx.stroke();
}

function drawRadar(ctx, card, data, type) {
  const keys = data.config.stats.keys;
  const max = data.config.stats.max;
  const cx = 250;
  const cy = 1186;
  const R = 92;
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
    const [px, py] = point(i, R + 30);
    const dx = px - cx;
    ctx.textAlign = Math.abs(dx) < 10 ? 'center' : dx > 0 ? 'left' : 'right';
    ctx.textBaseline = 'alphabetic';
    const top = i === 0;
    const label = fitSingle(ctx, t(`stats.${key}`), { maxWidth: 110, size: 26, minSize: 18, weight: 700 });
    ctx.fillStyle = SOFT_TEXT;
    ctx.fillText(label.text, px, top ? py - 32 : py + 2);
    setFont(ctx, 38, 900);
    ctx.fillStyle = LIGHT_TEXT;
    ctx.fillText(String(card.stats[i]), px, top ? py + 2 : py + 38);
  });
}

function drawSkills(ctx, card, data) {
  const x = 462;
  const w = 528;
  let y = 1018;
  for (const kind of SKILL_KINDS) {
    const skill = resolveSkill(card[kind], data.skills[kind]);
    const chip = fitSingle(ctx, t(`card.${kind}`), { maxWidth: 220, size: 24, minSize: 18, weight: 800 });
    const chipW = ctx.measureText(chip.text).width + 28;
    roundRect(ctx, x, y, chipW, 36, 18);
    ctx.fillStyle = SKILL_COLORS[kind];
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(chip.text, x + 14, y + 19);
    ctx.textBaseline = 'alphabetic';
    const name = fitSingle(ctx, skill.name, { maxWidth: w - chipW - 14, size: 38, minSize: 26, weight: 900 });
    ctx.fillStyle = LIGHT_TEXT;
    ctx.fillText(name.text, x + chipW + 14, y + 32);
    if (skill.desc) {
      // Prefer one line; wrap to two smaller lines only when needed.
      const one = fitLines(ctx, skill.desc, { maxWidth: w, maxLines: 1, size: 27, minSize: 22, weight: 500 });
      const desc = one.lines[0].endsWith('…')
        ? fitLines(ctx, skill.desc, { maxWidth: w, maxLines: 2, size: 22, minSize: 18, weight: 500 })
        : one;
      ctx.fillStyle = SOFT_TEXT;
      desc.lines.forEach((line, i) => ctx.fillText(line, x, y + (desc.lines.length > 1 ? 64 : 72) + i * (desc.size + 2)));
    }
    y += 106;
  }
}

function drawQuote(ctx, card, data, trim) {
  chamfer(ctx, 66, 1352, 948, 80, 24);
  ctx.fillStyle = PLATE[0];
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = gradient(ctx, trim, 66, 1352, 1014, 1432);
  ctx.stroke();
  // Wrap in quote marks unless the line already has its own quotes.
  const desc = resolveDesc(card.desc, data.descriptions.items);
  const text = /["“”「」『』]/.test(desc) ? desc : `${t('card.quoteOpen')}${desc}${t('card.quoteClose')}`;
  const fit = fitLines(ctx, text, { maxWidth: 900, maxLines: 2, size: 38, minSize: 24, weight: 800 });
  const lineH = fit.size * 1.2;
  const top = 1392 - (lineH * (fit.lines.length - 1)) / 2;
  ctx.fillStyle = '#ffe94d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fit.lines.forEach((line, i) => ctx.fillText(line, 540, top + i * lineH));
}

function drawFooter(ctx, data) {
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  setFont(ctx, 24, 900);
  ctx.fillStyle = SOFT_TEXT;
  ctx.fillText(t('app.name'), 90, 1458);
  ctx.textAlign = 'right';
  setFont(ctx, 22, 600);
  ctx.fillText(data.config.siteUrl, 990, 1458);
}

export async function renderCard(canvas, card, data) {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  const rules = data.config.rarity;
  const frame = rules.frames[card.rarity];
  const trim = rules.trim;
  const type = data.types.types.find((x) => x.id === card.type);
  ctx.clearRect(0, 0, CARD_W, CARD_H);
  chamfer(ctx, 0, 0, CARD_W, CARD_H, 70);
  ctx.fillStyle = NIGHT;
  ctx.fill();
  await drawArt(ctx, card, data, type);
  drawFrame(ctx, frame, trim);
  gem(ctx, 540, 40, 40, frame.gem, trim);
  drawMedallion(ctx, type, trim);
  drawRarityPlate(ctx, card, frame, trim);
  drawNamePlate(ctx, card, type, trim);
  drawPanel(ctx, trim);
  gem(ctx, 540, 986, 20, frame.gem, trim);
  drawRadar(ctx, card, data, type);
  drawSkills(ctx, card, data);
  drawQuote(ctx, card, data, trim);
  drawFooter(ctx, data);
  if (frame.sparkle) {
    for (const [x, y, r] of [[70, 70, 26], [1010, 230, 20], [60, 700, 18], [1020, 960, 22], [430, 1494, 18], [1000, 1470, 26], [1046, 1290, 16]]) {
      sparkle(ctx, x, y, r);
    }
  }
  return canvas;
}
