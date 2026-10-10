// Card builder UI: one step per screen, routed as #/make/<step>.

import { t, getLang } from './i18n.js';
import { loadJSON } from './data.js';
import {
  SKILL_KINDS, CUSTOM, createDraft, textLength, clipText, isBlocked, isTextOk,
  statTotal, isStatsValid, setStat, randomStats, pickOther, isSkillOk, isDescOk,
  isGender, cardArt, toCard,
} from './card.js';
import { rollRarity } from './rarity.js';
import { showReveal } from './reveal.js';

const STEPS = ['name', 'type', 'look', 'stats', 'skills', 'desc', 'summary'];

let draft = null; // kept in memory while the page is open
let data = null;
let mountToken = 0;

async function loadData() {
  const lang = getLang();
  if (data && data.lang === lang) return data;
  const [config, types, blocklist, skills, descriptions] = await Promise.all([
    loadJSON('data/config.json'),
    loadJSON('data/types.json'),
    loadJSON('data/blocklist.json'),
    loadJSON(`data/skills/${lang}.json`),
    loadJSON(`data/descriptions/${lang}.json`),
  ]);
  data = { lang, config, types, blocklist, skills, descriptions };
  return data;
}

// Small element helper. Text is always set via textContent (safe for user input).
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'text') el.textContent = value;
    else if (key === 'value' || key === 'checked' || key === 'disabled') el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  el.append(...children.filter((c) => c != null));
  return el;
}

const terms = () => data.blocklist.terms;
const go = (step) => { location.hash = `#/make/${step}`; };

const VALID = {
  name: () => isTextOk(draft.name, terms()),
  type: () => data.types.types.some((type) => type.id === draft.type),
  look: () => isGender(data.config, draft.gender),
  stats: () => isStatsValid(draft.stats, data.config.stats),
  skills: () => SKILL_KINDS.every((kind) => isSkillOk(draft[kind], terms())),
  desc: () => isDescOk(draft.desc, terms()),
  summary: () => true,
};

export async function mountBuilder(container, param) {
  const token = ++mountToken;
  try {
    await loadData();
  } catch (err) {
    console.error(err);
    container.replaceChildren(h('p', { class: 'load-error', text: t('error.load') }));
    return;
  }
  if (token !== mountToken) return; // a newer navigation took over
  if (!draft) draft = createDraft(data);

  // Once the rarity is rolled the card is final: only the reveal screen is shown.
  if (draft.rarity) {
    if (param !== 'reveal') history.replaceState(null, '', '#/make/reveal');
    showReveal(container, toCard(draft), data, {
      opened: draft.opened,
      onOpened: () => { draft.opened = true; },
      onAgain: () => { draft = createDraft(data); go('name'); },
    });
    return;
  }

  let step = STEPS.includes(param) ? param : param === 'reveal' ? 'summary' : 'name';
  if (step !== param && param) history.replaceState(null, '', `#/make/${step}`);
  // Later steps need every earlier step to be valid.
  const firstInvalid = STEPS.slice(0, STEPS.indexOf(step)).find((s) => !VALID[s]());
  if (firstInvalid) {
    step = firstInvalid;
    history.replaceState(null, '', `#/make/${step}`);
  }
  showStep(container, step);
}

function showStep(container, step) {
  const index = STEPS.indexOf(step);
  const nextBtn = h('button', {
    class: 'btn btn-primary', type: 'button', text: t('builder.next'),
    onclick: () => VALID[step]() && go(STEPS[index + 1]),
  });
  const refresh = () => { nextBtn.disabled = !VALID[step](); };
  const view = VIEWS[step]({
    refresh, next: () => nextBtn.click(), redraw: () => showStep(container, step),
  });

  const backBtn = h('a', {
    class: 'btn btn-secondary', href: index === 0 ? '#/' : `#/make/${STEPS[index - 1]}`,
    text: t('builder.back'),
  });
  const randomBtn = view.random && h('button', {
    class: 'btn btn-secondary', type: 'button', text: t('builder.random'),
    onclick: () => { view.random(); showStep(container, step); },
  });

  const nav = h('div', { class: 'step-nav' }, backBtn, randomBtn, step === 'summary' ? null : nextBtn);

  container.replaceChildren(h('section', { class: 'builder' },
    h('p', { class: 'step-count', text: t('builder.step', { n: index + 1, total: STEPS.length }) }),
    h('div', { class: 'progress', 'aria-hidden': 'true' },
      h('span', { style: `transform: scaleX(${(index + 1) / STEPS.length})` })),
    h('h1', { text: t(`builder.${step}.title`) }),
    view.body,
    nav));
  refresh();
  view.focus?.();
}

