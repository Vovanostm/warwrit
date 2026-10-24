VERDICT: ACCEPT 6485ed800ee699c2591f2cde1897137f27d589d6

## Findings

None. This bounded source review found no concrete introduced defect, ownership violation, or material missing regression for the extracted behavior. No runtime reproduction was performed; this is the source gate only.

## Scope and authority

- Reviewed `git diff origin/main...HEAD` on `Vovanostm/qa-action-polling`, base `99e513f563d71804903ecd86ebaa820ad5566d7a`. HEAD was read once at entry, as allocated. Source remains `67f49bf2`; subsequent commits change the author report and coordinator records only.
- Read AGENTS.md, the `warwrit-review` skill, issue #307 body/comments, the full local contract, and both full parent contracts at the absolute paths named there. Read current CHANGELOG/CURRENT_PLAN and technology guidance. `docs/engineering/epics/217/contract.md` is absent; retained parent contracts supply the epic boundaries.
- Issue comment `6380577929` explicitly allocates `CombatLab.mounted.test.tsx`; the historical allocation question is settled. Changed source/tests are confined to the four allocated CombatLab/controller files. `CombatLab.test.tsx` remains unchanged. The author report and coordinator-owned CHANGELOG/CURRENT_PLAN are the only additional tracked changes; they are authorized records, not source ownership violations.
- The graph indexes `/Users/vovanostm/learn/warwrit` at another head, so local source is authoritative. No graph mutation or re-indexing was performed.

## Source and regression evidence

All paths below are under `apps/web/src/combat-lab/`.

| Boundary | Source inspection and existing test evidence |
| --- | --- |
| Shared read ownership | `CombatLab.tsx:541` supplies React-owned refs to the factory; `CombatLab.tsx:564` uses its poll callback and `CombatLab.tsx:634` passes its refresh callback into action transport. `controller.ts:452` returns the exact shared promise and clears only its own identity. `controller.test.ts:1333` covers concurrent sharing and replacement protection after both success and failure. |
| Authenticated, fresh responses | `controller.ts:419` preserves endpoint, capability, captured signal, guards after fetch/JSON and in catch, 404 handling, error fallback and malformed/foreign-session rejection. `controller.ts:410` retains the real `applyLatest` boundary, whose existing session/battle/revision checks remain unchanged at `controller.ts:159` and `controller.ts:213`. `controller.test.ts:1372`, `:1421`, `:1459`, `:1481` and `:1521` cover these effects, selective notice clearing and stale/no-controller cases. |
| Poll timing and continuation | `controller.ts:464` retains current-ref admission, awaits the complete shared read, then rechecks session/status/lost/stop/abort before calling the scheduling callback synchronously. Pending/deleting pauses retain continuation. `CombatLab.tsx:556` retains the session-ID effect, initial timeout, 750 ms timeout after settlement, and identity-safe abort/cleanup. `controller.test.ts:1541`, `:1579` and `:1616` cover pause/resume, post-await state changes and synchronous scheduling. |
| Actual component wiring | `CombatLab.mounted.test.tsx:530` exercises 749+1 ms, held fetch and held JSON, action refresh sharing, pending acknowledgement and the next 749+1 ms boundary. Tests from `CombatLab.mounted.test.tsx:618` cover restored-terminal initial reads, terminal/lost continuation, unmount cancellation, late poll JSON, deletion and replacement. The harness checks no unexpected requests, aborted signals and zero remaining timers. |
| Autoplay and retry preservation | The 550 ms timer and current-ref stop check at `CombatLab.tsx:109` are unchanged. Retained mounted tests exercise the 549+1 boundary, uncertainty, identical retry bytes and stop followed by a manual order. Action callbacks at `controller.ts:273` are unchanged; the retained controller cases cover single-flight, historical terminal retry and stale completion. |

No game-rule computation, private-state expansion, replay/serialization, RNG, schema, renderer, clock, hook or dependency change appears in the diff. The extraction retains one mutable read cell and React lifecycle ownership.

## Validation evidence and limits

Read the existing `.orca/validate-*.log` files, without executing their commands. `validate-related-tests.log` records **187 tests / 4 files passed**. `validate-scope.log` records **197 changed source lines / 300**; the ordinary diff agrees: CombatLab +23/-68 and controller +106/-0. Typecheck/package logs complete successfully, formatting reports all matched files clean, and the audit reports zero new dead-code, complexity or duplication findings. The audit retains its explicit syntactic-attribution warning; it is not proof of full semantic analysis. Empty clean-tree/rebase/lint logs are not independent success evidence; the nine-check aggregate success is the coordinator's supplied result.

These logs belong to the coordinator's validated `f9d7c28b` checkpoint. Inspection of `67f49bf2..HEAD` shows only report/shared-record successors, so no intervening source/test change invalidates that source evidence. The author's report/captures are baseline claims, not independent runtime acceptance.

Tests, coverage, lint, audit, setup, builds, servers and browsers: **NOT_RUN by this reviewer**, as allocated. Performance and visual quality: **NOT_MEASURED**. No specific unresolved source concern was identified; ordinary day/night journeys, live timing/network observations and player acceptance remain the independent evaluator's responsibility. This verdict does not satisfy H1/H2, close #263/#231/#217, reset any consumed budget, or release #179/#209/#310/#297 holds.

## Coordinator record proposal

Record source reviewer ACCEPT at `6485ed800ee699c2591f2cde1897137f27d589d6`, with no findings and no reviewer-executed checks; independent evaluation and subsequent delivery gates remain pending. No correction to the current shared records is otherwise needed. This reviewer wrote only `.orca/qa-action-polling/review-1.md`; no source, tests, shared records, other gate artifacts, commits or remote state were modified.
