// Everything needed to check and draw cards and challenges in the current language.

import { getLang } from './i18n.js';
import { loadJSON } from './data.js';

export async function loadCardData() {
  const lang = getLang();
  const [config, types, blocklist, skills, descriptions, penalties] = await Promise.all([
    loadJSON('data/config.json'),
    loadJSON('data/types.json'),
    loadJSON('data/blocklist.json'),
    loadJSON(`data/skills/${lang}.json`),
    loadJSON(`data/descriptions/${lang}.json`),
    loadJSON(`data/penalties/${lang}.json`),
  ]);
  return { lang, config, types, blocklist, skills, descriptions, penalties };
}
