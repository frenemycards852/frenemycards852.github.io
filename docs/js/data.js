// Loads JSON files from docs/ (relative to this module) and caches them.

const cache = new Map();

export function loadJSON(path) {
  if (!cache.has(path)) {
    const url = new URL(`../${path}`, import.meta.url);
    const promise = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`Load ${path} failed: ${res.status}`);
      return res.json();
    });
    // Do not cache failures, so a retry can succeed.
    promise.catch(() => cache.delete(path));
    cache.set(path, promise);
  }
  return cache.get(path);
}
