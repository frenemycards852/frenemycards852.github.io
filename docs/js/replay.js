// Replay link (#r=...): the same battle again, for the challenger (or anyone it was forwarded to).
// The result is recomputed from the link, so it is exactly the fight the friend saw.

import { t } from './i18n.js';
import { loadCardData } from './carddata.js';
import { decodeReplay, CodecError } from './codec.js';
import { isReplayValid, battleSeed } from './challenge-model.js';
import { showError } from './cardview.js';
import { loadBattleData, showBattle, resultSharePanel } from './battleview.js';
import { resultActions } from './accept.js';
import { wasSent, lockedFight } from './matches.js';
import { comicMode, showComicBattle } from './comicbattle.js';
import { startNewCard } from './builder.js';

let watched = null; // payload already played once (a language switch shows the result straight away)
let mountToken = 0;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export async function mountReplay(container, payload) {
  const token = ++mountToken;
  const isAlive = () => token === mountToken && location.hash === `#r=${payload}`;
  let data;
  try {
    const [cardData, battleData] = await Promise.all([loadCardData(), loadBattleData()]);
    data = { ...cardData, ...battleData };
  } catch (err) {
    console.error(err);
    container.replaceChildren(el('p', 'load-error', t('error.load')));
    return;
  }
  let replay;
  try {
    replay = await decodeReplay(payload);
    if (!isReplayValid(replay, data)) throw new CodecError('corrupt', 'invalid replay');
  } catch (err) {
    if (token !== mountToken) return;
    console.warn('Replay link could not be opened:', err.message);
    showError(container, err instanceof CodecError ? err.code : 'corrupt');
    return;
  }
  if (token !== mountToken) return;

  // Who is watching: the phone that sent the challenge, the one that fought it, or someone else.
  let viewer = null;
  if (wasSent(replay.nonce)) viewer = 0;
  else if (lockedFight(replay.nonce)) viewer = 1;

  const match = {
    cards: replay.cards,
    tactics: replay.tactics,
    seed: battleSeed(replay.nonce, replay.cards[1], replay.tactics[1]),
    nonce: replay.nonce,
    penalty: replay.penalty,
    people: replay.people,
  };
  const other = (side) => match.people[side] || match.cards[side].name;
  const notices = [viewer === 0
    ? t('replay.introYou', { name: other(1) })
    : t('replay.intro', { a: other(0), b: other(1) })];
  if (replay.rules !== data.config.battle.version) notices.push(t('replay.oldRules'));

  const play = (animate) => {
    watched = payload;
    (comicMode() ? showComicBattle : showBattle)(container, match, data, {
      viewer,
      animate,
      isAlive,
      title: t('replay.title'),
      notice: notices.join(' '),
      actions: (result) => {
        const actions = resultActions(match, result, data, viewer, () => { play(true); window.scrollTo(0, 0); }, { send: false });
        if (viewer === null) {
          const make = el('a', 'btn btn-primary', t('view.makeOwn'));
          make.href = '#/make';
          make.addEventListener('click', () => startNewCard(''));
          actions.prepend(make);
        }
        // Forward it to the group chat too.
        actions.append(resultSharePanel(match, result, data, { primary: false }));
        return [actions];
      },
    });
  };
  play(watched !== payload);
}
