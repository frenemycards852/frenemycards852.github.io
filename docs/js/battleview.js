// Battle screen: both fighters with Stamina bars, commentary line by line, a skip button,
// then the result (winner, loser, penalty). Same inputs → same battle on every phone.
// Animations are CSS (transform/opacity only) and are skipped with reduced motion.

import { t, getLang } from './i18n.js';
import { loadJSON } from './data.js';
import { simulateBattle } from './battle.js';
import { commentate } from './commentary.js';
import { resolveSkill, SKILL_KINDS } from './card.js';
import { renderThumb } from './mycards-view.js';
import { penaltyText } from './challenge-model.js';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Extra data for battles (on top of carddata.js).
export async function loadBattleData() {
  const [effects, lines] = await Promise.all([
    loadJSON('data/effects.json'),
    loadJSON(`data/commentary/${getLang()}.json`),
  ]);
  return { effects, lines };
}

// match = { cards: [a, b], tactics: [ta, tb], seed, penalty, people: [nameA, nameB] }
export function runBattle(match, data) {
  const result = simulateBattle(match, data);
  const ctx = {
    names: match.cards.map((c) => c.name),
    types: match.cards.map((c) => t(`types.${c.type}.name`)),
    typeIds: match.cards.map((c) => c.type),
    skills: match.cards.map((c) => Object.fromEntries(SKILL_KINDS.map((k) => [k, resolveSkill(c[k], data.skills[k]).name]))),
    rounds: data.config.battle.rounds,
  };
  return { result, said: commentate(result, ctx, data.lines, match.seed) };
}

function fighterBox(card, who, tactic) {
  const box = el('div', 'fighter');
  const art = el('div', 'fighter-art');
  const hp = el('div', 'hp-bar');
  const fill = el('span', 'hp-fill');
  hp.append(fill);
  box.append(
    art,
    el('p', 'fighter-name', card.name),
    el('p', 'fighter-who', who === card.name ? '' : who),
    hp,
    el('p', 'hp-text'),
    el('p', 'fighter-tactic', t(`tactics.${tactic}.name`)),
  );
  return box;
}

