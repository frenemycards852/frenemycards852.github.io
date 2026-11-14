// Plan picker (rules v3): one action per round — ⚔️ attack, 🛡️ defend or 💥 special
// (the card's signature move, at most config.planBattle.specialMax times). Used by the
// challenge and accept screens. Native radios keep it accessible.

import { t } from './i18n.js';
import { ACTIONS, isPlanValid } from './battle.js';

let uid = 0;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export const DEFAULT_PLAN = ['attack', 'defend', 'special'];

// plan: current plan (array, changed in place); rules: config.planBattle; hint: line under the title.
// Returns { el, setMoveName(name) } — the special's name is shown so players know what it does.
export function planPicker({ plan, rules, hint, onChange = () => {} }) {
  const id = ++uid;
  const box = el('fieldset', 'group plan-picker');
  box.append(el('legend', null, t('plan.title')));
  if (hint) box.append(el('p', 'hint', hint));
  box.append(el('p', 'plan-rules', t('plan.rules')));

  const inputs = [];
  const rows = Array.from({ length: rules.rounds }, (_, round) => {
    const row = el('div', 'plan-round');
    row.append(el('span', 'plan-round-label', t('plan.round', { n: round + 1 })));
    const choices = el('div', 'plan-choices');
    choices.setAttribute('role', 'radiogroup');
    choices.setAttribute('aria-label', t('plan.round', { n: round + 1 }));
    for (const action of ACTIONS) {
      const label = el('label', `plan-choice ${action}`);
      const input = el('input');
      Object.assign(input, { type: 'radio', name: `plan-${id}-${round}`, value: action });
      input.addEventListener('change', () => {
        plan[round] = action;
        sync();
        onChange(plan);
      });
      label.append(input, el('span', 'plan-icon', t(`plan.icon.${action}`)), el('span', 'plan-name', t(`plan.${action}`)));
      choices.append(label);
      inputs.push({ round, action, input, label });
    }
    row.append(choices);
    return row;
  });

  const note = el('p', 'hint plan-note');
  const random = el('button', 'btn btn-secondary btn-more', t('plan.random'));
  random.type = 'button';
  random.addEventListener('click', () => {
    let next;
    do {
      next = Array.from({ length: rules.rounds }, () => ACTIONS[Math.floor(Math.random() * ACTIONS.length)]);
    } while (!isPlanValid(next, rules) || next.join() === plan.join());
    plan.splice(0, plan.length, ...next);
    sync();
    onChange(plan);
  });

  // Checked state, and 💥 locked in other rounds once the specials are used up.
  function sync() {
    const specials = plan.filter((a) => a === 'special').length;
    for (const { round, action, input, label } of inputs) {
      input.checked = plan[round] === action;
      const locked = action === 'special' && plan[round] !== 'special' && specials >= rules.specialMax;
      input.disabled = locked;
      label.classList.toggle('locked', locked);
    }
  }
  sync();

  box.append(...rows, note, random);
  return {
    el: box,
    setMoveName(name) {
      note.textContent = t('plan.specialNote', { move: name });
    },
  };
}
