# MASTER PROMPT — FRENEMY CARDS / 損友圖鑑

You are the primary AI coding agent for this project.

Your job is to help build a real, functional, polished **mobile-first static web application**, deployed **for free on GitHub Pages** at **`https://frenemycards852.github.io`**.

The product creator is a beginner. Work incrementally, explain important changes clearly, and avoid unnecessary complexity. Do not build the entire application in one giant operation.

When a requirement is ambiguous, do not silently choose a major architecture, paid service, dependency, or product behavior. Explain the options and ask for confirmation when the decision materially affects the project.

**Communication language:** Explain plans, changes, and test instructions to the product creator in **Traditional Chinese** (Hong Kong Cantonese is welcome). Code, comments, commit messages, and file names stay in English.

---

## 1. CORE CONSTRAINT: STATIC & FREE

This is the most important technical constraint. Every decision must respect it.

- The whole product is **static files only** (HTML, CSS, JavaScript, JSON, SVG/images) served by GitHub Pages.
- **No backend, no server, no database, no serverless functions, no paid APIs, no AI.**
- Running cost must be **zero**. Nothing may require a credit card.
- All content (skills, commentary lines, penalties, avatar parts) is **pre-written data** in the repo. All logic runs in the user's browser.
- Cards and battles travel between friends **inside the link itself** (Section 9). Nothing is uploaded anywhere.

If a feature seems to need a server, stop and explain the trade-off to the product creator instead of adding it.

---

## 2. TOOLS

- Windows PC
- **Claude Code**: primary coding agent
- **Cursor**: IDE for viewing, reviewing, and small manual edits
- **Git** and **GitHub** (account `frenemycards852`): version control and free hosting
- **Google Chrome**: testing, including DevTools device mode
- A real phone (Android and/or iPhone) for real-device testing

Nothing else is required. Node.js is **not** required.

Claude Code usage counts toward the product creator's Claude Pro plan limits. Work efficiently: inspect only what is needed and avoid regenerating whole files for small changes.

---

## 3. NAME & URL

- English: **Frenemy Cards**
- Chinese: **損友圖鑑** (temporary; the product creator will decide the final Chinese name later)
- All product names live only in the UI locale files, so they can be changed in one place.
- URL: **`https://frenemycards852.github.io`**
  - GitHub user site. The repository is named exactly **`frenemycards852.github.io`** and is **public**.
- Use **relative paths** for all assets and data.

---

## 4. PRODUCT CONCEPT

**Frenemy Cards turns your friends into collectible trading cards — and lets you roast them, battle them, and collect them all.**

It brings a childhood activity (collecting trading cards, swapping stickers, card battles in the playground) into adult friendships, where the cards roast your friends' everyday habits: always late, never replies, "next time I'll pay".

### 4.1 The core loop

```
① Make a card for a friend (roast them)
      ↓ send it
② Friend sees their card: 「吓？我 DEF 99？」
      ↓ not convinced
③ Friend strikes back: makes an even worse card of you
      ↓
④ Someone sends a challenge → ⑤ card battle → ⑥ loser takes the penalty
      ↓
⑦ "Rematch!" / make cards for other friends → the whole group joins in
```

Every step gives the receiver a reason to respond. **High interaction is the main product goal.**

### 4.2 Design principles

1. **Funny first.** The jokes come from accurate, affectionate roasting of everyday habits.
2. **Every output is addressed to someone.** Cards and challenges are made *for* a specific friend.
3. **Every screen a receiver lands on invites them to strike back** ("Make a card of them", "Accept the challenge").
4. **Fast.** A card can be made in about 60 seconds.
5. **Surprise.** The rarity roll and the battle commentary must not be predictable.
6. **Roast, never bully.** Section 12 is mandatory.

### 4.3 Originality

Frenemy Cards is an original card system. **Do not copy or imitate** Pokémon, Yu-Gi-Oh!, Digimon, Magic: The Gathering, or any other existing card game: no card frames, layouts, type names, icons, energy symbols, logos, or terminology from them. Our types (遲到系, 食貨系 …) and stats (抽水力, 臉皮 …) are our own.

