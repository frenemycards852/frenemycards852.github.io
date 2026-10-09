// Draws a finished card onto a canvas (1080×1512). Layout is original to this project.
// card: { name, avatar, type, stats, move, trait, weakness, desc, rarity }
// data: { config, types, skills, descriptions, avatar } loaded in the current language.

import { setFont, fitSingle, fitLines } from './textlayout.js';
import { avatarSvg } from './avatar.js';
import { SKILL_KINDS, resolveSkill, resolveDesc } from './card.js';
import { t } from './i18n.js';

export const CARD_W = 1080;
export const CARD_H = 1512;

const INK = '#1d1412';
const PAPER = '#fffaf0';
const MUTED = '#6b5d50';
const SKILL_COLORS = { move: '#d23a4a', trait: '#3f7fd6', weakness: '#6b4bb8' };

function mix(hex, target, amount) {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(target.slice(1), 16);
  const ch = (s) => Math.round(((a >> s) & 255) + ((((b >> s) & 255) - ((a >> s) & 255)) * amount));
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
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

function gradient(ctx, colors, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  colors.forEach((c, i) => g.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), c));
  return g;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

function drawFrame(ctx, frame) {
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 48);
  ctx.fillStyle = gradient(ctx, frame.colors, 0, 0, CARD_W, CARD_H);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = INK;
  ctx.stroke();
  roundRect(ctx, 18, 18, CARD_W - 36, CARD_H - 36, 36);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.stroke();
  roundRect(ctx, 36, 36, CARD_W - 72, CARD_H - 72, 28);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function drawHeader(ctx, card, frame, type) {
  // Rarity badge
  roundRect(ctx, 66, 72, 150, 92, 20);
  ctx.fillStyle = INK;
  ctx.fill();
  const badge = fitSingle(ctx, card.rarity, { maxWidth: 124, size: 60, minSize: 40, weight: 900 });
  ctx.fillStyle = gradient(ctx, frame.badgeText, 80, 80, 200, 150);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge.text, 141, 121);

  // Type pill (right)
  const label = `${type.emoji} ${t(`types.${type.id}.name`)}`;
  const pill = fitSingle(ctx, label, { maxWidth: 230, size: 36, minSize: 24, weight: 800 });
  const pillW = ctx.measureText(pill.text).width + 52;
  roundRect(ctx, 1014 - pillW, 84, pillW, 68, 34);
  ctx.fillStyle = type.color;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.fillText(pill.text, 1014 - pillW / 2, 119);

  // Name
  const nameMax = 1014 - pillW - 24 - 236;
  const name = fitSingle(ctx, card.name, { maxWidth: nameMax, size: 78, minSize: 38, weight: 900 });
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(name.text, 236, 121);
}

