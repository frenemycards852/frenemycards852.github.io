// Hash-based views: "#/" home, "#/make/<step>", "#/album", "#/challenge",
// card links "#c=<payload>" and challenge links "#x=<payload>".
// Replay links (#r=) are added in Phase 10c.

import { applyI18n } from './i18n.js';
import { mountBuilder } from './builder.js';
import { mountHome } from './home.js';
import { mountCardView } from './cardview.js';
import { mountChallenge } from './challenge.js';
import { mountChallengeReceived } from './accept.js';
import { mountMyCards } from './mycards-view.js';

// A route either clones a static <template> (optionally followed by `after`) or mounts a view module.
const ROUTES = {
  '': { template: 'view-home', after: mountHome },
  make: { mount: mountBuilder },
  album: { mount: mountMyCards },
  challenge: { mount: mountChallenge },
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
  // Challenge links: #x=<payload>
  if (location.hash.startsWith('#x=')) {
    mountChallengeReceived(app, location.hash.slice(3));
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
