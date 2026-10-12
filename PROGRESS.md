# PROGRESS — Frenemy Cards / 損友圖鑑

Claude Code: read this at the start of every session and update it at the end of every step.
Keep it short: replace old "Next step" text rather than appending forever.

## Current phase

**Stage 3 · Phase 12b — Photo step in the builder** (built; awaiting review). 12a head positions confirmed 2026-10-12 (circles cover the whole head, hair included). Phase 11 album, battle backgrounds and effect art pushed 2026-10-11.

## Next step

- Product creator tests 12b, then 12c (album, challenge, battle and images use the photo; consent reminder). Original Phase 12 visual design (icons, link preview) moves after this. Phase 11 still to be tested on phones.
- Battle effect art added 2026-10-11 (`docs/assets/fx/`: `vs.png`, `ko.png`, `bubble-say.png` for shouts/moves, `bubble-think.png` for skipped turns, `burst.png` behind "-38 HP" (crit bigger and red, heal tinted green), `burst-label.png` (solid yellow burst) for small labels like miss/dodge, `winner.png` over the winner on a points win (K.O. wins show only the K.O. art); text sits inside via `--text-area`). The AI images had a painted checkerboard instead of real transparency; `tools/cutout.ps1` turns such JPGs into transparent PNGs.
- Battle backgrounds added 2026-10-11 (`docs/assets/scenes/`, `types.json` → `scene`): late street, foodie café, slacker beach, work office, love café (shared; a 6th scene could replace it), savage classroom. Later, from the product creator: better effects for damage, K.O. and skills, and pose images (`spec/ILLUSTRATIONS.md` §6).
- Comic battle Cantonese (speech-bubble shouts in `data/commentary/zh-HK.json` → `shout`, `comic.*` labels) still to be reviewed line by line.
- Decided: both players pick a tactic; the opponent can't see the challenger's tactic; the battle seed must combine the challenge nonce with B's card + tactic.
- Comic battle (`comicbattle.js`) is the default battle screen since 2026-10-11; `?comic=0` shows the older list version (`battleview.js`), kept for comparison. Pose images (brief: `spec/ILLUSTRATIONS.md` §6) will replace the whole-card actors when drawn.

