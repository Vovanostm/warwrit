# Warwrit current delivery plan

- Status: operational mirror for coding agents
- As of: 2026-09-08
- Product/planning authority: canonical Airtable base `apph3bj1NyVrfJeLM`
- Active contract: [WP-02.2](../work-packages/WP-02.2.md), GitHub issue #11, parent #8

## Current state

```yaml
M0: done
S-02: done
WP-00: done
WP-01: done
WP-02: in-progress
current_slice: WP-02.2
merge_authorized: false
deploy_authorized: false
production_runtime: repository-pinned-node-24
package_manager: repository-pinned-pnpm
persistence: postgresql-kysely-pg
renderer: Q-T03-evidence-pending
```

The owner explicitly authorized and completed PR #10 merge. Implementation, tests and the WP-02.2 PR are authorized; that is not permission to merge the next PR, enable auto-merge, deploy, buy cloud resources or expand gameplay. Completion of a slice on a branch is not delivery of the entire WP-02 on main.

## Authority and source order

Read the active WP-02.2 contract `rec39pw7h0ycTk4r7` and full Notes/Purpose in Airtable Artifacts `tblwAxG5Ek1FyWpiW`:

1. `rec5bphVYSZUTqavX`: agent launch; owner authorization `comlmb1eSiASlOH30` on WP-02 `rec6JCF929ViGc2MX`.
2. `rechIKj0hsvfXIvFU`: explicit RC-P1=A, RC-P2=AAAA, RC-P3=A.
3. `recuCnhrb6OJMIvak`: development readiness v1.2; delta `recuq6OOuKnmc1yJL`, lore `recQNKqYfwoJpCXVu`, QA `recwglYVX3nGfu2Xh`.
4. `rec822ZmnjlU0kcaR`: independent semantic corrections.
5. `recdUjdne68biQYoE` and its twelve substantive baseline Notes.

The former Q-CHAR-13A..14C and Q-CHAR-15A blocking lists describe historical state. Do not reopen those decisions. See the [dated ADR-0004 addendum](../architecture/0004-company-identity-succession-2026-09-07.md). Keep the original accepted history intact.

## Delivery sequence

```text
DONE WP-00 -> DONE WP-01
  -> DONE WP-02.1 source/type/catalogue/command foundation
  -> WP-02.2 identity, opening, membership, party, succession
  -> WP-02.3 exact money, F1, knowledge-safe accounting
  -> WP-02.4 items, custody, care, outcomes
  -> WP-02.5 practice R, books, perks, memory
  -> WP-02.6 V2 bridge, unchanged V1 replay
  -> WP-02.7 actual PostgreSQL and integrated acceptance
  -> WP-03 encounter authority/reconnect/timers
  -> Q-T03 renderer comparison -> WP-04 tactical client
  -> WP-05 movement -> WP-06 fog/light
  -> WP-07 narrative -> WP-08 physical cooperative PvE
```

Use one code writer/integrator per slice and a separate review pass. Until merge is authorized, continue on reviewed feature commits or explicitly stacked branches rather than silently merging prerequisites. WP-09..15 retain their later scope and dependencies.

## Source and evidence boundaries

G0 permits an explicitly labelled independent reconstruction of machine contracts from canonical Notes. Neither the missing original v1 ZIP nor the independently regenerated v1.2 ZIP is claimed byte-verified by this implementation. `RC-GAP-MACHINE-01` remains a named source-concordance gap, not a new product interview. Use the source manifest in the active WP contract; do not infer 117 executed tests from a catalogue count.

M0 proves deterministic combat, termination and replay, not player enjoyment. Q-C01/Q-C10/R-01 require interactive M1 evidence. The 30-second activation limit remains a versioned parameter for player validation. Q-T03 / issue #6 compares Babylon and PlayCanvas with the same scene and workflow; no permanent renderer dependency is installed by WP-02.1.

## Resources

One owner plus ChatGPT agents. Server target: Yandex Cloud, 2 cores / 4 GB RAM. Account conservatively for OS, application and database within the total until topology is specified. Do not presume a paid external database, use the game VM as a coding/CI runner, or promise 50-100 CCU without measurements.

Primary available test client: MacBook + Chrome. Record actual model/chip/RAM/OS/browser/resolution at benchmark time; do not guess Apple Silicon. Other compatibility profiles are not silently removed. Unspecified spending/time budgets do not authorize purchases or block headless type work.

## Validation and change control

Retain the pinned toolchain, zero-runtime-dependency core, Fastify control plane and PostgreSQL/Kysely persistence. Realtime and rendering remain adapters. Run repository validation without weakening it, report exact commits/commands/outcomes, and distinguish source, implementation, database, renderer and player evidence. Update Airtable and Empirical with readback after each actual delivery.

## Owner-directed quality correction — 2026-09-07

PR #10 review R1–R3 is addressed by foundation-2; see the active contract and actual PR evidence. The owner requests fewer durable, behavior-level specifications instead of a parallel command catalogue or pinned provisional values. AGENTS.md is updated accordingly. Read the latest test policy, not the superseded fixture-count requirement. Final PR CI runs the complete gate once per update; an extra feature-push run is not required. No merge/deployment is implied.

## 2026-09-07 delivery transition

Owner authorized and completed PR #10 squash merge at `0d58dde305b2c7b85c73f2732a9b4aa7686045d3`.
WP-02.2 starts from that main revision, not a stacked unmerged foundation.
The merge permission applied to #10 only; the next PR and deployment need separate authorization.
See WP-02.2 for the PREPARED component boundary and source-to-postulate mapping.
