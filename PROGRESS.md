# PROGRESS — Frenemy Cards / 損友圖鑑

Claude Code: read this at the start of every session and update it at the end of every step.
Keep it short: replace old "Next step" text rather than appending forever.

## Current phase

**Stage 1 · Phase 7 — Card links + card view + sharing** (built; awaiting review)

## Next step

- Product creator tests sharing on a real phone (Share to WhatsApp, Copy link, Save image), then push.
- Then **test Stage 1 with real friends** before Stage 2 (battles).

Notes (current state):
- Card links: `#c=<payload>` (`codec.js`). Payload = version digit + format ("j" plain / "z" deflate-raw via CompressionStream) + base64url of a compact JSON array `[name, gender b/g, type id, stats, move, trait, weakness, desc, rarity, from]`; presets are numbers (m3 → 3), customs are text. Typical link payload 60–80 chars. v1 must keep decoding forever; change the format by adding a version. Decode errors are `CodecError` with code corrupt / version / unsupported; `card.js` → `isCardValid` also rejects tampered cards (stats, unknown ids, blocked words).
- Card view (`cardview.js`): flip-in card, "Strike back! Make one of {from}" (pre-fills the builder via `builder.startNewCard(name)`), grey "coming soon" Challenge / Add to album, share panel, intro + make your own. Bad links show a friendly message.
- Sharing (`share.js`): Web Share with the PNG file when supported, else text + link, else copies the link; Copy link (clipboard with fallback); Save image (download, or open the image). The maker's name ("你叫咩名？", optional) is asked on the reveal screen, stored as `fc.myName`, and put in the link as `from`.
- Home "make a card" always starts a fresh card.
- Builder: `#/make/<step>` with steps name → type → look (boy/girl, previews the type's illustration) → stats → skills → desc → summary. "Done" asks to confirm, rolls rarity (`rarity.js`), then `#/make/reveal` (`reveal.js`): pack wobbles, tap → flash in the rarity colour → card flips in + reaction line; SSR gets a moving holo shine. After the roll the draft is locked: any edit step redirects to the reveal; "Make another card" starts fresh. Reduced motion skips straight to the card. Final states are the CSS defaults, animations only play the way in.
- Card: `render-card.js` draws 1080×1512. Frame style "A": rarity-coloured chamfered metal (N steel, R silver, SR gold, SSR holo + sparkles), no gems. Illustration for type + gender (`types.json` → `art`) covers the card; lower glass panel (radar + skills) and quote strip are see-through. Missing illustration → type burst + energy effect + "插畫準備中". `card.js` → `toCard(draft)` is the finished card shape (stores `gender`, not an avatar).
- Home shows an example card (`data/sample-card.json`, `home.js`).
- `avatar.js` / `avatar.json` (programmatic avatars, styles explored 2026-10-09/10) are no longer loaded; kept in case of future use.
- Draft lives in memory only; a page reload starts a new card.
- Skill/description presets share ids across languages (`m1`, `t1`, `w1`, `d1`); battle effects get mapped to these ids in Phase 8. Custom entries use id `custom`. Builder dice uses `Math.random` (seeded RNG is only for battles).
- Language saved as `fc.lang` in localStorage. Dev page: `docs/dev/test.html` (link round trips, broken-link cases, card samples, rarity distribution).

## Phase checklist

### Stage 1 — Make & send cards

- [x] 1. Environment check
- [x] 2. Project setup & first deployment
- [x] 3. App shell + localization
- [x] 4. Card builder (without avatar)
- [x] 5. Avatar builder (later replaced by illustrations)
- [x] 6. Card rendering + rarity roll
- [x] 7. Card links + card view + sharing → **test with real friends** (awaiting review)

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
- No real photos on cards in the MVP (card art = type illustrations, see below).
- Environment: Git 2.56, Chrome, Cursor with Live Server (local testing). GitHub account was renamed from `excuseme852` to `frenemycards852` (same account ID); the noreply commit email still links to it. Repo-only commit name: `Frenemycards852`.
- GitHub Pages: deploy from branch `main`, folder `/docs`. Live since 2026-10-08.
- Card builder is one step per screen (decided 2026-10-08).
- 2026-10-10: card art switches to **illustrations** (product creator's choice "A"): one illustration per type × boy/girl (12), chosen automatically by type + gender. Done 2026-10-10: builder steps are now name → type → look (boy/girl, previews the type's illustration) → stats → skills → desc → summary; card stores `gender` instead of `avatar`. Illustration paths live in `types.json` → `art`; missing ones show a "插畫準備中" placeholder (type burst + effect). `avatar.js` / `avatar.json` are no longer loaded (kept for now in case of future use). Illustrations in: late-boy, late-girl, foodie-boy, foodie-girl, slacker-boy, slacker-girl, work-boy, work-girl, love-boy, love-girl, savage-boy, savage-girl — all 12 (made with Google Gemini; love-boy has generic anime posters in the background, love-girl a stray extra hand near the scarf (mostly hidden by the name plate), savage-boy cartoon bullets and a little garbled text — kept by the product creator's choice; any may be regenerated). Brief: `spec/ILLUSTRATIONS.md`. Card frame back to style "A" (rarity-coloured chamfered metal frame, no gems). Product creator supplies the images; rights to publish must be confirmed for each (repo is public).
- Photo heads: approved idea, to build **after Stage 1** is tested. With illustrations (2026-10-10) this becomes a "sticker head": each illustration gets face data in `types.json` (centre, size, angle, and whether it suits a photo — e.g. slacker-girl in the blanket does not); the user crops a photo to a circle on the phone and it is pasted over the drawn head. Photo stays local only (preview, shared PNG, own album); links always show the plain illustration. Needs a consent reminder and no face-altering effects. Zero cost (all on the phone).

## Open questions

- Final Chinese name (decide at ~80% completion).

## Known issues

(none yet)
