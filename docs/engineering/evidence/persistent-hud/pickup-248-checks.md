# Issue #248 final focused check

Initial attempt date: 2026-10-20. Final corrected coverage date: 2026-10-21. Checkout: `/Users/vovanostm/orca/workspaces/warwrit/uix-w1-scene`.

Ran one combined focused PostgreSQL invocation against the owned `warwrit-hud248-pg-postgres-1` test container for the lifecycle-equality case and elapsed-food terminal-effects case. Credentials were resolved in-process and are intentionally omitted.

Command: `pnpm exec vitest run apps/server/src/encounters/postgres.integration.test.ts -t "releases a bound company whose lifecycle revision stays unchanged|settles carried helper food after an elapsed FIRST HUNT tick"`.

Result: **FAIL** (20.05s): lifecycle-equality passed; elapsed-food failed at `apps/server/src/encounters/postgres.integration.test.ts:1232` because `applyPendingFirstHuntTerminalEffects(database)` returned an empty list where the assertion expected the encounter ID. The new admission assertions passed first: three bound membership food carries were exactly `1`, and persisted carried rations were `27`. No retry assertions ran. Scenario cleanup ran in `finally`; the failed invocation did not retain an exact post-terminal marker/root/receipt readback (**NOT_MEASURED**).

Coverage: **NOT_RUN** for this failed invocation; it omitted the repository's supported Vitest coverage mode. Source readback corrected the initial worker-race hypothesis: this fixture's `buildApp` call supplies `encounters` but no `encounterRealtime`, and `app.ts` starts the worker only when `encounterRealtime` is configured. A legitimate empty result is also possible when `applyPendingFirstHuntTerminalEffects` catches `TerminalAwaitingLeadershipChoice` and leaves the terminal pending; the existing integration path records a required owner choice before retrying. The failed run cleaned its fixture before any exact post-terminal marker/root/receipt readback, so which path occurred remains **NOT_MEASURED**. The elapsed test now follows that successor-choice path when the marker remains pending, while retaining strict durable settlement, carry, ration and retry assertions. Corrected focused coverage is pending independent source-review readback.

## Final corrected focused coverage

An intermediate focused coverage invocation used the repository `test:coverage` script with `--` before the file/filter. Vitest received the filter after its option boundary, so that invocation was interrupted and is **NOT_RUN** as focused coverage. The next direct invocation had the correct filter but lifecycle-equality failed before entering its test body because the prior interrupted process had left the synthetic fixed-world fixture in the owned test database. Read-only inspection found one stale campaign clock/admission and six `first-hunt-join-` actor rows for `first-hunt-terminal-lifecycle-equality`; there were zero other active database sessions. The existing scenario cleanup sequence was applied in a transaction only to that fixed test world and those fixture actors; readback confirmed zero clock, admission, and fixture-account rows remained.

After that cleanup, the final direct invocation passed:

`pnpm exec vitest run --coverage --mode coverage apps/server/src/encounters/postgres.integration.test.ts -t "releases a bound company whose lifecycle revision stays unchanged|settles carried helper food after an elapsed FIRST HUNT tick"`

Result: **PASS**, 2 focused tests passed and 14 unrelated tests skipped (117.37s). V8 coverage was generated: statements 22.50%, branches 20.42%, functions 25.32%, lines 23.66%. The elapsed case verified persisted helper carry `1 → 2` for three bound memberships, carried rations `27 → 27`, terminal marker, released/completed helper state, one terminal receipt, and unchanged physical state on retry. Full output is retained in `final-coverage.log`; the database URL is omitted.
