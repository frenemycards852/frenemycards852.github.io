# CLAUDE.md — Frenemy Cards / 損友圖鑑

Full specification: `spec/MASTER_PROMPT.md`. Read only the sections relevant to the current task.
Current status: `PROGRESS.md`. **Read it at the start of every session.**

## What we are building

A mobile-first **static** web app at `https://frenemycards852.github.io` (repo `frenemycards852.github.io`, public, served from `docs/`).

Users turn their friends into collectible trading cards that roast their everyday habits (always late, never replies, "next time I'll pay"). The loop:

make a card for a friend → send image + link → friend strikes back with a card of you → challenge → 3-round card battle with funny commentary → loser takes the penalty → rematch.

It brings childhood card collecting and playground battles into adult friendships. **High interaction is the main goal:** every screen a receiver lands on invites them to respond.

English name: **Frenemy Cards**. Chinese name: **損友圖鑑** (temporary; names live only in locale files).

## Core constraint: static & free

- Static files only. **No backend, server, database, serverless function, paid API, or AI.** Running cost must be zero.
- Cards, challenges, and replays travel **inside the URL hash** (`#c=`, `#x=`, `#r=`), versioned and compact (spec Section 9). Nothing is uploaded.
- The album lives in `localStorage` on the user's phone only.
- If something seems to need a server, stop and explain the trade-off instead.

## Who you are working with

- The product creator is a **beginner** on Windows, using Claude Code, Cursor, Git, GitHub, and Chrome.
- Explain plans, changes, and test steps in **Traditional Chinese** (Hong Kong Cantonese welcome).
- Code, comments, commit messages, and file names stay in English.

## Tech rules

- Plain HTML + CSS + JavaScript (ES modules). **No framework, no build step, no npm packages** without approval.
- Relative paths only. Website files only in `docs/`; the repo is public, so no secrets or private notes anywhere.
- Mobile-first (360–430 px), 44 px tap targets, input font ≥ 16px, `dvh` + safe-area insets. Must work in in-app browsers.
- Cards and result images are drawn with **Canvas**; avatars are layered SVG parts stored as indices.
- Battles use a **seeded RNG**: same inputs → same battle for both players.
- Logic modules (`codec`, `card`, `rng`, `rarity`, `battle`, `commentary`) have **no DOM access**.
- UI text in `docs/locales/*.json`; content and numbers (skills, effects, commentary, penalties, odds, battle config) in `docs/data/**`. **Nothing user-facing or tunable is hard-coded.**
- Every link payload has a **version number**; old or broken links must fail gracefully, never crash.
- Animations: CSS, `transform`/`opacity` only, respect `prefers-reduced-motion`.
- `localStorage` always inside try/catch; the app must work without it.

## Content rules

- **Roast, never bully:** presets target habits only. Never appearance, body, race, religion, gender, sexuality, disability, health, family, or money hardship. No slurs or sexual content. Small block list for custom text.
- **Stay original:** no frames, layouts, type names, icons, or terms from Pokémon, Yu-Gi-Oh!, Digimon, Magic, or any existing card game.
- Penalties stay harmless, legal, and affordable.
- Cantonese is contemporary and natural; English is written independently, not translated.
- Write content one theme at a time; the product creator reviews the Cantonese.

## How to work

For every major stage:

1. Read `PROGRESS.md`, then inspect only the files you need.
2. Explain the plan in Traditional Chinese, listing the files you will change and why.
3. Make only the changes needed. Small targeted edits; do not rewrite whole files.
4. Check: serve the page, check the browser console, fix errors.
5. Explain what changed and give step-by-step test instructions.
6. Update `PROGRESS.md` and propose a commit (commit every working step; never commit a broken state).
7. **Wait for confirmation before the next major stage.**

## Strict rules

- Build stage by stage (spec Section 20). Do not start a later stage until the current one is confirmed. Do not build future features (spec Section 24) unless asked.
- Ask before major, irreversible, or account-related decisions.
- No silent changes to architecture, dependencies, or services. Explain why, what it does, and its cost first.
- Preserve working code. No unrelated refactoring or file churn.
- If something breaks, use Git history to return to the last working state.
- When a bug is reported without details, ask for: the console error, a screenshot, and "what I did / expected / got".
