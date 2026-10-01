import {
  isFirstHuntCommand,
  type FirstHuntCommandDto,
  type FirstHuntCommandResponseDto,
  type FirstHuntContractViewDto,
  type FirstHuntReadResponseDto,
} from '@warwrit/protocol';

export interface FirstHuntScope {
  readonly accountId: string;
  readonly companyId: string;
}

export interface FirstHuntAttempt {
  readonly scope: FirstHuntScope;
  readonly request: FirstHuntCommandDto;
  readonly body: string;
}

export interface FirstHuntStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const FIRST_HUNT_ACTIVATION_POLL_DELAYS_MS = Object.freeze([
  3_000, 6_000, 12_000, 24_000, 30_000,
]);

export function shouldPollForFirstHuntActivation(contract: FirstHuntContractViewDto): boolean {
  return (
    contract.knownState === 'ACTIVE' &&
    contract.yourRole !== 'NONE' &&
    contract.yourJoinIntent &&
    contract.encounterId === null
  );
}

export function startFirstHuntActivationPolling(input: {
  readonly initialContract: FirstHuntContractViewDto;
  readonly refresh: () => Promise<FirstHuntReadResponseDto | undefined>;
  readonly onEncounterDiscovered: (encounterId: string) => void;
}): () => void {
  let contract: FirstHuntContractViewDto | undefined = input.initialContract;
  let delayIndex = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const schedule = () => {
    if (stopped || !contract || !shouldPollForFirstHuntActivation(contract)) return;
    const delay =
      FIRST_HUNT_ACTIVATION_POLL_DELAYS_MS[
        Math.min(delayIndex, FIRST_HUNT_ACTIVATION_POLL_DELAYS_MS.length - 1)
      ]!;
    timer = setTimeout(() => {
      timer = undefined;
      void poll();
    }, delay);
  };

  const poll = async () => {
    if (stopped || !contract || !shouldPollForFirstHuntActivation(contract)) return;

    let response: FirstHuntReadResponseDto | undefined;
    try {
      response = await input.refresh();
    } catch {
      // Keep the last confirmed JOIN state and retry after the capped backoff.
    }
    if (stopped) return;
    if (response) contract = response.contract ?? undefined;
    if (!contract) return;

    const encounterId = firstHuntEncounterDiscoveryId(contract);
    if (encounterId) {
      input.onEncounterDiscovered(encounterId);
      return;
    }
    if (!shouldPollForFirstHuntActivation(contract)) return;

    delayIndex = Math.min(delayIndex + 1, FIRST_HUNT_ACTIVATION_POLL_DELAYS_MS.length - 1);
    schedule();
  };

  schedule();
  return () => {
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
}

export function firstHuntEncounterDiscoveryId(
  contract: FirstHuntContractViewDto,
): string | undefined {
  return contract.encounterId ?? undefined;
}

export function firstHuntAttemptKey(scope: FirstHuntScope): string {
  return `warwrit:first-hunt:v1:${encodeURIComponent(scope.accountId)}:${encodeURIComponent(scope.companyId)}`;
}

export function createFirstHuntAttempt(input: {
  readonly scope: FirstHuntScope;
  readonly current: FirstHuntReadResponseDto;
  readonly commandId: string;
  readonly type: FirstHuntCommandDto['type'];
  readonly containerId?: string;
}): FirstHuntAttempt {
  const contract = input.current.contract;
  if (!contract) throw new TypeError('The FIRST HUNT contract is unavailable');
  const instanceId = contract.instanceId;
  let request: FirstHuntCommandDto;
  if (input.type === 'ACCEPT' || input.type === 'HELP') {
    request = {
      schemaVersion: 1,
      commandId: input.commandId,
      expectedPublicRevision: input.current.publicRevision,
      type: input.type,
      payload: { instanceId, termsDigest: contract.termsDigest },
    };
  } else if (input.type === 'PICKUP') {
    if (!input.containerId) throw new TypeError('A destination container is required');
    request = {
      schemaVersion: 1,
      commandId: input.commandId,
      expectedPublicRevision: input.current.publicRevision,
      type: 'PICKUP',
      payload: { instanceId, toContainerId: input.containerId },
    };
  } else {
    request = {
      schemaVersion: 1,
      commandId: input.commandId,
      expectedPublicRevision: input.current.publicRevision,
      type: input.type,
      payload: { instanceId },
    };
  }
  const body = JSON.stringify(request);
  return Object.freeze({ scope: Object.freeze({ ...input.scope }), request, body });
}

export function availableFirstHuntActions(
  contract: FirstHuntContractViewDto,
  currentSiteId: string | null,
  hasPickupTarget: boolean,
): readonly FirstHuntCommandDto['type'][] {
  const actions: FirstHuntCommandDto['type'][] = [];
  const atIssuer = currentSiteId === contract.terms.issuerLocation.siteId;
  const atObjective = currentSiteId === contract.terms.objectiveLocation.siteId;

  if (contract.yourRole === 'NONE' && atIssuer && contract.knownState === 'OFFERED')
    actions.push('ACCEPT');
  if (
    contract.yourRole === 'NONE' &&
    atIssuer &&
    contract.knownState === 'ACTIVE' &&
    contract.helperSlot === 'AVAILABLE'
  )
    actions.push('HELP');
  if (contract.yourRole === 'HELPER' && contract.knownState !== 'ENCOUNTER_ACTIVE')
    actions.push('LEAVE');
  if (
    contract.yourRole !== 'NONE' &&
    atObjective &&
    contract.knownState === 'ACTIVE' &&
    !contract.yourJoinIntent
  )
    actions.push('JOIN');
  if (
    contract.yourRole !== 'NONE' &&
    atObjective &&
    contract.knownState === 'PROOF_AVAILABLE' &&
    hasPickupTarget
  )
    actions.push('PICKUP');
  if (
    contract.yourProof?.redemption === 'UNREDEEMED' &&
    atIssuer &&
    contract.knownState === 'PROOF_HELD'
  )
    actions.push('PRESENT');
  return Object.freeze(actions);
}

export function saveFirstHuntAttempt(storage: FirstHuntStorage, attempt: FirstHuntAttempt): void {
  storage.setItem(
    firstHuntAttemptKey(attempt.scope),
    JSON.stringify({
      version: 1,
      accountId: attempt.scope.accountId,
      companyId: attempt.scope.companyId,
      body: attempt.body,
    }),
  );
}

export function clearFirstHuntAttempt(storage: FirstHuntStorage, scope: FirstHuntScope): void {
  storage.removeItem(firstHuntAttemptKey(scope));
}

export function readFirstHuntAttempt(
  storage: FirstHuntStorage,
  scope: FirstHuntScope,
): FirstHuntAttempt | undefined {
  try {
    const value = storage.getItem(firstHuntAttemptKey(scope));
    if (!value) return undefined;
    const envelope: unknown = JSON.parse(value);
    if (
      !isRecord(envelope) ||
      envelope['version'] !== 1 ||
      envelope['accountId'] !== scope.accountId ||
      envelope['companyId'] !== scope.companyId ||
      typeof envelope['body'] !== 'string'
    )
      throw new TypeError('Invalid FIRST HUNT attempt');
    const request: unknown = JSON.parse(envelope['body']);
    if (!isFirstHuntCommand(request) || JSON.stringify(request) !== envelope['body'])
      throw new TypeError('Invalid FIRST HUNT request');
    return Object.freeze({
      scope: Object.freeze({ ...scope }),
      request,
      body: envelope['body'],
    });
  } catch {
    try {
      storage.removeItem(firstHuntAttemptKey(scope));
    } catch {
      return undefined;
    }
    return undefined;
  }
}

const rejectedCodes = new Set([
  'INVALID_COMMAND',
  'NOT_AUTHORIZED',
  'NOT_AVAILABLE',
  'STALE_REVISION',
  'TERMS_CHANGED',
  'INCOMPATIBLE_ACTIVITY',
  'CAPACITY',
  'INSUFFICIENT_FUNDS',
]);

/** Accept only the stored command's exact public reply shape and identity. */
export function readFirstHuntCommandResponse(
  value: unknown,
  commandId: string,
): FirstHuntCommandResponseDto | undefined {
  if (
    !isRecord(value) ||
    value['schemaVersion'] !== 1 ||
    value['commandId'] !== commandId ||
    typeof value['publicRevision'] !== 'string' ||
    !/^(0|[1-9][0-9]*)$/.test(value['publicRevision'])
  )
    return undefined;
  if (
    value['ok'] === true &&
    Object.keys(value).length === 5 &&
    typeof value['receiptId'] === 'string' &&
    value['receiptId'].length > 0
  )
    return value as unknown as FirstHuntCommandResponseDto;
  if (
    value['ok'] === false &&
    Object.keys(value).length === 5 &&
    typeof value['code'] === 'string' &&
    rejectedCodes.has(value['code'])
  )
    return value as unknown as FirstHuntCommandResponseDto;
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
