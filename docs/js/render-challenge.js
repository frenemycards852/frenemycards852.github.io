// Challenge image (1080×1350, fits chat apps and IG): the challenger's card,
// "… challenges you!" and the penalty for the loser. Drawn with Canvas.
// Emoji are drawn with a solid fillStyle (iOS hides colour emoji under gradients).

import { t } from './i18n.js';
import { renderCard, CARD_W, CARD_H } from './render-card.js';
import { fitSingle, fitLines, setFont } from './textlayout.js';

export const CHALLENGE_W = 1080;
export const CHALLENGE_H = 1350;

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawBackground(ctx) {
  const bg = ctx.createLinearGradient(0, 0, CHALLENGE_W, CHALLENGE_H);
  bg.addColorStop(0, '#2a1155');
  bg.addColorStop(0.55, '#5a1238');
  bg.addColorStop(1, '#1a0f2e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CHALLENGE_W, CHALLENGE_H);
  // Speed-line burst behind the card.
  ctx.save();
  ctx.translate(CHALLENGE_W / 2, 600);
  ctx.fillStyle = 'rgba(255, 233, 77, 0.07)';
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-40, -1100);
    ctx.lineTo(40, -1100);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// challenge = { card, name }, penaltyLine = "🧋 請對方飲珍奶". data = card render data.
export async function renderChallenge(canvas, { card, name }, penaltyLine, data) {
  const cardCanvas = document.createElement('canvas');
  await renderCard(cardCanvas, card, data);

  canvas.width = CHALLENGE_W;
  canvas.height = CHALLENGE_H;
  const ctx = canvas.getContext('2d');
  drawBackground(ctx);

  // Title
  const title = name ? t('challenge.imageTitle', { name }) : t('challenge.imageTitleAnon');
  const fit = fitSingle(ctx, title, { maxWidth: 980, size: 76, minSize: 44, weight: 900 });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#1a0f2e';
  ctx.strokeText(fit.text, CHALLENGE_W / 2, 84);
  ctx.fillStyle = '#ffe94d';
  ctx.fillText(fit.text, CHALLENGE_W / 2, 84);

  // Card
  const scale = 0.6;
  const w = CARD_W * scale;
  const h = CARD_H * scale;
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  ctx.drawImage(cardCanvas, (CHALLENGE_W - w) / 2, 148, w, h);
  ctx.restore();

  // Penalty box
  const boxY = 1086;
  const boxH = 188;
  roundRect(ctx, 60, boxY, 960, boxH, 28);
  ctx.fillStyle = '#fff4dc';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#ff5a36';
  ctx.stroke();
  setFont(ctx, 32, 800);
  ctx.fillStyle = '#ff5a36';
  ctx.fillText(t('challenge.imageLoser'), CHALLENGE_W / 2, boxY + 40);
  const lines = fitLines(ctx, penaltyLine, { maxWidth: 900, maxLines: 2, size: 50, minSize: 32, weight: 900 });
  ctx.fillStyle = '#2b2118';
  const lineH = lines.size * 1.25;
  const startY = boxY + 116 - ((lines.lines.length - 1) * lineH) / 2;
  lines.lines.forEach((line, i) => ctx.fillText(line, CHALLENGE_W / 2, startY + i * lineH));

  drawImageFooter(ctx, data);
  return canvas;
}

// Product name + site URL along the bottom, so anyone who sees the image can find the site.
export function drawImageFooter(ctx, data) {
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  setFont(ctx, 26, 900);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(t('app.name'), 64, 1322);
  ctx.textAlign = 'right';
  setFont(ctx, 24, 600);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillText(data.config.siteUrl, CHALLENGE_W - 64, 1322);
}
