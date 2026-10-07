# B8 — The company book (opening) in the new lore and style

Execute with [00-common.md](00-common.md). Type: text; code only after owner acceptance.
Time box: 4 agent-hours to owner review. Depends on: nothing.

## Goal

A new five-spread opening book for a newly founded company: a band of mercenaries
the war has produced, told by the company's chronicler, using the player's
chosen hero name, fitting the existing backgrounds and any spawn town.

**How the owner will try it:** read two variants in the wiki and choose one.

## Owner context

- 2026-10-05: the military prologue, the convoy version with Miron and ten
  variants were rejected: «приторный язык», «Не верю», «Звучит не литературно».
  Hero name is chosen by the player; spawn towns differ (MMO).
- 2026-10-07: world of warring duchies; literary style after Lermontov,
  Pushkin, Turgenev, Tolstoy, Gogol, Tolkien.

## Must read

- `docs/wiki/onboarding-lore.md` and `onboarding-book.md` — what was rejected and
  why (read the critics' tables; do not repeat those faults).
- `docs/wiki/world/index.md`, `world/literary-style.md` (voices: the chronicler
  in «мы»), `world/writing.md`, `docs/engineering/TEXT_CRITIQUE.md`.
- `apps/server/src/company/opening.ts` (origins such as «Разорившаяся дружина»,
  cultures, homelands, family stories), `docs/work-packages/M1-SUPPLIES.md`
  (start money and supplies — the text must match them).

## In scope

Two variants for the origin «Разорившаяся дружина»: five spreads each, 40–90
words per spread, one illustration note per spread (existing art where possible).

## Out of scope

Other origins until one variant is accepted. UI implementation until accepted.
New canonical events beyond `world/index.md`.

## Design constraints

- Voice: the company chronicler, «мы», dry and honest (literary-style.md).
- The hero's decision to lead is shown by an act, not stated.
- Companions differ by what they do and say.
- Start money, supplies and party size match M1-SUPPLIES; nothing is lost or
  invented to create drama.
- Works for any spawn town: no mandatory local tour; the town may be named by
  a parameter.
- The hero's name is a parameter; avoid gendered past-tense verbs for the hero
  unless both forms are written.

## Steps

1. Write variant A and variant B in a dated section of `onboarding-book.md`.
2. Text critic until ACCEPT on both (max three rounds each).
3. Record critic rounds in `onboarding-lore.md` (short table, no process essay).
4. Stop: send both to the parent for the owner.

## Acceptance criteria

- **AC-1** Two complete variants, five spreads each, within the word range.
- **AC-2** Text critic ACCEPT on both, with scores.
- **AC-3** No conflict with M1-SUPPLIES numbers or the world page (critic's
  lore-truth and mechanics-truth ≥ 2).
- **AC-4** Owner chose a variant (recorded by the parent) — only then strings.

## Critique

`warwrit-text-critic`; also ask it to compare with the rejected versions in
onboarding-book.md and name any repeated fault.

## Stop and ask

After step 4 (mandatory owner choice).
