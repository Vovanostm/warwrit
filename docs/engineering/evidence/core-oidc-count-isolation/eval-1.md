VERDICT: ACCEPT 6db7dd20de62c90c361a6708cc73ab3246aea675

# Independent evaluation — #272, round 1

Evaluator: `task_76a6f1551b25`, 2026-10-22. Findings: none.

## Reviewed source and ownership

Read AGENTS.md, warwrit-review and playwright skills, full issue #272 and comments, accepted contract, original report and its fresh Continuation, retained scripts/patches/native logs, and the actual `git diff origin/main...HEAD`.

The allocated frozen executable tree was `c8b6c308627a97dddbe4e4de3e3e10ee8d7a248b`. While the runtime permit was pending, the coordinator advanced HEAD through `72b6e4eb`, `4293640c`, and `6db7dd20`. Direct comparison against the frozen tree shows only CHANGELOG.md/CURRENT_PLAN.md changes; the OIDC source and all runtime source are unchanged. The verdict names the actual final HEAD above. The original source commit `37f35c6b` changes only the owned test file; the other branch changes are explicitly coordinator-owned records. No production/configuration/migration/dependency/parallelism change is present in the slice.

The graph inventory points to another Warwrit checkout and an old head, so current source was read directly.

- `apps/server/src/auth/oidc.integration.test.ts:210–223`: both snapshots share one parameterized query. Accounts are scoped to the actual runtime-assigned loopback issuer and its explicitly attempted `/wrong` variant. Sessions join those accounts by `account_id`; they are not counted globally or inferred from cookie absence.
- Lines 63–69 and 336–342: token construction defaults to the test issuer. The wrong-issuer rejection overrides it with exactly `${issuer}/wrong`; audience, nonce, expiry and signing-key cases retain the default issuer even with random subjects. Replay and wrong-browser cases also use that issuer. Thus both actual attempted issuer values are covered.
- Lines 295–350: original rejection status/cookie assertions and final count equality remain. Valid parallel login/account equality, logout, surviving second session and expiry remain intact. No new rule/privacy/replay violation was found.

## Retained author evidence inspected — not evaluator-executed

Fresh native evidence: `.orca/core-oidc-count-isolation/20261022-task-f24f4df0dbf0/`.

- Read the actual `proof.sh`, `mutations.py` and both patches. The wrong-issuer mutation inserts an account with `${issuer}/wrong` immediately before the final snapshot. Its log fails that equality at mutated line 354: expected accounts/sessions `1/2`, received `2/2`.
- The separate session mutation uses `firstSession.json().accountId`, connecting it to a real accepted test account. Its log fails the same equality at mutated line 359: expected `1/2`, received `1/3`. These are assertion failures, not setup failures.
- The runner restores source in `finally`; native output says `Both mutations restored.` Direct current-source comparison with `37f35c6b` is empty, and neither injection is retained.
- The script uses a unique Compose project, a dynamic loopback PostgreSQL binding, the same owned database for identity/encounter/company tests, and a separate FIRST HUNT database. Both native migration logs report all 14 existing migrations applied and no pending migrations.
- Read all five native suite summaries: eight files and 60 tests passed each, with no failed/skipped summary. Durations: 40.96, 38.79, 45.10, 42.32 and 40.98 seconds. The exact eight-file command has no serialization/worker override; unchanged Vitest configuration retains `maxWorkers: 2`. The script runs the five invocations sequentially with ordinary file parallelism.
- Native typecheck/format logs agree with the reported passes. The continuation audit explicitly covers **zero changed files**; it is not a new audit of the original source diff. Earlier ordinary source-commit audit evidence and coordinator validation remain separate evidence.
- Native cleanup records removal of the task Compose stack, then `container remaining: NONE`, `volume remaining: NONE`, `network remaining: NONE`.

The original rollback deadlock failures remain historical failures. The fresh continuation supplies the required five passes after the merged rollback prerequisite; it does not relabel those earlier failures as passes. I did not repeat the five runs, mutate source, or operate any database.

## Independently played

All setup/build/browser/server operations waited until the permit file first line was exactly `GRANTED task_76a6f1551b25`. Before that, only source/evidence reading occurred.

1. Existing `.worktree-ports` was present, so setup was NOT_RUN. Confirmed both owned ports had no listeners before starting. `bash scripts/orca-play.sh start` printed `READY http://127.0.0.1:25611/combat-lab` (exit 0). Its first detached launch subsequently exited before navigation; a persistent terminal retry of the same launcher stayed alive and printed READY again. No exit-3 environment failure occurred.
2. Used a dedicated Playwright CLI session `oidc272eval` at **1440×900**. The wrapper was not executable directly, so it was invoked with bash. An npm-cache permission error on a later command was avoided by invoking the already installed Playwright CLI directly; the attempted task-local-cache command was interrupted (exit 130). No global permission/source changes.
3. Opened the default **Старая мельница / Развалины мельницы** draft, saw readiness, and clicked **Начать бой** without changing roster/map/seed.
4. Inspected the battlefield, hovered enemy G (**Волк 1**) and clicked its marker. The enemy inspection and focus responded. Toggled **Ночная сцена**; the resulting snapshot exposes **Дневной свет**, pressed. Captured my own day and night viewport images.
5. Used **Обзор поля**, then **Защищаться** for the archer. The visible tooltip says defense ends the turn; the acting unit advanced to **Командир**. Clicked **Завершить ход** and observed the next turn.
6. Clicked the visible **Начать автобой** control and watched progression. The battle finished in **round 8**, **Победа**: allies in formation 6, dead/left/surrendered 0; opponents in formation 0, dead 6. An attempted pause after completion correctly encountered the now-disabled autobattle control; this was an automation timing miss, not a finding.
7. Read the result and clicked **К редактору**, returning to the editor.

Own screenshots under `eval-shots/`, all confirmed 1440×900 and visually inspected:

- `day.png`: initial active battle overview.
- `night.png`: enemy inspection/focus in night mode.
- `night-overview.png`: completed night battle overview/result after Home.
- `result.png`: readable victory result and return controls.

The used commands, target marker, turn controls and result were usable in this smoke. Issue #272 is Tier L and introduces no visual acceptance change; these captures do not certify a separate Tier V visual sheet or complete UI acceptance. Browser console contained only the observed favicon 404, not a gameplay/auth exception.

**Combat play is a regression smoke, not live OIDC-login proof.** The actual signed-token fixture/rejection journey, account/session mutations and real-PostgreSQL passes above are retained author evidence, independently inspected here, not independently executed auth runtime. Additional integration tests/typecheck/audit/full suites/coverage/stress/migration suites were NOT_RUN by this evaluator; performance NOT_MEASURED.

## Positive cleanup and closeout

Dedicated Playwright session reported `Browser 'oidc272eval' closed`; its reported PID 31643 was subsequently absent. `bash scripts/orca-play.sh stop` returned `STOPPED`, exit 0. Direct readback found no listeners on ports 23611/25611 and no `.orca/play.pid`; the persistent holding terminal also exited 0. No other runtime/browser/database was stopped.

Final HEAD remains `6db7dd20de62c90c361a6708cc73ab3246aea675`; tracked/index status is clean. This evaluator wrote only this verdict and ignored local gate evidence. Shared records, source, commits, pushes, labels, merges and coordinator operations were untouched. Coordinator publication/integration and final delivery remain coordinator-owned.
