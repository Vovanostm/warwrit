import { COMPANY_CATALOGUE } from './definitions.js';
import { reservedQ } from './economy-state.js';
import { consumePhysicalQuantity } from './physical-items.js';
import { availableContainerG, validatePhysicalState } from './physical-state.js';
import { requirePartyTransportCapacity } from './physical-items.js';
import { canonicalRevision, moneyQ, publicRevision } from './values.js';
import type { MaterializedCompanyState } from './physical-root-types.js';

export const MILL_DESCENT_KIT_ID = 'mill-descent-kit';
export const MILL_DESCENT_KIT_PRICE_Q = '15000000';
export const MILL_DESCENT_KIT_INITIAL_STOCK = 2;
export const MILL_DESCENT_KIT_SITE = 'tikhaya-gat';

export interface MillDescentKitStock {
  readonly worldId: string;
  readonly revision: string;
  readonly quantity: number;
  readonly priceQ: string;
  readonly cashQ: string;
}

export type MillDescentKitPurchase =
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
      readonly stock: MillDescentKitStock;
      readonly itemId: string;
    };

export function prepareMillDescentKitPurchase(
  root: MaterializedCompanyState,
  input: {
    readonly commandId: string;
    readonly siteId: string;
    readonly shopRevision: string;
  },
  stock: MillDescentKitStock,
  carriedPurse?: { readonly walletId: string; readonly partyId: string },
): MillDescentKitPurchase {
  const reject = (code: Extract<MillDescentKitPurchase, { kind: 'REJECTED' }>['code']) =>
    ({ kind: 'REJECTED', code }) as const;
  const party = root.lifecycle.parties.length === 1 ? root.lifecycle.parties[0] : undefined;
  if (
    input.siteId !== MILL_DESCENT_KIT_SITE ||
    stock.worldId !== root.lifecycle.worldId ||
    !party ||
    party.location.kind !== 'AT' ||
    party.location.siteId !== input.siteId ||
    root.lifecycle.company?.runStatus !== 'ACTIVE' ||
    root.lifecycle.characters.some((person) => person.presence.encounterBindingId !== null)
  )
    return reject('CONTACT_OR_ACCESS_REQUIRED');
  if (input.shopRevision !== stock.revision) return reject('STALE_REVISION');
  if (!Number.isSafeInteger(stock.quantity) || stock.quantity < 0)
    throw new TypeError('Invalid mill descent kit stock');
  if (
    stock.quantity > MILL_DESCENT_KIT_INITIAL_STOCK ||
    stock.priceQ !== MILL_DESCENT_KIT_PRICE_Q ||
    !/^(0|[1-9][0-9]*)$/u.test(stock.revision) ||
    !/^(0|[1-9][0-9]*)$/u.test(stock.cashQ)
  )
    throw new TypeError('Invalid mill descent kit stock');
  if (stock.quantity < 1) return reject('OUT_OF_STOCK');
  if (
    root.physical.items.some((item) => item.itemId === input.commandId) ||
    root.finance.movements.some((movement) => movement.movementId === input.commandId)
  )
    return reject('INVALID_COMMAND');
  const partyLocation = party.location;

  const wallet = root.finance.wallets.find(
    (entry) =>
      entry.owner.kind === 'COMPANY' &&
      entry.owner.id === root.lifecycle.companyId &&
      ((entry.location.kind === 'AT' &&
        entry.location.siteId === input.siteId &&
        entry.location.areaId === partyLocation.areaId) ||
        (entry.walletId === carriedPurse?.walletId && carriedPurse.partyId === party.partyId)),
  );
  const cost = BigInt(stock.priceQ);
  if (!wallet || BigInt(wallet.cashQ) - reservedQ(root.finance, wallet.walletId) < cost)
    return reject('INSUFFICIENT_FUNDS');
  const container = root.physical.containers.find(
    (entry) =>
      entry.kind === 'PARTY_SUPPLY' &&
      entry.closed === null &&
      entry.carrier?.kind === 'PARTY' &&
      entry.carrier.id === party.partyId,
  );
  const definition = COMPANY_CATALOGUE.items.find((entry) => entry.id === MILL_DESCENT_KIT_ID);
  if (
    !container ||
    !definition ||
    availableContainerG(root.physical, container.containerId) < definition.weightG
  )
    return reject('CAPACITY');

  const itemId = input.commandId;
  const physical = {
    ...root.physical,
    items: [
      ...root.physical.items,
      {
        itemId,
        definitionId: MILL_DESCENT_KIT_ID,
        owner: { kind: 'COMPANY' as const, id: root.lifecycle.companyId },
        containerId: container.containerId,
        quantity: 1,
        currentCondition: 100,
        maximumCondition: 100,
        contentRevision: '1',
        provenance: {
          sourceId: `mill-descent-kits:${stock.worldId}:${input.siteId}`,
          parentItemId: null,
          ordinal: MILL_DESCENT_KIT_INITIAL_STOCK - stock.quantity,
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
    itemId,
    stock: {
      ...stock,
      revision: (BigInt(stock.revision) + 1n).toString(),
      quantity: stock.quantity - 1,
      cashQ: (BigInt(stock.cashQ) + cost).toString(),
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
            ? {
                ...entry,
                location: partyLocation,
                cashQ: moneyQ((BigInt(wallet.cashQ) - cost).toString()),
              }
            : entry,
        ),
        movements: [
          ...root.finance.movements,
          {
            movementId: input.commandId,
            from: wallet.walletId,
            to: `mill-descent-kits:${stock.worldId}:${input.siteId}`,
            amountQ: moneyQ(cost.toString()),
            purpose: 'TRANSFER' as const,
            atTick: root.lifecycle.campaignTick,
          },
        ],
      },
    },
  };
}

export function consumeMillDescentKit(
  root: MaterializedCompanyState,
  itemId: string,
  sourceId: string,
  atTick: typeof root.lifecycle.campaignTick,
): MaterializedCompanyState {
  const item = root.physical.items.find(
    (entry) =>
      entry.itemId === itemId &&
      entry.definitionId === MILL_DESCENT_KIT_ID &&
      entry.owner.kind === 'COMPANY' &&
      entry.owner.id === root.lifecycle.companyId &&
      entry.tombstone === null,
  );
  if (!item) throw new TypeError('Company does not hold the mill descent kit');
  const physical = consumePhysicalQuantity(
    root.physical,
    itemId,
    1,
    sourceId,
    'QUIET_MILL_RESCUE',
    atTick,
  );
  return {
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
  };
}
