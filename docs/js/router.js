// Hash-based views: "#/" home, "#/make/<step>", "#/album".
// Link payloads (#c=, #x=, #r=) will be routed here in later phases.

import { applyI18n } from './i18n.js';
import { mountBuilder } from './builder.js';
import { mountHomeCard } from './home.js';

// A route either clones a static <template> (optionally followed by `after`) or mounts a view module.
const ROUTES = {
  '': { template: 'view-home', after: mountHomeCard },
  make: { mount: mountBuilder },
  album: { template: 'view-album' },
};

function parseHash() {
  const [name = '', param] = location.hash.replace(/^#\/?/, '').split(/[/?]/);
  return { name, param };
}

export function render() {
  const app = document.getElementById('app');
  let { name, param } = parseHash();
  if (!(name in ROUTES)) {
    // Unknown hash: fall back to home without adding a history entry.
    history.replaceState(null, '', '#/');
    name = '';
    param = undefined;
  }
  const route = ROUTES[name];
  if (route.mount) {
    route.mount(app, param);
  } else {
    app.replaceChildren(document.getElementById(route.template).content.cloneNode(true));
    applyI18n(app);
    route.after?.(app);
  }
  window.scrollTo(0, 0);
}

export function initRouter() {
  window.addEventListener('hashchange', () => {
    render();
    document.getElementById('app').focus({ preventScroll: true });
  });
  render();
}
