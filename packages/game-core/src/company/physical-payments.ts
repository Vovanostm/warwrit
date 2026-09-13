import { canPerform, person, sameLocation } from './lifecycle-state.js';
import { moveCash } from './economy-payments.js';
import { poolWallet, requirePoolAccess, walletFor } from './economy-state.js';
import type { EconomyContext, CashMovement, CompanyFinance } from './economy-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import type { AtLocation } from './lifecycle-types.js';
import { requirePhysical } from './physical-state.js';
import { isExactInteger } from './values.js';

export function payPhysicalProvider(
  root: MaterializedCompanyState,
  context: EconomyContext,
  input: {
    readonly poolId: string;
    readonly providerWalletId: string;
    readonly moneyAccessEvidenceId: string;
    readonly providerId: string;
    readonly location: AtLocation;
    readonly amountQ: string;
    readonly movementId: string;
    readonly purpose: Extract<
      CashMovement['purpose'],
      'CARE' | 'CARE_HANDOVER' | 'FOOD' | 'REPAIR' | 'PRESENTATION'
    >;
  },
): CompanyFinance {
  const access = requirePoolAccess(root, input.poolId, context, input.moneyAccessEvidenceId);
  const receiver = person(root.lifecycle, input.providerId);
  requirePhysical(
    access.recipientWalletIds.includes(input.providerWalletId) &&
      receiver.presence.availability === 'AVAILABLE' &&
      receiver.presence.encounterBindingId === null &&
      canPerform(receiver, 'basicWork') &&
      sameLocation(receiver.presence.location, input.location),
    'CONTACT_OR_ACCESS_REQUIRED',
  );
  const source = poolWallet(root.finance, input.poolId);
  const provider = walletFor(root.finance, input.providerWalletId);
  requirePhysical(
    provider.owner.kind === 'CHARACTER' &&
      provider.owner.id === input.providerId &&
      sameLocation(source.location, input.location) &&
      sameLocation(provider.location, input.location),
    'INVALID_SOURCE',
  );
  requirePhysical(isExactInteger(input.amountQ) && BigInt(input.amountQ) > 0n, 'INVALID_SOURCE');
  const amount = BigInt(input.amountQ);
  return moveCash(
    root.finance,
    source.walletId,
    provider.walletId,
    amount,
    context.atTick,
    input.movementId,
    input.purpose,
  );
}
