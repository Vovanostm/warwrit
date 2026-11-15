# M1 ordinary contract terms — reward, withdrawal, trophy

Status: **SPECIFIED / LOCAL**, reconciled with owner decisions of November 9
and November 13. Fresh implementation/gameplay checks are NOT_RUN.
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
