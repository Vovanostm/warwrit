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
migration 0027. The report covers the settled campaign interval, stock rations
actually consumed, accrued and paid wages, unpaid wages, other company debt and
observed allowlisted lifecycle events. Late food settlements carry their original
start time. Custom audit rows advance the cursor without becoming player events.
An interval without factual changes produces no report.

Closing the native modal explicitly acknowledges its server-issued report ID.
Reload retains an unacknowledged offer. A lost acknowledgement response can be
retried after the server committed it. Facts recorded while an offer is open
remain available for the next report. Read failures offer retry or continuation
without acknowledging unread facts. Requests use the session owner and expected
company scope. Hidden events and unknown people are omitted.

The first access establishes a baseline for existing saves. Reports then cover
changes after that baseline. This compatibility choice should be checked during
owner acceptance.

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
