VERDICT: ACCEPT a54b65c680d4cfab8e66540b4ffe146a0b887e7d

No blocking findings in the reviewed #305 diff. This is source-review acceptance only, not Tier L gameplay acceptance or permission to close a parent issue.

Reviewed `git diff origin/main...HEAD`, with `origin/main` at `96f5b2b9bf86e6aa92a837186922a338dfad4258`. HEAD matched the allocation at entry and final readback; tracked worktree was clean. The successor of validated source `31d6fa5f2f78c9546c81317de73a80f7256a8955` changes only coordinator-owned CHANGELOG/CURRENT_PLAN records.

Authority read: AGENTS.md, warwrit-review, the complete local contract, both complete named sibling/retained parent contracts, #305 body/comments including the mounted-test ownership transfer, #263 and #231 bodies/comments, and #217 body/owner decisions. `docs/engineering/epics/217/contract.md` does not exist. The graph indexes another checkout/head; review therefore used current files and Git diff.

Source and test assessment:

- `apps/web/src/combat-lab/controller.ts:30`: admission preserves the original predicates and reserves both pending ref and state synchronously before transport. No client range, LOS, cost or legality calculation was added. `CombatLab.tsx:769` still admits retries only from uncertain pending state; the first retry synchronously clears that flag, blocking a second click.
- `CombatLab.tsx:679`: authenticated POST, original serialized retry body, request identity, response parsing and refresh orchestration remain in the component. The four uncertainty call sites preserve their notices exactly. `controller.ts:52` preserves body/description, stops autoplay and updates ref/state together.
- `controller.ts:64` and `CombatLab.tsx:727`: settlement reads the current session revision after refresh; the caller retains its abort/generation guard before effects. Rejections stop autoplay and retain selection; acceptance clears the skill and stops autoplay if revision has not advanced. Pending clearing retains its generation check. The helper is not independently an all-effects generation guard; the actual caller supplies that boundary, as before.
- `controller.test.ts:347`: new cases cover synchronous reservation, competing orders/different bytes, missing/deleting/terminal/opponent admission, all uncertainty notices, exact historical retry after activation/terminal changes, and accepted/rejected settlement after a deferred refresh. Existing malformed/unmatched acknowledgement plus failed-refresh and foreign/stale-view regressions remain. The replacement-generation test checks pending preservation only; it does not establish complete stale-response lifecycle proof.
- `CombatLab.mounted.test.tsx:14`, `:123`, `:150`, `:302`: the harness mounts the actual CombatLab/menu/CommandDesk, invokes DOM callbacks and intercepts fetch. It does not reimplement admission, submit or reply orchestration. New failure cases exercise network/503/unmatched replies, autoplay stopping, byte/header/signal-identical retry and rapid duplicate retry/manual clicks; additional cases cover lost-session rejection/DELETE 404 and unresolved POST abort on unmount. Fixture cleanup also asserts aborted signals, no timers and no unexpected requests. These are adapter tests, not real gameplay or browser proof.
- Production changes are confined to CombatLab.tsx and controller.ts (169 added/deleted source lines). Test changes are confined to controller.test.ts and the explicitly transferred CombatLab.mounted.test.tsx. Coordinator record changes are expected. No protocol, rules, RNG, replay, schema, dependency, renderer, transport extraction or polling extraction changes were found.

Existing evidence inspected, not executed by this reviewer:

- `.orca/validate-related-tests.log`: 4 files / 115 tests passed.
- `.orca/validate-scope.log`: 169/300 source lines passed.
- `.orca/validate-audit.log`: normal audit against main `96f5b2b9`, no issues in 6 changed files. Its recorded syntactic-attribution fallback warning remains a limitation; it was not suppressed by this diff.
- `.orca/qa-action-admission/completion-commit.log`: normal commit audit passed and produced source commit `31d6fa5f`. Historical CRAP/zero-coverage failures in coordinator records describe earlier attempts, not a reproduced failure of this candidate. Derived coverage metrics were treated as supporting evidence, not a substitute for the normal hook.

Tests, package checks, coverage, audit, builds and browser/runtime were NOT_RUN by this reviewer, as allocated. Independent evaluator acceptance, final PR CI and delivery remain coordinator-owned. #306/#307, H1/H2, full stale-generation/timer proof and the integrated epic journey remain required under their original contracts; this verdict neither supplies nor waives them. #263/#231/#217 remain open. No source changes or additional repair round are requested by this review.
