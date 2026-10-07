# B6 — Localize the rest of the interface

Execute with [00-common.md](00-common.md). Type: code (string moves) + text.
Time box: 6 agent-hours. Depends on: B1–B4 merged, or limit to components they
do not touch (list them before starting and get the parent's ACK).

## Goal

Every player-visible string in the web client comes from `apps/web/src/i18n`.
English is complete and natural. The player can switch language in the game.

**How the owner will try it:** switch to English in settings; every screen —
company, map, places, contracts, combat, camp — is in English; switch back.

## Owner context

- 2026-10-07: request for «удобную возможность переводов на разные языки».
- Desktop UI only (AGENTS.md, desktop policy).

## Must read

- `docs/wiki/world/localization.md`, `docs/content/world/glossary.csv`.
- `apps/web/src/i18n/*` (catalogue per area, `lookup`/`t`, `?lang=`).
- Inventory: `git grep -lP '[А-Яа-я]' -- apps/web/src`.
- `apps/server/src/company/opening.ts` (labels sent from the server).

## In scope

Move strings component by component into area catalogues; language switch;
server returns IDs instead of Russian labels where it does now; formatting of
numbers and crowns per locale.

## Out of scope

Rewording Russian text (move only, except obvious typos — list them). New
languages beyond ru/en. Gender forms until the hero form-of-address exists.

## Design constraints

- Keys from stable IDs; one catalogue pair per area (`ui`, `company`, `map`,
  `combat`, `errors`, …).
- No string concatenation; parameters only. If plural forms are needed, ask
  before adding a library (recommended `intl-messageformat`).
- Tests: update expected literals only where the string moved; do not change
  what a test asserts.
- Language switch: settings control; persists in `localStorage` as now.

## Steps

1. Inventory table (component → strings → area key prefix) in localization.md.
   Commit.
2. Move strings area by area; typecheck and tests after each area. Commit per area.
3. Server labels → IDs; client maps IDs to strings. Commit.
4. Language switch. Commit.
5. Screenshots of every main screen in ru and en; critics. Commit.

## Acceptance criteria

- **AC-1** `git grep -lP '[А-Яа-я]' -- apps/web/src` lists only `i18n/*.ru.ts`,
  `i18n/ru.ts` and test files.
- **AC-2** `en` compiles complete (type) and reads naturally (text critic ACCEPT).
- **AC-3** Language switch works and persists (journey).
- **AC-4** No layout overflow in English on any main screen (visual critic ACCEPT).
- **AC-5** `pnpm vitest run apps/web/src` and web typecheck pass.

## Critique

Text critic on the English catalogue (glossary consistency, natural UI English);
visual critic on ru/en screenshots; code critic on the diff (no behaviour change).

## Stop and ask

Before adding any library; if a server change affects the protocol package.
