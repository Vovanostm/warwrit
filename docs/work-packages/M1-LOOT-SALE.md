# M1 loot sale to the town trader

Status **IMPLEMENTED / LOCAL**, checked 2026-11-16.
Sale policy accepted by the owner on November 9,
class-price approach selected November 13. Initial values retain their playtest
status below. The native battle-loot-to-town sale is recorded below.
Rules: [m1-spec §7](m1-next/06-company-capabilities.md).

## Player outcome

After a battle the company takes enemy equipment and sells it to the trader
in Каменный Брод at a fixed price.

- Normal path: finish a battle with accessible enemy gear → take it → travel to town → trader →
  sell → exact crowns added, item removed.
- Choices: which items to sell or keep and equip.
- Alternatives/refusals: not at the town, item not owned, item is a contract
  trophy — refused with the reason; nothing changes.
- Saved consequences: ownership transfer to the trader and an exact cash receipt;
  repeated commands do not pay twice.

Simplest try: recover available mill-raider gear, sell one taken item, reload and
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

## Current implementation — 2026-11-15

A Kamenny Brod market visit now offers equipment buyback through the normal
place UI. The quote uses actual company access, public revision and the finite
purse shared with local supply purchases. An equipped item identifies the fighter
using it and displays condition as a percentage. Selling a required training
resource warns that it interrupts learning. Contract trophies are excluded.

The initial catalogue mapping is an implementation playtest choice. Sword,
raider weapon, bow and spear use the light-weapon price, great weapon uses heavy
weapon, shield uses shield, simple helmet and padded coat use light armor.
The current catalogue supplies no enabled heavy-armor item for the final row.

The sale atomically retains the exact item in world-owned trader custody,
removes its company and observed inventory copies, transfers money and stores
a receipt. A late exact retry reads that receipt. Changed bodies or settlement
paths conflict. Remote quotes refuse before revealing the merchant purse.
Locally present company members can hand over company gear carried in their
owner-access bags. Foreign custody still refuses.

### Direct results

- The retained company `eb855f6f-ab02-42ca-9eef-a82b2c6830bf` travelled from
  Severny Dvor to Kamenny Brod through the map. Buying twenty rations cost eighty
  crowns and funded the local merchant purse through the existing supply flow.
- Through the market UI, Rell's equipped shield sold for three crowns. Company
  cash changed 766 → 769, merchant cash 80 → 77. Readback found one retained
  trader item with its original ID, condition and provenance, zero company copies
  and one three-crown SALE movement. Reload showed the same 769-crown company.
  Native captures and snapshots are in ignored `output/playwright/m1-*sale*`.
- The focused pure sale regression passed ten tests, including the carried
  owner-access bag found during the native journey. The trader UI passed six
  tests, including definitive 409 rejection and persistent lost-response retry.
- Isolated PostgreSQL market and FIRST HUNT company-transition checks passed
  two tests. The market case checks finite funds, atomic refusal, exact late
  replay, changed settlement path and remote quote privacy. The older proof
  fixture now uses the actual issuer location. The remote market fixture keeps
  party, people and carried containers coherent.
- Migration smoke through 0028 passed, including refusal to roll back retained
  trader equipment. Readiness probes the new table.

Grounded hostile equipment pickup is now integrated. The hunt outcome offers
eligible dead/surrendered hostile gear while the company is physically local.
The server selects an actual company operator and validates source, custody,
capacity, observed revision and company scope. ClaimLoot, world claimed/removal
state, canonical inventory and receipt commit in one transaction. Both the
original hunt and later hunt cards use the same pickup panel, with known labels
and an exact saved-request retry.

The author passed one isolated PostgreSQL pickup case covering competing claims,
retries, wrong company, remote access and capacity rollback. The integrated
nickname/loot/source/protocol/UI union passes31 tests and server/web typechecks.
The parent added expected-company validation to the private quote and uses the
shared 256-codepoint ID reader. Its updated SQL case includes foreign-quote
privacy and awaits the parent rerun. Required-course item sale interruption
passes the separate PostgreSQL regression recorded in N06.