---

## 5. TARGET USERS

Young adults and friend groups on WhatsApp, Instagram, and Threads who enjoy roasting each other, memes, and nostalgia.

The product should feel especially natural to Hong Kong users, but it serves an international audience. English must be a fully natural, first-class experience.

Most users arrive **by tapping a link a friend sent**, so the first screen they see is usually a card or a challenge, not the home page. That screen must load fast and make sense immediately.

---

## 6. MAKING A CARD

### 6.1 Steps (target: ~60 seconds)

| # | Step | Notes |
|---|---|---|
| 1 | **Name** | Friend's name or nickname, max 12 characters |
| 2 | **Avatar** | Cartoon avatar builder (Section 6.3) |
| 3 | **Type** | One of the 6 types (Section 6.4) |
| 4 | **Stats** | Creator distributes **300 points** across 5 stats (Section 6.5) |
| 5 | **Signature move / Trait / Weakness** | Pick from preset lists or write your own (Section 6.6) |
| 6 | **Card description** | One line, preset suggestions or custom, max 40 characters |
| 7 | **Rarity roll** 🎰 | Random reveal with a pack-opening animation (Section 6.7) |

Then: preview the finished card → **Share** (Section 9).

- Every step has a sensible default and a 🎲 "random" button, so a card can be made in a few taps.
- The creator can go back and edit any step before the rarity roll. The rarity roll is final for that card.

### 6.2 Who the card is for

The builder asks once at the start: 「幫邊個整卡？」 / "Who is this card for?". The name is used for the card and for the share message.

### 6.3 Avatar builder

- Built from **layered SVG parts**: face shape, skin colour, hair, eyes, mouth, accessories (glasses, cap, earphones, mask …), expression.
- Each part is stored as a small index number, so an avatar costs only a few bytes in the link.
- Offer a **wide range of skin colours** including playful non-realistic ones. Never use stereotyped features for any ethnicity.
- Parts are original artwork drawn for this project (placeholders first, final art in the visual design phase).
- **No real photos** in the MVP (they cannot fit in a link, and avatars are funnier and more private).

### 6.4 Types and matchups

| Type | 中文 | English | Idea |
|---|---|---|---|
| ⏰ | 遲到系 | Late | Always "on the way" |
| 🍜 | 食貨系 | Foodie | Lives to eat |
| 🛋️ | 廢青系 | Slacker | Professional lying-on-the-sofa |
| 💼 | 工作狂系 | Workaholic | "Let me just reply to this email" |
| 💘 | 戀愛腦系 | Lovestruck | "He's not like that" |
| 🗡️ | 毒舌系 | Savage | Roasts everyone |

Matchups (attacker deals **×1.5** damage to the type it beats):

```
工作狂系 → beats → 廢青系 → beats → 食貨系 → beats → 工作狂系
毒舌系   → beats → 戀愛腦系 → beats → 遲到系 → beats → 毒舌系
```

(Funny reasons, shown in the battle commentary: the workaholic out-works the slacker; the slacker sleeps through mealtime; the foodie drags the workaholic to dinner; the savage crushes the lovestruck's illusions; the lovestruck happily waits forever for the late one; the late one isn't there to hear the savage.)

Types and matchups live in data, so they can be rebalanced without code changes.

### 6.5 Stats

Five stats, each **0–100**, total exactly **300**. The creator distributes the points (putting **0** into 準時度 is a roast in itself).

| Stat | 中文 | English | Battle effect |
|---|---|---|---|
| HP | 體力 | Stamina | Starting health (scaled, e.g. 50 + HP) |
| ATK | 抽水力 | Roast | Damage dealt |
| DEF | 臉皮 | Thick Skin | Damage reduced |
| SPD | 準時度 | Punctuality | Who acts first each round |
| LUK | 運氣 | Luck | Chance of critical hits and dodges |

The UI shows remaining points and prevents going over 300. A 🎲 button distributes points randomly.

### 6.6 Signature move, trait, weakness

Each card has exactly one of each.

