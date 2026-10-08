// Hash-based views: "#/" home, "#/make", "#/album".
// Link payloads (#c=, #x=, #r=) will be routed here in later phases.

import { applyI18n } from './i18n.js';

const ROUTES = {
  '': 'view-home',
  make: 'view-make',
  album: 'view-album',
};

function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  const name = hash.split(/[/?]/)[0];
  return name in ROUTES ? name : null;
}

export function render() {
  const app = document.getElementById('app');
  let route = currentRoute();
  if (route === null) {
    // Unknown hash: fall back to home without adding a history entry.
    history.replaceState(null, '', '#/');
    route = '';
  }
  const tpl = document.getElementById(ROUTES[route]);
  app.replaceChildren(tpl.content.cloneNode(true));
  applyI18n(app);
  window.scrollTo(0, 0);
}

export function initRouter() {
  window.addEventListener('hashchange', () => {
    render();
    document.getElementById('app').focus({ preventScroll: true });
  });
  render();
}
