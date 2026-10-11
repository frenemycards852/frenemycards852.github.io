// Result image (1080×1350): both cards (winner glowing, loser faded), final Stamina,
// and who has to do the penalty. Emoji are drawn with a solid fillStyle (iOS).

import { t } from './i18n.js';
import { renderCard, CARD_W, CARD_H } from './render-card.js';
import { fitSingle, fitLines, setFont } from './textlayout.js';
import { CHALLENGE_W as W, CHALLENGE_H as H, roundRect, drawBackground, drawImageFooter } from './render-challenge.js';

function badge(ctx, x, y, emoji, color) {
  ctx.beginPath();
  ctx.arc(x, y, 50, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#1a0f2e';
  ctx.stroke();
  setFont(ctx, 54, 400);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000000';
  ctx.fillText(emoji, x, y + 4);
}

// match = { cards, people, penalty }, result from simulateBattle,
// texts = { title, payLabel, penalty } already in the current language.
export async function renderResult(canvas, match, result, texts, data) {
  const cardCanvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  drawBackground(ctx);

  // Title
  const fit = fitSingle(ctx, texts.title, { maxWidth: 980, size: 76, minSize: 44, weight: 900 });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#1a0f2e';
  ctx.strokeText(fit.text, W / 2, 84);
  ctx.fillStyle = '#ffe94d';
  ctx.fillText(fit.text, W / 2, 84);

  // Cards
  const scale = 0.42;
  const w = CARD_W * scale;
  const h = CARD_H * scale;
  const top = 178;
  const xs = [W / 2 - w - 24, W / 2 + 24];
  for (const side of [0, 1]) {
    await renderCard(cardCanvas, match.cards[side], data);
    const won = result.winner === side;
    const lost = result.winner === 1 - side;
    ctx.save();
    if (won) {
      ctx.shadowColor = 'rgba(255, 220, 80, 0.9)';
      ctx.shadowBlur = 50;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 30;
    }
    if (lost) ctx.globalAlpha = 0.55;
    ctx.drawImage(cardCanvas, xs[side], top, w, h);
    ctx.restore();
    if (won) badge(ctx, xs[side] + w - 20, top + 10, '🏆', '#ffe94d');
    if (lost) badge(ctx, xs[side] + w - 20, top + 10, '💀', '#c9c3d6');
    if (result.winner === null) badge(ctx, xs[side] + w - 20, top + 10, '🤝', '#ffe94d');

    // Name + Stamina under each card
    const cx = xs[side] + w / 2;
    const name = fitSingle(ctx, match.cards[side].name, { maxWidth: w, size: 46, minSize: 28, weight: 900 });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(name.text, cx, top + h + 46);
    setFont(ctx, 30, 700);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(t('battle.hp', { hp: result.hp[side], max: result.maxHp[side] }), cx, top + h + 92);
  }
  setFont(ctx, 56, 900);
  ctx.fillStyle = '#ff5a36';
  ctx.fillText(t('battle.vs'), W / 2, top + h / 2);

  // Penalty box
  const boxY = 1010;
  const boxH = 230;
  roundRect(ctx, 60, boxY, 960, boxH, 28);
  ctx.fillStyle = '#fff4dc';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#ff5a36';
  ctx.stroke();
  const label = fitSingle(ctx, texts.payLabel, { maxWidth: 900, size: 38, minSize: 28, weight: 900 });
  ctx.fillStyle = '#ff5a36';
  ctx.fillText(label.text, W / 2, boxY + 50);
  const lines = fitLines(ctx, texts.penalty, { maxWidth: 900, maxLines: 2, size: 52, minSize: 32, weight: 900 });
  ctx.fillStyle = '#2b2118';
  const lineH = lines.size * 1.25;
  const startY = boxY + 140 - ((lines.lines.length - 1) * lineH) / 2;
  lines.lines.forEach((line, i) => ctx.fillText(line, W / 2, startY + i * lineH));

  drawImageFooter(ctx, data);
  return canvas;
}
