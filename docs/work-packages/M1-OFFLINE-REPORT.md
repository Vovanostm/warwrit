# M1 return report «Пока вас не было»

Status **IMPLEMENTED / LOCAL**, checked 2026-11-15.
Owner decision of November 9 remains the product contract.
Rules: [m1-spec §6](../wiki/m1-spec.md#6-два-независимых-хода-времени).

## Player outcome

A player who signs in after time passed sees what happened to the company:
days elapsed, rations eaten, wages paid or owed, debt and company events. If
nothing happened, no report appears.

- Normal path: sign in → report → close → game.
- Saved consequences: none new; the report only reads facts already recorded.
- Failure: missing facts are not invented; an empty interval shows nothing.

Simplest try: leave a company in camp, advance a campaign day through the
normal clock, sign in again.

## Current result — 2026-11-15

The normal authenticated game entry reads `/company/return-report`. The server
stores an acknowledged baseline and one stable offered report per company in
migration 0027. Migration 0029 adds separate acknowledged/offered contract
outcome identities. The report covers the settled campaign interval, stock
rations actually consumed, accrued and paid wages, unpaid wages, other company
debt, observed allowlisted lifecycle events and the company-owned ending of
«Обход, которого не было». Late food settlements carry their original start
time. Custom audit rows advance the cursor without becoming player events. An
interval without factual changes produces no report.

Closing the native modal explicitly acknowledges its server-issued report ID.
Reload retains an unacknowledged offer. A lost acknowledgement response can be
retried after the server committed it. Facts recorded while an offer is open
remain available for the next report. Read failures offer retry or continuation
without acknowledging unread facts. Requests use the session owner and expected
company scope. Hidden events and unknown people are omitted.

The empty-watch report separates its immediate choice from later world phases.
Handing Прокоп over reports his custody immediately and camp removal only after
2,000 ticks. Destroying the proof reports that choice without ford knowledge;
after 3,000 ticks, a local board read at Каменный Брод records the company-only
ford fact and marker, which can then appear in a later report. The 3,000-tick
delay is a provisional interpretation of «через несколько дней».

The first access establishes a baseline for existing saves. Reports then cover
changes after that baseline. This compatibility choice should be checked during
owner acceptance.

### Same-tick contract outcome cursor — 2026-11-15

An ending can be recorded after a report was acknowledged at the same campaign
tick. Outcome identity is therefore stored separately from food in
`acknowledged_contract_outcomes` and `offered_contract_outcomes` as stable
`instanceId` / `sourceEventId` pairs. An unacknowledged outcome at the cursor tick
is included in the next offer; acknowledging that offer advances its identity so
the next same-tick read does not repeat it. First access baselines a matching
ending already present, preserving the existing-save behavior.

Migration 0029 backfills existing cursors to empty arrays. Legacy food-only
snapshots remain unchanged; default-empty identity arrays preserve their prior
cursor behavior. The down migration refuses to remove either column while it
contains identities, preserving retained acknowledgement data. Migration 0029
applied successfully in the focused disposable PostgreSQL clone. The report API
regression passed for an ending recorded at the acknowledged tick, a stable
repeat offer, acknowledgement and no repeat afterward. The migration down path
was NOT_RUN. Phase identities reuse migration 0029's array entries with an
optional `phase`; a missing phase retains the original terminal identity.
Native player acceptance and general same-tick gameplay are NOT_RUN.

### Direct checks

- Retained company `eb855f6f-ab02-42ca-9eef-a82b2c6830bf` entered through the
  normal browser UI. Its report showed 0.001 campaign days, zero rations,
  0.02 crowns accrued and approximately 536.5 crowns of unpaid wages.
- The native dialog was modal, focused its close control and fit the viewport.
  A browser interception discarded one acknowledgement response after the server
  committed it. The report remained visible with retry feedback. Retrying closed
  it through the duplicate acknowledgement path, preserving the 886-crown purse
  present at that check. Captures are in ignored `output/playwright/m1-report-*`.
- Isolated PostgreSQL union check passed 33 tests across return-report, B4 and
  encounter suites. It covered stable offers, acknowledgement/retry, intervals,
  privacy, wrong-company access and real custom `SuppliesPurchased` audit rows.
- Final focused report UI and database readiness checks passed 11 tests in two
  files. The UI also accepts supported long amounts, IDs and event collections.

The result is local on `codex/m1-completion-20261115`. Publication and merge are
NOT_RUN. Human usability acceptance and target-device measurements are
NOT_MEASURED. Broader M1 acceptance remains in T027–T030 and T036.
