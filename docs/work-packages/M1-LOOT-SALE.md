# M1 loot sale to the town trader

Status: **proposed, not started** (owner decision 2026-11-09). No writer assigned.
Rules: [m1-spec §7](../wiki/m1-spec.md#7-компания-люди-лагерь-и-содержание).

## Player outcome

After a battle the company takes enemy equipment and sells it to the trader
in Каменный Брод at a fixed price.

- Normal path: win a battle → take enemy gear → travel to town → trader →
  sell → exact crowns added, item removed.
- Choices: which items to sell or keep and equip.
- Alternatives/refusals: not at the town, item not owned, item is a contract
  trophy — refused with the reason; nothing changes.
- Saved consequences: ownership transfer to the trader and an exact cash receipt;
  repeated commands do not pay twice.

Simplest try: win the mill raiders battle, sell one taken weapon, reload and
see the cash and inventory unchanged from after the sale.

## Current state (checked 2026-11-09)

`packages/game-core/src/company/physical-types.ts` already names transfer
operations `SALE` and `LOOT`. Loot pickup in battle and a sell command: NOT_CHECKED.
Prices are a fixed table; no market. Player-to-player trade stays outside M1.
