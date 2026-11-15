import { COMPANY_CATALOGUE } from './definitions.js';
import { reservedQ } from './economy-state.js';
import { requirePartyTransportCapacity } from './physical-items.js';
import { availableContainerG, validatePhysicalState } from './physical-state.js';
import { moneyQ, canonicalRevision, publicRevision } from './values.js';
import type { CompanyCommand } from './commands.js';
import type { MaterializedCompanyState } from './physical-root-types.js';

/** Finite playtest catalogue; no production or automatic stock regeneration. */
export const SUPPLY_SHOPS = Object.freeze([
  'kamenny-brod',
  'bereznyak',
  'severny-dvor',
  'tikhaya-gat',
]);
export const SUPPLY_PRICE_Q = '4000000';
export const MEDICAL_UNIT_PRICE_Q = '5000000';
export const SUPPLY_INITIAL_RATIONS = 300;
export const HERBALIST_INITIAL_MEDICAL_UNITS = 12;
export interface SettlementSupplies {
  readonly worldId: string;
  readonly siteId: string;
  readonly revision: string;
  readonly rations: number;
  readonly herbalistMedicalUnits: number;
  readonly chapelCashQ: string;
  readonly cashQ: string;
}
export type SupplyPurchase =
  | {
      readonly kind: 'REJECTED';
      readonly code:
        | 'CONTACT_OR_ACCESS_REQUIRED'
        | 'STALE_REVISION'
        | 'INSUFFICIENT_FUNDS'
        | 'CAPACITY'
        | 'OUT_OF_STOCK'
        | 'INVALID_COMMAND';
    }
  | {
      readonly kind: 'PREPARED';
      readonly next: MaterializedCompanyState;
      readonly shop: SettlementSupplies;
      readonly costQ: string;
    };

type SupplyFunds = Pick<MaterializedCompanyState, 'lifecycle' | 'finance'>;
type CarriedSupplyPurse = { readonly walletId: string; readonly partyId: string };

function findSupplyWallet(root: SupplyFunds, siteId: string, carriedPurse?: CarriedSupplyPurse) {
  const party = root.lifecycle.parties.length === 1 ? root.lifecycle.parties[0] : undefined;
  if (!party || party.location.kind !== 'AT' || party.location.siteId !== siteId) return undefined;
  const location = party.location;
  return root.finance.wallets.find(
    (entry) =>
      entry.owner.kind === 'COMPANY' &&
      entry.owner.id === root.lifecycle.companyId &&
      ((entry.location.siteId === siteId && entry.location.areaId === location.areaId) ||
        (entry.walletId === carriedPurse?.walletId && carriedPurse.partyId === party.partyId)),
  );
}

/** Same actual wallet and reservations as the exchange, for the owning player's quote. */
export function supplySpendableCashQ(
  root: SupplyFunds,
  siteId: string,
  carriedPurse?: CarriedSupplyPurse,
): string {
  const wallet = findSupplyWallet(root, siteId, carriedPurse);
  if (!wallet) return '0';
  const free = BigInt(wallet.cashQ) - reservedQ(root.finance, wallet.walletId);
  return (free > 0n ? free : 0n).toString();
}