// viewer: the side looking at the screen (0 challenger, 1 defender), or null for an onlooker.
// animate: false shows the finished battle at once (e.g. after a language switch).
export async function showBattle(container, match, data, { viewer, animate = true, isAlive = () => true, actions = [] }) {
  const { result, said } = runBattle(match, data);
  const pace = data.config.battle.pace;
  const who = (side) => (side === viewer ? t('battle.you') : (match.people[side] || t('battle.opponent')));

  const fighters = match.cards.map((card, side) => fighterBox(card, who(side), match.tactics[side]));
  const row = el('div', 'fighters');
  row.append(fighters[0], el('span', 'vs', t('battle.vs')), fighters[1]);
  const feed = el('ol', 'battle-feed');
  feed.setAttribute('aria-live', 'polite');
  const skip = el('button', 'btn btn-secondary', t('battle.skip'));
  skip.type = 'button';
  const resultBox = el('div', 'battle-result');
  const section = el('section', 'battle');
  section.append(el('h1', null, t('battle.title')), row, feed, skip, resultBox);
  container.replaceChildren(section);

  match.cards.forEach((card, side) => {
    renderThumb(card, data, 300).then((thumb) => {
      if (!isAlive()) return;
      thumb.className = 'fighter-canvas';
      fighters[side].querySelector('.fighter-art').append(thumb);
    }).catch((err) => console.error(err));
  });

  const setHp = (hp) => {
    hp.forEach((value, side) => {
      const box = fighters[side];
      const pct = value / result.maxHp[side];
      box.querySelector('.hp-fill').style.transform = `scaleX(${pct})`;
      box.querySelector('.hp-fill').classList.toggle('low', pct < 0.3);
      box.querySelector('.hp-text').textContent = t('battle.hp', { hp: value, max: result.maxHp[side] });
    });
  };
  const pop = (side, text, kind) => {
    if (reducedMotion()) return;
    const box = fighters[side];
    if (kind !== 'heal') {
      box.classList.remove('hit');
      void box.offsetWidth; // restart the shake
      box.classList.add('hit');
    }
    const float = el('span', `float float-${kind}`, text);
    box.append(float);
    setTimeout(() => float.remove(), 1200);
  };
  const effectsOf = (e) => {
    if (e.t === 'attack' && e.dmg) pop(1 - e.side, `-${e.dmg}`, e.crit ? 'crit' : 'dmg');
    if (e.t === 'trait' && e.dmg) pop(1 - e.side, `-${e.dmg}`, 'dmg');
    if (e.heal) pop(e.side, `+${e.heal}`, 'heal');
  };
  const addLine = (text, e) => {
    let cls = 'line';
    if (e.t === 'round') cls += ' line-round';
    if (e.t === 'end') cls += ' line-end';
    if (e.crit) cls += ' line-crit';
    feed.append(el('li', cls, text));
    feed.scrollTop = feed.scrollHeight;
  };

  // Waits that end early when "skip" is pressed.
  let skipped = !animate;
  let wake = () => {};
  const sleep = (ms) => new Promise((resolve) => {
    if (skipped) { resolve(); return; }
    const timer = setTimeout(resolve, ms);
    wake = () => { clearTimeout(timer); resolve(); };
  });
  skip.addEventListener('click', () => { skipped = true; wake(); });

  setHp(result.events[0].hp);
  let shown = 0;
  for (const [i, e] of result.events.entries()) {
    if (skipped || !isAlive()) break;
    if (e.t === 'end') await sleep(pace.endMs);
    if (skipped || !isAlive()) break;
    said[i].forEach((line, j) => { addLine(line, e); if (j === 0) effectsOf(e); });
    setHp(e.hp);
    shown = i + 1;
    if (said[i].length) await sleep(e.t === 'round' ? pace.roundMs : pace.lineMs * said[i].length);
  }
  if (!isAlive()) return result;
  // Skipped (or not animated): show whatever is left at once.
  for (let i = shown; i < result.events.length; i++) said[i].forEach((line) => addLine(line, result.events[i]));
  setHp(result.hp);
  skip.remove();
  showResult(resultBox, match, result, data, { viewer, who, actions });
  if (animate) resultBox.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  return result;
}

function showResult(box, match, result, data, { viewer, who, actions }) {
  const { winner } = result;
  let headline;
  if (winner === null) headline = t('result.draw');
  else if (viewer === null) headline = t('result.winnerIs', { name: match.cards[winner].name });
  else headline = winner === viewer ? t('result.win') : t('result.lose');

  const loser = winner === null ? null : 1 - winner;
  let payLabel;
  if (loser === null) payLabel = t('result.bothPay');
  else if (loser === viewer) payLabel = t('result.youPay');
  else payLabel = t('result.theyPay', { name: who(loser) });

  const penalty = el('div', 'penalty-box');
  penalty.append(el('p', 'penalty-label', payLabel), el('p', 'penalty-text', penaltyText(match.penalty, data.penalties)));
  const tactics = el('p', 'result-tactics', match.cards
    .map((card, side) => t(who(side) === card.name ? 'result.tacticOfCard' : 'result.tacticOf', { who: who(side), card: card.name, tactic: t(`tactics.${match.tactics[side]}.name`) }))
    .join(' · '));
  const score = el('p', 'result-score', match.cards
    .map((card, side) => `${card.name} ${result.hp[side]}/${result.maxHp[side]}`)
    .join(` ${t('battle.vs')} `));

  let mood = 'draw';
  if (winner !== null && viewer !== null) mood = winner === viewer ? 'win' : 'lose';
  box.append(
    el('h2', `result-headline ${mood}`, headline),
    score,
    tactics,
    penalty,
    ...actions,
  );
}
