# Independent #321 review — 2026-10-25

Verdict: ACCEPT for local child completion at `b1194a94f7477f07112a55da93a80d2c06872ef7`.
No material source findings. This verdict does not close parent #167 or authorize publication, merge, deployment or Orca/automation.

## Inspected evidence

Read the updated checkout AGENTS, warwrit-review skill, full child contract and parent contract's applicable D/data/acceptance boundaries; inspected the actual candidate diff, core `economy-view.ts`, authenticated GET route, existing web wage consumer, new projector tests, route integration changes and author report. Parent established the graph index is stale; source reads were used. Candidate HEAD and clean tracked state were confirmed.

The new mapper consumes one existing safe core observation, explicitly allowlists DTO fields and joins retained known services/pools without current-roster filtering. Core remains owner of cash/reservation/claim policy. Exact BigInt sums use processedTick; owed includes pending plus unsecured, while payable excludes pending. Legacy totals share these same sums. Optional protocol addition preserves historical typed responses. No canonical writes, allocator, migration or command behavior changed.

The independent finite full-object test oracle covers >Number-safe q, 1-q future debt, maintenance, paid cash versus pending, known ended service and fully settled history, ordering, repeated projection, no mutation and strict reader roundtrip. Paired valid roots change private earned/death/canonical revision while retaining equal payroll and legacy totals; unknown accounts are excluded. The deliberately mismatched lifecycle/finance tick case is an isolated seam probe, not persisted-root acceptance.

Author reports were inspected, not independently rerun: 10 focused projector/economy/privacy tests; 2 real PostgreSQL route tests without skips; affected protocol/server/web types; lint/format/diff and normal hook audit PASS. The integration assertion uses fixed expected claim amounts; core projection provides the existing observation seam for pools/services. It does not calculate its oracle through the payroll helper.

Parent independently ran real loopback HTTP against isolated PostgreSQL 17 at this unchanged candidate. Reviewer inspected `http-readback.ts` and `http-readback.json`: finite oracle 1001 estimate minus 5 paid minus 3 maintenance gives 993 unpaid, with pending 7 retained and unsecured/duePayable 986; owner 200, anonymous 401, other account empty company, public revision/tick coherence, identical repeated GET and unchanged loaded persisted root PASS. Parent reported two probe-harness repairs before success (package resolution and invalid initial earned/paid fixture); these did not change production source. Reviewer executed read-only inspection only, no tests/runtime operations.

## Remaining boundaries

Local #321 readback/history criteria are satisfied by source review plus focused and real HTTP/PG evidence. Full clean game gate, browser journey, payment commands, uncertain committed response/retry and parent #167 day/night acceptance are NOT_RUN here. No new visuals or player text were authored, so visual/text critique is not required for this transport-only child. Original source ZIP concordance remains inherited NOT_RUN. Tokens/effort savings NOT_MEASURED.

Parent owns final shared documentation readback/update: replace pending independent-review/loopback status in CHANGELOG, CURRENT_PLAN and the owning wiki amendment with this local ACCEPT and actual probe result, while retaining parent/payment/browser/publication limits. Reviewer changed only this assigned ignored report.
