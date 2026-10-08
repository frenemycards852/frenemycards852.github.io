// UI localization: loads locale JSON, translates keys, remembers the choice.

export const LANGS = ['zh-HK', 'en'];
const STORAGE_KEY = 'fc.lang';

let lang = 'en';
let strings = {};

function readSaved() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function save(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage unavailable (private mode, in-app browser): keep working without it.
  }
}

function detect() {
  const saved = readSaved();
  if (LANGS.includes(saved)) return saved;
  const nav = (navigator.language || '').toLowerCase();
  return nav.startsWith('zh') ? 'zh-HK' : 'en';
}

async function load(code) {
  const url = new URL(`../locales/${code}.json`, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Locale ${code} failed: ${res.status}`);
  return res.json();
}

export async function initI18n() {
  await setLang(detect(), { remember: false });
}

export async function setLang(code, { remember = true } = {}) {
  try {
    strings = await load(code);
    lang = code;
  } catch (err) {
    console.error(err);
    if (code === 'en') return;
    strings = await load('en');
    lang = 'en';
  }
  if (remember) save(lang);
  document.documentElement.lang = lang;
}

export function getLang() {
  return lang;
}

// t('builder.step', { n: 2 }) fills "{n}" placeholders.
export function t(key, vars) {
  const value = key.split('.').reduce((obj, part) => obj?.[part], strings);
  if (typeof value !== 'string') return key;
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

// Fill text and aria-labels for every [data-i18n] element under root.
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
  });
}
