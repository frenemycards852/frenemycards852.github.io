// Comic battle (preview, turned on with "?comic=1"): one big comic panel at a time.
// HP bars stay on top, the panel shows the action (lunge, hit, burst, speech bubble,
// K.O.), and the referee caption below reads the commentary. Same battle and
// commentary as battleview.js; only the presentation differs.
//
// Poses: types.json may later add  "poses": { "boy": { "attack": "...", "hurt": "...", "ko": "..." } }.
// Until then every pose falls back to the card's illustration plus CSS motion.
// Animations are CSS (transform/opacity only); reduced motion shows plain panels.

import { t } from './i18n.js';
import { cardArt } from './card.js';
import { runBattle, showResult, whoIs } from './battleview.js';
import { renderThumb } from './mycards-view.js';

export function comicMode() {
  try {
    return new URLSearchParams(location.search).get('comic') === '1';
  } catch {
    return false;
  }
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Battle background for a card: a dedicated scene from types.json ("scene": "..."), if one
// is added later, else the card's own illustration (its street, mall, café…), blurred by CSS.
function scenePath(types, card) {
  const type = types.types.find((x) => x.id === card.type);
  return type?.scene || cardArt(types, card.type, card.gender);
}

// Pose image path, or null while that pose hasn't been drawn yet.
function posePath(types, card, pose) {
  const type = types.types.find((x) => x.id === card.type);
  return (pose && type?.poses?.[card.gender]?.[pose]) || null;
}

// Group battle events into panels: one per action, with its side effects folded in.
function buildPanels(events, said) {
  const panels = [];
  let current = null;
  let pendingRound = null;
  const start = (kind, e, i) => {
    current = { kind, main: e, events: [e], lines: [...said[i]], round: null };
    if (pendingRound) {
      current.round = pendingRound.round;
      current.lines.unshift(...pendingRound.lines);
      pendingRound = null;
    }
    panels.push(current);
  };
  events.forEach((e, i) => {
    switch (e.t) {
      case 'start':
        start('intro', e, i);
        break;
      case 'round':
        pendingRound = { round: e.round, lines: said[i] };
        break;
      case 'move':
        start('move', e, i);
        break;
      case 'attack':
        // A signature strike is announced, then lands: one panel.
        if (current?.kind === 'move' && current.main.kind === 'strike' && e.via === 'move' && current.events.length === 1) {
          current.kind = 'attack';
          current.strike = current.main;
          current.main = e;
          current.events.push(e);
          current.lines.push(...said[i]);
        } else {
          start('attack', e, i);
        }
        break;
      case 'skip':
        start('skip', e, i);
        break;
      case 'trait':
        if (current && current.kind !== 'intro' && current.kind !== 'finish') {
          current.events.push(e);
          current.lines.push(...said[i]);
        } else {
          start('status', e, i);
        }
        break;
      case 'end':
        start('finish', e, i);
        break;
      default:
        break;
    }
  });
  return panels;
}

export async function showComicBattle(container, match, data, {
  viewer, animate = true, isAlive = () => true, actions = () => [], title = t('battle.title'), notice = '',
}) {
  const { result, said } = runBattle(match, data);
  const panels = buildPanels(result.events, said);
  const pace = data.config.battle.pace.comic;
  const who = whoIs(match, viewer);
  const skillName = (side, kind) => {
    const entry = match.cards[side][kind];
    if (entry.id === 'custom') return entry.name;
    return data.skills[kind].find((x) => x.id === entry.id)?.name ?? '';
  };

  // HUD: avatar, name, Stamina bar for both sides.
  const hud = el('div', 'comic-hud');
  const pills = match.cards.map((card, side) => {
    const pill = el('div', `comic-pill side-${side}`);
    const face = el('img', 'comic-face');
    face.src = cardArt(data.types, card.type, card.gender) ?? '';
    face.alt = '';
    const info = el('div', 'comic-pill-info');
    const bar = el('div', 'hp-bar');
    bar.append(el('span', 'hp-fill'));
    info.append(el('p', 'comic-pill-name', card.name), bar, el('p', 'hp-text'));
    pill.append(face, info);
    hud.append(pill);
    return pill;
  });
  const setHp = (hp) => hp.forEach((value, side) => {
    const pct = value / result.maxHp[side];
    const fill = pills[side].querySelector('.hp-fill');
    fill.style.transform = `scaleX(${pct})`;
    fill.classList.toggle('low', pct < 0.3);
    pills[side].querySelector('.hp-text').textContent = t('battle.hp', { hp: value, max: result.maxHp[side] });
  });

  // Stage: solid scene colour, two actors (the whole card, or a pose image once drawn), effects.
  const stage = el('div', 'comic-stage');
  const actors = match.cards.map((card, side) => {
    const actor = el('div', `comic-actor side-${side}`);
    const cardBox = el('div', 'comic-card');
    cardBox.setAttribute('role', 'img');
    cardBox.setAttribute('aria-label', card.name);
    const pose = el('img', 'comic-pose');
    pose.alt = card.name;
    actor.append(cardBox, pose);
    renderThumb(card, data, 420).then((thumb) => {
      if (!isAlive()) return;
      thumb.className = 'comic-card-canvas';
      cardBox.append(thumb);
    }).catch((err) => console.error(err));
    return actor;
  });
  const fx = el('div', 'comic-fx');
  const backdrop = el('div', 'comic-scene');
  const tint = el('div', 'comic-tint');
  stage.append(backdrop, tint, ...actors, fx);

  const caption = el('div', 'comic-caption');
  caption.setAttribute('aria-live', 'polite');
  const skip = el('button', 'btn btn-secondary', t('battle.skip'));
  skip.type = 'button';
  const resultBox = el('div', 'battle-result');
  const section = el('section', 'battle comic');
  section.append(el('h1', null, title));
  if (notice) section.append(el('p', 'hint center battle-notice', notice));
  section.append(hud, stage, caption, skip, resultBox);
  container.replaceChildren(section);

  // ---------- one panel ----------
  const setPose = (side, pose, cls) => {
    const actor = actors[side];
    // With a pose image the character acts; without one, the whole card does.
    // Pose images face right; the right-hand fighter is mirrored to face the opponent.
    const src = posePath(data.types, match.cards[side], pose);
    actor.className = `comic-actor side-${side}${cls ? ` ${cls}` : ''}${src ? ' posed' : ''}`;
    const img = actor.querySelector('.comic-pose');
    if (src && !img.src.endsWith(src)) img.src = src;
  };
  const burst = (side, text, kind = '') => {
    const node = el('div', `comic-burst ${side === null ? 'center' : `at-${side}`} ${kind}`);
    node.append(el('span', null, text));
    fx.append(node);
  };
  const tag = (text, kind = '') => {
    let tags = fx.querySelector('.comic-tags');
    if (!tags) {
      tags = el('div', 'comic-tags');
      fx.append(tags);
    }
    tags.append(el('span', `comic-tag ${kind}`, text));
  };
  // Scene behind the cards: the acting side's place (street, mall, café…).
  let backdropSrc = null;
  const setBackdrop = (side) => {
    const src = scenePath(data.types, match.cards[side]);
    if (!src || src === backdropSrc) return;
    backdropSrc = src;
    backdrop.style.backgroundImage = `url("${src}")`;
  };
  // "WINNER!" above the winner, a "LOSE" rubber stamp across the loser.
  const stamp = (side, text, kind) => fx.append(el('div', `comic-stamp ${kind} at-${side}`, text));
  const banner = (text) => fx.append(el('div', 'comic-banner', text));
  const bubble = (side, text) => {
    if (!text) return;
    fx.append(el('div', `comic-bubble at-${side}`, text));
  };
  const shout = (i) => {
    const pool = data.lines.shout ?? [];
    return pool.length ? pool[i % pool.length] : '';
  };

  function drawPanel(panel, index) {
    const e = panel.main;
    // Restart all CSS animations for the new panel.
    stage.className = 'comic-stage';
    void stage.offsetWidth;
    fx.replaceChildren();
    let scene = panel.kind;
    if (panel.round) fx.append(el('div', 'comic-round', t('comic.round', { n: panel.round })));

    if (panel.kind === 'intro') {
      setPose(0, null, 'enter');
      setPose(1, null, 'enter');
      burst(null, t('battle.vs'), 'vs');
    } else if (panel.kind === 'attack') {
      const a = e.side;
      const d = 1 - a;
      scene = `attack-${a}`;
      setPose(a, 'attack', 'lunge');
      if (e.missed || e.dodged) {
        setPose(d, null, 'dodge');
        burst(d, e.missed ? t('comic.miss') : t('comic.dodge'), 'miss');
      } else {
        setPose(d, 'hurt', 'hurt');
        burst(d, `-${e.dmg}`, e.crit ? 'crit' : '');
        if (e.crit) { tag(t('comic.crit'), 'hot'); scene += ' crit'; }
        if (e.effective) tag(t('comic.super'), 'hot');
        if (e.saved) tag(t('comic.survive'));
      }
      bubble(a, e.via === 'normal' ? shout(index) : skillName(a, 'move'));
    } else if (panel.kind === 'move') {
      const a = e.side;
      setPose(a, 'attack', 'power');
      setPose(1 - a, null, '');
      bubble(a, skillName(a, 'move'));
      if (e.kind === 'heal' || (e.kind === 'gambleHeal' && e.ok)) burst(a, `+${e.heal}`, 'heal');
      else burst(a, t(`comic.move.${e.kind === 'gambleHeal' ? 'fail' : e.kind}`), 'small');
    } else if (panel.kind === 'skip') {
      const a = e.side;
      setPose(a, 'hurt', 'sleepy');
      setPose(1 - a, null, '');
      burst(a, t(`comic.skip.${e.cause === 'stun' ? 'stun' : e.kind}`), 'small');
    } else if (panel.kind === 'status') {
      setPose(e.side, null, 'power');
      setPose(1 - e.side, null, '');
    } else if (panel.kind === 'finish') {
      const w = result.winner;
      if (w === null) {
        setPose(0, null, 'winner');
        setPose(1, null, 'winner');
        banner(t('result.draw'));
      } else if (result.reason === 'ko') {
        scene = 'ko';
        setPose(w, 'attack', 'winner');
        setPose(1 - w, 'ko', 'ko');
        burst(null, t('comic.ko'), 'big');
        stamp(w, t('comic.winStamp'), 'win');
      } else {
        scene = 'timeup';
        setPose(w, null, 'winner');
        setPose(1 - w, 'hurt', 'lose');
        banner(t('comic.timeUp'));
        stamp(w, t('comic.winStamp'), 'win');
        stamp(1 - w, t('comic.loseStamp'), 'lose');
      }
    }
    // Trait / weakness side effects folded into this panel.
    for (const extra of panel.events.slice(1)) {
      if (extra.t === 'trait' && extra.kind === 'reflect') tag(t('comic.reflect', { n: extra.dmg }));
      if (extra.t === 'trait' && extra.kind === 'regen') tag(`+${extra.heal}`, 'heal');
    }
    setBackdrop(panel.kind === 'finish' ? (result.winner ?? 0) : (e.side ?? 0));
    stage.className = `comic-stage scene-${scene}`;
    caption.replaceChildren(el('span', 'comic-referee', t('comic.referee')), ...panel.lines.map((line) => el('p', null, line)));
    setHp(panel.events[panel.events.length - 1].hp);
  }

  // ---------- play ----------
  let skipped = !animate;
  let wake = () => {};
  const sleep = (ms) => new Promise((resolve) => {
    if (skipped) { resolve(); return; }
    const timer = setTimeout(resolve, ms);
    wake = () => { clearTimeout(timer); resolve(); };
  });
  skip.addEventListener('click', () => { skipped = true; wake(); });

  setHp(result.events[0].hp);
  for (const [i, panel] of panels.entries()) {
    if (skipped || !isAlive()) break;
    drawPanel(panel, i);
    let ms = pace.panelMs + pace.lineMs * Math.max(0, panel.lines.length - 1);
    if (panel.kind === 'intro') ms = pace.introMs;
    if (panel.kind === 'finish') ms = pace.finishMs;
    await sleep(ms);
  }
  if (!isAlive()) return result;
  if (skipped) drawPanel(panels[panels.length - 1], panels.length - 1);
  setHp(result.hp);
  skip.remove();
  showResult(resultBox, match, result, data, { viewer, who, actions });
  if (animate) resultBox.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  return result;
}