- **Signature move (必殺技):** used once per battle, strong effect.
- **Trait (特性):** passive effect that may trigger during battle.
- **Weakness (弱點):** a situation that makes the card take extra damage or lose a turn.

Preset lists are grouped by theme (lateness, phone, food, money, work, love, sleep, social …). Each preset has a **funny name, a short funny description, and a mechanical effect** defined in data, for example:

| Kind | 名稱 | Description | Effect (example) |
|---|---|---|---|
| Move | 「到喇到喇」 | 實際仲有 40 分鐘 | Opponent's next attack misses |
| Move | 「下次我請」 | 冇人信 | Fails 70% of the time; when it works, heals 30 |
| Trait | 已讀不回 Lv.MAX | 隱身於對話之中 | 25% chance to dodge any attack |
| Trait | 第二個胃 | 永遠食得落 | Heals 10 at the end of each round |
| Weakness | 早上 9 點前 | 腦部未開機 | Loses the first turn |
| Weakness | 埋單時刻 | 突然要去廁所 | Takes +50% damage in the final round |

**Custom text** is allowed for all three (max 16 characters for the name, 30 for the description). A custom entry gets a **random generic effect** from a small balanced pool, so custom cards stay fair.

### 6.7 Rarity roll

After the card is finished, a pack-opening animation reveals its rarity:

| Rarity | Chance | Look |
|---|---|---|
| N | 50% | Plain frame |
| R | 30% | Silver frame |
| SR | 15% | Gold frame |
| SSR | 5% | Holographic frame, sparkle effect |

- Rarity is **cosmetic only** in the MVP (no battle bonus), so battles stay fair and the roll is purely for fun: 「阿明竟然係 N 卡 😂」.
- The result is random and final for that card; to re-roll, the creator must make the card again.

---

## 7. VIEWING A RECEIVED CARD

When someone opens a card link:

1. A short **card-flip reveal** (respect `prefers-reduced-motion`).
2. The full card, readable on a phone.
3. Big actions:
   - **「🔄 反擊！幫佢整一張」 / "Strike back! Make a card of them"** — opens the builder with the sender's name pre-filled (the sender's name is included in the link if they entered one).
   - **「⚔️ 挑戰佢」 / "Challenge them"** — start a battle with one of your cards.
   - **「📥 收入卡冊」 / "Add to my album"**
   - **Share** (forward the card to others)
4. A small line explaining what this is, with a button to make your own card, for first-time visitors.

---

## 8. BATTLES

### 8.1 Flow

```
A picks one of their cards (from their album, or makes one)
A chooses a penalty (preset or custom)
      → "Challenge" link + challenge image are created
      ↓
B opens the link → sees A's card and the penalty
B picks their own card to fight with (from their album, or makes one on the spot)
B picks a tactic: 進攻 Attack / 防守 Defend / 亂嚟 Chaos
      ↓
Automatic battle, 3 rounds, animated with commentary
      ↓
Result screen + result image: 🏆 winner, 💀 loser, 📜 penalty
      ↓
"Rematch!" creates a new challenge link back to A.
"Send result" shares the result image + a replay link so A can watch the same battle.
```

### 8.2 Battle rules

- Each card starts with health derived from HP.
- **3 rounds.** In each round, the card with higher 準時度 acts first (ties: random).
- On its turn, a card makes a normal attack, or uses its signature move once per battle (the engine decides when, influenced by the tactic).
- Damage ≈ ATK × type multiplier × random factor (0.85–1.15) − DEF reduction, minimum 1.
- 運氣 gives a chance for critical hits and dodges.
- Traits and weaknesses trigger according to their data-defined effects.
- Tactics: **Attack** (more damage, less defence), **Defend** (less damage taken, less dealt), **Chaos** (bigger random swings).
- A card reaching 0 health loses immediately. Otherwise, after 3 rounds, the card with the higher **remaining health percentage** wins. Exact ties: a dramatic 「打和！兩個一齊受罰」 / "Draw! Both take the penalty."
- All numbers live in a data/config file so they can be balanced without changing code.

### 8.3 Determinism and fairness

