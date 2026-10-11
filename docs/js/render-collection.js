// "Friend Collection" image (1080×1920, IG Story size): up to 9 cards in a sticker-album grid.
// Emoji are drawn with a solid fillStyle (iOS hides colour emoji under gradients).

import { t } from './i18n.js';
import { renderCard, CARD_W, CARD_H } from './render-card.js';
import { fitSingle, setFont } from './textlayout.js';

export const COLLECTION_W = 1080;
export const COLLECTION_H = 1920;

function drawBackground(ctx) {
  const bg = ctx.createLinearGradient(0, 0, COLLECTION_W, COLLECTION_H);
  bg.addColorStop(0, '#2a1155');
  bg.addColorStop(0.5, '#5a1238');
  bg.addColorStop(1, '#1a0f2e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, COLLECTION_W, COLLECTION_H);
  // Polka dots, like an old sticker album.
  ctx.fillStyle = 'rgba(255, 233, 77, 0.06)';
  for (let y = 40; y < COLLECTION_H; y += 80) {
    for (let x = (y / 80) % 2 ? 40 : 80; x < COLLECTION_W; x += 80) {
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// cards: up to 9; title: already in the current language.
export async function renderCollection(canvas, cards, title, data) {
  const scratch = document.createElement('canvas');
  canvas.width = COLLECTION_W;
  canvas.height = COLLECTION_H;
  const ctx = canvas.getContext('2d');
  drawBackground(ctx);

  // Title
  const fit = fitSingle(ctx, title, { maxWidth: 980, size: 84, minSize: 48, weight: 900 });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#1a0f2e';
  ctx.strokeText(fit.text, COLLECTION_W / 2, 150);
  ctx.fillStyle = '#ffe94d';
  ctx.fillText(fit.text, COLLECTION_W / 2, 150);
  setFont(ctx, 36, 700);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText(t('collection.imageCount', { n: cards.length }), COLLECTION_W / 2, 240);

  // 3 × 3 grid, centred; each card slightly tilted like a stuck-on sticker.
  const w = 300;
  const h = Math.round((w * CARD_H) / CARD_W);
  const gap = 30;
  const rows = Math.ceil(cards.length / 3);
  const top = 300 + ((3 - rows) * (h + gap)) / 2;
  for (const [i, card] of cards.entries()) {
    const row = Math.floor(i / 3);
    const inRow = Math.min(3, cards.length - row * 3);
    const left = (COLLECTION_W - (inRow * w + (inRow - 1) * gap)) / 2;
    const x = left + (i % 3) * (w + gap);
    const y = top + row * (h + gap);
    await renderCard(scratch, card, data);
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(((i % 2 ? 1 : -1) * 2 * Math.PI) / 180);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.drawImage(scratch, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // Call to action + footer
  setFont(ctx, 44, 900);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(t('collection.imageCta'), COLLECTION_W / 2, 1730);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  setFont(ctx, 30, 900);
  ctx.fillText(t('app.name'), 64, 1860);
  ctx.textAlign = 'right';
  setFont(ctx, 28, 600);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText(data.config.siteUrl, COLLECTION_W - 64, 1860);
  return canvas;
}
