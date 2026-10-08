// App startup: load language, wire the language toggle, start the router.

import { initI18n, setLang, getLang, applyI18n, t, LANGS } from './i18n.js';
import { initRouter, render } from './router.js';

function refreshChrome() {
  applyI18n(document);
  document.title = t('app.name');
}

async function start() {
  await initI18n();
  refreshChrome();
  initRouter();

  document.getElementById('lang-btn').addEventListener('click', async () => {
    const next = LANGS.find((code) => code !== getLang());
    await setLang(next);
    refreshChrome();
    render(); // redraw the current view (e.g. builder presets) in the new language
  });
}

start();
