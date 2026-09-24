# Warwrit development roadmap

- Status: repository-side execution roadmap
- As of: 2026-09-24
- Product authority: canonical Airtable decisions and the current M1 execution index
- Operational status: [CURRENT_PLAN.md](CURRENT_PLAN.md)
- Parent implementation issue: [#8](https://github.com/Vovanostm/warwrit/issues/8)

This file answers **what should be implemented next and what each completion unlocks**.
It does not replace product canon, task cards, ADRs, issue acceptance criteria or exact
PR evidence. A task is not complete until its required implementation is actually merged.

## Milestone state

| Milestone | State | Meaning |
| --- | --- | --- |
| M0 deterministic combat | DONE | Headless deterministic combat/replay foundation exists |
| S-02 company design | DONE | Accepted company/character rules are not reopened by delivery work |
| WP-00 / WP-01 | DONE | Repository foundation and deterministic combat kernel |
| WP-02 company/domain integration | IN PROGRESS | Learning, social acceptance, combat consequences, durability and acceptance remain |
| Disposable local battle PB | IN PROGRESS | PB01 merged; local server/browser path is not complete |
| M1 first persistent playable | INCOMPLETE | Requires persistent company-to-PvE-to-consequences-to-re-entry path |

## Current parallel frontier

These responsibilities can move independently after a fresh live-source/writer check:

| Session | Responsibility | Current state | Unlocks |
| --- | --- | --- | --- |
| C05-FIN | Finish finance-owned learning settlement | PR #88 funding admission is OPEN/GREEN; full FIN remains PARTIAL | C05-TIME |
| E04-ACCEPT | Joint acceptance of merged E04 binding/composition | ELIGIBLE | E05 |
| G07 | Apply trusted combat receipts to existing physical state | ELIGIBLE | G08 |
| PB02 | Local in-memory battle session + guarded HTTP access | ELIGIBLE after merged PB01 | PB03 |
| PB04 | Protocol-only hex/state presentation | ELIGIBLE after merged PB01 | PB06, together with PB03 |

PR #88 is not full C05-FIN. Its funding-admission result does not by itself provide
retained obligation backing, debit/reservation, prior-obligation-aware spendable
boundaries or financial replay.

The existing C05-FIN writer owns its acknowledged shared-path reservation for
`company/economy-types.ts`, `company/economy-state.ts` and only a necessary
`company/index.ts` export until that writer explicitly hands it off. Other sessions
must remain disjoint.

## WP-02 dependency graph

```text
C05-FIN
  -> C05-TIME
  -> C05-COMPOSE
  -> C06
  -> C07
  -> C08
  -> D01 -> D02

E04-ACCEPT
  -> E05
  -> F01

G07
  -> G08
  -> G09

G09 + C08 + E05
  -> G10

required domain activation + G10
  -> H01-H08 durable persistence/execution responsibilities
  -> I01

I02 additionally requires F01 + D02
(F02 and B04 are already merged)
```

Activation boundaries remain strict:

- `StartLearning` stays disabled until C08.
- partial G07-G09 work must not advance a processed combat-receipt cursor as if G10 existed;
- G10 is the first full persistent combat-consequence activation point;
- H01-H08 are not forced into an artificial numeric serial chain; refine their exact internal prerequisites against live predecessor APIs, while all required H durability evidence must exist before I01;
- H requires real PostgreSQL transaction/concurrency/crash evidence where specified;
- I is end-to-end acceptance, not a replacement for H durability evidence.

## Disposable local battle path

PB is a diagnostic local battle, not persistent M1 or production realtime.

```text
PB01 MERGED
  -> PB02 -> PB03 -> PB05 -> PB07
  -> PB04 --------> PB06
PB03 + PB04 -> PB06
PB06 + PB07 -> PB08
PB05 + PB08 -> PB09
```

Milestone meanings:

1. **PB01-PB06 integrated** — first local playable candidate: browser controls use
   the real local server, real combat kernel and server-owned AI.
2. **PB08 complete** — repeat/replay/import/reset and one documented local launcher.
3. **PB09 complete** — actual browser journey evidence; MacBook/Chrome evidence only
   counts when it is really executed on the owner's device.

Until PB08 exists, do not document `pnpm dev:combat-lab` as an available command.

## After WP-02

Persistent M1 still needs work outside the WP-02 domain package:

- production encounter/session authority, reconnect and deadline/timer ownership;
- measured Q-T03 Babylon.js vs PlayCanvas renderer decision;
- tactical client/rendering after that decision;
- world navigation, fog, travel and camp flow;
- contracts, proof/evidence, rewards and consequences;
- physical two-company PvE integration with persistent state;
- re-entry/recovery after combat and company continuity;
- interactive/browser/device acceptance and later load/operations evidence.

Production Colyseus, renderer selection and world/co-op work must reuse the persistent
domain rather than turning the disposable PB memory store into production authority.

## Definition of delivery states

- **SOURCE-READY** — sources are sufficient to start; no implementation claim.
- **PARTIAL** — a bounded prerequisite is implemented, but the parent responsibility is incomplete.
- **OPEN/GREEN** — PR checks passed, but no merge occurred.
- **MERGED** — GitHub records the change on the default branch.
- **POST-MERGE VERIFIED** — the actual merged default-branch tree passed the required check.

Do not transfer merge authority between tasks. Creating this roadmap does not launch
an agent or authorize a successor merge.

## Starting a new session

Every implementation session must first read:

1. root `AGENTS.md`;
2. full [CURRENT_PLAN.md](CURRENT_PLAN.md);
3. its exact canonical Airtable card and dated amendments;
4. applicable repository skills;
5. live GitHub PR/issue/branch state.

Then continue existing usable work rather than opening a duplicate branch or PR.
