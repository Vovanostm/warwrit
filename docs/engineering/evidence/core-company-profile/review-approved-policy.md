VERDICT: ACCEPT bc4d88e19b40d9e67a3531e8f0763bc0d9a8ec75

Independent final source readback for PR241/#164, 2026-10-20. No material finding
in the approved-policy/profile integration boundary. This is source acceptance;
parent owns integrated validation and actual runtime delivery.

## Identity and exact scope

- Initial/final observed HEAD: a9207d76ecb4992247cb67e0c0310ccb01c469b1,
  documentation-only child of frozen source bc4d88e. Tracked tree/index clean.
- bc4d88e is a normal merge of published profile
  9f18c5480e2ca8b81860c5cd9c57fc7a02338233 and actual main
  fe3bcdb43a0edcd364d4d337fcce1cd894abeff0.
- Compared 9f18c548..bc4d88e: 45 paths, 1898 insertions/160 deletions. All 13
  apps/packages changes are imported apps/web/src/combat-lab overview paths;
  these have no diff against main parent. Profile core, protocol, server,
  EncounterPanel, CompanyPanel, encounter connection and renderer are unchanged.
  No whole-overview re-review is claimed.
- 0fa34ed..9f18c548 has no apps/packages delta. bc4d88e..a9207d76 changes only
  CHANGELOG, derivative contract, CURRENT_PLAN, profile evidence README and wounds
  wiki (58 additions); no source/test/migration/dependency change.
- Read AGENTS/warwrit-review, current checkpoint/changelog, existing contract,
  evidence README, prior integration/correction reports, classification decision
  and dated owner amendment. Reused unchanged prior source/runtime evidence;
  no source-archive research or runtime rerun.

## Approved matrix and persistence

Direct owner approval, classification APPROVED_OWNER_2026_10_20 and
CONTRACTS_M1_DERIVATIVE.md:324–338 supersede earlier PENDING_OWNER wording.
Critical bleeding allows attack/defence; movement/independent retreat are blocked.
No additional incapacitating condition or rescue/transport rule is inferred.

- company/combat-projection.ts:148–161 reads actual active physical conditions;
  :222–235 maps critical-bleed to exactly
  {move:false,attack:true,defend:true,retreat:false}. No observed-condition or
  travel-eligibility substitute determines attack/defence.
- company/encounter-binding.ts:180–191 admits the actual co-located available
  v3 member with no existing binding; it does not require travel capability.
  :245–275 carries projection capabilities into setup/startBattleV2, retaining
  membership and targetability. combat/runtime-v2.ts:23–38 copies capability
  values into canonical units with separate current pools.
- company/aggregate-state.ts:534–619 pairs projection3 with bridge-v3, compares
  complete member setup including capabilities and reconstructs the initial
  transition. :794–818 requires exactly four booleans for v3 and absence for
  historical payloads. company/combat-physical.ts:210–229 independently checks
  bound setup against projection. Reload does not silently restore mobility.
- combat/rules.ts:293–308 gates move/attack/defend/retreat by the corresponding
  v3 boolean; other historical rulesets exit before inspecting capabilities.
  engine.ts:1580–1631 applies this guard before action mutation. False move/
  retreat rejects with the original state; true attack/defence reaches existing
  target/range/AP/stamina/controller guards, not unconditional success.
  applyDefend :1482–1521 retains normal resource checks and guarding transition.
- Private access actorActions and web command gating are unchanged from prior
  integration acceptance; raw capabilities remain excluded from public units.

## Existing independent regressions and reused proof

- company-combat-projection.spec.test.ts:156–184 independently expects the exact
  critical-bleed four-boolean matrix, wounded pools/penalties and absent weapon
  identity; malformed equipped loadouts still reject without changing input.
- company-encounter-binding.spec.test.ts:590–642 retains all actual members,
  asserts immobility/fists and JSON aggregate reload equality.
- combat/runtime-v2.test.ts:219–280 uses an immobile actor on its lawful exit:
  move and retreat reject atomically with identical state/no RNG draws; actual
  fists attack succeeds, costs2AP/8stamina, and replays to the same canonical
  state. Defence allowance is established here by the exact projection boolean
  and inspected shared dispatch/applyDefend; no new played critical-defence
  result is claimed. Existing guard/practice tests remain unchanged.
- Fists rules remain range1/base6/2AP/8stamina/zero penetration. Existing physical
  and leadership regressions retain no fists weapon XP/start snapshots, separate
  leadership credit, aggregate roundtrip and exact retry. Prior review4/eval3
  keep their original source heads and execution limits.
- R1's corrected seven-key DB allowlist, explicit capabilities/foreign-account
  exclusions and later durable JOIN retry/reload assertions remain unchanged.
  Prior correction ACCEPT0fa34ed and parent FAIL-before/PASS-after evidence are
  reused; historical REWORK is preserved, not rewritten.

## Checks and remaining limits

Performed here: read-only Git parent/source comparisons and source/report
inspection. Tests, builds, lint/typecheck, DB/browser/services, agents, Orca and
remote operations: NOT_RUN. No Git mutation; only this report written.
Parent checkpoint records imported initiative-related25PASS/normal integration
audit PASS and initial missing-coverage failure; these are parent evidence,
not reviewer execution or a new combined full-gate pass. Sequential integrated
validator and runtime delivery remain parent-owned.

Historical setup/replay dispatch and canonical capability serialization remain
version-gated; approval does not rewrite old replay semantics. HP compatibility
limit remains: new readers accept an absent maximum as unknown, while old strict
six-field readers reject the producer's seventh key. Coordinate producer/readers.

Rescue/transport remains excluded. Payment and terminal-browser acceptance remain
downstream full-mission work and NOT_RUN here; they do not reopen approved policy.
No full-M1, actor186, #165 implementation, balance/performance or visual acceptance
is implied. This source verdict supplies no merge/deploy permission. Parent owns
shared-record closeout and delivery; later source changes need affected review.