// Text input with a character counter and a block-list warning.
function textField({ id, label, value, max, placeholder, onInput, onEnter }) {
  const count = h('span', { class: 'count' });
  const error = h('p', { class: 'field-error', role: 'alert' });
  const input = h('input', {
    class: 'text-input', type: 'text', id, value, placeholder,
    autocomplete: 'off', enterkeyhint: 'next',
  });
  const update = () => {
    const clipped = clipText(input.value, max);
    if (clipped !== input.value) input.value = clipped;
    count.textContent = t('builder.count', { n: textLength(clipped), max });
    error.textContent = isBlocked(clipped, terms()) ? t('builder.blocked') : '';
  };
  input.addEventListener('input', () => { update(); onInput(input.value); });
  if (onEnter) {
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') onEnter(); });
  }
  update();
  const el = h('div', { class: 'field' },
    h('div', { class: 'field-head' }, h('label', { for: id, text: label }), count),
    input,
    error);
  return { el, input };
}

// Radio-style option card. Native radios keep it accessible.
function option({ name, value, checked, title, desc, color, onPick }) {
  return h('label', { class: 'option', style: color ? `--accent: ${color}` : null },
    h('input', { type: 'radio', name, value, checked, onchange: onPick }),
    h('span', { class: 'option-body' },
      h('span', { class: 'option-title', text: title }),
      desc ? h('span', { class: 'option-desc', text: desc }) : null));
}

const reminder = () => h('p', { class: 'reminder', text: t('builder.reminder') });

// Card illustration for the draft's type + a gender, or a placeholder if not drawn yet.
function artEl(gender, className) {
  const src = cardArt(data.types, draft.type, gender);
  if (src) return h('img', { class: className, src, alt: '' });
  const type = data.types.types.find((x) => x.id === draft.type);
  return h('div', { class: `${className} art-soon`, style: `--accent: ${type.color}` },
    h('span', { class: 'art-soon-emoji', text: type.emoji }),
    h('span', { text: t('card.artSoon') }));
}

