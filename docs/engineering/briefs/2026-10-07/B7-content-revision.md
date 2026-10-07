# B7 — Content revision: bestiary and the 60 quest cards

Execute with [00-common.md](00-common.md). Type: docs/text only.
Time box: 6 agent-hours. Depends on: nothing. Can run alongside code briefs.

## Goal

The bestiary and the quest wiki fit the world of warring duchies and the writing
rules: fewer, stronger creatures with folk-rooted names; quest cards rooted in
the war, with named people and no bureaucratic player text.

**How the owner will try it:** read the new creature list and five sample quest
cards; they read like the same world as the Porechye contracts.

## Owner context

- 2026-10-07: «Продумай — как и что писать, чтобы не было ванильности,
  избыточности, ИИ-слопа. Нужно продумать сюжеты, пересмотреть миссии, диалоги».
- 2026-10-07: big world of warring duchies; mythic creatures rare.

## Must read

- `docs/wiki/world/index.md` («Странное и чудовищное», what it means for the
  bestiary), `world/porechye.md`, `world/writing.md`, `world/literary-style.md`.
- `docs/engineering/TEXT_CRITIQUE.md`.
- `docs/wiki/bestiary/**` (catalogue, world-rules, all B001–B060),
  `docs/wiki/economy-quests/**` (catalogue, narrative-style, editorial-review,
  all Q001–Q060).

## In scope

Decision tables and rewrites of bestiary and quest pages; new character rows.

## Out of scope

Code, balance numbers, new IDs (keep all IDs), deleting history sections.

## Design constraints

- Bestiary: keep B001–B016 (real fauna). Tie B017–B024 to the dead of the war.
  Keep 6–8 folk creatures (e.g. береговая плакальщица, пустоголос, висельная
  тень, пустой караульщик) and rename generator-style names (Камнеглот,
  Иглошкур, Снотяжец…) to folk-rooted ones. Mark dragon, basilisk, thunderbird,
  deep serpent «далёкие земли, не в Поречье». Others: keep, merge or cut with a
  reason. Remove the boilerplate repeated in every card; keep the shared rule on
  `world-rules.md`.
- Quests: per card keep / rewrite / cut. A rewritten card has a named issuer
  (row in `characters.csv`), a want, a silence, a war detail; conditions and
  proofs stay in the designer section, not in speech.
- No banned words in player text (writing.md table).
- Preserve IDs, links and dated history; add a dated revision section.

## Steps

1. Bestiary decision table (ID, old name, decision, new name, reason) on
   `bestiary/catalogue.md`. Text critic on names. Commit.
2. Apply bestiary decisions; strip boilerplate. Commit.
3. Quest decision table on `economy-quests/catalogue.md`. Commit.
4. Rewrite the kept cards in batches of 10; text critic per batch. Commit per batch.
5. Corpus check: `rg` for banned words and repeated last lines; fix. Commit.

## Acceptance criteria

- **AC-1** Both decision tables exist with a reason per row.
- **AC-2** Zero banned words in player text sections (rg output in handoff).
- **AC-3** No two cards end with the same sentence.
- **AC-4** Every rewritten card's issuer is a named row in `characters.csv`.
- **AC-5** Text critic ACCEPT on the creature list and on every batch.
- **AC-6** All local links resolve; IDs unchanged.

## Critique

`warwrit-text-critic` per batch; the parent sends five sample cards and the
creature list to the owner.

## Stop and ask

If a rewrite would change a quest's mechanics or reward; if a creature needs
new magic rules.
