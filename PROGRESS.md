# PROGRESS — Frenemy Cards / 損友圖鑑

Claude Code: read this at the start of every session and update it at the end of every step.
Keep it short: replace old "Next step" text rather than appending forever.

## Current phase

**Stage 1 · Phase 3 — App shell + localization** (built; awaiting Cantonese review)

## Next step

- Product creator reviews Cantonese in `docs/locales/zh-HK.json`, tests locally, then push.
- Then Phase 4: card builder (without avatar).

Phase 3 notes: views are `<template>`s in `index.html` (`#/`, `#/make`, `#/album`); unknown hashes fall back to home. Language saved as `fc.lang` in localStorage. Example card on home waits for Phase 6.

## Phase checklist

### Stage 1 — Make & send cards

- [x] 1. Environment check
- [x] 2. Project setup & first deployment
- [x] 3. App shell + localization
- [ ] 4. Card builder (without avatar)
- [ ] 5. Avatar builder
- [ ] 6. Card rendering + rarity roll
- [ ] 7. Card links + card view + sharing → **test with real friends**

### Stage 2 — Battles

- [ ] 8. Battle engine
- [ ] 9. Commentary
- [ ] 10. Challenge & battle screens → **test with real friends**

### Stage 3 — Album & polish

- [ ] 11. Album
- [ ] 12. Visual design
- [ ] 13. Content & localization review
- [ ] 14. Cross-browser & device testing
- [ ] 15. Launch
- [ ] 16. Polish

## Decisions made

- Product: friends as collectible roast trading cards, with link-based battles. Childhood card collecting brought into adult friendships; high interaction is the main goal.
- English name "Frenemy Cards". Chinese name 「損友圖鑑」 is temporary (to be decided at ~80% completion).
- URL `https://frenemycards852.github.io`; repo `frenemycards852.github.io` (public), site served from `docs/`.
- Static only: plain HTML/CSS/JS, no build step, no backend, no AI, zero running cost.
- Data travels in the URL hash; album in localStorage.
- Stats: 5 stats (體力, 抽水力, 臉皮, 準時度, 運氣), creator distributes 300 points.
- Rarity N/R/SR/SSR rolled at random, cosmetic only.
- Penalties: preset list + custom text.
- Cartoon avatars only (no photos) in the MVP.
- Environment: Git 2.56, Chrome, Cursor with Live Server (local testing). GitHub account was renamed from `excuseme852` to `frenemycards852` (same account ID); the noreply commit email still links to it. Repo-only commit name: `Frenemycards852`.
- GitHub Pages: deploy from branch `main`, folder `/docs`. Live since 2026-10-08.

## Open questions

- Final Chinese name (decide at ~80% completion).

## Known issues

(none yet)
