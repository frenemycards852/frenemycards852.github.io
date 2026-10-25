// Card back: the same for every card, drawn once per language and reused as an image.
// Night-blue with rays and dots, the app icon in the middle, the app name below.

import { t, getLang } from './i18n.js';
import { setFont, fitSingle } from './textlayout.js';
import { CARD_W, CARD_H } from './render-card.js';

const W = CARD_W / 2;
const H = CARD_H / 2;
const C = 35; // corner cut, same shape as the front
const cache = new Map();

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

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function draw() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const cx = W / 2;
  const cy = H * 0.44;

  // Base and rays
  chamfer(ctx, 0, 0, W, H, C);
  const base = ctx.createRadialGradient(cx, cy, 20, cx, cy, H * 0.75);
  base.addColorStop(0, '#3a2f8f');
  base.addColorStop(1, '#0f1223');
  ctx.fillStyle = base;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 210, 90, 0.08)';
  for (let i = 0; i < 28; i += 2) {
    const a = (i / 28) * Math.PI * 2;
    const b = ((i + 1) / 28) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, H, a, b);
    ctx.closePath();
    ctx.fill();
  }
  // Dot grid
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  for (let y = 12; y < H; y += 22) {
    for (let x = (y / 22) % 2 ? 23 : 12; x < W; x += 22) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Frame: orange outer, yellow inner line
  chamfer(ctx, 10, 10, W - 20, H - 20, C - 6);
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#ff5a36';
  ctx.stroke();
  chamfer(ctx, 26, 26, W - 52, H - 52, C - 14);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffd23f';
  ctx.stroke();

  // App icon as a tilted sticker
  const icon = await loadImage(new URL('../assets/icons/icon-512.png', import.meta.url).href).catch(() => null);
  if (icon) {
    const s = 220;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((-8 * Math.PI) / 180);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-s / 2 - 10, -s / 2 - 10, s + 20, s + 20, 36);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.roundRect(-s / 2, -s / 2, s, s, 28);
    ctx.clip();
    ctx.drawImage(icon, -s / 2, -s / 2, s, s);
    ctx.restore();
  }

  // App name
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const name = fitSingle(ctx, t('app.name'), { maxWidth: W - 100, size: 56, minSize: 30, weight: 900 });
  ctx.lineWidth = 10;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0f1223';
  ctx.strokeText(name.text, cx, H * 0.77);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(name.text, cx, H * 0.77);
  setFont(ctx, 20, 700);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('frenemycards852.github.io', cx, H - 52);
  return canvas.toDataURL('image/png');
}

// Data URL of the card back for the current language.
export function cardBackImage() {
  const lang = getLang();
  if (!cache.has(lang)) cache.set(lang, draw().catch((err) => { cache.delete(lang); throw err; }));
  return cache.get(lang);
}
