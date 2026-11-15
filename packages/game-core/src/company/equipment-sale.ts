import { sameLocation } from './lifecycle-state.js';
import { activeMembership } from './lifecycle-state.js';
import { COMPANY_CATALOGUE } from './definitions.js';
import { canonicalJson } from './input.js';
import type { CompanyCommand } from './commands.js';
import type { ItemInstance } from './physical-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import { SUPPLY_SHOPS } from './supplies.js';
import type { SettlementSupplies } from './supplies.js';
import { canonicalRevision, isExactInteger, moneyQ, publicRevision } from './values.js';

const CROWN_Q = 1_000_000n;
const SALE_PRICES_Q: Readonly<Record<string, bigint>> = Object.freeze({
  sword: 4n * CROWN_Q,
  'raider-weapon': 4n * CROWN_Q,
  bow: 4n * CROWN_Q,
  spear: 4n * CROWN_Q,
  'great-weapon': 8n * CROWN_Q,
  shield: 3n * CROWN_Q,
  'simple-helmet': 5n * CROWN_Q,
  'padded-coat': 5n * CROWN_Q,
});

/** Fixed owner-approved buyback quote in exact q units; returns nothing for other catalogue IDs. */
export function equipmentSaleQuote(definitionId: string): string | undefined {
  if (!Object.hasOwn(SALE_PRICES_Q, definitionId)) return undefined;
  const definition = COMPANY_CATALOGUE.items.find(
    (entry) => entry.id === definitionId && entry.enabled,
  );
  const price = SALE_PRICES_Q[definitionId];
  return definition && price !== undefined ? price.toString() : undefined;
}

export type EquipmentSale =
  | {
      readonly kind: 'REJECTED';
      readonly code:
        | 'CONTACT_OR_ACCESS_REQUIRED'
        | 'STALE_REVISION'
        | 'INSUFFICIENT_FUNDS'
        | 'INVALID_STATE'
        | 'INVALID_ITEM'
        | 'ITEM_NOT_OWNED'
        | 'UNSALEABLE_ITEM'
        | 'INCOMPATIBLE_ACTIVITY'
        | 'IDEMPOTENCY_CONFLICT';
    }
  | {
      readonly kind: 'PREPARED';
      readonly next: MaterializedCompanyState;
      readonly shop: SettlementSupplies;
      readonly sold: ItemInstance;
      readonly priceQ: string;
    };

type CarriedPurse = { readonly walletId: string; readonly partyId: string };