async function drawArt(ctx, card, data, type) {
  const x = 66;
  const y = 188;
  const w = 948;
  const h = 560;
  ctx.save();
  roundRect(ctx, x, y, w, h, 28);
  ctx.clip();
  // Battle-style burst lines in the type colour
  ctx.fillStyle = type.color;
  ctx.fillRect(x, y, w, h);
  const cx = 540;
  const cy = 500;
  const rays = 36;
  ctx.fillStyle = mix(type.color, '#ffffff', 0.38);
  for (let i = 0; i < rays; i += 2) {
    const a0 = (i / rays) * Math.PI * 2;
    const a1 = ((i + 1) / rays) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * 1000, cy + Math.sin(a0) * 1000);
    ctx.lineTo(cx + Math.cos(a1) * 1000, cy + Math.sin(a1) * 1000);
    ctx.closePath();
    ctx.fill();
  }
  const glow = ctx.createRadialGradient(cx, cy, 40, cx, cy, 440);
  glow.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);

  const svg = avatarSvg(data.avatar, card.avatar).replace('<svg ', '<svg width="560" height="560" ');
  const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  ctx.drawImage(img, 260, y, 560, 560);
  ctx.restore();
  roundRect(ctx, x, y, w, h, 28);
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function drawRadar(ctx, card, data, type) {
  const keys = data.config.stats.keys;
  const max = data.config.stats.max;
  const cx = 300;
  const cy = 1004;
  const R = 122;
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
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(29, 20, 18, 0.18)';
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

  // Stat shape
  ctx.beginPath();
  keys.forEach((_, i) => {
    const [px, py] = point(i, Math.max(4, (R * card.stats[i]) / max));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fillStyle = mix(type.color, '#ffffff', 0.15).replace('rgb', 'rgba').replace(')', ', 0.6)');
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = mix(type.color, '#000000', 0.3);
  ctx.stroke();

  // Labels: name + value at each corner
  keys.forEach((key, i) => {
    const [px, py] = point(i, R + 34);
    const dx = px - cx;
    ctx.textAlign = Math.abs(dx) < 10 ? 'center' : dx > 0 ? 'left' : 'right';
    const top = i === 0;
    const label = fitSingle(ctx, t(`stats.${key}`), { maxWidth: 118, size: 30, minSize: 20, weight: 700 });
    ctx.fillStyle = MUTED;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label.text, px, top ? py - 36 : py + 2);
    setFont(ctx, 42, 900);
    ctx.fillStyle = INK;
    ctx.fillText(String(card.stats[i]), px, top ? py + 4 : py + 44);
  });
}

function drawSkills(ctx, card, data) {
  const x = 584;
  const w = 430;
  let y = 772;
  for (const kind of SKILL_KINDS) {
    const skill = resolveSkill(card[kind], data.skills[kind]);
    // Kind chip
    const chip = fitSingle(ctx, t(`card.${kind}`), { maxWidth: 220, size: 28, minSize: 20, weight: 800 });
    const chipW = ctx.measureText(chip.text).width + 32;
    roundRect(ctx, x, y, chipW, 42, 21);
    ctx.fillStyle = SKILL_COLORS[kind];
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(chip.text, x + 16, y + 22);
    // Name
    const name = fitSingle(ctx, skill.name, { maxWidth: w, size: 42, minSize: 28, weight: 900 });
    ctx.fillStyle = INK;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(name.text, x, y + 88);
    // Description (up to 2 lines)
    if (skill.desc) {
      // Prefer one slightly smaller line; wrap to two lines only when needed.
      const one = fitLines(ctx, skill.desc, { maxWidth: w, maxLines: 1, size: 30, minSize: 24, weight: 600 });
      const desc = one.lines[0].endsWith('…')
        ? fitLines(ctx, skill.desc, { maxWidth: w, maxLines: 2, size: 28, minSize: 22, weight: 600 })
        : one;
      ctx.fillStyle = MUTED;
      desc.lines.forEach((line, i) => ctx.fillText(line, x, y + 120 + i * (desc.size + 2)));
    }
    y += 162;
  }
}

function drawQuote(ctx, card, data) {
  const x = 66;
  const y = 1262;
  const w = 948;
  const h = 120;
  roundRect(ctx, x, y, w, h, 24);
  ctx.fillStyle = '#fff1cf';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // Wrap in quote marks unless the line already has its own quotes.
  const desc = resolveDesc(card.desc, data.descriptions.items);
  const hasQuotes = /["“”「」『』]/.test(desc);
  const text = hasQuotes ? desc : `${t('card.quoteOpen')}${desc}${t('card.quoteClose')}`;
  const fit = fitLines(ctx, text, { maxWidth: w - 64, maxLines: 2, size: 42, minSize: 28, weight: 800 });
  const lineH = fit.size * 1.25;
  const top = y + h / 2 - (lineH * (fit.lines.length - 1)) / 2;
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fit.lines.forEach((line, i) => ctx.fillText(line, x + w / 2, top + i * lineH));
}

function drawFooter(ctx, data) {
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(29, 20, 18, 0.25)';
  ctx.beginPath();
  ctx.moveTo(66, 1404);
  ctx.lineTo(1014, 1404);
  ctx.stroke();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  setFont(ctx, 32, 900);
  ctx.fillStyle = INK;
  ctx.fillText(t('app.name'), 66, 1450);
  ctx.textAlign = 'right';
  setFont(ctx, 26, 600);
  ctx.fillStyle = MUTED;
  ctx.fillText(data.config.siteUrl, 1014, 1448);
}

function drawSparkles(ctx) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
  ctx.shadowBlur = 18;
  const spots = [[30, 30, 26], [1050, 60, 20], [24, 760, 16], [1056, 980, 22], [44, 1480, 18], [1040, 1490, 26], [120, 230, 22], [960, 250, 16], [930, 720, 24]];
  for (const [x, y, r] of spots) star(ctx, x, y, r);
  ctx.restore();
}

export async function renderCard(canvas, card, data) {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  const frame = data.config.rarity.frames[card.rarity];
  const type = data.types.types.find((x) => x.id === card.type);
  ctx.clearRect(0, 0, CARD_W, CARD_H);
  drawFrame(ctx, frame);
  drawHeader(ctx, card, frame, type);
  await drawArt(ctx, card, data, type);
  drawRadar(ctx, card, data, type);
  drawSkills(ctx, card, data);
  drawQuote(ctx, card, data);
  drawFooter(ctx, data);
  if (frame.sparkle) drawSparkles(ctx);
  return canvas;
}