- The battle uses a **seeded random number generator**. The same two cards + seed + tactic always produce the same battle, so A and B see exactly the same fight.
- The seed combines a value from A's challenge and **B's choices**, so A cannot know the result before sending the challenge.
- Determined users could still inspect links. That is acceptable: this is a game among friends. Do not over-engineer anti-cheating.

### 8.4 Commentary

The commentary is the main source of laughs. It comes from **line pools** with placeholders, for example:

- 「{attacker}使出「{move}」！{defender}唔信，傷害 0！」
- 「{defender}發動特性「{trait}」，成功閃避！」
- 「{attacker}嘅弱點「{weakness}」發作！成個人停咗機！」
- 「屬性相剋！{attackerType}完全剋制{defenderType}，效果拔群！」
- English pools are written separately and naturally.

Requirements:

- Several lines per event type, picked by the seeded generator, so the same battle replays identically, but different battles feel different.
- Lines must fit the effect that actually happened.
- Pace: about 1–1.5 seconds per action, with a "skip to result" button.

### 8.5 Penalties

The challenger picks a preset or writes their own (max 30 characters):

- 🧋 請對方飲珍奶 / Buy them a bubble tea
- 🍽️ 請食晚飯 / Dinner is on you
- 👑 叫對方做「大佬」一整日 / Call them "Boss" for a whole day
- 📸 幫對方影 IG 相影到佢滿意 / Be their IG photographer until they're happy
- 🖼️ 用對方幫你整嘅卡做 WhatsApp 頭像一日 / Use the card they made of you as your profile picture for a day
- ✏️ Custom

Penalties must stay harmless, legal, and affordable. No preset may involve health risks, alcohol challenges, or anything humiliating beyond light fun.

---

## 9. LINKS, SHARING, AND THE ALBUM

### 9.1 Data travels inside the link

- Card, challenge, and replay data are encoded into the **URL hash** (the part after `#`), e.g.
  - `https://frenemycards852.github.io/#c=<card data>`
  - `#x=<challenge data>`
  - `#r=<replay data>`
- The hash is **never sent to GitHub's servers**, so nothing is uploaded or stored anywhere.
- Encoding: compact JSON → optional compression (built-in `CompressionStream` where available, with a plain fallback) → base64url.
- Every payload includes a **version number**, so old links keep working after updates. Decoding must never crash: invalid or old links show a friendly message and a "make your own card" button.
- Keep links reasonably short: short keys, numeric indices for preset items, length limits on custom text.

**Important honesty note for users:** anyone who has a link can open it. Cards are meant to be shared, so this is fine, but the UI must not promise privacy for card contents.

### 9.2 Sharing

Every share sends **an image + a link**:

- The **image** is what makes people want to tap (the card, the challenge, or the result).
- The **link** is what lets them respond.

Share logic:

1. Feature-detect `navigator.share` and `navigator.canShare({ files })`.
2. If file sharing works, share the PNG plus a short message with the link, e.g.
   「你張卡出咗 😂 撳入嚟睇：<link>」 / "Your card just dropped 😂 Take a look: <link>"
3. Some apps drop the text when an image is attached. Always also offer **「複製連結」 / "Copy link"** and **「儲存圖片」 / "Save image"**.
4. Never assume Web Share support means file sharing is supported.

Images are drawn with the **Canvas API** (card ~1080×1512, portrait). Every image includes the product name and the site URL in a small footer, so anyone who sees the image can find the site.

Note: a static site cannot generate a different link-preview image for each link. The site's Open Graph image is the same for every link, which is why the shared image matters.

### 9.3 The album (卡冊)

- Cards the user made or received are saved in **`localStorage`** (always inside try/catch).
- The album shows all cards, can sort/filter by type and rarity, and lets the user pick a card for battles.
- **「朋友圖鑑」 / "Friend Collection" image:** a grid of up to 9 cards, shareable to IG Story.
- The UI must explain simply that the album is stored **on this phone only**: clearing browser data or switching phones loses it. Offer **export/import** of the album as a link or a small text code, so users can move it.

---

## 10. SCREENS

Single page app with simple hash-based views (no framework):

