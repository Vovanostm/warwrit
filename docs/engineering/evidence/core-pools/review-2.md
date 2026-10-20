VERDICT: ACCEPT 74b22f8761cb9497c1a5afd53ed41104bea03555

Independent source-only re-review of #163, bounded to R1 correction. No material finding remains in the inspected delta. `review-1.md` remains historical REWORK for `be263a32a1b1b2ef08007724d0ec76e75626a9cb`.

## Scope and identity

Read the exact ordinary diff `be263a32a1b1b2ef08007724d0ec76e75626a9cb..74b22f8761cb9497c1a5afd53ed41104bea03555`, `report-rework-1.md`, all three named DB-test logs, the checkpoints log, and `ready-for-docs.json`; inspected current named test and relevant app/worker/SDK lifecycle sources. Git confirms requested HEAD, direct parent be263a3 and a clean tracked tree. The four changed paths are the integration test, CHANGELOG, CURRENT_PLAN and existing battlefield wiki. No production source, protocol, dependency, core, replay, migration, AGENTS or review-skill change intervened.

Accordingly, the unchanged production assessment in review-1 is reused only across that explicit diff boundary: canonical scalar producer, detached optional DTO, room sentinel/copy ordering, strict normalized readers, same-revision/cap-only/unknown transitions, consumed bar/text, private grants, public exports and KISS/SRP/SSOT. Omission still means unknown; no peakHealth inference is restored. Historical replay/source remains unchanged.

Only this report is written. No tests, builds, coverage, services/DB queries, browser, agents, Orca, remote operations, memory writes or Git mutations ran in this review. Reading supplied runtime logs is not an independent runtime rerun. Parent validator, damaged-company/browser/playable/visual acceptance and full gate remain separately pending; this ACCEPT does not accept those gates, authorize deployment or close the issue.

## R1 correction verified

- **Single AI executor:** the named test no longer calls `executeEncounterAiWake`, lists wakes or manually refreshes rooms. The real worker started by app readiness owns opponent execution. At `postgres.integration.test.ts:2544–2556`, polling reads persisted revision/activation and accepts any change from the previously observed pair. The old failing interleaving—worker commits before the test polls—now satisfies progress immediately; it no longer requires a receipt belonging to the test.
- **Stable damaged checkpoint:** `:2500–2520` reads state/deadline/wake together and accepts damage only on a human activation, with `ai_wake_at === null`, a real non-null deadline and current time before that deadline. No more commands are sent after selecting it. Normal AI/timeout scheduling is unchanged; no SQL state/revision/deadline freeze or worker suspension was added.
- **Exact comparisons and deadline:** `:2560–2602` retains exact public unit equality and exact revision across both real SDK clients, authenticated HTTP, reconnect, fresh client and reopened app/new DB handle, followed by real replay verification. Time assertions bracket every snapshot comparison and follow final replay verification. The deadline is never extended. Explicit stock cap70 assertion strengthens the fixture description; no snapshot assertion was weakened.
- **Actual reconnect semantics:** pinned SDK0.18.4/shared-types defines `CloseCode.MAY_TRY_RECONNECT` as4010. Its WebSocket transport triggers the normal close callback then closes the actual socket; Room routes4010 through onDrop/automatic reconnection, while server `onDrop` allows reconnection and `onReconnect` rechecks authorization/projection. The test subscribes before closing and awaits the real SDK signal. This is supported transport behavior, not a manually emitted mock reconnect. Setting test minUptime0 avoids only the SDK minimum-uptime guard.

## Supplied executed evidence and limits

- `db-rework-1-test.log`: actual named test FAIL, `InvalidAccessError: invalid code` at client close1001. This is preserved failure evidence, superseded by the supported4010 correction.
- `db-rework-1-test-2.log`: named test PASS1/12 filtered SKIP,1.62s test time.
- `db-rework-1-test-final.log`: final named test PASS1/12 filtered SKIP,1.64s test /3.47s total. Checkpoint emitted only after all comparisons, replay and final deadline assertion succeed: encounter `a62e6970-9c6a-4859-b5dc-52a2e7d1b364`, revision8, `1:human-spear`, deadline `2026-10-20T03:12:05.739Z`, opponent-raider67/70 and five other units70/70. The twelve skipped tests are outside the name filter, not skipped execution of this required regression.
- `db-rework-1-checkpoints.log` shows two earlier attempt UUIDs at revision8/human-spear, no AI wake, raider67/70. It is not a DB readback of the final UUID; the final log supplies that attempt's post-assertion record. No live retained-fixture inspection was performed here.

This supports the named stock-cap70 PostgreSQL/SDK test receipt. It does not establish20/60 runtime, company-cap60 UI, WebGL appearance/input, independent browser proof, broad replay compatibility, performance or whole-game acceptance. A future lawful restart after the normal deadline may advance retained rows; the historical checkpoint is not a claim of their current state.

## Retention, privacy and records

`WARWRIT_KEEP_HEALTH_CAP_FIXTURE` is checked only inside this test and enables retention only for exact string `1`. Default cleanup still deletes this UUID's encounter receipts/events/commands/controllers/participants/encounter and generated identity session/account. Both modes close rooms/app/new DB handle; the opt-in preserves rows, not a background worker. It introduces no production flag or permission bypass. Isolation is described in the author report as a newly created disposable Compose project; the reviewer did not contact it.

Checkpoint stdout includes public encounter/unit facts and test result/retention booleans only. It does not emit auth cookie/token/digest, account identity, raw setup/attributes, private control grants or RNG. Earlier pool readback similarly contains only encounter timing/activation and public health facts.

`report-rework-1.md` and `ready-for-docs.json` record normal manual audit and pre-commit hook PASS, no bypass, and inherited-findings/semantic-attribution limitations. Commit ancestry, scope and clean source identity are independently confirmed by read-only Git inspection; audit execution itself is an author receipt, not independently rerun or established by commit metadata. No audit setting/hook change appears in the delta.

The compatibility warning now exists in all three tracked records: new readers accept old omission, old strict readers reject the additional unit key, so producer/new-reader rollout must be coordinated. Optional DTO syntax does not authorize an old strict reader/new producer rollout. Pending browser/full-gate/deployment authority remains explicit.

Parent documentation handoff only: append the actual74b22f8 commit/normal-audit receipt and this bounded source ACCEPT to supersede the newest pre-commit/re-review-pending wording. Preserve original R1/close1001/lint failure history and cap70 limits; keep parent validator, company browser and full gate pending. No shared document was edited here.
