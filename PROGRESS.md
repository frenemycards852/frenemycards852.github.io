# PROGRESS — Frenemy Cards / 損友圖鑑

Claude Code: read this at the start of every session and update it at the end of every step.
Keep it short: replace old "Next step" text rather than appending forever.

## Current phase

**Stage 1 · Phase 5 — Avatar builder** (built; awaiting review)

## Next step

- Product creator tests the avatar step locally, then push.
- Then Phase 6: card rendering (Canvas) + rarity roll.

Notes:
- Avatar: placeholder SVG parts all in `docs/data/avatar.json` (one file instead of `assets/avatar/*.svg`; approved 2026-10-09). `avatar.js` builds the SVG; head is its own `<g class="head">` for future photo heads.
- Avatar step starts with 男仔/女仔 (product creator's request). Each style has its own categories (`styles[].partOrder`): boy 11 (incl. beard), girl 13 (incl. make-up, earrings, hair accessory); shared: face, skin, eyes, brows, mouth, hair colour, outfit colour. Choosing loads a basic look (`base`); dice keeps the style.
- Stored avatar = `[styleIndex, ...indices in that style's partOrder]`, so the style **is** part of the card. **Never reorder/remove styles, parts or options; only append** (links depend on it).
- Category row scrolls sideways (visible scrollbar, mouse wheel, edge fade).
- Art style B "cool shonen chibi" (型格少年漫 Q 版), chosen 2026-10-09 by the product creator after a cute chibi round ("too peaceful for a battle game"): big-head proportions kept; sharp almond eyes, angled brows, V chin, cel shadows (hair `shade` slot under the eyes layer), spiky hair, dark outlines, cool palette. All art original (samples were style direction only). Detailed anime-illustration level ruled out (needs an illustrator; copyright). Note: spec Section 14 says "not dark/edgy" — B stays bright-outlined and playful, battle hype goes into card frames/battle screens later.
- Routes: `#/`, `#/make/<step>` (steps: name, avatar, type, stats, skills, desc, summary), `#/album`. Unknown hashes → home. Opening a later step with earlier steps invalid redirects to the first invalid step.
- Draft is kept in memory only (`builder.js`); a page reload starts a new card.
- Skill/description presets share ids across languages (`m1`, `t1`, `w1`, `d1`); battle effects get mapped to these ids in Phase 8.
- Custom entries use id `custom`. Builder dice uses `Math.random` (seeded RNG is only for battles).
- Language saved as `fc.lang` in localStorage. Example card on home waits for Phase 6.

## Phase checklist

### Stage 1 — Make & send cards

- [x] 1. Environment check
- [x] 2. Project setup & first deployment
- [x] 3. App shell + localization
- [x] 4. Card builder (without avatar)
- [x] 5. Avatar builder
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
- Card builder is one step per screen (decided 2026-10-08).
- Photo heads (real photo head on a cartoon body): approved idea, to build **after Stage 1** is tested. Photo stays local only (preview, shared PNG, own album); links always carry the cartoon head. Needs a consent reminder and no face-altering effects. Phase 5 avatar must keep the head as a swappable layer.

## Open questions

- Final Chinese name (decide at ~80% completion).

## Known issues

(none yet)