const VIEWS = {
  name({ refresh, next }) {
    const field = textField({
      id: 'f-name', label: t('builder.name.label'), value: draft.name,
      max: data.config.card.nameMax, placeholder: t('builder.name.placeholder'),
      onInput: (v) => { draft.name = v; refresh(); }, onEnter: next,
    });
    return { body: h('div', {}, field.el, reminder()), focus: () => field.input.focus() };
  },

  look({ refresh }) {
    const genders = data.config.card.genders;
    const buttons = genders.map((gender) => h('button', {
      type: 'button', class: 'look-choice', 'aria-pressed': String(draft.gender === gender),
      onclick: () => {
        draft.gender = gender;
        buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(genders[i] === gender)));
        refresh();
      },
    }, artEl(gender, 'look-art'), h('span', { class: 'look-label', text: t(`builder.look.${gender}`) })));
    return {
      body: h('div', {},
        h('p', { class: 'hint', text: t('builder.look.hint') }),
        h('div', { class: 'look-choices' }, ...buttons)),
      random: () => { draft.gender = pickOther(genders, draft.gender); },
    };
  },

  type({ refresh }) {
    const list = h('div', { class: 'options', role: 'radiogroup' });
    for (const type of data.types.types) {
      list.append(option({
        name: 'type', value: type.id, checked: draft.type === type.id, color: type.color,
        title: `${type.emoji} ${t(`types.${type.id}.name`)}`, desc: t(`types.${type.id}.idea`),
        onPick: () => { draft.type = type.id; refresh(); },
      }));
    }
    const ids = data.types.types.map((type) => type.id);
    return { body: list, random: () => { draft.type = pickOther(ids, draft.type); } };
  },

  stats({ refresh }) {
    const rules = data.config.stats;
    const remaining = h('p', { class: 'stat-remaining', 'aria-live': 'polite' });
    const rows = rules.keys.map((key, i) => {
      const label = t(`stats.${key}`);
      // Typed number: digits only; an empty box keeps the old value until it loses focus.
      const value = h('input', {
        class: 'stat-value', type: 'text', id: `f-stat-${key}`, inputmode: 'numeric',
        pattern: '[0-9]*', maxlength: 3, autocomplete: 'off', enterkeyhint: 'done',
        onfocus: () => value.select(),
        oninput: () => {
          value.value = value.value.replace(/\D/g, '');
          if (value.value !== '') change(i, Number(value.value));
        },
        onchange: () => sync(),
        onkeydown: (e) => { if (e.key === 'Enter') value.blur(); },
      });
      const range = h('input', {
        type: 'range', min: rules.min, max: rules.max, step: 1, 'aria-label': label,
        oninput: () => change(i, Number(range.value)),
      });
      const less = h('button', {
        class: 'stat-btn', type: 'button', text: '−', 'aria-label': t('builder.stats.less', { stat: label }),
        onclick: () => change(i, draft.stats[i] - rules.step),
      });
      const more = h('button', {
        class: 'stat-btn', type: 'button', text: '+', 'aria-label': t('builder.stats.more', { stat: label }),
        onclick: () => change(i, draft.stats[i] + rules.step),
      });
      const row = h('div', { class: 'stat-row' },
        h('div', { class: 'stat-head' }, h('label', { for: `f-stat-${key}`, text: label }), value),
        h('div', { class: 'stat-controls' }, less, range, more));
      return { row, value, range, less, more };
    });

    const sync = () => {
      const left = rules.total - statTotal(draft.stats);
      rows.forEach((r, i) => {
        const v = draft.stats[i];
        // Leave an empty box alone while it is being typed in.
        const typingEmpty = r.value === document.activeElement && r.value.value === '';
        if (!typingEmpty && r.value.value !== String(v)) r.value.value = v;
        r.range.value = v;
        r.less.disabled = v <= rules.min;
        r.more.disabled = v >= rules.max || left <= 0;
      });
      remaining.textContent = left > 0
        ? `${t('builder.stats.remaining', { n: left })} · ${t('builder.stats.needAll')}`
        : t('builder.stats.remaining', { n: left });
      remaining.classList.toggle('warn', left > 0);
      refresh();
    };
    function change(i, value) {
      draft.stats = setStat(draft.stats, i, value, rules);
      sync();
    }
    sync();

    return {
      body: h('div', {},
        h('p', { class: 'hint', text: t('builder.stats.hint', { total: rules.total, max: rules.max }) }),
        remaining,
        ...rows.map((r) => r.row)),
      random: () => { draft.stats = randomStats(rules); },
    };
  },

  skills({ refresh }) {
    const limits = data.config.skills;
    const groups = SKILL_KINDS.map((kind) => {
      const entry = draft[kind];
      const custom = h('div', { class: 'custom-fields', hidden: entry.id !== CUSTOM },
        textField({
          id: `f-${kind}-name`, label: t('builder.custom.name'), value: entry.name,
          max: limits.customNameMax, onInput: (v) => { entry.name = v; refresh(); },
        }).el,
        textField({
          id: `f-${kind}-desc`, label: t('builder.custom.desc'), value: entry.desc,
          max: limits.customDescMax, onInput: (v) => { entry.desc = v; refresh(); },
        }).el,
        reminder());
      const pick = (id) => {
        entry.id = id;
        custom.hidden = id !== CUSTOM;
        refresh();
      };
      const options = data.skills[kind].map((skill) => option({
        name: kind, value: skill.id, checked: entry.id === skill.id,
        title: skill.name, desc: skill.desc, onPick: () => pick(skill.id),
      }));
      options.push(option({
        name: kind, value: CUSTOM, checked: entry.id === CUSTOM,
        title: t('builder.custom.option'), onPick: () => pick(CUSTOM),
      }));
      return h('fieldset', { class: 'group' },
        h('legend', { text: t(`builder.skills.${kind}`) }),
        h('div', { class: 'options', role: 'radiogroup' }, ...options),
        custom);
    });
    return {
      body: h('div', {}, ...groups),
      random: () => {
        for (const kind of SKILL_KINDS) {
          const ids = data.skills[kind].map((skill) => skill.id);
          draft[kind].id = pickOther(ids, draft[kind].id);
        }
      },
    };
  },

  desc({ refresh }) {
    const entry = draft.desc;
    const custom = h('div', { class: 'custom-fields', hidden: entry.id !== CUSTOM },
      textField({
        id: 'f-desc', label: t('builder.desc.label'), value: entry.text,
        max: data.config.card.descriptionMax, onInput: (v) => { entry.text = v; refresh(); },
      }).el,
      reminder());
    const pick = (id) => {
      entry.id = id;
      custom.hidden = id !== CUSTOM;
      refresh();
    };
    const options = data.descriptions.items.map((item) => option({
      name: 'desc', value: item.id, checked: entry.id === item.id,
      title: item.text, onPick: () => pick(item.id),
    }));
    options.push(option({
      name: 'desc', value: CUSTOM, checked: entry.id === CUSTOM,
      title: t('builder.custom.option'), onPick: () => pick(CUSTOM),
    }));
    const ids = data.descriptions.items.map((item) => item.id);
    return {
      body: h('div', {}, h('div', { class: 'options', role: 'radiogroup' }, ...options), custom),
      random: () => { entry.id = pickOther(ids, entry.id); },
    };
  },

  summary() {
    const type = data.types.types.find((x) => x.id === draft.type);
    const skillText = (kind) => {
      const entry = draft[kind];
      if (entry.id === CUSTOM) return [entry.name, entry.desc].filter((s) => s.trim()).join(' — ');
      const skill = data.skills[kind].find((x) => x.id === entry.id);
      return `${skill.name} — ${skill.desc}`;
    };
    const descText = draft.desc.id === CUSTOM
      ? draft.desc.text
      : data.descriptions.items.find((x) => x.id === draft.desc.id).text;
    const statsText = data.config.stats.keys
      .map((key, i) => `${t(`stats.${key}`)} ${draft.stats[i]}`).join(' · ');

    const rows = [
      ['name', draft.name.trim(), 'name'],
      ['type', `${type.emoji} ${t(`types.${type.id}.name`)}`, 'type'],
      ['look', h('span', { class: 'summary-look' }, artEl(draft.gender, 'summary-art'), t(`builder.look.${draft.gender}`)), 'look'],
      ['stats', statsText, 'stats'],
      ...SKILL_KINDS.map((kind) => [kind, skillText(kind), 'skills']),
      ['desc', descText, 'desc'],
    ];
    const list = h('dl', { class: 'summary' }, ...rows.map(([key, value, step]) =>
      h('div', { class: 'summary-row' },
        h('dt', { text: t(`builder.summary.rows.${key}`) }),
        typeof value === 'string' ? h('dd', { text: value }) : h('dd', {}, value),
        h('a', {
          class: 'summary-edit', href: `#/make/${step}`, text: t('builder.summary.edit'),
          'aria-label': `${t('builder.summary.edit')} ${t(`builder.summary.rows.${key}`)}`,
        }))));

    const restart = h('button', {
      class: 'btn btn-secondary', type: 'button', text: t('builder.summary.restart'),
      onclick: () => { draft = createDraft(data); go('name'); },
    });
    // "Done" asks once, because the rarity roll is final.
    const confirm = h('div', { class: 'confirm', hidden: true },
      h('p', { text: t('builder.confirm.text') }),
      h('div', { class: 'confirm-actions' },
        h('button', {
          class: 'btn btn-secondary', type: 'button', text: t('builder.confirm.no'),
          onclick: () => { confirm.hidden = true; finish.hidden = false; },
        }),
        h('button', {
          class: 'btn btn-primary', type: 'button', text: t('builder.confirm.yes'),
          onclick: () => { draft.rarity = rollRarity(data.config.rarity); go('reveal'); },
        })));
    const finish = h('button', {
      class: 'btn btn-primary btn-block', type: 'button', text: t('builder.summary.finish'),
      onclick: () => { finish.hidden = true; confirm.hidden = false; },
    });
    return {
      body: h('div', {}, list, finish, confirm, h('div', { class: 'center' }, restart)),
    };
  },
};