/** Both sides of one exchange. The adapter authenticates, settles elapsed time, locks and receipts it. */
export function prepareSupplyPurchase(
  root: MaterializedCompanyState,
  command: Extract<CompanyCommand, { type: 'BuySupplies' }>,
  shop: SettlementSupplies,
  carriedPurse?: { readonly walletId: string; readonly partyId: string },
): SupplyPurchase {
  const { siteId, quantity, shopRevision } = command.payload;
  const good = command.payload.goodId ?? 'RATION';
  const medical = good === 'MEDICAL_UNIT';
  const reject = (code: Extract<SupplyPurchase, { kind: 'REJECTED' }>['code']): SupplyPurchase => ({
    kind: 'REJECTED',
    code,
  });
  const party = supplyPurchaseParty(root, command, shop);
  if (!party) return reject('CONTACT_OR_ACCESS_REQUIRED');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100)
    return reject('INVALID_COMMAND');
  if (shopRevision !== shop.revision) return reject('STALE_REVISION');
  const stock = medical ? shop.herbalistMedicalUnits : shop.rations;
  if (!Number.isSafeInteger(stock) || stock < quantity) return reject('OUT_OF_STOCK');
  const location = party.location;
  const wallet = findSupplyWallet(root, siteId, carriedPurse);
  if (medical && (siteId !== 'bereznyak' || good !== 'MEDICAL_UNIT'))
    return reject('INVALID_COMMAND');
  const unit = COMPANY_CATALOGUE.items.find(
    (entry) => entry.id === (medical ? 'medical-unit' : 'ration'),
  )!;
  const cost = BigInt(medical ? MEDICAL_UNIT_PRICE_Q : SUPPLY_PRICE_Q) * BigInt(quantity);
  if (!wallet || BigInt(wallet.cashQ) - reservedQ(root.finance, wallet.walletId) < cost)
    return reject('INSUFFICIENT_FUNDS');
  const container = root.physical.containers.find(
    (entry) =>
      entry.kind === 'PARTY_SUPPLY' &&
      entry.closed === null &&
      entry.carrier?.kind === 'PARTY' &&
      entry.carrier.id === party.partyId,
  );
  if (
    !container ||
    availableContainerG(root.physical, container.containerId) < quantity * unit.weightG
  )
    return reject('CAPACITY');
  if (root.physical.items.some((item) => item.itemId === command.commandId))
    return reject('INVALID_COMMAND');
  const physical = {
    ...root.physical,
    items: [
      ...root.physical.items,
      {
        itemId: command.commandId,
        definitionId: medical ? 'medical-unit' : 'ration',
        owner: { kind: 'COMPANY' as const, id: root.lifecycle.companyId },
        containerId: container.containerId,
        quantity,
        currentCondition: 100,
        maximumCondition: 100,
        contentRevision: '1',
        provenance: {
          sourceId: medical
            ? `herbalist:${shop.worldId}:${siteId}`
            : `supplies:${shop.worldId}:${siteId}`,
          parentItemId: null,
          ordinal: 0,
        },
        equipped: null,
        tombstone: null,
      },
    ],
  };
  try {
    requirePartyTransportCapacity(root, physical);
    validatePhysicalState({ lifecycle: root.lifecycle, physical });
  } catch {
    return reject('CAPACITY');
  }
  return {
    kind: 'PREPARED',
    costQ: cost.toString(),
    shop: {
      ...shop,
      revision: (BigInt(shop.revision) + 1n).toString(),
      ...(medical
        ? { herbalistMedicalUnits: shop.herbalistMedicalUnits - quantity }
        : { rations: shop.rations - quantity }),
      cashQ: (BigInt(shop.cashQ) + cost).toString(),
    },
    next: {
      ...root,
      physical,
      lifecycle: {
        ...root.lifecycle,
        revision: canonicalRevision((BigInt(root.lifecycle.revision) + 1n).toString()),
        knowledge: {
          ...root.lifecycle.knowledge,
          revision: publicRevision((BigInt(root.lifecycle.knowledge.revision) + 1n).toString()),
        },
      },
      finance: {
        ...root.finance,
        wallets: root.finance.wallets.map((entry) =>
          entry.walletId === wallet.walletId
            ? { ...entry, location, cashQ: moneyQ((BigInt(wallet.cashQ) - cost).toString()) }
            : entry,
        ),
        movements: [
          ...root.finance.movements,
          {
            movementId: command.commandId,
            from: wallet.walletId,
            to: `supplies:${shop.worldId}:${siteId}`,
            amountQ: moneyQ(cost.toString()),
            purpose: medical ? ('CARE' as const) : ('FOOD' as const),
            atTick: root.lifecycle.campaignTick,
          },
        ],
      },
    },
  };
}

function supplyPurchaseParty(
  root: MaterializedCompanyState,
  command: Extract<CompanyCommand, { type: 'BuySupplies' }>,
  shop: SettlementSupplies,
) {
  const { siteId } = command.payload;
  const party = root.lifecycle.parties.length === 1 ? root.lifecycle.parties[0] : undefined;
  if (
    command.companyId !== root.lifecycle.companyId ||
    command.worldId !== root.lifecycle.worldId ||
    command.worldId !== shop.worldId ||
    siteId !== shop.siteId ||
    !SUPPLY_SHOPS.includes(siteId) ||
    !party ||
    party.location.kind !== 'AT' ||
    party.location.siteId !== siteId ||
    root.lifecycle.company?.runStatus !== 'ACTIVE' ||
    root.lifecycle.characters.some((person) => person.presence.encounterBindingId !== null)
  )
    return undefined;
  return { ...party, location: party.location };
}
