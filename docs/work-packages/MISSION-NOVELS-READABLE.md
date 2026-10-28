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

## PR336 continuation — 2026-10-28

The initial delivery is published in [PR336](https://github.com/Vovanostm/warwrit/pull/336)
at `d7aa265d46792266ae2215829f05a9efea627537`. Parent's current scoped task
continues only two known literary defects in Savva and a source-grounded handoff
of the existing prototype format in the owning mission-testing page. The writer
owns manuscript revisions. Final r6.2 was handed off from writing commit
`afba9125cc3767d473ce40f4c7c58c6d1140ca34` after sequential reading and editorial
review; its exact player text replaces r4.2. The actual delta has six scenes,
two endings and eight combinations of trust, custody and food/payment decisions.
Old lost-grain, injury and repair assumptions are removed from the existing tests.
The owning result preserves the limited fresh-reader coverage and remaining
literary concern.

The handoff documents data paths, conditions, path-local history, existing art
mapping and the missing campaign contract. It does not design or implement a
production runner. Payroll, care, world, shared runtime and other stories remain
outside this continuation. Parent owns writing commits, PR updates and CI; the
integrator remains the sole game-worktree writer. No game commit or push until
the affected validation and independent delta review are ready and parent instructs it. No merge or deployment.

Retain the initial full-gate result as historical evidence. Use proportional
checks for the actual text/document delta and applicable PR CI; do not repeat
bootstrap solely for documentation or prose changes.
