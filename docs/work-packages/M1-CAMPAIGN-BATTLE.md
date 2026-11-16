# M1 campaign battle — S4 and multiple conflict sides

**Status** IN_PROGRESS / LOCAL. The native Playground now demonstrates a saved,
editable three-side battle with 36 figures, replay and day/night readability;
see [current implementation](#current-implementation--2026-11-15). Campaign
joins and continuation, native surrender and full N10 performance acceptance
remain open. Capacity/performance measurements are NOT_MEASURED.

[Normalized M1](../../specs/001-warwrit-m1/spec.md) ·
[Battlefield specification](../wiki/battlefield-test-maps.md) ·
[Outcome ownership](m1-next/08-battle-outcomes.md)

## Owner correction — 2026-11-14

> У 1 отряда игрока максимум 6 бойцов. Сам бой может идти до 12 х 12 х 12 —
> надо разработать такой движок, что могут быть несколько сторон конфликта.

The player-party limit is six fighters. The current engine target supports
up to three conflict sides, up to twelve participants per side, thirty-six
participants in the maximum battle. A conflict side may contain several
admitted parties. Party membership, command ownership and conflict-side
membership have separate identities.

## Player outcome

A player brings up to six fighters from their party into a persistent battle
that can involve three independent conflict sides. Friendly admitted parties
may share a side. Each player retains command of their own fighters.
The battle follows S4 reactions, intentions, morale and terminal consequences.

- Normal path — prepare party → travel → lawful admission → inspect all sides →
  act with owned fighters → read battle result and saved company consequences.
- Alternatives — join an allied side, face two other sides, lose one side from
  the fight while the remaining two continue, retreat or surrender where allowed.
- Refusal/retry — an oversized party/side, unknown membership or unauthorized
  command is rejected atomically. The same accepted retry returns its saved result.
- Saved effects — actual participants, injuries, ownership, proof, terminal
  result and released company bindings survive reconnect and restart.

Simplest complete trial — create a real three-side battle through the stand's
normal editor, inspect 12+12+12 figures and party groupings, eliminate one side
and continue the other two to a lawful result. Campaign admission and persistent
company effects then receive their own ordinary-entry acceptance.

## Model and boundaries

### Party, side and controller

- Reuse the existing company/party membership owner to enforce at most six
  admitted fighters from one player party. A larger company roster retains its
  existing rules outside this battle-party boundary.
- A battle side owns a stable SideId and its battle-specific metadata, including
  retreat areas. Its capacity is twelve fighters summed across admitted parties.
- Represent sides as a collection. The first accepted capacity profile permits
  two or three sides. Membership references an existing side exactly once.
- Initial active sides require valid admitted participants. Eliminated sides
  retain their identity/history in the saved battle after losing active fighters.
- The authenticated adapter derives controllable unit IDs from actual party
  ownership. Being allied on one side gives no command authority over another
  player's fighters.
- Use existing battle-side affiliation to distinguish allied and hostile units.
  A three-way hostile fixture uses three different side IDs. World-faction names
  and player ownership are supplied by their existing owners.

### Pure engine

`game-core` remains deterministic and serializable. Reuse current initiative,
S4 execution, geometry, command preparation, RNG and terminal-outcome functions.
Replace assumptions that address only the first/second side with side-ID-based
iteration in the new ruleset path.

Validation must cover unique side/unit IDs, unit-to-side membership, bounded
side counts and sums, legal map positions and retreat areas. Party admission
must be composed with trusted existing company membership before activation.
No partial battle or receipt is written for a rejected setup.

Initiative and deadlines apply to the existing unit activation model. Targeting,
AI, reactions, threats and previews inspect every relevant hostile side.
An eliminated third side cannot prematurely resolve a battle between two
remaining sides. Apply the existing terminal policy to the remaining sides,
including winner/no-winner and round-limit outcomes.

### Storage, protocol and compatibility

Introduce the new behavior through explicit ruleset/schema compatibility at the
owning boundary. Released two-side definitions, saved battles, content editions
and replay histories retain their original behavior.

The new transport/configuration conveys all side IDs, party/control attribution,
participants and side-specific results. Do not serialize a third side into the
legacy opponent slot or drop it from a projection, save or editor export.
Old configurations remain readable through their owning versioned path.

### Stand and campaign consumers

The editor can create two or three sides, assign admitted party groups, set up
figures within side/party caps, and save/load/import/export the complete setup.
The battle view distinguishes all sides and own-party control in the HUD,
turn order, selection, target preview and result. Day/night views must remain
readable with thirty-six figures.

Campaign joins use actual presence, consent and trusted membership, then the
same multi-side combat rules. The recorded FIRST HUNT special terms, proof,
payment and REDEEMED disposition retain their own policies. Authored encounter
profiles retain their versioned composition within the new engine capacity.

## Source inspection — 2026-11-14

Checkout `codex/sprite-combat-stage1`, HEAD `7841632a`, with substantial shared
staged/unstaged work. No fresh integrated-main or runtime readback in this pass.

| Owner                                         | Observed limitation                                                                            | Required change in the new path                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `packages/game-core/src/combat/types.ts`      | BattleSetup and BattleState sides are two-element tuples.                                      | Preserve side identities for all admitted conflict sides.                   |
| `packages/game-core/src/combat/engine.ts`     | validateSetup requires the configured fixed side count, startBattle copies only sides 0 and 1. | Validate the selected capacity and retain every admitted side.              |
| `packages/game-core/src/combat/engine.ts`     | activeSideIds/resolvedOutcome already collect active side IDs.                                 | Reuse and verify their behavior after one side is eliminated from three.    |
| `packages/game-core/src/combat/setup-v2.ts`   | V2 validation explicitly requires two sides.                                                   | Keep its released behavior and define the compatible multi-side setup path. |
| `packages/protocol/src/combat-lab.ts`         | Custom-unit sideId is human/opponent.                                                          | Version the new side-aware configuration and complete projection.           |
| `apps/server/src/combat-lab/custom-battle.ts` | Two counts, two side setups and a human controlled-side fixture.                               | Validate all side/party groups and retain their control attribution.        |
| `apps/web/src/combat-lab/`                    | Existing editor consumes the binary custom configuration.                                      | Create, render and preserve the new configuration through the normal entry. |

Graph discovery located the type and engine functions. The graph snippet for
validateSetup had stale line boundaries, so the owning source was read directly.
These observations identify implementation seams, not completed gameplay.

## Ordered implementation

1. Confirm the actual execution base and reserve paths. Define the player-party,
   conflict-side and controller mapping against existing trusted membership.
2. Implement a compatible pure-engine path and focused regressions for two/three
   sides, 12+12+12 capacity, rejected oversize setups, targeting and terminal state.
3. Compose protocol, server admission, serialization and projection, preserving
   ownership, exact retries and prior saved/replay versions.
4. Connect the normal stand editor and battle view. Exercise create → play →
   side elimination → result → save/reload and complete import/export.
5. Connect campaign S4 admission and physical consequences. Try ordinary joins
   with player parties of at most six and the accepted side capacities.
6. Check day/night readability at maximum composition and measure the actual
   target-device workload. Record each result at this owner and the affected
   N08/N10 owners.

The corresponding Spec Kit tasks are [T004–T010](../../specs/002-m1-completion/tasks.md).
Each selected code slice must
complete its own normal entry and direct check before its checkbox is closed.

## Direct acceptance

- [x] MULTI-1 One player party admits at most six fighters. A seventh is rejected
      without partial state, while a side may reach twelve through valid membership.
- [x] MULTI-2 Two-side and three-side new setups work, including 12+12+12.
      A thirteenth fighter on one side, a fourth side, unknown/duplicate side
      membership and overlapping positions are rejected atomically.
- [x] MULTI-3 All three sides retain IDs, positions, retreat areas and control
      attribution through setup, projection, save/reload and editor import/export.
- [x] MULTI-4 AI, attacks, reactions, intentions, initiative and previews account
      for each hostile side. One allied player's units cannot command another's.
- [x] MULTI-5 Elimination of one side leaves the other two fighting. Final
      resolution and released bindings follow actual remaining participants.
- [x] MULTI-6 Repeated identical input/seed yields the same accepted replay.
      Existing released two-side replays and stored-state checks remain valid.
- [x] MULTI-7 Real campaign joins preserve party ownership, physical presence,
      consequences, trophy custody and once-only payment through reconnect/restart.
- [ ] MULTI-8 The actual desktop HUD/field/result is readable by day/night at
      thirty-six figures. Device, viewport, frame-time and memory are recorded.

## Surrender — owner decision 2026-11-13

A surrendering enemy drops its gear and leaves the field. Dropped gear follows
[loot sale](M1-LOOT-SALE.md). Captives, ransom and prisoner transport remain
post-M1. An incapacitated fighter lies down and skips remaining turns under
the campaign S4 policy. Battle chronicle remains post-M1.

Owner amendment 2026-11-16: after its battle ends, a company physically present
at its own dropped gear may recover it, including while enemies remain at the
place. The existing item, ownership and condition are retained through the
ordinary transfer path. [Owning rule and implementation](m1-next/06-company-capabilities.md#returning-owned-equipment--owner-decision-2026-11-16).

## Current implementation — 2026-11-15

T001 complete. Live origin/main is `4a9c3af9`; the original sprite checkout
`7841632a` is 830 upstream commits behind and has retained owner WIP.
Implementation uses branch `codex/m1-completion-20261115` in
`.claude/worktrees/m1-completion-20261115`, based on origin/main with the accepted
M1 specs and owner documentation. The original checkout retains its work.
Main already includes sprite-v4 and bridge-v5 plus the authenticated persistent
Playground at `/dev/playground/combat`. New integration follows those current
entry points and preserves the accepted campaign and replay histories.
The attempted three-way source transfer stopped on removed legacy entry files
before changing application files. Latest-main application sources are the baseline.

T003 complete. The current public path is session cookie → resolveSessionAccount
→ developer allowlist/origin → owned sandbox row → executeEncounterCommand
→ trusted participant unit grant → existing receipt or replay-verified state
→ persistTransition transaction → projected view. Existing command receipts bind
account and canonical request body before returning private prior responses.
New setup/replay schema3 and bridge-v6 keep state schema1. SQL setup/state columns
are versioned JSON and already admit positive schema versions; no migration is
needed merely to store schema3. Original setup/replay dispatch remains in place.
Git, Prettier and ESLint ignore installed dependencies/generated output. All
workspace packages are private, with no package publication requested.

Ownership for the first slice is reserved below. Parent owns transport, server,
integration, docs, task markers and local resources. A Luna writer owns pure
combat schema/rules/runtime and focused regressions in its separate worktree.
The graph index covers the original HEAD only, so this new checkout uses direct
source inspection. Company provenance is being checked read-only by another Luna.
No permission to merge, deploy or provision paid resources was granted here.

## Current result

IN_PROGRESS / LOCAL. T001/T003/T004/T005/T006/T007/T008/T009/T010 complete on
`codex/m1-completion-20261115`. Setup/replay schema3 with bridge-v6 retains
runtime state schema1 and the historical setup1/2 execution paths. The new
validator preserves all sides/parties/controller references and enforces the
6/12/36 capacities, legal positions and stable history after side elimination.

Protected persistent Playground now accepts config2, stores/reloads all 36 figures,
projects three sides and exports a schema3 replay through the existing encounter
executor. Old content/config1 remain readable. SQL storage already accepts the
versioned JSON envelopes, so this slice needs no migration. Cookie session,
developer allowlist, origin and sandbox ownership guard the normal entry.

New admissions for the three existing hunts use schema3/bridge-v6 with player parties derived from
trusted company membership and NPC parties from world sources. The actual SQL
JOIN scenario admits two companies, verifies separate grants and metadata, moves
an owned bow fighter, shoots, retries the saved command through a new connection,
settles the real terminal battle and releases each company. Both clock-offset
cases pass. The hostile-retreat/retry scenario also passes with saved survivors,
rollback probe and one payout. Previously admitted battles retain their recorded rules.
Humanoid and wolf morale use their trusted source profiles. The mill beast's
existing slam intention is supplied by the trusted NPC profile. Incapacitated
living figures remain targetable and lie down while their activations are skipped.

Checks completed on the integrated sources:

- Core typecheck and 29 focused combat tests passed, including valid36, invalid
  limits/attribution, third-side retention, continued two-side combat, deterministic
  replay, legacy replay, S4 reaction/fire movement and incapacity.
- Server/protocol builds and server typecheck passed before the final metadata
  assertion was added. The assertion uses the existing controllableUnitIds DTO.
- 29 adapter/projection tests passed. The final union passed all 26 encounter
  PostgreSQL tests together with all six story PostgreSQL cases. Two terminal
  fixtures now freeze participant identities and public-opening skill seed, so
  their intended supported victory/carry scenarios have reproducible inputs.
  The two Playground replay-view failures introduced by a presentation-only
  control-list override were fixed by preserving its existing side projection;
  the subsequent nine Playground PostgreSQL tests passed.
- Ordinary browser created a sandbox, selected 36 figures, saved, validated and
  started it. All three sides appear in the field and initiative. Day/night and
  Home overview were inspected at 1200×757 CSS px, DPR 2, with no document overflow.
  Artifacts are retained in `output/playwright/m1-multiside-*`.
- The same sandbox resolved at revision513, round11, with south the winner.
  Native replay export reproduced MATCH. Replay revision330 retains all three
  sides after middle is eliminated while north and south remain active.
- Native scenario export → file import → save → reload → native export preserves
  the complete scenario, including36 figures, three sides and four parties.
  Malformed JSON shows a Russian error and preserves the whole prior draft.
- Server/web typechecks and64 focused company-surrender, projection, sprite,
  terminal-view and story-interface tests passed on the integrated sources.

T007/T010 are complete. MULTI-1–MULTI-6 use the unchanged focused and native
editor/replay evidence above. MULTI-7 now passes the two-company ordinary HUNT-03
journey under [N02](m1-next/02-next-contract.md#native-hunt-03-completion--2026-11-16).
Nine account orders retain each company's actor ownership, both founders survive,
terminal effects release their bindings, and the real standard pays its lawful
bearer once. The compiled restart preserves that result and a normal subsequent
purchase succeeds. Earlier defeats remain under N08. This campaign used two
founders against one retained raider; the 36-figure three-side exercise remains
separate diagnostic/editor evidence. Ordinary loot pickup/sale is complete under
T022. MULTI-8 and full N10 measurement/acceptance remain open. Whole-route 60-FPS
compliance and human tactical acceptance remain NOT_MEASURED/NOT_RUN.