The full native win → pickup → town → sale journey remains NOT_RUN. T022 remains
open. Publication and merge are NOT_RUN. Balance and owner enjoyment are
NOT_MEASURED.

## Native loot identifier refusal — 2026-11-16

FIXED / LOCAL. The fresh native HUNT-03 defeat retained the heavy raider's
real dead-hostile weapon and coat and offered both through the loot controls.
The two UI pickup attempts retained both items at the world source. The captured
coat response refused with NOT_AVAILABLE. A pure reproduction at both the stored tick and the current tick isolates INVALID_SOURCE
in ClaimLoot's temporary per-item ownership identifier. Concatenating the valid
199-character item ID with the authorization ID and JSON escaping exceeds the
256-character entity-ID limit. The source item and custody remain retained.

The correction reuses the already validated authorization identity for its
local ownership projection. The actual item ID, source, condition and public
receipt remain canonical. Maximum-length item/authorization regressions failed
before the correction and pass through ClaimLoot and exact replay afterward.

After the identifier correction, the saved pure replay also exposed missing
elapsed-food evidence at a later campaign tick. Pickup now supplies the existing
prepareStationaryFoodFacts result to the same pure ClaimLoot candidate. Time,
owned stock and the new item settle atomically in the pickup transaction.
The isolated PostgreSQL case advances the server clock beyond the company root
while retaining its competing-claim, rejection rollback and late-replay checks.

## Native loot, equipment and sale completion — 2026-11-16

COMPLETED / LOCAL for T022. The retained owner picked up the heavy raider's
weapon with e741f64e-ef94-423e-b094-b416b017dfe5 and coat with
75c05f8d-bafe-45dc-af8a-a1e355401573. The latter returned receipt
6e7a977c-35c7-464e-b0d6-024ad20170d8 at public revision 1085. Both actual items
appeared after reload. An immediately following coat click first retained the
item in the offered list; a later refreshed request succeeded. That first
response was not captured. No item was fabricated.

The native equipment button then failed before transport because its persisted
roster request used the 128-unit transport guard for the longer company item ID.
That field now reuses isCompanyEntityId. The new regression failed before the
fix and checks saved exact-body retry plus oversized/control-character refusal.
The native weapon transfer and equip succeeded through ordinary controls,
including equip fb4b5f72-0ff1-4e6b-8ee9-c35da941b55c. Rell keeps the weapon.
Dozor and Rell also recovered and equipped their own retained coats.

After ordinary travel to Kamenny Brod, the market quoted the spare coat at the
accepted light-armor class price of 5 crowns, including its actual 0% condition.
Sale ca2d7a2c-1d4c-46fc-a60a-deca5b661563 returned saved success at revision 1137.
Company cash changed 438.71→443.71 and merchant cash 277→272. Read-only SQL found
the original item in world-owned settlement_equipment, unchanged condition 0,
and zero canonical or observed company copies. Reload retained its absence.
Buying 25 rations then cost 100 crowns, leaving 343.71 and 30 carried rations.

This journey recovered loot after a defeat in which a hostile died. The accepted
pickup rule covers locally accessible dead/surrendered-hostile gear. The earlier
example's victory wording narrowed that rule and is corrected above. Native hunt victory and reward remain under T014.

The integrated morale/loot/roster focused union passed 54/54. The dedicated
m1_loot_clock_20261116 PostgreSQL case passed 1/1, with elapsed-time pickup,
competing claims, refusal rollback and late replay. Its log is
output/m1-loot-clock-pg-20261116-rerun.log. Core/protocol builds and server/web
types passed. Earlier native sale and isolated market refusal/retry evidence
above remain applicable. Publication/merge and owner balance acceptance remain
NOT_RUN/NOT_MEASURED.

Bounded identifier follow-up found partial-stack core fallback IDs can also
exceed 256 when composing valid long IDs. Current HTTP TransferItem supplies a
bounded splitItemId, and hostile pickup claims whole items. A future direct
partial-stack caller still needs compatible bounded identity treatment under
N06/I1. That fallback was not changed by this slice.
