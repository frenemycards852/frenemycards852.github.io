// Hash-based views: "#/" home, "#/make/<step>", "#/album", and card links "#c=<payload>".
// Challenge (#x=) and replay (#r=) links will be routed here in Stage 2.

import { applyI18n } from './i18n.js';
import { mountBuilder } from './builder.js';
import { mountHome } from './home.js';
import { mountCardView } from './cardview.js';

// A route either clones a static <template> (optionally followed by `after`) or mounts a view module.
const ROUTES = {
  '': { template: 'view-home', after: mountHome },
  make: { mount: mountBuilder },
  album: { template: 'view-album' },
};

function parseHash() {
  const [name = '', param] = location.hash.replace(/^#\/?/, '').split(/[/?]/);
  return { name, param };
}

export function render() {
  const app = document.getElementById('app');
  // Card links: #c=<payload>
  if (location.hash.startsWith('#c=')) {
    mountCardView(app, location.hash.slice(3));
    window.scrollTo(0, 0);
    return;
  }
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