Notes (current state):
- Photo sticker heads (Phase 12a, started 2026-10-12): `types.json` → `head.<gender>` = `[x, y, r, tilt]` (x, y, r = fractions of the illustration; tilt in degrees). `render-card.js` → `drawPhoto` draws `card.photo` (a square image cropped by the maker) as a round sticker with a white edge on the head. The photo never goes into any link (codec ignores it). Calibrate on `dev/heads.html` (tap a card, drag the ring, sliders for size/tilt, copy the JSON).
- Builder photo step (12b, `photo.js`, step `#/make/photo` after "look", optional): pick/take a photo (`input type=file accept=image/*`, scaled to ≤2400 px once), drag with one finger, pinch or slider to zoom (1–10×, for far-away faces), slider to rotate (±180°), live preview on the illustration's head; exported as a 256 px JPEG data URL into `draft.photo` (`draft.photoState` keeps the editable picture for this session). `toCard` adds `photo` only when present; summary shows it; privacy/consent note under the editor.
- Album (Phase 11, `mycards-view.js`): `#/album` = progress line, filter chips (source / type / rarity), sort (newest / rarity / name), grid; tap → `#/album/<n>` big card (challenge, share, delete with confirm). `#/album/collection` = pick up to `config.collection.max` (9) → 1080×1920 "Friend Collection" image (`render-collection.js`, title uses `fc.myName`). `#/album/export` = one link `#a=` (`codec.js` ALBUM_VERSION 1: `[[card array, "m"|"r"], …]`, ~48 chars per card) → import screen adds only new cards (`importMyCards`), broken entries skipped. Album max `config.myCards.max` = 100. `canStoreCards()` shows a notice when storage is off.
- Comic battle: same `match` / `runBattle` / `showResult` as `battleview.js`. Events are grouped into panels (intro VS, one per action with trait effects folded in, round label on the next panel, finish = K.O.!! or ⏰ Time's up). HUD pills on top, stage with no box (the whole page background becomes the acting card's place while battling: fixed `#battle-backdrop`, body class `in-battle`, cleared by the router; `types.json` → `scene` if added later, else the card illustration, blurred, with a panel colour tint; the two whole cards as actors — the attacking card charges into the other — plus burst / speech bubble / tags; finish = WINNER! / LOSE stamps, K.O.!! burst or ⏰ banner), referee caption below, skip. Poses: `types.json` → `poses.<gender>.attack|hurt|ko` (pose images face right; the right fighter is mirrored), falling back to the whole card + CSS motion. Shouts for normal attacks: `shout` in `data/commentary/<lang>.json`. Pace: `config.battle.pace.comic`. Text: `comic.*` in locales. Switch in `accept.js` / `replay.js` via `comicMode()`.
- My album (`mycards.js`, `mycards-view.js`, route `#/album`): `fc.myCards` = `{ v: 1, items: [{ card, source: made|received, at }] }`, newest first, max `config.myCards.max` (20), de-duplicated by `cardKey` (ignores `from`). Made cards are saved when the pack opens (`reveal.js`); received cards when a card link opens (`cardview.js`). Invalid stored cards are skipped. Thumbnails are drawn one at a time through one scratch canvas (memory on phones).
- Challenges: `#/challenge` (`challenge.js`) = pick card (card picker) + penalty (`data/penalties/<lang>.json`, ids p1–p5 or custom ≤ `config.challenge.penaltyMax`) + tactic + your name (`fc.myName`). `startChallenge(card)` pre-picks a card (from reveal, card view, album). Link `#x=` (`codec.js` → `encodeChallenge`, CHALLENGE_VERSION 1): `[card array, tactic a/d/c, penalty number|text, name, nonce]`, ~110–140 chars. `challenge-model.js` → `isChallengeValid`, `penaltyText`. Image 1080×1350 (`render-challenge.js`). `#x=` opens `accept.js`.
- Accept (`accept.js`, `#x=`): challenger card + penalty, pick your card (album) or "make one on the spot" (`startNewCard('', '#x=…')` → builder keeps `draft.returnTo` → reveal shows "Fight with this card" → `acceptWithCard`), pick tactic, Fight. Seed = `battleSeed(nonce, defender card, defender tactic)` (`challenge-model.js`, plain `cardKey` JSON, not the compressed link). State is in memory per challenge: a language switch shows the result without replaying.
- Battle screen (`battleview.js`): `showBattle(container, match, data, { viewer, animate, isAlive, actions })`, match = `{ cards, tactics, seed, penalty, people }`. Fighter thumbnails, Stamina bars (`transform: scaleX`), shake + floating numbers, commentary feed one line at a time (`config.battle.pace`), skip button, result (headline from the viewer's side, final Stamina, both tactics revealed, who pays the penalty). `actions(result)` builds the buttons under the result.
- Result (10c): `resultSharePanel` = result image (`render-result.js`, 1080×1350, names only so it reads right for anyone) + share with a replay link. `resultActions` (accept.js) = send result, 🔄 Rematch (`startChallenge(myCard, penalty)`), watch again, home.
- Replay `#r=` (`replay.js`, REPLAY_VERSION 1): `[card A, card B, tactic A, tactic B, penalty, name A, name B, nonce, battle rules version]`, ~160–180 chars; seed rebuilt with `battleSeed`. Viewer: this phone sent the challenge → side 0; fought it → side 1; else onlooker ("make your own card"). Old rules version → notice.
- One fight per challenge (`matches.js`, `fc.matches` = `{ v: 1, sent: [nonce], fought: [{ nonce, card, tactic, name }] }`, 50 each): reopening a fought challenge shows "🔒 already answered" and the same result. Per phone only (another phone/browser could fight again; acceptable among friends).
- Canvas text must avoid FE0F emoji (penalty emoji 🍜 🤳 instead of 🍽️ 🖼️; challenge title uses 🥊).
- Commentary (`commentary.js`, no DOM): `commentate(result, ctx, lines, seed)` → one array of lines per battle event. `ctx = { names, types (labels), typeIds, skills: [{ move, trait, weakness } names], rounds }`. Pools in `data/commentary/<lang>.json`, keyed by event (`attack.hit`, `effective.<attacker type>`, `trigger.<kind>`, `skip.<kind>`, `move.<kind>`, `trait.<kind>`, `end.*` …); placeholders `{actor} {opponent} {move} {oppMove} {trait} {oppTrait} {weakness} {type} {oppType} {dmg} {heal} {n}`. Own RNG stream (`talk|seed`); each pool is used up before repeating. Chinese templates have no spaces around placeholders; a space is added automatically next to Latin names/numbers. Dev page checks both languages have the same keys and every event gets a filled line. Phase 13 expands pools to ≥5 lines each.
- Battle engine (`battle.js`, `rng.js`, no DOM): `simulateBattle({ cards: [a, b], tactics: [ta, tb], seed }, { config, types, effects })` → `{ winner 0/1/null, reason ko/points/draw, hp, maxHp, pct, effects, events }`. Events (`start`, `round`, `skip`, `move`, `attack`, `trait`, `end`) each carry `hp: [a, b]` for Phase 9 commentary and Phase 10 animation. RNG seed = `${battle.version}|${seed}`; Phase 10 must build the seed from the challenger's random part + B's card and tactic. Commentary must use its own RNG stream so wording changes never change results.
- Battle numbers: `config.json` → `battle` (bump `battle.version` when changing rules, so old replay links can be told apart). Effects: `effects.json` (presets by id; custom entries get a pool effect picked by a hash of their name). Tuned 2026-10-11 on the dev page (6000 random battles): every move/trait/weakness/top stat/tactic wins 41–56%; type advantage ≈ 66%. Higher 準時度 acts first and gets a first-strike bonus; nextMiss/stun aren't used when the opponent has no turn left.
- Card links: `#c=<payload>` (`codec.js`). Payload = version digit + format ("j" plain / "z" deflate-raw via CompressionStream) + base64url of a compact JSON array `[name, gender b/g, type id, stats, move, trait, weakness, desc, rarity, from]`; presets are numbers (m3 → 3), customs are text. Typical link payload 60–80 chars. v1 must keep decoding forever; change the format by adding a version. Decode errors are `CodecError` with code corrupt / version / unsupported; `card.js` → `isCardValid` also rejects tampered cards (stats, unknown ids, blocked words).
- Card view (`cardview.js`): flip-in card, "Strike back! Make one of {from}" (pre-fills the builder via `builder.startNewCard(name)`), grey "coming soon" Challenge / Add to album, share panel, intro + make your own. Bad links show a friendly message.
- Sharing (`share.js`): Web Share with the PNG file when supported, else text + link, else copies the link; Copy link (clipboard with fallback); Save image (download, or open the image). The maker's name ("你叫咩名？", optional) is asked on the reveal screen, stored as `fc.myName`, and put in the link as `from`.
- Home "make a card" always starts a fresh card.
- iOS canvas: emoji with the FE0F variation selector (🗡️ 🛋️ ⚔️) draw as thin black symbols and break text measuring/alignment. Canvas text must only use plain colour emoji (slacker 🥱, savage 💀, "Beats" 👊). Set fillStyle to a solid colour before drawing emoji (gradients hide them on iOS).
- Fixed 2026-10-11: after opening a pack the page shifted left on phones (the flash kept its 1.8× scale and widened the page). Flash no longer keeps its end state, the reveal stage clips overflow, and html/body clip sideways overflow as a safety net.
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
- [x] 7. Card links + card view + sharing → **test with real friends** (tested with friends)

### Stage 2 — Battles

- [x] 8. Battle engine
- [x] 9. Commentary
- [x] 10a. My album + challenge setup/link/image
- [x] 10b. Accept + battle animation + result screen
- [x] 10c. Result image + replay link + rematch + lock + comic battle → **test with real friends**
- [ ] 10. Challenge & battle screens → **test with real friends**

### Stage 3 — Album & polish

- [ ] 11. Album (built; awaiting review)
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
