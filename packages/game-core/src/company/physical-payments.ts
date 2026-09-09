import { sameLocation } from './lifecycle-state.js';
import { moveCash } from './economy-payments.js';
import { poolWallet, requirePoolAccess, walletFor } from './economy-state.js';
import type { EconomyContext, CashMovement, CompanyFinance } from './economy-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import type { AtLocation } from './lifecycle-types.js';
import { requirePhysical } from './physical-state.js';

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
    readonly purpose: Extract<CashMovement['purpose'], 'CARE' | 'FOOD' | 'REPAIR'>;
  },
): CompanyFinance {
  requirePoolAccess(root, input.poolId, context, input.moneyAccessEvidenceId);
  const source = poolWallet(root.finance, input.poolId);
  const provider = walletFor(root.finance, input.providerWalletId);
  requirePhysical(
    provider.owner.kind === 'CHARACTER' &&
      provider.owner.id === input.providerId &&
      sameLocation(source.location, input.location) &&
      sameLocation(provider.location, input.location),
    'INVALID_SOURCE',
  );
  const amount = BigInt(input.amountQ);
  requirePhysical(amount > 0n, 'INVALID_SOURCE');
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
