// Booster pack: crimped foil pack with a tear strip along the top.
// Swipe along the dotted line to tear it (the strip rolls up behind the finger; past halfway it
// tears off on release), or tap / press Enter to tear it in one go.
//
// boosterPack() returns { front, torn }:
//   front – the pack itself (a button), placed in front of the card;
//   torn  – a promise that resolves once the strip has flown off.

const STRIP = 0.17; // tear strip height, share of the pack
const TEAR_AT = 0.5; // swipe this far across to tear on release
const TAP_PX = 8;

// Saw-tooth edge for the crimped seals: points along y, teeth pointing out.
function crimp(y, depth, teeth = 14) {
  const pts = [];
  for (let i = 0; i <= teeth * 2; i++) pts.push(`${(i / (teeth * 2)) * 100}% ${i % 2 ? y + depth : y}%`);
  return pts;
}

function el(tag, className) {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

export function boosterPack({ name, label, icon }) {
  const top = STRIP * 100;

  const front = el('button', 'pack');
  front.type = 'button';
  front.setAttribute('aria-label', label);

  const strip = el('div', 'pack-strip');
  strip.style.clipPath = `polygon(${[...crimp(0, 4), `100% 100%`, `0 100%`].join(', ')})`;
  const body = el('div', 'pack-body');
  body.style.clipPath = `polygon(0 0, 100% 0, ${[...crimp(100, -3)].reverse().join(', ')})`;
  body.style.top = `${top}%`;
  // The strip rolls up from the left: the wrap hides the rolled-up part, the roll rides the edge.
  const stripWrap = el('div', 'pack-strip-wrap');
  stripWrap.style.height = `${top}%`;
  stripWrap.append(strip);
  const roll = el('div', 'pack-roll');
  roll.style.height = `${top}%`;
  const seam = el('div', 'pack-seam');
  seam.style.top = `${top}%`;
  const rip = el('div', 'pack-rip');
  rip.style.top = `${top}%`;

  const logo = el('img', 'pack-logo');
  logo.src = icon;
  logo.alt = '';
  const title = el('span', 'pack-name');
  title.textContent = name;
  const q = el('span', 'pack-q');
  q.textContent = '?';
  body.append(logo, title, q);
  front.append(body, stripWrap, seam, rip, roll);

  let state = 'closed'; // closed → tearing → torn
  let resolveTorn;
  const torn = new Promise((resolve) => { resolveTorn = resolve; });
  const setTear = (p) => front.style.setProperty('--tear', p.toFixed(3));

  const tearOff = () => {
    if (state === 'torn') return;
    state = 'torn';
    front.disabled = true;
    front.classList.remove('dragging');
    setTear(1);
    front.classList.add('torn');
    // The strip finishes rolling up to the right edge, then the roll pops off.
    roll.addEventListener('animationend', () => resolveTorn(), { once: true });
    // Safety net if the animation is skipped.
    setTimeout(resolveTorn, 1300);
  };

  let drag = null;
  let swipedAway = false; // a swipe ends with a click event too; that click must not tear
  front.addEventListener('pointerdown', (e) => {
    if (state === 'torn') return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  });
  front.addEventListener('pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId || state === 'torn') return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > TAP_PX) {
      drag.moved = true;
      front.classList.add('dragging');
      try { front.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    }
    if (drag.moved) setTear(Math.min(1, Math.max(0, (dx / front.getBoundingClientRect().width) * 1.2)));
  });
  const release = (e) => {
    if (!drag || state === 'torn') return;
    const p = parseFloat(front.style.getPropertyValue('--tear')) || 0;
    const swiped = drag.moved;
    drag = null;
    front.classList.remove('dragging');
    swipedAway = swiped && e.type === 'pointerup'; // a cancelled touch sends no click
    if (swiped && p >= TEAR_AT) tearOff();
    else if (swiped) setTear(0); // springs back (CSS transition)
  };
  front.addEventListener('pointerup', release);
  front.addEventListener('pointercancel', release);
  // A tap or Enter / Space: tear it in one go (a swipe that moved is handled above).
  front.addEventListener('click', () => {
    if (swipedAway) { swipedAway = false; return; }
    if (state === 'closed') tearOff();
  });

  return { front, torn };
}
