# Frenemy Cards

Turn your friends into collectible trading cards that roast their everyday habits, then challenge them to a card battle.

Live site: https://frenemycards852.github.io

## How it works

- Static site only (HTML, CSS, JavaScript). No backend, no build step.
- The website lives in `docs/` (GitHub Pages publishes from that folder).
- Cards and battles travel inside the link; the album is stored on the user's phone.

## Run locally

Opening `docs/index.html` directly from the file system will not work later (ES modules and `fetch()` need a web server).

1. Open this folder in Cursor.
2. Right-click `docs/index.html` → **Open with Live Server**.
3. Chrome opens `http://127.0.0.1:5500/docs/index.html`.