1. **Home**: what this is (one sentence + example card), 「幫朋友整卡」 / "Make a card for a friend", 「我的卡冊」 / "My album".
2. **Card builder**: Section 6.
3. **Card view** (from a link): Section 7.
4. **Challenge setup**: pick card, pick penalty.
5. **Challenge received** (from a link): see challenger card + penalty, pick card + tactic.
6. **Battle**: animated battle with commentary.
7. **Result**: winner, loser, penalty, rematch, share.
8. **Album**.

Language toggle and a short footer (privacy note, disclaimer) on every view.

---

## 11. LANGUAGE

- UI and content languages: **繁體中文 (zh-HK)** and **English (en)**.
- Default from `navigator.language` (`zh*` → zh-HK, otherwise en). Visible toggle; remember it in `localStorage` (inside try/catch); set `<html lang>`.
- **Card content stays in the language it was made in.** Preset items are stored as IDs, so a preset skill shows in the **viewer's** language; custom text shows as typed.
- Battle commentary uses the **viewer's** UI language.
- **Hong Kong Cantonese:** contemporary written Cantonese, like a real WhatsApp message. Avoid Mainland/Taiwanese phrasing and stiff translated Cantonese.
- **English:** natural and playful, written independently, never translated word-for-word.

---

## 12. ROAST, NEVER BULLY (mandatory)

Roasting friends is the product. Hurting people is not.

- All preset content targets **habits and behaviours** only: lateness, phone habits, food, money habits, work habits, sleep, dating habits, and similar.
- **Never** target appearance, body, weight, race, ethnicity, nationality, religion, gender, sexuality, disability, health, family background, or financial hardship.
- No sexual content, slurs, or profanity in presets.
- Custom text fields show a light reminder: 「抽水要有分寸，大家先玩得耐 😉」 / "Keep the roast friendly so everyone keeps playing 😉".
- A small built-in block list rejects obvious slurs and hate terms in custom text (both languages). It does not need to be perfect.
- Avatar parts never use stereotyped ethnic features.
- Penalties stay harmless (Section 8.5).

---

## 13. WEB PLATFORM REQUIREMENTS

### 13.1 Technology

- **Plain HTML, CSS, and JavaScript (ES modules). No framework, no build step.**
- Do not add npm packages or CDN libraries without first explaining why, what it does, and its size/maintenance cost, and getting approval.
- Prefer built-in browser APIs.

### 13.2 Mobile-first

- Phone portrait first (360–430 px); on desktop, a centered phone-width column.
- Viewport meta, `dvh`, safe-area insets.
- Tap targets ≥ 44×44 px; inputs font-size ≥ 16px.
- Works with the on-screen keyboard open.

### 13.3 Browser support

Latest Chrome (Android + desktop), Safari (iOS + macOS), Samsung Internet, Edge, Firefox, and **in-app browsers** (WhatsApp, Instagram, Threads, Facebook). Feature-detect instead of browser-sniffing.

### 13.4 Performance

- First screen usable within ~2 seconds on 4G; initial weight under ~1 MB.
- SVG for avatars, frames, and icons. Lazy-load anything not needed on the first screen.
- Use system fonts by default. A display font is allowed only after explaining the trade-off (Chinese fonts are very large).
- Animations: CSS transitions/keyframes, animate only `transform` and `opacity`, respect `prefers-reduced-motion`. No animation libraries, game engines, or WebGL in the MVP.

### 13.5 Accessibility

- Localized `alt` / `aria-label`s; each card has an accessible text summary.
- Sufficient colour contrast.
- Battle commentary is real text (screen readers can follow it).

### 13.6 Link previews and PWA

- Open Graph and Twitter meta tags with an attractive generic preview image.
- `manifest.webmanifest` and icons for optional Add to Home Screen. No install pressure. No service worker in the MVP.

---

## 14. VISUAL DESIGN

- Bright, playful, nostalgic: playground, sticker albums, card packs, holographic shine.
- Each type has its own colour and icon. Each rarity has its own frame.
- Original designs only (Section 4.3).
- Cards must be readable as a phone screenshot and as a shared image.

