VERDICT: ACCEPT 1105189d56d616426a7202cb61de16da741b6605

# Tier L evaluator — round 1, 2026-10-21

No reproduced in-scope defect, unmet evaluator criterion, ownership violation, or replay/privacy violation found. This accepts the #256 core/lab code slice only. Persistent selectors, admission, saved-version activation and restart belong wholly to successor #249: **NOT_RUN**. No claim closes #249/#218/#217; the absent epic-217 tracked contract was not reconstructed.

## Evaluated source and authority

- Exact worktree: `/Users/vovanostm/orca/workspaces/warwrit/core-bow-lab-256`; branch `Vovanostm/core-bow-lab-256`. Initial HEAD was the requested `1105189d56d616426a7202cb61de16da741b6605`, with clean tracked state.
- Read AGENTS.md, the full accepted local contract including every Proof row, #256/#249 issue bodies and comments, #217 comments, and `warwrit-review`/`playwright` skills. Used the accepted split; did not interpret historical epic comments as a new contract.
- Independently inspected the ordinary `origin/main...1105189d` diff against main `0adcff2e06344ce823f9631ff346248de666ebc4`, source consumers and regression assertions. Graph inventory points at another checkout/old revision; local source was used instead.
- Another writer advanced this branch during evaluation to `81328bc06969a2f8a57b6d97064e8199c09e6e45` (`docs: record bow lab validation and visual rework gates`). Direct diff from the requested code SHA contains only CHANGELOG.md and docs/engineering/CURRENT_PLAN.md. No gameplay source or tests changed; this report accepts the requested **code SHA**, not a claim that the checkout ref remained there. Evaluator performed no ref mutation.
- Production changes stay within the assigned combat/lab/protocol/validator paths. The server README and coordinator-owned CHANGELOG/CURRENT_PLAN changes match the accepted ownership exceptions. No company/binding/testkit/encounter/contracts implementation, migration, renderer or asset changes.

## Independent source and compatibility assessment

- `packages/game-core/src/combat/rules.ts:239`: new sprite-v4 changes only ordinary bow AP to 3. Bridge-v5 retains predecessor recovery, fists and capability restrictions (`:315`, `:325`). Bow range 1–4, 16 stamina, base damage 18, variance 4 and other profile fields remain unchanged; old selectors keep their old profiles.
- Traced version admission, terrain and capability retention through types.ts, setup-v2.ts, engine.ts, runtime-v2.ts and replay.ts. Old-ID predicate results, ordering dispatch, schema versions and serialization remain unchanged. New IDs inherit tactical behavior without rewriting old setups.
- `apps/server/src/combat-lab/custom-battle.ts:256` selects v4 for new lab fixtures. Both route AI dispatches admit v4. Existing projection reads core rules/previews/refusals; web view-validation.ts only widens reach-context admission and retains actor/activation/revision/geometry validation. No client cost/range/LOS/legality rule was introduced.
- Reviewed the new public-boundary regressions: both new versions' move/shot and atomic 2 AP/15 stamina rejection; aimed shot remains 4 AP/24 stamina; supplied movement affordability, projection/export reconstruction, malformed/stale views, and finite mixed-weapon/terrain tactical replay through resolution. The released order regression was not changed.
- **Fresh finite compatibility readback:** extracted actual main source directly with `git archive 0adcff2e... packages/game-core/src` into private evidence, without builds. Independently consumed all seven tracked released bow replay records with that source and the current built public exports. Sprite v1–v3 and bridge v1–v4 each match baseline full state/events and recorded output, canonical serialization matches, input JSON is unchanged, and ordinary bow remains 4 AP. This assesses the recorded baseline against actual main rather than trusting its provenance comment. Evidence: `eval-1-shots/compat-readback.ts`, `compat-readback.json`. This is a bounded offline replay readback, not a Vitest/build/coverage rerun.

## Fresh browser proof

Used an isolated Playwright CLI session `bow256-eval1`, **1440×900**, only web25823/API23823. No request routing, response substitution, canonical-state injection or fabricated UI result. Native evidence contains request bodies and JSON responses, without capability headers.

1. Opened and started the default mill battle. The archer starts at 4 AP, the ordinary attack visibly costs 3 AP/16 stamina, and the default opening has no legal target. Captured `default-day.png`.
2. Returned through the UI to the real editor. Removed the twelve default units, clicked “Очистить карту”, placed W05 “Лук” on the human side at (3,5) and W02 “Топор + щит” at (6,5). Native create request confirms flat plain height-0 unblocked tiles and those profiles/positions. No imported fabricated server state. Evidence: `editor-fixture.png`, `editor-fixture.txt`, `day-create-native.txt`.
3. Selected (4,5) on the rendered field, inspected the supplied preview (1 AP/4 stamina, 3 AP remaining), and clicked ordinary “Переместиться”. Selected the target and inspected 3 AP/16 stamina ordinary attack; clicked “Атаковать”. Repeated from a newly created editor battle in native night mode (“Дневной свет” pressed).

