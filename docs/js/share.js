// Share, copy link and save image, using the best method the browser supports.
// Some apps drop the text when an image is attached, so "copy link" is always offered too.

import { t } from './i18n.js';
import { encodeCard, encodeChallenge, encodeReplay } from './codec.js';

// Full link to a card on this site (works on GitHub Pages and on a local server).
export async function cardLink(card) {
  return `${location.origin}${location.pathname}#c=${await encodeCard(card)}`;
}

// Full link to a challenge.
export async function challengeLink(challenge) {
  return `${location.origin}${location.pathname}#x=${await encodeChallenge(challenge)}`;
}

// Full link to a battle replay.
export async function replayLink(replay) {
  return `${location.origin}${location.pathname}#r=${await encodeReplay(replay)}`;
}

// Share / Copy link / Save image buttons with a small status line.
// getCard() returns the card to put in the link (so a name typed just before still counts).
// getLink() (optional) builds another kind of link instead, e.g. a challenge.
// primary: whether "Share" is the page's main (orange) button.
// hasPhoto: the image shows a friend's real photo, so remind before it goes out.
export function createSharePanel({ canvas, getCard, getLink, message, primary = true, hasPhoto = false }) {
  const panel = document.createElement('div');
  panel.className = 'share-panel';
  const status = document.createElement('p');
  status.className = 'share-status';
  status.setAttribute('aria-live', 'polite');
  const say = (key) => { status.textContent = key ? t(key) : ''; };
  const fileName = () => `frenemy-${getCard().name || 'card'}.png`;
  const link = getLink ?? (() => cardLink(getCard()));

  const button = (key, cls, onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn ${cls}`;
    b.textContent = t(key);
    b.addEventListener('click', async () => {
      b.disabled = true;
      try {
        await onClick();
      } catch (err) {
        console.error(err);
        say('share.failed');
      } finally {
        b.disabled = false;
      }
    });
    return b;
  };

  const share = button('share.share', primary ? 'btn-primary' : 'btn-secondary', async () => {
    say(null);
    const result = await shareCard({
      canvas, url: await link(), text: message(), title: t('app.name'), fileName: fileName(),
    });
    if (result === 'unsupported') {
      say((await copyText(await link())) ? 'share.copiedInstead' : 'share.failed');
    }
  });
  const copy = button('share.copy', 'btn-secondary', async () => {
    say((await copyText(await link())) ? 'share.copied' : 'share.failed');
  });
  const save = button('share.save', 'btn-secondary', async () => {
    await saveImage(canvas, fileName());
    say('share.saved');
  });

  const row = document.createElement('div');
  row.className = 'share-row';
  row.append(copy, save);
  if (hasPhoto) {
    const note = document.createElement('p');
    note.className = 'photo-privacy';
    note.textContent = t('share.photoNote');
    panel.append(note);
  }
  panel.append(share, row, status);
  return panel;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

// Returns "shared", "cancelled" or "unsupported".
export async function shareCard({ canvas, url, text, title, fileName }) {
  try {
    if (navigator.canShare && navigator.share) {
      const file = new File([await canvasToBlob(canvas)], fileName, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text: `${text} ${url}` });
        return 'shared';
      }
    }
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return 'shared';
    }
  } catch (err) {
    if (err?.name === 'AbortError') return 'cancelled';
    console.error(err);
  }
  return 'unsupported';
}

// Returns true when the text reached the clipboard.
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back below (e.g. clipboard blocked in some in-app browsers).
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

// Downloads the card as PNG; where downloads are not supported, opens the image instead.
export async function saveImage(canvas, fileName) {
  const blob = await canvasToBlob(canvas);
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  if ('download' in link) {
    link.href = href;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
  } else {
    window.open(href, '_blank');
  }
  setTimeout(() => URL.revokeObjectURL(href), 60000);
}
