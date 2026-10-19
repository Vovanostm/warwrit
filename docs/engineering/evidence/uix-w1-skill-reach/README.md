# UIX-05a / #187: authoritative learned-skill geometry

2026-10-19 · `Vovanostm/uix-w1-skill-reach` · local Tier L ACCEPT, publication/CI pending; NOT_MERGED.
Gated code: `3ea21b060f5cfae16ad48835dbf93402c4e98721`, baseline main `0c4b98d57627146d436030ae2d8739db19b45baa`.
Refs #187, producer subset only; #187 stays open for the scene consumer.

## Behavior and scope

Pure public `previewCombatSkillReach` supplies all five learned skill shapes for the current controlled sprite-v3 activation. Optional protocol/server `skillReach` carries actor, activation and revision; the web validates supplied metadata and cells. Omitted legacy fields, empty rows and explicit empty geometry remain valid. Target admission, costs, rulesets, RNG, canonical state and replay schemas are preserved. No scene renderer or visual source changed.

The successor selects only the current `(activation.actorId, activation.id, viewRevision, selectedSkillId)` row. Missing/stale/empty selected-skill geometry suppresses its contour without weapon fallback. Pinning another unit must not change origin. See [contract](contract.md), [fresh reviewer](review-1.md), [independent played evaluator](eval-1.md).

## Executed gates

- Coordinator [validator](validate.log): EXIT0, all eight stages PASS; related732PASS/47SKIP, audit PASS on gated code. Reused on unchanged source, not rerun for evidence/docs.
- Both fresh Tier L verdicts start ACCEPT and name the gated SHA. Evaluator independently ran69 focused tests, played baseline and candidate, used real UI downloads and checked79 observed revisions against the pure query. [Focused core](focused-core.log), [server](focused-server.log), [web](focused-web.log), [replay/admission](focused-replay.log).
- Coordinator freshly generated15 saved streams on baseline0c4b98d and replayed those exact commands on the candidate: schemas1/2, five rulesets,362 commands/1016 events. Canonical states, complete events and accepted counts match; [comparison](baseline-replay-comparison.log). Finite supplemental fixture proof, not a browser journey or a performance measurement.
- [Runtime reader](runtime-validation.log) accepted observed projections and rejected corrupted context. [Passive inspection](candidate-passive.log) caused0 action POST/rev4 stable; [terminal inspection](candidate-terminal-passive.log) added none.
- Actual UI downloads: [baseline](baseline-mill-replay.json), [candidate](candidate-mill-replay.json); [independent reconstruction](replay-check.log). Each real battle ended victory R9/rev163,163 accepted replay commands/400 events. The two independently played move choices differ and are not claimed as an identical command stream.
- Hosted clean-checkout CI owns final integrated bootstrap/full verification and isolated migration checks. At this record: CI/full verify/stress/migrations NOT_RUN; no deployment, performance/balance/capacity NOT_MEASURED.

## Inspected screenshots

Eight evaluator captures,1440×900,DPR1,initial rev4, converted to JPEG without resizing. Baseline was independently restarted before its final initial captures; its exported replay is from its first completed battle. The evaluator report preserves this provenance.

| State          | Baseline                              | Candidate                             |
| -------------- | ------------------------------------- | ------------------------------------- |
| Day overview   | [before](baseline-day-overview.jpg)   | [after](candidate-day-overview.jpg)   |
| Night overview | [before](baseline-night-overview.jpg) | [after](candidate-night-overview.jpg) |
| Day close      | [before](baseline-day-close.jpg)      | [after](candidate-day-close.jpg)      |
| Night close    | [before](baseline-night-close.jpg)    | [after](candidate-night-close.jpg)    |

Try `pnpm dev:combat` → `/combat-lab` → untouched «Развалины мельницы»,seed20261009,6×6. The starting bow row is aimed-shot2–4 with43 cells, ordinary weapon1–4. A move refreshes revision/origin; next commander has brace1/rally19 cells. The scene still draws the existing fills and legend; this producer supplies the future contour data.

## Remaining acceptance

Rendered selected-skill contour/union boundary,≥2px stroke,contrast3:1,grayscale/CVD,selection/stale handling and full viewport/native125% acceptance remain downstream with scene. Existing night silhouette/crowding/safe-area/terminal-overlay REWORK is not waived. Full #187 and M1 acceptance NOT_RUN. No migration, dependency or deployment change; wiki mechanics specification unchanged.

Local untracked originals: `.orca/uix-w1-skill-reach/eval-shots/` and coordinator `.orca/pipeline/tick-20261019T1735/`; named as paths only. Shared closeout: CHANGELOG Unreleased and CURRENT_PLAN.
