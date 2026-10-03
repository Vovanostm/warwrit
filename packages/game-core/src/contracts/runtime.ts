export interface FirstHuntJoinIntent {
  readonly companyId: string;
  readonly accountId: string;
  readonly publicRevision: string;
  readonly campaignTick: string;
}

export interface FirstHuntLifecycleState {
  readonly revision: string;
  readonly ownerCompanyId: string | null;
  readonly helperCompanyId: string | null;
  readonly ownerJoin: FirstHuntJoinIntent | null;
  readonly helperJoin: FirstHuntJoinIntent | null;
}

export type FirstHuntLifecycleCommand =
  | {
      readonly type: 'ACCEPT' | 'HELP';
      readonly companyId: string;
      readonly accountId: string;
      readonly expectedRevision: string;
      readonly expectedTermsDigest: string;
      readonly termsDigest: string;
      readonly atIssuer: boolean;
    }
  | {
      readonly type: 'LEAVE';
      readonly companyId: string;
      readonly accountId: string;
      readonly expectedRevision: string;
      readonly encounterActive: boolean;
    }
  | {
      readonly type: 'JOIN';
      readonly companyId: string;
      readonly accountId: string;
      readonly expectedRevision: string;
      readonly publicRevision: string;
      readonly campaignTick: string;
      readonly atObjective: boolean;
    };

export type FirstHuntLifecyclePreparation =
  | { readonly kind: 'PREPARED'; readonly next: FirstHuntLifecycleState }
  | {
      readonly kind: 'REJECTED';
      readonly code: 'NOT_AVAILABLE' | 'STALE_REVISION' | 'TERMS_CHANGED';
    };

/** Pure owner/helper/JOIN intent transition. Durable activation remains an adapter transaction. */
export function prepareFirstHuntLifecycleTransition(
  state: FirstHuntLifecycleState,
  command: FirstHuntLifecycleCommand,
): FirstHuntLifecyclePreparation {
  if (command.expectedRevision !== state.revision)
    return { kind: 'REJECTED', code: 'STALE_REVISION' };

  const actorRole =
    command.companyId === state.ownerCompanyId
      ? 'OWNER'
      : command.companyId === state.helperCompanyId
        ? 'HELPER'
        : 'NONE';
  let next: Omit<FirstHuntLifecycleState, 'revision'> | undefined;

  if (command.type === 'ACCEPT' || command.type === 'HELP') {
    if (command.termsDigest !== command.expectedTermsDigest)
      return { kind: 'REJECTED', code: 'TERMS_CHANGED' };
    if (command.type === 'ACCEPT') {
      if (actorRole !== 'NONE' || state.ownerCompanyId !== null || !command.atIssuer)
        return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };
      next = { ...state, ownerCompanyId: command.companyId };
    } else {
      if (
        actorRole !== 'NONE' ||
        state.ownerCompanyId === null ||
        state.helperCompanyId !== null ||
        !command.atIssuer
      )
        return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };
      next = { ...state, helperCompanyId: command.companyId };
    }
  } else if (command.type === 'LEAVE') {
    if (actorRole !== 'HELPER' || command.encounterActive)
      return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };
    next = { ...state, helperCompanyId: null, helperJoin: null };
  } else if (command.type === 'JOIN') {
    if (
      actorRole === 'NONE' ||
      !command.atObjective ||
      (actorRole === 'OWNER' && state.ownerCompanyId !== command.companyId) ||
      (actorRole === 'HELPER' && state.helperCompanyId !== command.companyId)
    )
      return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };
    const intent: FirstHuntJoinIntent = {
      companyId: command.companyId,
      accountId: command.accountId,
      publicRevision: command.publicRevision,
      campaignTick: command.campaignTick,
    };
    next =
      actorRole === 'OWNER' ? { ...state, ownerJoin: intent } : { ...state, helperJoin: intent };
  } else return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };

  return {
    kind: 'PREPARED',
    next: { ...next, revision: (BigInt(state.revision) + 1n).toString() },
  };
}
