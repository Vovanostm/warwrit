VERDICT: ACCEPT 9eee0ce3ed697d094a3073ff24cb35ac1267d44a

Independent source verdict only. Product/classifier, exact integrated-head execution,
durable terminal/restart and playable acceptance remain PENDING; #164 is not accepted closed.

Scope and evidence

- Read full AGENTS.md, warwrit-review, contract.md, live classification-decision.json,
  report.md and actual b568ee2..9eee0ce diff; traced changed consumers in current files.
- HEAD resolved to the SHA above. Concurrent tracked changes were documentation only;
  their integration/conflicts are parent-owned and outside this source verdict.
- Used direct source because the supplied graph checkpoint is stale/wrong checkout.
  No fresh Airtable/archive read; canonical Notes/Purpose evidence is parent-supplied.
  Original source-archive concordance remains NOT_RUN.
- No confirmed P1/P2 source defect or required cosmetic/refactoring change found.
  No test result below is claimed from execution by this reviewer.

Counterexample traces inspected

1. Corrupt equipment -> fists: missing required shield, a two-handed main without
   its off-hand occupancy, and orphan off-hand equipment cannot select fists.
   combat-projection.ts:145-155 requires either equippedWeaponContext or absence of
   every live hand-equipped item; encounter-binding.ts validates physical state first
   and subsequently validates each equipped item's exact slots/location. Expected
   rejection is retained. Fists add no item/definition/skill identity or custody.
2. Old equipped payload -> new semantics: old projection entrypoints still default
   to schemas1/2; physical validation selects projector3 only for projection3.
   setup-v2.ts gates fists/capabilities to bridge-v3; aggregate-state.ts:534-619
   pairs nested versions, compares participant/setup capabilities and reconstructs
   initial state/events. Its setup/state/projection shapes reject missing, extra,
   nonboolean and cross-version capability JSON. Old equipped projection values,
   rules profiles and canonical-state fields remain on their historical branches.
   rules.ts retains v1 locale ordering and v2 code-unit ordering; v3 selects the
   latter. Existing random draws/events are not changed by the new false-capability
   rejection. Historical byte/event/RNG runtime comparison was NOT_RUN here.
3. Wounded current pools -> first activation: projection consumes actual active
   physical conditions and current vitals/armor; runtime-v2 initializes those pools
   before initiative, keeps initial wounds empty and retains activation recovery.
   No second application of pre-existing wound penalties was found.
4. Null-skill attack -> receipt application: combat-practice.ts:193 excludes fists
   from weapon action starts and weapon interactions; combat-aggregate.ts:776 and
   terminal-evidence.ts:140 skip null attack-skill snapshots. The surrounding physical
   application still runs. Equipped attack credit and qualifying defence/leadership
   paths retain their existing checks; no substitute skill or weapon XP is added.
   Exact retries retain existing receipt/evidence identity checks and cursors.
5. Immobile command -> hidden mutation: engine.ts:1590 rejects unavailable ordinary
   intents before action execution, spending, RNG or revision changes. AI checks
   capabilities before selecting move/attack/defend/retreat and can wait. Units stay
   active occupants/targets; no capability branch creates death/capture/transport.
6. Client capability spoof/public leak: protocol encounter command validator accepts
   only the fixed intent payload, not capabilities. Executor retains authenticated
   participant/activation/revision authority and applies the stored kernel state.
   access.ts:110-136 derives only current owned actor's permitted intents; public
   HTTP projection and room-state.ts retain six explicit unit fields. Web grants
   validate owned actor/intent allowlists and existing revision checks; submit also
   checks actor/activation. Raw capabilities/equipment/conditions/RNG are not added
   to the shared public view. Hints confer no command authority.
7. JOIN exception -> ordinary travel/ownership bypass: routes.ts passes allowImmobile
   only for JOIN's objective check; :900-903 retains AVAILABLE/unbound/co-located
   members. Admission independently resolves company account ownership, stationary
   objective party, active encounter exclusion and full membership/cap limits;
   binding retains lifecycle membership, presence and equipment checks. Other
   contract/travel calls keep canPerform('travel'). Removed read-view availability
   checks were already implied by the remaining canPerform call.

Pending gates and precise proof limits

- classification-decision.json remains PENDING_OWNER. Source currently derives
  critical-bleed move=false/retreat=false, attack=true/defend=true from actual active
  conditions (combat-projection.ts:223-235). This provisional boundary is honestly
  reported; pending owner policy is not itself a source defect. Full condition
  acceptance waits for the owner answer. Rescue/assisted transport remains excluded.
- Inspected the author's actual PostgreSQL mixed JOIN test at
  apps/server/src/encounters/postgres.integration.test.ts:2685-2800: two authenticated
  JOINs, nine setup units, one fists/one immobile member, replay verification, private
  access/foreign denial, aggregate reload and exact JOIN receipt replay in a second
  buildApp instance sharing the database. It issues no combat command, reaches no
  terminal result and restarts no process. Actor-action assertions are conditional
  when the owner's actor is active. These are proof limits, not reproduced defects.
- report.md records that DB run before final validator/type corrections, plus an
  inconclusive historical terminal timeout. Exact frozen/integrated-head mixed JOIN,
  historical terminal, mixed physical/practice/world/proof completion, once-only
  reload, process restart/reconnect and browser controls remain parent/evaluator gates.
- parent-check-window.json was read repeatedly and remained BUSY (parent preset
  validator), including immediately before report creation. Reviewer tests, builds,
  coverage, DB and browser: NOT_RUN. No broad suite requested or run. Balance and
  performance: NOT_MEASURED. Source acceptance does not promote author claims to
  independent runtime proof or waive the final integrated-head gate.
- Only this ignored review report was written. Parent owns changelog/checkpoint
  integration and must record this bounded verdict alongside the remaining gates;
  no source/shared-doc edit, agent, Orca action, commit or remote write was performed.
