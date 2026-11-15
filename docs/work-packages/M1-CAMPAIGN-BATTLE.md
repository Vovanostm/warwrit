# M1 campaign battle — S4 and multiple conflict sides

**Status** SPECIFIED / LOCAL, reconciled with the owner correction of 2026-11-14.
The inspected checkout still contains two-side assumptions. Three-side gameplay
and 36-figure acceptance are NOT_RUN.

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

- [ ] MULTI-1 One player party admits at most six fighters. A seventh is rejected
      without partial state, while a side may reach twelve through valid membership.
- [ ] MULTI-2 Two-side and three-side new setups work, including 12+12+12.
      A thirteenth fighter on one side, a fourth side, unknown/duplicate side
      membership and overlapping positions are rejected atomically.
- [ ] MULTI-3 All three sides retain IDs, positions, retreat areas and control
      attribution through setup, projection, save/reload and editor import/export.
- [ ] MULTI-4 AI, attacks, reactions, intentions, initiative and previews account
      for each hostile side. One allied player's units cannot command another's.
- [ ] MULTI-5 Elimination of one side leaves the other two fighting. Final
      resolution and released bindings follow actual remaining participants.
- [ ] MULTI-6 Repeated identical input/seed yields the same accepted replay.
      Existing released two-side replays and stored-state checks remain valid.
- [ ] MULTI-7 Real campaign joins preserve party ownership, physical presence,
      consequences, trophy custody and once-only payment through reconnect/restart.
- [ ] MULTI-8 The actual desktop HUD/field/result is readable by day/night at
      thirty-six figures. Device, viewport, frame-time and memory are recorded.

## Surrender — owner decision 2026-11-13

A surrendering enemy drops its gear and leaves the field. Dropped gear follows
[loot sale](M1-LOOT-SALE.md). Captives, ransom and prisoner transport remain
post-M1. An incapacitated fighter lies down and skips remaining turns under
the campaign S4 policy. Battle chronicle remains post-M1.

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

Ownership for the first slice is reserved below. Parent owns transport, server,
integration, docs, task markers and local resources. A Luna writer owns pure
combat schema/rules/runtime and focused regressions in its separate worktree.
The graph index covers the original HEAD only, so this new checkout uses direct
source inspection. Company provenance is being checked read-only by another Luna.
No permission to merge, deploy or provision paid resources was granted here.

## Current result

Prepared the corrected model, implementation seams, task order and direct
acceptance contract. Multi-side engine implementation, stand/campaign gameplay,
old/new replay execution and performance measurement are NOT_RUN.