It should **not** look like an existing card game, a generic AI app, or a dark/edgy gaming site.

---

## 15. DATA & PRIVACY

- No accounts, no server, no database, no analytics, no tracking cookies.
- Card and battle data live only in links and in the user's own browser.
- Footer note: 「所有資料只喺連結同你部手機入面，我哋冇伺服器，乜都唔會儲存。」 / "Everything lives in the link and on your phone. We have no server and store nothing."
- Disclaimer: 「純屬抽水，切勿認真 😂」 / "Just a friendly roast. Don't take it seriously 😂".

---

## 16. REPOSITORY STRUCTURE (suggested)

```
frenemycards852.github.io/          ← repository
├── docs/                           ← the website (GitHub Pages publishes from /docs)
│   ├── index.html
│   ├── manifest.webmanifest
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── main.js                 ← startup, wiring
│   │   ├── router.js               ← hash-based views
│   │   ├── state.js                ← app state
│   │   ├── i18n.js                 ← UI localization helper
│   │   ├── codec.js                ← encode/decode link payloads (no DOM)
│   │   ├── card.js                 ← card model, validation, stat rules (no DOM)
│   │   ├── rng.js                  ← seeded random number generator (no DOM)
│   │   ├── rarity.js               ← rarity roll (no DOM)
│   │   ├── battle.js               ← battle engine → list of events (no DOM)
│   │   ├── commentary.js           ← events → commentary lines (no DOM)
│   │   ├── avatar.js               ← compose avatar SVG from part indices
│   │   ├── builder.js              ← card builder UI
│   │   ├── render-card.js          ← draw card on canvas
│   │   ├── render-result.js        ← draw challenge/result images
│   │   ├── textlayout.js           ← text wrapping/fitting helper
│   │   ├── album.js                ← localStorage album, export/import
│   │   └── share.js                ← share, save, copy
│   ├── locales/
│   │   ├── zh-HK.json              ← UI strings (incl. product names)
│   │   └── en.json
│   ├── data/
│   │   ├── config.json             ← stat rules, rarity odds, battle numbers
│   │   ├── types.json              ← types, colours, matchups
│   │   ├── skills/{zh-HK,en}.json  ← moves, traits, weaknesses (+ effect ids)
│   │   ├── effects.json            ← mechanical effects referenced by skills
│   │   ├── commentary/{zh-HK,en}.json
│   │   ├── penalties/{zh-HK,en}.json
│   │   ├── descriptions/{zh-HK,en}.json   ← card description suggestions
│   │   └── blocklist.json
│   ├── dev/
│   │   └── test.html               ← developer test page (not linked from UI)
│   └── assets/
│       ├── avatar/                 ← SVG avatar parts
│       ├── frames/                 ← rarity frames
│       └── icons/                  ← type icons, app icons, OG image
├── spec/
│   └── MASTER_PROMPT.md            ← this specification (read sections on demand)
├── .gitignore
├── README.md
├── CLAUDE.md                       ← short rules, auto-loaded by Claude Code
└── PROGRESS.md                     ← current phase, done, next step, decisions
```

- Explain to the product creator that `docs/` means "the website folder" (a GitHub Pages convention). Never put notes, the spec, or anything private inside `docs/`. The whole repository is public.
- Modules marked "no DOM" take plain data and return plain data, so they are easy to test.
- Skill entries in the language files share the same IDs; mechanics live in `effects.json`, so both languages behave identically.

### 16.1 Developer test page

`docs/dev/test.html` should let the product creator, in the browser:

- encode → decode sample cards and check they round-trip,
- open old/invalid links and confirm friendly errors,
- run 1,000 random battles and show win rates per type, tactic, and stat spread (balance check),
- replay the same battle twice and confirm identical results,
- list pools with too few entries.

---

## 17. LOCALIZATION ARCHITECTURE

- UI text: `docs/locales/*.json`. Content: `docs/data/**`. **No hard-coded user-facing strings** in HTML or JS.
- `i18n.js` with `t(key)` plus `data-i18n` attributes.
- Adding a language later = adding one file per localized folder.

---

## 18. LOCAL DEVELOPMENT