/** One equipment instance, one exact buyback and one finite trader balance. */
export function prepareEquipmentSale(
  root: MaterializedCompanyState,
  command: Extract<CompanyCommand, { type: 'SellItem' }>,
  shop: SettlementSupplies,
  carriedPurse?: CarriedPurse,
): EquipmentSale {
  const { itemId, siteId, shopRevision } = command.payload;
  const reject = (code: Extract<EquipmentSale, { kind: 'REJECTED' }>['code']): EquipmentSale => ({
    kind: 'REJECTED',
    code,
  });
  const party = root.lifecycle.parties.length === 1 ? root.lifecycle.parties[0] : undefined;
  if (
    command.companyId !== root.lifecycle.companyId ||
    command.worldId !== root.lifecycle.worldId ||
    command.worldId !== shop.worldId ||
    siteId !== 'kamenny-brod' ||
    shop.siteId !== siteId ||
    !SUPPLY_SHOPS.includes(siteId) ||
    !party ||
    party.location.kind !== 'AT' ||
    party.location.siteId !== siteId ||
    root.lifecycle.company?.runStatus !== 'ACTIVE'
  )
    return reject('CONTACT_OR_ACCESS_REQUIRED');
  if (root.lifecycle.characters.some((person) => person.presence.encounterBindingId !== null))
    return reject('INCOMPATIBLE_ACTIVITY');
  const marketAreaId = party.location.areaId;
  if (root.finance.movements.some((movement) => movement.movementId === command.commandId))
    return reject('IDEMPOTENCY_CONFLICT');
  const saleSourceKey = JSON.stringify(['equipment-sale', itemId]);
  if (root.physical.sourceEffects.some((effect) => effect.key === saleSourceKey))
    return reject('IDEMPOTENCY_CONFLICT');
  if (shopRevision !== shop.revision) return reject('STALE_REVISION');
  if (!/^(0|[1-9][0-9]*)$/u.test(shop.cashQ) || !/^(0|[1-9][0-9]*)$/u.test(shop.revision))
    return reject('INVALID_STATE');

  const item = root.physical.items.find((entry) => entry.itemId === itemId);
  if (!item || item.tombstone !== null) return reject('INVALID_ITEM');
  if (item.owner.kind !== 'COMPANY' || item.owner.id !== root.lifecycle.companyId)
    return reject('ITEM_NOT_OWNED');
  const quoteQ = equipmentSaleQuote(item.definitionId);
  if (quoteQ === undefined || item.quantity !== 1) return reject('UNSALEABLE_ITEM');
  const price = BigInt(quoteQ);
  const container = root.physical.containers.find(
    (entry) => entry.containerId === item.containerId && entry.closed === null,
  );
  if (!container) return reject('CONTACT_OR_ACCESS_REQUIRED');
  const atMarket =
    container.location.kind === 'AT' &&
    container.location.siteId === siteId &&
    container.location.areaId === party.location.areaId;
  const carriedByParty =
    (container.carrier?.kind === 'PARTY' && container.carrier.id === party.partyId) ||
    (container.carrier?.kind === 'CHARACTER' &&
      root.lifecycle.characters.some(
        (person) =>
          person.identity.characterId === container.carrier?.id &&
          person.presence.fieldPartyId === party.partyId &&
          person.presence.availability === 'AVAILABLE' &&
          person.presence.encounterBindingId === null &&
          sameLocation(person.presence.location, party.location),
      ));
  const localCompanyCharacterCustodian =
    container.custodian.kind === 'CHARACTER' &&
    activeMembership(root.lifecycle, container.custodian.id) !== null &&
    root.lifecycle.characters.some(
      (person) =>
        person.identity.characterId === container.custodian.id &&
        person.presence.fieldPartyId === party.partyId &&
        person.presence.availability === 'AVAILABLE' &&
        person.presence.encounterBindingId === null &&
        sameLocation(person.presence.location, party.location),
    );
  const companyAccessible =
    (container.access === 'COMPANY' &&
      container.custodian.kind === 'COMPANY' &&
      container.custodian.id === root.lifecycle.companyId) ||
    (container.access === 'OWNER' &&
      (canonicalJson(container.custodian) === canonicalJson(item.owner) ||
        localCompanyCharacterCustodian)) ||
    (container.access === 'CUSTODIAN' &&
      ((container.custodian.kind === 'COMPANY' &&
        container.custodian.id === root.lifecycle.companyId) ||
        localCompanyCharacterCustodian ||
        carriedByParty));
  if ((!atMarket && !carriedByParty) || !companyAccessible)
    return reject('CONTACT_OR_ACCESS_REQUIRED');

  const wallet = root.finance.wallets.find(
    (entry) =>
      entry.owner.kind === 'COMPANY' &&
      entry.owner.id === root.lifecycle.companyId &&
      ((entry.location.kind === 'AT' &&
        entry.location.siteId === siteId &&
        entry.location.areaId === marketAreaId) ||
        (entry.walletId === carriedPurse?.walletId && carriedPurse.partyId === party.partyId)),
  );
  if (!wallet) return reject('CONTACT_OR_ACCESS_REQUIRED');
  if (BigInt(shop.cashQ) < price) return reject('INSUFFICIENT_FUNDS');
  const traderId = `supplies:${shop.worldId}:${siteId}`;
  const traderContainerId = `trader-items:${shop.worldId}:${siteId}`;
  const companyCashQ = (BigInt(wallet.cashQ) + price).toString();
  const traderCashQ = (BigInt(shop.cashQ) - price).toString();
  const shopRevisionNext = (BigInt(shop.revision) + 1n).toString();
  if (
    !isExactInteger(companyCashQ) ||
    !isExactInteger(traderCashQ) ||
    !isExactInteger(shopRevisionNext)
  )
    return reject('INVALID_STATE');
  const sold: ItemInstance = {
    ...item,
    owner: { kind: 'WORLD', id: root.lifecycle.worldId },
    containerId: traderContainerId,
    equipped: null,
  };
  const priceQ = quoteQ;
  return {
    kind: 'PREPARED',
    next: {
      ...root,
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
          entry.walletId === wallet.walletId ? { ...entry, cashQ: moneyQ(companyCashQ) } : entry,
        ),
        movements: [
          ...root.finance.movements,
          {
            movementId: command.commandId,
            from: traderId,
            to: wallet.walletId,
            amountQ: moneyQ(priceQ),
            purpose: 'SALE',
            atTick: root.lifecycle.campaignTick,
          },
        ],
      },
      physical: {
        ...root.physical,
        items: root.physical.items.filter((entry) => entry.itemId !== item.itemId),
        sourceEffects: [
          ...root.physical.sourceEffects,
          { key: saleSourceKey, requestKey: command.commandId },
        ],
        knowledge: {
          ...root.physical.knowledge,
          itemSnapshots: root.physical.knowledge.itemSnapshots.filter(
            (entry) => entry.itemId !== item.itemId,
          ),
        },
      },
    },
    shop: {
      ...shop,
      cashQ: moneyQ(traderCashQ),
      revision: shopRevisionNext,
    },
    sold,
    priceQ,
  };
}
