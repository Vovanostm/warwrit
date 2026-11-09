# M1 ordinary contract terms — reward, withdrawal, trophy

Status: **proposed, not started** (owner decisions 2026-11-09). No writer assigned.
Rules: [m1-spec §9](../wiki/m1-spec.md#9-контракты-улика-и-выплата).

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

Withdrawal/expiry commands: none found in `game-core`. FIRST HUNT keeps the
trophy as `REDEEMED`; that stays. Changing terms after acceptance is still an
open question (m1-spec §16).
