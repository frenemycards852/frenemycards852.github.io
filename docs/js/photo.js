// Friend's photo for the "sticker head": pick a picture, drag it into the circle,
// zoom and rotate it, and export a small square image. Everything happens on this
// phone; nothing is uploaded and the photo never goes into a link.

const EDIT_SIZE = 512; // working canvas (px)
const EXPORT_SIZE = 256; // stored photo (px), about 20–30 KB as JPEG
const MAX_SOURCE = 1600; // big phone photos are scaled down once, to keep memory low

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// A file → a canvas no bigger than MAX_SOURCE (browsers apply the photo's rotation tag).
async function readPicture(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, MAX_SOURCE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Draws the picture into a square canvas with the current position, zoom and rotation.
function paint(canvas, source, view) {
  const size = canvas.width;
  const ctx = canvas.getContext('2d');
  const fit = EDIT_SIZE / Math.min(source.width, source.height);
  const k = size / EDIT_SIZE;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2 + view.x * k, size / 2 + view.y * k);
  ctx.rotate((view.rotate * Math.PI) / 180);
  ctx.scale(fit * view.zoom * k, fit * view.zoom * k);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  ctx.restore();
}

// state = { source, view: { x, y, zoom, rotate } } kept by the caller between visits.
// onChange(photoDataUrl | null, state) is called after each edit (and with null when removed).
// art = { src, head: [x, y, r, tilt] } for the live preview on the illustration.
// text(key) gives the UI strings.
export function photoEditor({ state, art, onChange, text }) {
  const box = el('div', 'photo-editor');
  const input = el('input');
  Object.assign(input, { type: 'file', accept: 'image/*', hidden: true });
  const pick = el('button', 'btn btn-primary btn-block', text('pick'));
  pick.type = 'button';
  pick.addEventListener('click', () => input.click());
  const error = el('p', 'field-error');
  error.setAttribute('role', 'alert');

  let current = state;
  const render = () => {
    box.replaceChildren(input);
    if (!current) {
      box.append(pick, error);
      return;
    }
    box.append(editor(), error);
  };

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    error.textContent = '';
    try {
      const source = await readPicture(file);
      current = { source, view: { x: 0, y: 0, zoom: 1, rotate: 0 } };
      render();
      save();
    } catch {
      error.textContent = text('error');
    }
  });

  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const out = document.createElement('canvas');
      out.width = out.height = EXPORT_SIZE;
      paint(out, current.source, current.view);
      onChange(out.toDataURL('image/jpeg', 0.85), current);
    }, 150);
  }

  function editor() {
    const wrap = el('div', 'photo-edit');
    const canvas = el('canvas', 'photo-canvas');
    canvas.width = canvas.height = EDIT_SIZE;
    canvas.setAttribute('aria-label', text('fit'));
    const ring = el('div', 'photo-ring');
    ring.append(canvas);

    // Live preview: the photo on the illustration's head.
    const preview = el('div', 'photo-preview');
    const artImg = el('img', 'photo-preview-art');
    artImg.src = art.src;
    artImg.alt = '';
    const sticker = el('canvas', 'photo-preview-sticker');
    sticker.width = sticker.height = 160;
    const [hx, hy, hr, tilt] = art.head;
    Object.assign(sticker.style, {
      left: `${hx * 100}%`,
      top: `${hy * 100}%`,
      width: `${hr * 200}%`,
      transform: `translate(-50%, -50%) rotate(${tilt}deg)`,
    });
    preview.append(artImg, sticker);

    const redraw = () => {
      paint(canvas, current.source, current.view);
      paint(sticker, current.source, current.view);
    };

    // Drag with one finger, pinch with two.
    const pointers = new Map();
    let pinch = null;
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: current.view.zoom };
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      const last = pointers.get(e.pointerId);
      if (!last) return;
      const k = EDIT_SIZE / canvas.getBoundingClientRect().width;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2 && pinch) {
        const [a, b] = [...pointers.values()];
        current.view.zoom = Math.min(4, Math.max(1, pinch.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.dist)));
        zoom.value = current.view.zoom;
      } else {
        current.view.x += (e.clientX - last.x) * k;
        current.view.y += (e.clientY - last.y) * k;
      }
      redraw();
    });
    const end = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      save();
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    const slider = (label, min, max, step, value, apply) => {
      const field = el('label', 'photo-slider');
      const range = el('input');
      Object.assign(range, { type: 'range', min, max, step, value });
      range.addEventListener('input', () => { apply(Number(range.value)); redraw(); });
      range.addEventListener('change', save);
      field.append(el('span', null, label), range);
      return { field, range };
    };
    const { field: zoomField, range: zoom } = slider(text('zoom'), 1, 4, 0.01, current.view.zoom, (v) => { current.view.zoom = v; });
    const { field: rotateField } = slider(text('rotate'), -180, 180, 1, current.view.rotate, (v) => { current.view.rotate = v; });

    const change = el('button', 'btn btn-secondary', text('change'));
    change.type = 'button';
    change.addEventListener('click', () => input.click());
    const remove = el('button', 'btn btn-secondary', text('remove'));
    remove.type = 'button';
    remove.addEventListener('click', () => {
      current = null;
      onChange(null, null);
      render();
    });
    const row = el('div', 'share-row');
    row.append(change, remove);

    wrap.append(el('p', 'hint', text('fit')), ring, zoomField, rotateField, el('p', 'photo-preview-label', text('preview')), preview, row);
    redraw();
    return wrap;
  }

  render();
  return box;
}