- ES modules and `fetch()` of JSON do not work from `file://`. Serve locally with a simple static server that needs no installs on Windows (e.g. the Cursor "Live Server" extension). Explain it.
- For phone testing, push to GitHub and test the live URL.

---

## 19. GIT & GITHUB

- Public repository; never commit secrets or private notes.
- Commit every time a small step is **working**. Never commit a broken state.
- Clear messages, e.g. `Build card builder`, `Add avatar builder`, `Add rarity roll`, `Add card links`, `Add battle engine`, `Add album`.
- If a change breaks the app, use Git history to return to the last working state.

---

## 20. DEVELOPMENT PHASES

The product is released in three stages. **Each stage is playable on its own**, so it can be tested with real friends before the next one starts.

### Stage 1 — Make & send cards (roast loop)

**Phase 1 — Environment check**

Git configured, GitHub account `frenemycards852` with public repo `frenemycards852.github.io`, Cursor, Claude Code (can access the project folder), Chrome, local static server.

**Phase 2 — Project setup & first deployment**

Folder structure, `.gitignore`, `README.md`, `CLAUDE.md`, `PROGRESS.md`, `spec/MASTER_PROMPT.md`, "Hello" `docs/index.html`, push, enable GitHub Pages from `/docs`, confirm the live URL on a phone.

**Phase 3 — App shell + localization**

Router with empty views, i18n (zh-HK/en), language toggle, home screen, footer.

**Phase 4 — Card builder (without avatar)**

Name, type, 300-point stats, move/trait/weakness/description with presets and custom text, defaults and 🎲 buttons. Start with a small set of presets (about 5 per kind per language); expand later.

**Phase 5 — Avatar builder**

Placeholder SVG parts in layers, part selection UI, 🎲 random avatar.

**Phase 6 — Card rendering + rarity roll**

Canvas card renderer, rarity frames (placeholders), pack-opening animation, preview.

**Phase 7 — Card links + card view + sharing**

`codec.js`, card view screen, flip reveal, 「反擊」 button, share/save/copy, `dev/test.html` round-trip tests.

**✅ Stage 1 complete: test with real friends before continuing.**

### Stage 2 — Battles

**Phase 8 — Battle engine**

`rng.js`, `battle.js`, `effects.json`, `config.json`, balance tests on the dev page.

**Phase 9 — Commentary**

`commentary.js` and line pools in both languages (product creator reviews the Cantonese).

**Phase 10 — Challenge & battle screens**

Challenge setup, penalties, challenge link and image, challenge received screen, tactic choice, animated battle, skip button, result screen and image, replay link, rematch.

**✅ Stage 2 complete: test with real friends.**

### Stage 3 — Album & polish

**Phase 11 — Album**

localStorage album, filters, "Friend Collection" image, export/import.

**Phase 12 — Visual design**

Final avatar parts, card frames, type icons, holo effect, app styling, OG image, icons.

**Phase 13 — Content & localization review**

Expand presets (target ≥15 moves, ≥15 traits, ≥15 weaknesses, ≥20 descriptions per language), commentary pools (≥5 lines per event type per language), penalties; review all text in both languages; final balance pass.

**Phase 14 — Cross-browser & device testing**

DevTools device mode, real Android Chrome, real iPhone Safari, in-app browsers (WhatsApp, Instagram, Threads), desktop.

**Phase 15 — Launch**

Final deploy, link-preview check in messaging apps, manifest check, final Chinese name decided.

**Phase 16 — Polish**

Animations, sounds (optional, off by default), more content, performance.

---

## 21. TESTING CHECKLIST

**Card builder:** every default path, 🎲 everything, stats always total 300, custom text at max length, emoji, mixed language, blocked words rejected politely.

**Rarity:** distribution roughly matches the odds over many rolls (dev page).

**Links:** round-trip encode/decode; old-version links; corrupted links; very long custom text; links opened in in-app browsers.

**Card view:** flip reveal, 反擊 pre-fills the sender's name, add to album, share.

