import { createHash } from 'node:crypto';
import { canonicalJson } from '@warwrit/game-core';
import type {
  AtLocation,
  CampaignTick,
  CompanyEconomyState,
  LocalMoneyAccess,
} from '@warwrit/game-core';

/** Authenticated scope and opening-purse identity supplied by the transaction owner. */
export interface PayrollScope {
  readonly worldId: string;
  readonly companyId: string;
  readonly atTick: CampaignTick;
  readonly commandId: string;
  readonly sourceEventId: string;
  readonly poolId: string;
  readonly carriedPurse: { readonly walletId: string; readonly partyId: string } | undefined;
}

export function payrollEvidenceId(scope: PayrollScope, subject: string): string {
  const { worldId, companyId, commandId, sourceEventId } = scope;
  const namespace = canonicalJson([worldId, companyId, commandId, sourceEventId, subject]);
  return `payroll:${createHash('sha256').update(namespace).digest('hex')}`;
}

function samePlace(
  location: { readonly kind: string; readonly siteId?: string; readonly areaId?: string },
  place: AtLocation,
): boolean {
  return (
    location.kind === 'AT' && location.siteId === place.siteId && location.areaId === place.areaId
  );
}

function localContacts(root: CompanyEconomyState, place: AtLocation) {
  return root.lifecycle.characters
    .filter(
      ({ presence }) =>
        samePlace(presence.location, place) &&
        presence.availability === 'AVAILABLE' &&
        presence.encounterBindingId === null,
    )
    .map(({ identity }) => identity.characterId)
    .sort();
}

function localOperator(root: CompanyEconomyState, contacts: readonly string[]) {
  return contacts.find((id) =>
    root.lifecycle.memberships.some(
      (member) =>
        member.characterId === id &&
        member.companyId === root.lifecycle.companyId &&
        member.endedAt === null,
    ),
  );
}

function companyWallet(root: CompanyEconomyState, walletId: string) {
  const wallets = root.finance.wallets.filter((wallet) => wallet.walletId === walletId);
  const wallet = wallets.length === 1 ? wallets[0] : undefined;
  return wallet?.owner.kind === 'COMPANY' && wallet.owner.id === root.lifecycle.companyId
    ? wallet
    : undefined;
}

function recipientWallets(
  root: CompanyEconomyState,
  contacts: readonly string[],
  place: AtLocation,
) {
  const walletIds: string[] = [];
  for (const id of contacts) {
    const wallets = root.finance.wallets.filter(
      (wallet) =>
        wallet.owner.kind === 'CHARACTER' &&
        wallet.owner.id === id &&
        samePlace(wallet.location, place),
    );
    if (wallets.length > 1) return undefined;
    if (wallets[0]) walletIds.push(wallets[0].walletId);
  }
  return walletIds.sort();
}

type PayrollAccess =
  | { readonly kind: 'REJECTED'; readonly reason: 'CONTACT_OR_ACCESS_REQUIRED' }
  | {
      readonly kind: 'PREPARED';
      readonly access: LocalMoneyAccess;
      readonly contactIds: readonly string[];
    };

/** No relocation: identity anchors the local party; each pool still needs its actual wallet here. */
export function preparePayrollAccess(
  root: CompanyEconomyState,
  scope: PayrollScope,
): PayrollAccess {
  const rejected = { kind: 'REJECTED', reason: 'CONTACT_OR_ACCESS_REQUIRED' } as const;
  if (
    root.lifecycle.worldId !== scope.worldId ||
    root.lifecycle.companyId !== scope.companyId ||
    !scope.carriedPurse
  )
    return rejected;
  const parties = root.lifecycle.parties.filter(
    (party) => party.partyId === scope.carriedPurse!.partyId,
  );
  const place = parties.length === 1 ? parties[0]?.location : undefined;
  if (place?.kind !== 'AT') return rejected;
  const purse = companyWallet(root, scope.carriedPurse.walletId);
  const pools = root.finance.pools.filter((pool) => pool.poolId === scope.poolId);
  const wallet = pools.length === 1 ? companyWallet(root, pools[0]!.walletId) : undefined;
  if (!purse || !wallet || !samePlace(purse.location, place) || !samePlace(wallet.location, place))
    return rejected;
  const contactIds = localContacts(root, place);
  const operatorId = localOperator(root, contactIds);
  const recipientWalletIds = recipientWallets(root, contactIds, place);
  if (!operatorId || !recipientWalletIds) return rejected;
  return {
    kind: 'PREPARED',
    contactIds,
    access: {
      kind: 'LOCAL_MONEY_ACCESS',
      id: payrollEvidenceId(scope, 'access'),
      worldId: scope.worldId,
      companyId: scope.companyId,
      revision: root.lifecycle.revision,
      atTick: scope.atTick,
      sourceEventId: scope.sourceEventId,
      operatorId,
      location: { ...place },
      poolIds: [scope.poolId],
      recipientWalletIds,
    },
  };
}
