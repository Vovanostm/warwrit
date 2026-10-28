# Readable mission novels — 2026-10-28

## Owner request and problem

The owner requested:

> Проверь рассказы, провалидируй их - грамотность, понятность, интересность, посмотри с аналогами

> Fix issues, обнови стенд - я хочу их пройти вручную

> Надо чтобы систематически таких проблем не было. Как это сделать? Текст пока читается сложно, не видно связей, местами действия не логичны.

The delivery must let the owner read the revised stories manually. Technical
route coverage does not replace clarity, causality or literary acceptance.

## Current scope

- Integrate the nine-story DEV reader onto a fresh main-based worktree, preserving
  the old stand and opening a separate local stand on port 5328.
- Carry the accepted writing-project editions of Faddei, Yakov, Guide and Savva
  without changing player prose during game integration. Keep the rejected
  “Две матери” out of the catalogue.
- Connect Faddei's 12 independently reviewed selected images and provenance.
  Preserve the five older stories and their 34 own scene images. New text-only
  stories receive no borrowed illustrations.
- Verify source fidelity, conditional routes, readable scrolling and reachable
  choices at 1280×720; inspect the illustrated reader in both light modes.
- Run the existing final bootstrap and ordinary commit hooks. Prepare a draft PR
  through the coordinator after local validation and final review.

Out of scope: campaign state, server behavior, maps, game balance, dependencies,
new manuscripts, merge, deployment, Orca or automation activation. Publication
is a coordinator-owned next step; the branch owner must not push without its
explicit instruction.

## Evidence and acceptance limits

The sole owning result is [mission testing](../wiki/mission-testing.md), including
source editions, executed checks, visual review, failures and remaining literary
limits. The [current plan](../engineering/CURRENT_PLAN.md) records active delivery
status and authority. Do not duplicate the result or treat a passing build as
owner acceptance of the stories.
