VERDICT: ACCEPT 9534bf762118fb8da91bad87c0d77ec5150123aa

Tier L source review — core-preset-deserters, Refs #228, producer only.
No material source defect or required producer-proof gap found; no invented counterexample.

Scope and authority

- Read AGENTS.md, warwrit-review, full local contract, live issue #228 (OPEN),
  producer report/checkpoint, and actual origin/main...HEAD diff.
- Base/merge-base: b568ee25b7529fa5abeeae85e45a41bc587124bb; HEAD as above.
- Three code paths: custom-battle.ts, custom-battle.test.ts, protocol/combat-lab.ts.
  Two additional diff paths are coordinator-owned preimplementation records.
- Graph indexes another checkout at b44f5c1; current checked-out source used.

Source conclusions

- custom-battle.ts:87–114 adds catalog data using existing defaultSkillRanks and
  W01/W04/W05/W01/W04 profiles, six unchanged allies and five existing enemy slots.
  No copied stats, weakened morale, injected status, AI/rule or new lore change.
- Every default/preset config gets its own allocation; tiles, units, positions and
  ranks are detached across siblings and calls. Existing profile metadata ownership
  is unchanged. The discarded local template is not retained by another consumer.
- defaultSpriteBattle body, seed, map and composition are unchanged. routes.ts:321
  still uses the same omitted-battle default and ordinary custom-config creation.
- protocol/combat-lab.ts:74 is additive/optional; existing web catalog loading ignores
  the extra field. No selector ID enters setup/commands/replay; export/reconstruction,
  schemas, rulesets, profiles, migrations and dependencies are unchanged.
- Existing replay and custom-boundary regressions remain; no replay history rewrite.

Executed / inspected proof

- Fresh: pnpm exec vitest run apps/server/src/combat-lab/custom-battle.test.ts:
  17 PASS, including real Fastify GET catalog / POST create for both presets,
  draft detachment, skill metadata and existing replay/authorization regressions.
- Fresh: git diff --check origin/main...HEAD PASS.
- Inspected evidence/discover.ts: actual buildApp route injection, catalog config,
  returned capability/current revision/actor/activation, accepted /actions, /replay;
  autoplay plus first available legal withdrawal; bound 2,000 accepted requests.
- Independently reconstructed all retained import/actions/views/replay/withdrawal/
  panic-traces JSONs using public replayCombat/startBattle/applyCombatCommand.
  Configs match today's catalog; setups match the normal fixture, including initial
  attributes. Accepted acks/current action tokens and every saved live view match.

  Seed Requests Commands Round Surrender Retreated Matched live views
  20261009 68 152 8 2 0 69
  20261010 67 146 8 1 0 68
  20261011 68 148 8 2 0 69
  20261012 74 165 9 1 0 75
  20261013 64 150 8 2 0 65

- All terminal human victories; no bound hit. Genuine panic surrender commands match
  choosePanicCombatCommand and retained before/events/after states, under existing S4.
- All five: human-3 move from revision22 causes opponent-1 attack.resolved at rev23;
  retained preview, accepted move, after-view and replay prove a departure reaction,
  not an ordinary active-turn attack. No flee-to-edge observed or claimed.
- Full canonical state, RNG, complete events and command counts agree between replay
  and incremental reconstruction; all live projections agree. No private live-server
  state dump was retained: do not describe this as direct private-live RNG comparison.
- Author reports protocol/server typechecks, lint/format and audit PASS; not rerun.

Delivery boundary / shared-owner handoff

- ACCEPT covers producer source and finite API evidence, not full #228 or UI acceptance.
  Picker is intentionally next. Keep Refs #228; no issue closure from this report.
- Consumer still owes picker validation/fallback/detachment/restoration/busy/reset and
  actual manual + autobattle multi-seed UI/replay/withdrawal proof and critic ACCEPT.
  Author's browser download crash remains an evidence limit, not a proven source bug.
- Coordinator must supersede stale NOT_RUN implementation/check statements in
  CURRENT_PLAN/CHANGELOG before publication; shared docs were not edited here.
- Fresh browser, heavy suites, typechecks, API reruns and remote writes NOT_RUN;
  balance/performance NOT_MEASURED. Only this report written; no Orca calls.
