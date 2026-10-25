// Big card you can play with: a finger drag (or mouse hover) tilts it a little and a light
// glare follows the pointer; foil cards (SR, SSR) get a rainbow sheen on top.
// No phone tilt sensor: iPhone asks for permission and many in-app browsers block it.

const MAX_DEG = 12;

export function attachTilt(box, { foil = false } = {}) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  box.classList.add('tilt');
  const shine = document.createElement('div');
  shine.className = foil ? 'tilt-shine foil' : 'tilt-shine';
  shine.setAttribute('aria-hidden', 'true');
  box.append(shine);

  let frame = 0;
  const move = (e) => {
    box.parentElement?.classList.add('tilt-stage'); // 3D depth; the card is placed on the page after attachTilt
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
  const reset = () => {
    cancelAnimationFrame(frame);
    box.classList.remove('tilting');
    box.style.setProperty('--tilt-deg', '0deg');
  };
  box.addEventListener('pointermove', move);
  box.addEventListener('pointerdown', move);
  box.addEventListener('pointerleave', reset);
  box.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') reset(); });
  box.addEventListener('pointercancel', reset);
}
