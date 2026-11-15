# M1 ordinary contract terms — reward, withdrawal, trophy

Status **PARTIALLY IMPLEMENTED / LOCAL**, checked 2026-11-15.
Owner decisions of November 9 and November 13 remain authoritative.
Rules: [m1-spec §9](../wiki/m1-spec.md#9-контракты-улика-и-выплата).

## Accepted terms — owner decision 2026-11-13

Accepted ordinary-contract terms remain fixed through settlement. The permitted
pre-battle withdrawal remains available. The offer and accepted-contract views
show the agreed payment, result and material conditions from the same accepted
record. Updating an offer cannot change an existing acceptance.
Reload and exact command retry retain those terms and their saved consequences.
[Decision record](../engineering/roadmap/design-review.md#решения-владельца--2026-11-13).

## Player outcome

Outside FIRST HUNT a company can drop a contract freely before its battle
starts, the whole reward goes to whoever presents the trophy or delivers the
person, and the issuer keeps the presented trophy.

- Normal path: accept → fight → pick up trophy → present → full payment;
  trophy leaves the company property.
- Alternatives: drop before the battle (no payment, no penalty, contract back
  to the issuer); expiry before the battle works the same; a helper presents
  first and takes the whole reward.
- Failure/retry: after battle activation the FIRST HUNT rules apply — the
  unfinished contract and losses are kept.
- Saved consequences: payment receipt, trophy ownership transfer, contract
  state at the issuer.

Simplest try: two companies take «Волчья тропа»; the helper presents the pelt
and receives the full 80; the pelt is gone from its inventory.

## Current state (checked 2026-11-09)

The November 9 inspection found no withdrawal/expiry commands in `game-core`.
FIRST HUNT uses its own `REDEEMED` disposition. The November 13 owner answer
closes the terms-change question with fixed accepted terms. Fresh executable
conformance checks remain NOT_RUN.

## Direct acceptance checks

- Accept an ordinary contract and compare the displayed terms after reload.
- Exercise any available issuer-offer update through its authorized entry point
  and verify the earlier acceptance still reads its original terms.
- Withdraw before battle under the accepted ordinary policy and verify the
  recorded result. FIRST HUNT uses its separately owned withdrawal rules.
- Settle a successful ordinary contract, then read back/retry the same accepted
  command and verify the saved payment, terms and trophy ownership once.

## Implementation checkpoint — 2026-11-15

Ordinary investigation/rescue acceptance stores an immutable terms snapshot.
Legacy accepted saves hydrate it from the retained profile ID and version.
The board, objective progression and settlement use that accepted snapshot.
Withdrawal is available before battle or custody under the owning profile.
The existing offers carry no authored deadline to exercise expiry against.

Ordinary hunt owners may withdraw before any admission, clearing helper consent.
Presenting an ordinary proof moves the existing item to stable issuer custody
within the company/payment transaction. FIRST HUNT retains its original proof
policy. The external-transition validator independently checks the exact finance,
item and knowledge delta. The UI describes payment to the person who brought
the trophy. The two surfaced hunt briefs now use «сражение у брода», following
the owner's wording correction.

Focused hunt checks passed seventeen tests. The final focused trader and hunt UI
run passed twenty-three tests before the trader's later presentation adjustments.
The isolated FIRST HUNT company-transition check passed with its issuer-local
fixture, proving rollback, exact settlement and stale-state rejection for that
boundary. The revised Russian payment and battle wording passed the text checker
and was separately reread for meaning and rhythm.

The native two-company ordinary hunt, helper presentation and full NEXT-2–NEXT-6
sequence remain NOT_RUN. T012–T014 remain open until their complete paths are
verified. All changes are local on `codex/m1-completion-20261115`.
## Held-person return after withdrawal — 2026-11-16

The integration candidate combines this rule with the dragged-sack custody and
1,000-tick accepted deadline. Game-core/protocol builds, server/web typechecks
and43 focused tests across six files pass. The merge preserves frozen issuer
terms, unpaid return, the delayed Prokop observation and foul-well consequences.
Normal browser withdrawal/delivery and the complete two-company proof journey
remain pending.

### Player outcome

When a company has recovered a person but withdraws before its linked battle
starts, it can still return that person to the contract's frozen issuer. The
person stays with the same company, accepted terms remain saved while custody is
held, and the issuer return completes without payment. Another company cannot
accept the contract while the person remains in custody.

- Normal path: accept an existing rescue → recover the person → withdraw before
  battle → travel to the frozen issuer → return the person without payment.
- Choice: continue the contract under its accepted terms, or withdraw and finish
  only the physical return.
- Failure/retry: battle-started withdrawal and returns by a company without
  custody are rejected; exact command receipts continue to own replay behavior.
- Saved consequences: the pickup fact and source remain unchanged, custody is
  cleared only by delivery at the issuer, and the terminal outcome records
  `NO_PAYOUT`.

Observable outcome: the holder sees the return step at the issuer and a completed
contract marked without payment; a stranger cannot return the person or accept
the contract while custody remains.

Simplest try: use the existing lost-scout profile, search for the scout, withdraw
before battle, then deliver at Kamenny Brod and read back the no-payment outcome.

### Local implementation result

The transition and projection are implemented generically for the existing
cellar-rescue and lost-scout profiles; no quest-specific person or return text
was added. The same holder must complete the issuer delivery. Terms are retained
only while a withdrawn person remains in matching custody, then cleared when
that return completes. The saved outcome's optional `payoutPolicy` preserves old
state readers while explicitly recording a no-payout success.

Focused core, server-projection and board tests passed (33 tests); game-core and
server typechecks passed. Scoped lint and Prettier checks passed after correction.
The web typecheck remains blocked by existing `EquipmentTrader.tsx` references
to `EquipmentMarketDto.publicRevision` and `EquipmentMarketItemDto.interruptsLearning`;
these files are outside this slice. Browser/native play and database checks are
NOT_RUN. This is local evidence, not player acceptance or full M1 acceptance.
