# M1 loot sale to the town trader

Status: **SPECIFIED / LOCAL**. Sale policy accepted by the owner on November 9,
class-price approach selected November 13. Initial values retain their playtest
status below. Fresh implementation/gameplay checks are NOT_RUN.
Rules: [m1-spec §7](m1-next/06-company-capabilities.md).

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

## Price rule — owner decision 2026-11-13

Studioigor decision #14. One fixed buyback per item class; contract trophies
cannot be sold. Scale: one battle's loot is worth about one to two days of
company wages (leader plus five paid fighters at 10 crowns per Campaign Day,
[economy](../wiki/economy-quests/economy.md)). goods.md has no weapon/armor
prices, so the initial values below are agent-derived for the first playtest:

| Class        | Buyback, crowns |
| ------------ | --------------: |
| Light weapon |               4 |
| Heavy weapon |               8 |
| Shield       |               3 |
| Light armor  |               5 |
| Heavy armor  |              10 |

About 10 crowns per armed enemy: six enemies give ~60, twelve give ~120.
Creatures drop no sellable gear. Gear dropped by a surrendering enemy is
lootable ([campaign battle](M1-CAMPAIGN-BATTLE.md#surrender--owner-decision-2026-11-13)).
The implementing slice maps each roster item to one class; tuning after a
playtest changes this table, not per-item exceptions.
