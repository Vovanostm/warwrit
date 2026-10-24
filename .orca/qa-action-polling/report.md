# #307 build — round 1

Status: IN_PROGRESS. Source base `99e513f563d71804903ecd86ebaa820ad5566d7a`, allocation records `d5c5d611`. Only the five allocated web paths and this lane's evidence are owned; shared records stay coordinator-owned. No parent acceptance, holds or consumed budgets are changed.

## Step 1 — read and continuation helpers

Added finite controller callbacks using React-owned refs, with deferred public-boundary regressions. Initial red run: 63 passed / 13 failed because the factory did not yet exist. Focused controller coverage after implementation: 97 passed. Web typecheck passed. First-edit audits for the test and controller could not run because coverage was absent (exit 2); after focused coverage, `pnpm check:changes` passed with no new violations (one inherited endBattle coverage warning).

Integration, mounted additions, author smoke and independent acceptance are NOT_RUN at this checkpoint. No private runtime or browser started yet. Final checks, commits, source count and cleanup will be recorded below.

## Proposed coordinator CHANGELOG entry

2026-10-24 — `Vovanostm/qa-action-polling`, LOCAL #307: extract shared authenticated combat reads and post-settlement polling decisions into controller callbacks; preserve React timer/abort ownership, initial and subsequent 750 ms polling, 550 ms autoplay, exact-body retries and stale-response guards. Affected paths: CombatLab/controller and their existing tests. This is a bounded #263 R3c change, with no H1/H2, rules, protocol, renderer, schema, dependency or player-text changes. Delivery/check status must be replaced with the final result below before coordinator publication.