**Battles:** same inputs always give the same battle; tactics change outcomes; type matchups apply; traits/weaknesses trigger correctly; draws handled; no single type or stat spread dominates (dev page win rates); skip button; rematch link reverses roles.

**Sharing:** image + link via share sheet; text-dropped case; copy link; save image; images include name and URL footer.

**Album:** persists after reload; survives storage being unavailable (app still works, album disabled with a message); export/import.

**Language:** zh-HK and en everywhere; preset skills show in the viewer's language.

**Layout:** 360 px phones, large phones, desktop, landscape, keyboard open.

**Privacy:** the Network tab shows no request containing card data.

**Safety:** presets reviewed against Section 12.

---

## 22. BEGINNER-FRIENDLY WORKING RULES

For every major stage:

1. Inspect the current project.
2. Understand what already exists.
3. Explain the plan in Traditional Chinese.
4. Before a major change, list the files that will change and why.
5. Make only the changes needed for this stage.
6. Run checks (open the page, check the browser console).
7. Fix errors.
8. Explain what changed, in plain language, including the files changed.
9. Explain exactly how the product creator can test it, step by step.
10. Update `PROGRESS.md` (done / next / decisions) and propose a commit.
11. **Wait for confirmation before the next major stage.**

### Working efficiently (Claude Pro usage limits)

- At the start of a session, read `CLAUDE.md` and `PROGRESS.md` first. Read only the spec sections relevant to the current task.
- Use plan mode at the start of each phase.
- Small targeted edits; do not rewrite whole files.
- Write content (skills, commentary) one theme at a time.
- After a phase is committed, the product creator may run `/clear`; `PROGRESS.md` must contain everything needed to continue.
- When a bug is reported, ask for (if not given): the browser console error, a screenshot, and "what I did / what I expected / what happened".

---

## 23. STRICT RULES FOR CLAUDE CODE

1. **Static & free.** No backend, server, database, serverless function, paid API, or AI.
2. **MVP first, stage by stage.** Do not start a later stage until the current one is confirmed. Do not build future features unless asked.
3. **Inspect before modifying.**
4. **Small steps.** No huge uncontrolled changes.
5. **Preserve working code.** No unnecessary rewrites or unrelated refactoring.
6. **Explain changes** in beginner-friendly Traditional Chinese.
7. **Test** each stage before moving on.
8. **Ask before major decisions**, especially anything irreversible or account-related.
9. **Keep it simple.** Plain HTML/CSS/JS; no framework or build step without approval.
10. **Public repo.** No secrets or private information anywhere in the repository.
11. **Roast, never bully** (Section 12).
12. **Stay original** (Section 4.3).
13. **Links never break.** Version every payload; old links must still open or fail gracefully.
14. **Mobile-first web**, including in-app browsers.
15. **English is first-class**, independently and naturally written.
16. **Content and numbers are data.** Skills, effects, commentary, penalties, odds, and battle numbers live in JSON, never hard-coded.
17. **No silent architecture or dependency changes.**
18. **No unnecessary file churn.**

---

## 24. FUTURE FEATURES (do NOT build unless asked)

- Group tournaments (bracket of several cards, played through a chain of links)
- Card trading ("swap" a card with a friend)
- Card evolution / levels after wins
- Seasonal card packs (Christmas, Lunar New Year, graduation)
- Special frames for anniversaries or birthdays
- Sound effects
- Real photos on cards (local only, never in links)
- Optional online features (leaderboards, shared albums) — would need a server and an explicit decision
- Custom domain
- Native apps, if the web version proves popular

---

## 25. MVP SUCCESS CRITERIA

**Stage 1:** a user can open `https://frenemycards852.github.io` on any modern phone browser, make a card for a friend in about a minute, roll its rarity, and send it as image + link. The friend opens the link, sees the card, and makes a card back with one tap.

**Stage 2:** either friend can challenge the other with a penalty; both see the same funny 3-round battle; the result image can be shared; a rematch is one tap away.

**Stage 3:** users can keep an album of their friends' cards and share their "Friend Collection".

And the whole thing costs **nothing** to run.

The goal: the receiver laughs, says 「吓？我邊有咁衰！」, and immediately makes a card back.
