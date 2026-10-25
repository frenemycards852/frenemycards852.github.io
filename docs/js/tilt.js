// Big card you can play with, like a real card fresh out of the pack:
// - mouse hover tilts it a little and a glare follows the pointer;
// - a sideways drag (finger or mouse) spins it round to show the card back, and on release
//   it settles on whichever side is nearer;
// - a tap turns it over;
// - every few seconds a glint sweeps across the front.
// Foil cards (SR, SSR) get a rainbow sheen. No phone tilt sensor: iPhone asks for permission
// and many in-app browsers block it.
//
// box > .card-flip (spin) > .card-face.front (the original children) + .card-face.back

import { cardBackImage } from './render-back.js';

const MAX_DEG = 12;
const SPIN_PER_WIDTH = 200; // degrees for a drag across the whole card
const DRAG_START = 8; // px before a press becomes a spin
const TAP_MS = 350; // a press shorter than this, without a drag, turns the card over

// Returns { showBack, turnOver } for scripted turns (nothing with reduced motion).
export function attachTilt(box, { foil = false } = {}) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  box.classList.add('tilt');

  const front = document.createElement('div');
  front.className = 'card-face front';
  // The cut-corner clip moves to the face: a clip on the box would flatten the 3D flip.
  if (box.classList.contains('holo')) {
    box.classList.remove('holo');
    front.classList.add('holo');
  }
  front.append(...box.childNodes);
  const glint = document.createElement('div');
  glint.className = 'card-glint';
  const shine = document.createElement('div');
  shine.className = foil ? 'tilt-shine foil' : 'tilt-shine';
  front.append(glint, shine);

  const back = document.createElement('div');
  back.className = 'card-face back';
  back.setAttribute('aria-hidden', 'true');
  cardBackImage().then((src) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.draggable = false;
    back.append(img);
  }).catch((err) => console.error(err));

  const flip = document.createElement('div');
  flip.className = 'card-flip';
  flip.append(front, back);
  box.append(flip);

  let spin = 0; // resting angle: a multiple of 180
  let drag = null; // { id, x, spinning, at }
  let frame = 0;
  // Side-on the card catches less light: darker as it turns edge-on, bright again face-on.
  const setSpin = (deg) => {
    box.style.setProperty('--spin', `${deg}deg`);
    box.style.setProperty('--shade', (Math.abs(Math.sin((deg * Math.PI) / 180)) * 0.45).toFixed(3));
  };
  // A quick turn (tap) plays the darken-and-brighten as an animation instead.
  const flipBy = (deg) => {
    spin += deg;
    box.style.setProperty('--spin', `${spin}deg`);
    box.style.setProperty('--shade', '0');
    box.classList.remove('flipping');
    void box.offsetWidth; // restart the animation
    box.classList.add('flipping');
  };
  box.addEventListener('animationend', (e) => { if (e.animationName === 'flip-shade') box.classList.remove('flipping'); });

  const tilt = (e) => {
    const r = box.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      box.classList.add('tilting');
      // Turn around the axis perpendicular to the pointer's offset from the centre.
      const dx = x - 0.5;
      const dy = y - 0.5;
      const len = Math.hypot(dx, dy) || 1;
      box.style.setProperty('--tilt-ax', (-dy / len).toFixed(3));
      box.style.setProperty('--tilt-ay', (dx / len).toFixed(3));
      box.style.setProperty('--tilt-deg', `${(Math.min(1, len * 2) * MAX_DEG).toFixed(2)}deg`);
      box.style.setProperty('--tilt-x', `${(x * 100).toFixed(1)}%`);
      box.style.setProperty('--tilt-y', `${(y * 100).toFixed(1)}%`);
    });
  };
  const untilt = () => {
    cancelAnimationFrame(frame);
    box.classList.remove('tilting');
    box.style.setProperty('--tilt-deg', '0deg');
  };

  box.addEventListener('pointerdown', (e) => {
    box.parentElement?.classList.add('tilt-stage'); // 3D depth; the card is placed on the page after attachTilt
    drag = { id: e.pointerId, x: e.clientX, spinning: false, at: Date.now() };
    box.classList.add('pressed');
    if (e.pointerType === 'mouse') tilt(e);
  });
  box.addEventListener('pointermove', (e) => {
    box.parentElement?.classList.add('tilt-stage');
    if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x;
      if (!drag.spinning && Math.abs(dx) > DRAG_START) {
        drag.spinning = true;
        try { box.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
        untilt();
        box.classList.add('spinning');
      }
      if (drag.spinning) {
        setSpin(spin + (dx / box.getBoundingClientRect().width) * SPIN_PER_WIDTH);
        return;
      }
    }
    if (e.pointerType === 'mouse') tilt(e);
  });
  const release = (e) => {
    box.classList.remove('pressed');
    if (drag?.spinning) {
      const now = parseFloat(box.style.getPropertyValue('--spin')) || spin;
      spin = Math.round(now / 180) * 180;
      setSpin(spin);
      box.classList.remove('spinning');
    } else if (drag && e.type === 'pointerup' && Date.now() - drag.at < TAP_MS) {
      flipBy(180); // a tap turns the card over
    }
    drag = null;
    if (e.type !== 'pointerup' || e.pointerType !== 'mouse') untilt();
  };
  box.addEventListener('pointerup', release);
  box.addEventListener('pointercancel', release);
  box.addEventListener('pointerleave', () => {
    box.classList.remove('pressed');
    if (!drag?.spinning) untilt();
  });

  return {
    // Show the card back straight away, with no turning animation.
    showBack() {
      box.parentElement?.classList.add('tilt-stage');
      spin = 180;
      box.classList.add('spinning');
      setSpin(spin);
      requestAnimationFrame(() => requestAnimationFrame(() => box.classList.remove('spinning')));
    },
    // Turn the card over (front ↔ back) with the normal flip.
    turnOver() {
      box.parentElement?.classList.add('tilt-stage');
      flipBy(180);
    },
  };
}