| Native journey | Day | Night |
| --- | --- | --- |
| Session/battle | `36804fa5-79a4-44a9-8a1d-d8120a781e8a` | `c9cbbd3c-81ac-4fa6-a649-7746c2358983` |
| Move request ID | `e19db7c3-48be-4380-9308-f14e6f925a0f` | `f66c1a9b-0c43-4317-92be-f4fdfebb1530` |
| Shot request ID | `989824ed-d57c-4607-94e1-fb06d8b4a44c` | `f5de668f-e765-4cc9-96c6-94e0912e512e` |
| Both accepted commands' actor / activation | `human-1` / `1:human-1` | `human-1` / `1:human-1` |
| AP from downloaded command prefixes | **4 → 3 → 0** | **4 → 3 → 0** |
| Stamina from downloaded command prefixes | **100 → 96 → 80** | **100 → 96 → 80** |

Native move responses have revision 1, same activation and 3 AP. Each shot response is accepted at view revision 6 because the existing scheduler performs end-turn/opponent actions and starts round 2. Therefore the response's recovered 90 stamina/4 AP is not misreported as the shot debit. Downloaded replays bind the first two `human:<requestId>` commands to activation `1:human-1`; replaying those actual prefixes yields exactly 0 AP and 80 stamina after `attack.resolved`. The shot alone debits **16 stamina**. Both full exported prefixes JSON-roundtrip to matching canonical state and RNG. Evidence: `{day,night}-{create,move,shot}-native.txt`, `{day,night}-replay.json`, `{day,night}-replay-readback.json`, `read-native-replays.mjs`.

Own captures under `eval-1-shots/`:
- Day: `day-before.png`, `day-step-preview.png`, `day-3ap-preview.png`, `day-shot-log.png`.
- Night: `night-before.png`, `night-step-preview.png`, `night-3ap-preview.png`, `night-shot-log.png`; accompanying snapshots record native night mode.
- At the exercised desktop viewport, resource/cost text and target identity are readable and the movement/attack controls accept ordinary input. This is Tier L usability inspection, not Tier V art/asset acceptance or a general visual redesign review.

## Refusal and battle completion

- In a separate native restart of the disposable custom lab, selected supplied destination (5,5): preview costs 2 AP/8 stamina, `attackAffordableAfter:false`. Actual move leaves 2 AP/92 stamina in `1:human-1`. Selecting W02 leaves the ordinary attack disabled while its 3 AP/16 stamina cost and the actor’s 2 AP remain visible; no textual refusal card appeared in that capture. Native `attackPreview:[]`; `attackRefusals` reports `insufficient-action-points`, required 3 AP/16 stamina, available 2 AP/92 stamina. Export contains exactly the single accepted move and no RNG draw. Evidence: `refusal-create-native.txt`, `refusal-move-native.txt`, `refusal-2ap.png`, `refusal-target.txt`, `refusal-replay.json`.
- The UI prevented sending the unaffordable attack. Actual rejected-command atomicity and the 15-stamina boundary are inspected core/server regression assertions, **not fresh browser command-rejection proof**; no state was edited to manufacture 15 stamina. Aimed-shot 4 AP/24 stamina and its rejection after a step are likewise source/test evidence, not claimed as browser play.
- Clicked normal “Завершить ход” after the day shot, then “Начать автобой”; the custom duel resolved at round 4 (opponent victory, 16 commands). Its exported replay repeats matching events/canonical state/RNG.
- Returned to the editor, reset to the actual mill scenario, created a new battle and used native autobattle to completion. Battle `427b7e8e-5df0-44df-9358-5f1cae87c18c` ended in **round-8 victory**, human 5 active/1 dead, opponent 0 active/6 dead. Downloaded **163-command** replay reproduces resolution, events, canonical state and RNG (`draws:96`). Evidence: `mill-create-native.txt`, `mill-finished-day.png`, `mill-finished-replay.json`, `mill-result.txt`, `finish-readback.json`.
- No gameplay console error observed. The sole console error is the existing `/favicon.ico` 404; it did not block play. Browser automation setup/selector failures were corrected without source changes; they are not reported as game defects.

## Check boundaries and cleanup

- Started `pnpm dev:combat` exactly once. Its protocol/core startup builds completed and both assigned servers listened; wrote `.orca/core-bow-lab/eval-runtime-started-20261021T145105.txt` with SUCCESS at **2026-10-21T11:56:36.355330Z**. `eval-1-shots/runtime.log` preserves startup. No further package builds, Vitest/test suites, validation, coverage, audit, stress or migrations ran by evaluator.
- Supplied coordinator result: exact code head validator exit 0, **9/9 PASS**, scope **118 source lines**. Not rerun. Existing execution logs were inspected separately: focused 131 tests passed; final related coverage logs include old compatibility (9 tests), new runtime/autobattle, core and adapter checks (812 passed/51 skipped overall). These are producer logs, not fresh evaluator execution. The retained earlier typecheck failure is historical; the frozen custom-battle regression now explicitly narrows schemaVersion before startBattle. No log failure was silently represented as evaluator PASS.
- Fresh evaluator execution consists of the browser journeys and bounded offline readbacks described above. Hosted CI/publication/full integrated gate are coordinator-owned and **NOT_RUN here**. Balance **NOT_MEASURED**.
- Restored native day mode; autoplay ended at the terminal mill result. Closed only `bow256-eval1`; terminated only descendants of evaluator runtime PID 61259. `lsof` confirms no listener on 23823/25823 after cleanup. Other runtime/worktree/browser resources were untouched. Evidence: `cleanup.json`.
- No tracked edits, commits, external writes, ref changes, delegation or shared-document updates by evaluator. Builder images/logs and prior eval directories preserved. Documentation closeout is this report only, as explicitly requested; no proposed behavior correction is needed.
