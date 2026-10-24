// A type's badge for the page: the drawn badge (types.json -> badge) or, without one, its emoji.

export function typeBadge(type, className = 'type-badge') {
  if (type.badge) {
    const img = document.createElement('img');
    img.className = className;
    img.src = type.badge;
    img.alt = '';
    return img;
  }
  const span = document.createElement('span');
  span.className = `${className} is-emoji`;
  span.setAttribute('aria-hidden', 'true');
  span.textContent = type.emoji;
  return span;
}
