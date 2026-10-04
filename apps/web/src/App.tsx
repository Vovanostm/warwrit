import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';

import {
  type CompanyHoldingsDto,
  type CompanyOpeningOptionsResponseDto,
  type CompanySummaryDto,
  type CreateCompanyPayloadDto,
  type CreateCompanyRequestDto,
  type WorldPartyReadResponseDto,
  type WorldFreeMovementResponseDto,
  WORLD_EXPECTED_COMPANY_ID_HEADER,
} from '@warwrit/protocol';
import { CombatLab } from './combat-lab/CombatLab.js';
import { CompanyOpening } from './CompanyOpening.js';
import { getOrCreateCompanyCreateAttempt } from './company-create-attempt.js';
import { GameShell } from './game/GameShell.js';
import { FirstHunt } from './FirstHunt.js';
import { ContractBoard } from './game/ContractBoard.js';
import { HuntList } from './game/HuntList.js';
import {
  clearWorldTravelAttempt,
  clearWorldTravelReturnWindow,
  createWorldTravelAttempt,
  executeWorldTravelAttempt,
  isWorldTravelOperationCurrent,
  isWorldTravelReturnWindowOpen,
  onTimeWorldTravelReturnWindow,
  readWorldPartyResponse,
  readWorldTravelAttempt,
  saveWorldTravelAttempt,
  saveWorldTravelReturnWindow,
  worldTravelRejectionMessage,
  worldPartyReadHeaders,
  WorldTravelRefreshError,
  type WorldTravelAttempt,
  type WorldTravelAction,
  type WorldTravelScope,
  type WorldTravelStorage,
} from './world-travel-attempt.js';
import {
  classifyFreeMovementPost,
  clearFreeMovementAttempt,
  createFreeMovementAttempt,
  readFreeMovementAttempt,
  readFreeMovementResponse,
  saveFreeMovementAttempt,
  type FreeMovementAction,
  type FreeMovementAttempt,
  type FreeMovementScope,
} from './world-free-movement-attempt.js';

const apiBaseUrl = import.meta.env['VITE_API_BASE_URL'] ?? '/api';
const EncounterPanel = lazy(() =>
  import('./EncounterPanel.js').then((module) => ({ default: module.EncounterPanel })),
);

interface PlayerSession {
  readonly accountId: string;
}

type JourneyState =
  | { readonly status: 'checking-session' }
  | { readonly status: 'signed-out'; readonly message?: string }
  | { readonly status: 'signing-out' }
  | { readonly status: 'loading-company'; readonly session: PlayerSession }
  | { readonly status: 'loading-opening'; readonly session: PlayerSession }
  | {
      readonly status: 'company-opening';
      readonly session: PlayerSession;
      readonly opening: CompanyOpeningOptionsResponseDto['opening'];
    }
  | {
      readonly status: 'company-ready';
      readonly session: PlayerSession;
      readonly company: CompanySummaryDto;
      readonly holdings: CompanyHoldingsDto | undefined;
      readonly world: WorldPartyReadResponseDto;
      readonly freeMovement: WorldFreeMovementResponseDto | null;
      readonly returnWindowOpen: boolean;
      readonly travelAttemptPending: boolean;
      readonly freeMovementAttemptPending: boolean;
      readonly travelMessage?: string;
      readonly freeMovementMessage?: string | undefined;
    }
  | { readonly status: 'error'; readonly message: string; readonly retry: () => void };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readSession(value: unknown): PlayerSession | undefined {
  if (!isObject(value) || typeof value['accountId'] !== 'string') return undefined;
  return { accountId: value['accountId'] };
}

function readCompany(value: unknown): CompanySummaryDto | null | undefined {
  if (!isObject(value)) return undefined;
  if (value['schemaVersion'] !== 1) return undefined;
  const company = value['company'];
  if (company === null) return null;
  if (!isObject(company)) return undefined;
  const projection = company as Record<string, unknown>;
  const companyId = projection['companyId'];
  const revision = projection['revision'];
  const companyPresentation = projection['companyPresentation'];
  const leaderId = projection['leaderId'];
  const runStatus = projection['runStatus'];
  const characters = projection['characters'];
  const safeCompanyPresentation =
    companyPresentation === null
      ? null
      : isObject(companyPresentation) &&
          typeof companyPresentation['name'] === 'string' &&
          typeof companyPresentation['bannerId'] === 'string'
        ? {
            name: companyPresentation['name'],
            bannerId: companyPresentation['bannerId'],
          }
        : undefined;
  if (
    typeof companyId !== 'string' ||
    typeof revision !== 'string' ||
    safeCompanyPresentation === undefined ||
    (leaderId !== null && typeof leaderId !== 'string') ||
    !['ACTIVE', 'GAME_OVER', 'UNKNOWN'].includes(String(runStatus)) ||
    !Array.isArray(characters)
  ) {
    return undefined;
  }
  const safeCharacters = characters.filter(
    (character): character is CompanySummaryDto['characters'][number] =>
      isObject(character) &&
      typeof character['characterId'] === 'string' &&
      typeof character['name'] === 'string' &&
      (character['nicknameTextKey'] === null || typeof character['nicknameTextKey'] === 'string') &&
      ['AVAILABLE', 'IN_ENCOUNTER', 'OUT_OF_CONTACT', 'CAPTIVE', 'DEAD'].includes(
        String(character['knownStatus']),
      ),
  );
  if (safeCharacters.length !== characters.length) return undefined;
  return {
    companyId,
    revision,
    companyPresentation: safeCompanyPresentation,
    leaderId,
    runStatus: runStatus as CompanySummaryDto['runStatus'],
    characters: safeCharacters,
  };
}

/** Holdings are display-only; a malformed block is dropped rather than trusted. */
function readHoldings(value: unknown): CompanyHoldingsDto | undefined {
  if (!isObject(value)) return undefined;
  const holdings = value['holdings'];
  if (
    !isObject(holdings) ||
    typeof holdings['cashQ'] !== 'string' ||
    !/^-?[0-9]+$/u.test(holdings['cashQ']) ||
    !Array.isArray(holdings['wallets']) ||
    !Array.isArray(holdings['items']) ||
    !Array.isArray(holdings['people'])
  )
    return undefined;
  return holdings as unknown as CompanyHoldingsDto;
}

function readOpening(value: unknown): CompanyOpeningOptionsResponseDto['opening'] | undefined {
  if (!isObject(value) || value['schemaVersion'] !== 1 || !isObject(value['opening']))
    return undefined;
  const opening = value['opening'];
  const asChoice = (entry: unknown): entry is { readonly id: string; readonly label: string } =>
    isObject(entry) && typeof entry['id'] === 'string' && typeof entry['label'] === 'string';
  const defaults = opening['leaderDefaults'];
  const candidates = opening['candidates'];
  if (
    typeof opening['candidateSetId'] !== 'string' ||
    typeof opening['companyId'] !== 'string' ||
    typeof opening['bannerId'] !== 'string' ||
    !asChoice(opening['origin']) ||
    !asChoice(opening['culture']) ||
    !asChoice(opening['homeland']) ||
    !asChoice(opening['familyStory']) ||
    !isObject(defaults) ||
    !['sex', 'birthCultureId', 'birthplaceId', 'originId', 'speciesId', 'bornAt'].every(
      (key) => typeof defaults[key] === 'string',
    ) ||
    !Array.isArray(candidates) ||
    candidates.length !== 3 ||
    candidates.some(
      (candidate) =>
        !isObject(candidate) ||
        typeof candidate['characterId'] !== 'string' ||
        typeof candidate['name'] !== 'string' ||
        typeof candidate['sex'] !== 'string' ||
        typeof candidate['templateId'] !== 'string',
    ) ||
    !isObject(opening['selection']) ||
    opening['selection']['minCount'] !== 1 ||
    opening['selection']['maxCount'] !== 2 ||
    !isObject(opening['availability']) ||
    opening['availability']['allCanonicalPlayerChoicesOpen'] !== false
  ) {
    return undefined;
  }
  if (
    new Set(candidates.map((candidate) => (candidate as Record<string, unknown>)['characterId']))
      .size !== 3
  )
    return undefined;
  return opening as unknown as CompanyOpeningOptionsResponseDto['opening'];
}

function rejectionMessage(code: unknown): string {
  switch (code) {
    case 'INVALID_COMMAND':
      return 'Сервер не принял выбранные варианты. Запросите новые варианты и попробуйте снова.';
    case 'NOT_AUTHORIZED':
      return 'Сеанс завершился. Войдите снова, чтобы открыть компанию.';
    case 'CONTACT_OR_ACCESS_REQUIRED':
      return 'Сейчас открыть компанию не удалось: нет доступа к нужным людям или месту.';
    case 'UNSUPPORTED_ACTION':
      return 'Открытие компании пока недоступно на сервере.';
    default:
      return 'Сервер не смог сохранить компанию.';
  }
}

function responseError(response: Response): Error {
  if (response.status === 503)
    return new Error('Служба учётной записи или компании сейчас недоступна.');
  if (response.status >= 500) return new Error('Сервер не смог выполнить запрос.');
  return new Error('Сервер вернул неожиданный ответ.');
}

function travelStorage(): WorldTravelStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

function clearStoredTravelReturnWindow(scope: WorldTravelScope): void {
  const storage = travelStorage();
  if (!storage) return;
  try {
    clearWorldTravelReturnWindow(storage, scope);
  } catch {
    // Storage cleanup must not turn logout into a failed server operation.
  }
}

export function App() {
  const [journey, setJourney] = useState<JourneyState>({ status: 'checking-session' });
  const [hasPendingCreateAttempt, setHasPendingCreateAttempt] = useState(false);
  const [encounterGeneration, setEncounterGeneration] = useState(0);
  const [contractRefreshGeneration, setContractRefreshGeneration] = useState(0);
  const requestGeneration = useRef(0);
  const journeyController = useRef<AbortController | undefined>(undefined);
  const signingOut = useRef(false);
  const activeTravelScope = useRef<WorldTravelScope | undefined>(undefined);
  const pendingTravelAttempt = useRef<WorldTravelAttempt | undefined>(undefined);
  const pendingFreeMovementAttempt = useRef<FreeMovementAttempt | undefined>(undefined);
  const travelBusy = useRef(false);
  const travelGeneration = useRef(0);
  const travelController = useRef<AbortController | undefined>(undefined);
  const [travelBusyState, setTravelBusyState] = useState(false);
  const [equipBusy, setEquipBusy] = useState(false);
  const [equipMessage, setEquipMessage] = useState<string | undefined>(undefined);
  const pendingCreateAttempt = useRef<CreateCompanyRequestDto | undefined>(undefined);
  const pendingCreateAccountId = useRef<string | undefined>(undefined);
  const combatLabEnabled = import.meta.env.DEV && import.meta.env['VITE_COMBAT_LAB'] === '1';
  const isCombatLab =
    combatLabEnabled && typeof window !== 'undefined' && window.location.pathname === '/combat-lab';

  const restoreJourney = useCallback(async (signal?: AbortSignal, retryCompanyMismatch = true) => {
    if (signingOut.current) return;
    journeyController.current?.abort();
    const controller = new AbortController();
    journeyController.current = controller;
    const abortFromCaller = () => controller.abort();
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener('abort', abortFromCaller, { once: true });
    const generation = ++requestGeneration.current;
    const publish = (state: JourneyState) => {
      if (requestGeneration.current === generation) setJourney(state);
    };
    publish({ status: 'checking-session' });
    try {
      const sessionResponse = await fetch(`${apiBaseUrl}/auth/session`, {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (
        requestGeneration.current !== generation ||
        signingOut.current ||
        controller.signal.aborted
      )
        return;
      if (sessionResponse.status === 401) {
        travelGeneration.current += 1;
        travelController.current?.abort();
        travelBusy.current = false;
        setTravelBusyState(false);
        if (activeTravelScope.current) clearStoredTravelReturnWindow(activeTravelScope.current);
        activeTravelScope.current = undefined;
        pendingTravelAttempt.current = undefined;
        publish({ status: 'signed-out' });
        return;
      }
      if (!sessionResponse.ok) throw responseError(sessionResponse);
      const session = readSession(await sessionResponse.json());
      if (
        requestGeneration.current !== generation ||
        signingOut.current ||
        controller.signal.aborted
      )
        return;
      if (session === undefined) throw new Error('Сервер вернул неполные данные учётной записи.');
      const priorScope = activeTravelScope.current;
      if (priorScope && priorScope.accountId !== session.accountId) {
        travelGeneration.current += 1;
        travelController.current?.abort();
        travelController.current = undefined;
        travelBusy.current = false;
        setTravelBusyState(false);
        clearStoredTravelReturnWindow(priorScope);
        activeTravelScope.current = undefined;
        pendingTravelAttempt.current = undefined;
      }
      if (
        requestGeneration.current === generation &&
        pendingCreateAttempt.current !== undefined &&
        pendingCreateAccountId.current !== session.accountId
      ) {
        pendingCreateAttempt.current = undefined;
        pendingCreateAccountId.current = undefined;
        setHasPendingCreateAttempt(false);
      }

      publish({ status: 'loading-company', session });
      const companyResponse = await fetch(`${apiBaseUrl}/company`, {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (
        requestGeneration.current !== generation ||
        signingOut.current ||
        controller.signal.aborted
      )
        return;
      if (companyResponse.status === 401) {
        travelGeneration.current += 1;
        travelController.current?.abort();
        travelBusy.current = false;
        setTravelBusyState(false);
        if (activeTravelScope.current) clearStoredTravelReturnWindow(activeTravelScope.current);
        activeTravelScope.current = undefined;
        pendingTravelAttempt.current = undefined;
        publish({ status: 'signed-out' });
        return;
      }
      if (!companyResponse.ok) throw responseError(companyResponse);
      const companyBody: unknown = await companyResponse.json();
      const company = readCompany(companyBody);
      const holdings = readHoldings(companyBody);
      if (
        requestGeneration.current !== generation ||
        signingOut.current ||
        controller.signal.aborted
      )
        return;
      if (company === undefined) throw new Error('Не удалось безопасно прочитать данные компании.');
      if (company !== null) {
        const scope = { accountId: session.accountId, companyId: company.companyId };
        const previousScope = activeTravelScope.current;
        if (
          previousScope &&
          (previousScope.accountId !== scope.accountId ||
            previousScope.companyId !== scope.companyId)
        ) {
          travelGeneration.current += 1;
          travelController.current?.abort();
          travelController.current = undefined;
          travelBusy.current = false;
          setTravelBusyState(false);
          clearStoredTravelReturnWindow(previousScope);
          pendingTravelAttempt.current = undefined;
          pendingFreeMovementAttempt.current = undefined;
        }
        activeTravelScope.current = scope;
        const worldResponse = await fetch(`${apiBaseUrl}/world/party`, {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: worldPartyReadHeaders(scope),
          signal: controller.signal,
        });
        if (
          requestGeneration.current !== generation ||
          signingOut.current ||
          controller.signal.aborted
        )
          return;
        if (worldResponse.status === 401) {
          travelGeneration.current += 1;
          travelController.current?.abort();
          travelBusy.current = false;
          setTravelBusyState(false);
          clearStoredTravelReturnWindow(scope);
          activeTravelScope.current = undefined;
          pendingTravelAttempt.current = undefined;
          pendingFreeMovementAttempt.current = undefined;
          publish({ status: 'signed-out' });
          return;
        }
        if (worldResponse.status === 403) {
          if (retryCompanyMismatch) {
            await restoreJourney(signal, false);
            return;
          }
          throw new Error('Сеанс или выбранная компания изменились. Повторите загрузку записи.');
        }
        if (!worldResponse.ok) throw responseError(worldResponse);
        const world = readWorldPartyResponse(await worldResponse.json());
        if (
          requestGeneration.current !== generation ||
          signingOut.current ||
          controller.signal.aborted
        )
          return;
        if (world === undefined) throw new Error('Не удалось безопасно прочитать состояние мира.');
        const roadInTransit =
          world.schemaVersion === 1
            ? world.route !== null
            : world.execution !== null && world.execution.phase !== 'COMPLETE';
        let freeMovement: WorldFreeMovementResponseDto | null = null;
        if (!roadInTransit && world.party?.movementVersion === 1) {
          const movementResponse = await fetch(
            `${apiBaseUrl}/world/free-movement?schemaVersion=1`,
            {
              credentials: 'same-origin',
              cache: 'no-store',
              headers: worldPartyReadHeaders(scope),
              signal: controller.signal,
            },
          );
          if (
            requestGeneration.current !== generation ||
            signingOut.current ||
            controller.signal.aborted
          )
            return;
          if (movementResponse.status === 401) {
            activeTravelScope.current = undefined;
            pendingTravelAttempt.current = undefined;
            pendingFreeMovementAttempt.current = undefined;
            publish({ status: 'signed-out' });
            return;
          }
          if (movementResponse.status !== 409) {
            if (movementResponse.status === 403) {
              if (retryCompanyMismatch) {
                await restoreJourney(signal, false);
                return;
              }
              throw new Error(
                'Сеанс или выбранная компания изменились. Повторите загрузку записи.',
              );
            }
            if (!movementResponse.ok) throw responseError(movementResponse);
            freeMovement = readFreeMovementResponse(await movementResponse.json()) ?? null;
            if (!freeMovement)
              throw new Error('Не удалось безопасно прочитать свободное движение.');
          }
        }
        const storage = travelStorage();
        const storedAttempt = storage
          ? readWorldTravelAttempt(storage, scope)
          : { kind: 'UNAVAILABLE' as const };
        pendingTravelAttempt.current =
          storedAttempt.kind === 'FOUND' ? storedAttempt.attempt : undefined;
        const freeMovementAttempt = storage ? readFreeMovementAttempt(storage, scope) : undefined;
        pendingFreeMovementAttempt.current = freeMovementAttempt;
        const returnWindowOpen = storage
          ? isWorldTravelReturnWindowOpen(storage, scope, world)
          : false;
        publish({
          status: 'company-ready',
          session,
          company,
          holdings,
          world,
          freeMovement,
          returnWindowOpen,
          travelAttemptPending: storedAttempt.kind === 'FOUND',
          freeMovementAttemptPending: freeMovementAttempt !== undefined,
          ...(storedAttempt.kind === 'INVALID'
            ? {
                travelMessage:
                  'Сохранённый запрос повреждён и был удалён. Обновите состояние перед новым действием.',
              }
            : storedAttempt.kind === 'UNAVAILABLE'
              ? {
                  travelMessage: 'Локальное хранилище недоступно; новое путешествие не отправлено.',
                }
              : {}),
        });
        return;
      }
      if (activeTravelScope.current) {
        travelGeneration.current += 1;
        travelController.current?.abort();
        travelBusy.current = false;
        setTravelBusyState(false);
        clearStoredTravelReturnWindow(activeTravelScope.current);
        activeTravelScope.current = undefined;
        pendingTravelAttempt.current = undefined;
      }

      publish({ status: 'loading-opening', session });
      const openingResponse = await fetch(`${apiBaseUrl}/company/opening-options`, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      if (openingResponse.status === 401) {
        publish({ status: 'signed-out' });
        return;
      }
      if (!openingResponse.ok) throw responseError(openingResponse);
      const opening = readOpening(await openingResponse.json());
      if (opening === undefined) throw new Error('Сервер вернул неполные варианты начала.');
      publish({ status: 'company-opening', session, opening });
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : 'Не удалось связаться с сервером.';
      publish({ status: 'error', message, retry: () => void restoreJourney() });
    } finally {
      signal?.removeEventListener('abort', abortFromCaller);
      if (journeyController.current === controller) journeyController.current = undefined;
    }
  }, []);

  const submitCompanyCreateAttempt = useCallback(
    async (request: CreateCompanyRequestDto, accountId: string) => {
      const generation = requestGeneration.current;
      const response = await fetch(`${apiBaseUrl}/company/commands`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (response.status === 401)
        throw new Error('Сеанс завершился. Войдите снова, чтобы открыть компанию.');
      if (!response.ok) {
        let code: unknown;
        try {
          const body: unknown = await response.json();
          if (isObject(body)) code = body['code'];
        } catch {
          // Use the safe generic response for non-JSON errors.
        }
        if (response.status === 400 || response.status === 409) {
          if (
            pendingCreateAttempt.current === request &&
            pendingCreateAccountId.current === accountId
          ) {
            pendingCreateAttempt.current = undefined;
            pendingCreateAccountId.current = undefined;
            setHasPendingCreateAttempt(false);
          }
          if (requestGeneration.current === generation && !signingOut.current)
            await restoreJourney();
        }
        throw new Error(rejectionMessage(code));
      }
      const accepted: unknown = await response.json();
      if (
        !isObject(accepted) ||
        accepted['commandId'] !== request.commandId ||
        accepted['ok'] !== true ||
        typeof accepted['publicRevision'] !== 'string'
      ) {
        throw new Error('Сервер вернул неполное подтверждение сохранения компании.');
      }
      if (
        pendingCreateAttempt.current === request &&
        pendingCreateAccountId.current === accountId
      ) {
        pendingCreateAttempt.current = undefined;
        pendingCreateAccountId.current = undefined;
        setHasPendingCreateAttempt(false);
      }
      if (requestGeneration.current !== generation || signingOut.current) return;
      await restoreJourney();
    },
    [restoreJourney],
  );

  const createCompany = useCallback(
    async (
      opening: CompanyOpeningOptionsResponseDto['opening'],
      input: {
        readonly name: string;
        readonly leaderName: string;
        readonly selectedCandidateIds: string[];
      },
      accountId: string,
    ) => {
      if (
        pendingCreateAttempt.current !== undefined &&
        pendingCreateAccountId.current !== accountId
      ) {
        pendingCreateAttempt.current = undefined;
        pendingCreateAccountId.current = undefined;
        setHasPendingCreateAttempt(false);
      }
      const request = getOrCreateCompanyCreateAttempt(pendingCreateAttempt, () => {
        const payload: CreateCompanyPayloadDto = {
          originId: opening.origin.id,
          cultureId: opening.culture.id,
          homelandId: opening.homeland.id,
          familyStoryId: opening.familyStory.id,
          leaderInput: { ...opening.leaderDefaults, birthName: input.leaderName.trim() },
          candidateSetId: opening.candidateSetId,
          selectedCandidateIds: [...input.selectedCandidateIds],
          name: input.name.trim(),
          bannerId: opening.bannerId,
        };
        return {
          schemaVersion: 1,
          commandId: crypto.randomUUID(),
          type: 'CreateCompany',
          payload,
        };
      });
      pendingCreateAccountId.current = accountId;
      setHasPendingCreateAttempt(true);
      await submitCompanyCreateAttempt(request, accountId);
    },
    [submitCompanyCreateAttempt],
  );

  const retryPendingCompanyCreate = useCallback(
    async (accountId: string) => {
      const request = pendingCreateAttempt.current;
      if (request === undefined) return;
      if (pendingCreateAccountId.current !== accountId) {
        pendingCreateAttempt.current = undefined;
        pendingCreateAccountId.current = undefined;
        setHasPendingCreateAttempt(false);
        return;
      }
      await submitCompanyCreateAttempt(request, accountId);
    },
    [submitCompanyCreateAttempt],
  );

  const runWorldTravelAttempt = useCallback(
    async (
      attempt: WorldTravelAttempt,
      current: WorldPartyReadResponseDto,
      scope: WorldTravelScope,
    ) => {
      if (
        travelBusy.current ||
        activeTravelScope.current?.accountId !== scope.accountId ||
        activeTravelScope.current.companyId !== scope.companyId
      )
        return;
      const controller = new AbortController();
      const generation = ++travelGeneration.current;
      travelController.current = controller;
      travelBusy.current = true;
      setTravelBusyState(true);
      const operationCurrent = () =>
        isWorldTravelOperationCurrent({
          operationGeneration: generation,
          currentGeneration: travelGeneration.current,
          operationScope: scope,
          currentScope: activeTravelScope.current ?? { accountId: '', companyId: '' },
          signal: controller.signal,
        });
      const setTravelState = (
        update: (state: Extract<JourneyState, { status: 'company-ready' }>) => JourneyState,
      ) => {
        if (!operationCurrent()) return;
        setJourney((state) =>
          state.status === 'company-ready' &&
          state.session.accountId === scope.accountId &&
          state.company.companyId === scope.companyId
            ? update(state)
            : state,
        );
      };
      try {
        const storage = travelStorage();
        if (!storage) throw new Error('Локальное хранилище недоступно; запрос не отправлен.');
        saveWorldTravelAttempt(storage, attempt);
        pendingTravelAttempt.current = attempt;
        setTravelState((state) => {
          const { travelMessage: _message, ...withoutMessage } = state;
          return { ...withoutMessage, travelAttemptPending: true };
        });
        const result = await executeWorldTravelAttempt({
          attempt,
          signal: controller.signal,
          isCurrent: operationCurrent,
          transport: {
            post: async (body, signal, persistedAttempt) => {
              const response = await fetch(`${apiBaseUrl}/world/travel`, {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: {
                  'content-type': 'application/json',
                  ...worldPartyReadHeaders(persistedAttempt.scope),
                },
                body,
                signal,
              });
              let responseBody: unknown = null;
              try {
                responseBody = await response.json();
              } catch {
                // A malformed or empty body remains an unknown outcome in the classifier.
              }
              return { status: response.status, body: responseBody };
            },
            refresh: async (signal) => {
              const response = await fetch(`${apiBaseUrl}/world/party`, {
                credentials: 'same-origin',
                cache: 'no-store',
                headers: worldPartyReadHeaders(scope),
                signal,
              });
              if (response.status === 401) throw new WorldTravelRefreshError('UNAUTHENTICATED');
              if (response.status === 403) throw new WorldTravelRefreshError('FORBIDDEN');
              if (!response.ok) throw responseError(response);
              const refreshed = readWorldPartyResponse(await response.json());
              if (refreshed === undefined)
                throw new Error('Не удалось прочитать обновлённое состояние мира.');
              return refreshed;
            },
          },
        });
        if (!operationCurrent() || result.kind === 'CANCELLED') return;
        if (result.kind === 'FORBIDDEN') {
          clearStoredTravelReturnWindow(scope);
          pendingTravelAttempt.current = undefined;
          activeTravelScope.current = undefined;
          setJourney({ status: 'checking-session' });
          void restoreJourney();
          return;
        }
        if (result.kind === 'UNAUTHENTICATED') {
          clearStoredTravelReturnWindow(scope);
          pendingTravelAttempt.current = undefined;
          activeTravelScope.current = undefined;
          setJourney({
            status: 'signed-out',
            message:
              'Запрос путешествия сохранён для исходной учётной записи. Войдите в неё, чтобы вручную повторить запрос и сверить результат.',
          });
          return;
        }
        if (result.kind === 'UNKNOWN') {
          setTravelState((state) => ({
            ...state,
            travelAttemptPending: true,
            travelMessage:
              'Результат запроса неизвестен. Сохранённое тело можно отправить повторно.',
          }));
          return;
        }
        if (result.kind === 'ACCEPTED_UNREFRESHED' || result.kind === 'REJECTED_UNREFRESHED') {
          setTravelState((state) => ({
            ...state,
            travelAttemptPending: true,
            travelMessage:
              'Сервер подтвердил ответ, но обновить состояние пока не удалось. Повторите запрос для сверки.',
          }));
          return;
        }

        clearWorldTravelAttempt(storage, scope);
        pendingTravelAttempt.current = undefined;
        if (attempt.request.schemaVersion === 2 || attempt.request.action.kind === 'DEPART') {
          clearWorldTravelReturnWindow(storage, scope);
        } else {
          clearWorldTravelReturnWindow(storage, scope);
          if (result.kind === 'ACCEPTED') {
            const returnWindow = onTimeWorldTravelReturnWindow(
              attempt,
              result.receipt,
              result.current,
            );
            if (returnWindow) saveWorldTravelReturnWindow(storage, returnWindow);
          }
        }
        const returnWindowOpen = isWorldTravelReturnWindowOpen(storage, scope, result.current);
        setTravelState((state) => {
          const { travelMessage: _message, ...withoutMessage } = state;
          return {
            ...withoutMessage,
            world: result.current,
            returnWindowOpen,
            travelAttemptPending: false,
            ...(result.kind === 'REJECTED'
              ? { travelMessage: worldTravelRejectionMessage(result.rejection.code) }
              : {}),
          };
        });
      } catch (error) {
        if (operationCurrent()) {
          setJourney((state) =>
            state.status === 'company-ready' &&
            state.session.accountId === scope.accountId &&
            state.company.companyId === scope.companyId
              ? {
                  ...state,
                  travelMessage:
                    error instanceof Error
                      ? error.message
                      : 'Не удалось выполнить запрос путешествия.',
                }
              : state,
          );
        }
      } finally {
        if (generation === travelGeneration.current) {
          travelBusy.current = false;
          travelController.current = undefined;
          setTravelBusyState(false);
        }
      }
    },
    [restoreJourney],
  );

  const refreshWorldParty = useCallback(
    async (scope: WorldTravelScope) => {
      if (
        travelBusy.current ||
        pendingTravelAttempt.current ||
        activeTravelScope.current?.accountId !== scope.accountId ||
        activeTravelScope.current.companyId !== scope.companyId
      )
        return undefined;
      const controller = new AbortController();
      const generation = ++travelGeneration.current;
      travelController.current = controller;
      travelBusy.current = true;
      setTravelBusyState(true);
      const operationCurrent = () =>
        isWorldTravelOperationCurrent({
          operationGeneration: generation,
          currentGeneration: travelGeneration.current,
          operationScope: scope,
          currentScope: activeTravelScope.current ?? { accountId: '', companyId: '' },
          signal: controller.signal,
        });
      try {
        const response = await fetch(`${apiBaseUrl}/world/party`, {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: worldPartyReadHeaders(scope),
          signal: controller.signal,
        });
        if (!operationCurrent()) return undefined;
        if (response.status === 401) {
          clearStoredTravelReturnWindow(scope);
          pendingTravelAttempt.current = undefined;
          activeTravelScope.current = undefined;
          setJourney({ status: 'signed-out' });
          return undefined;
        }
        if (response.status === 403) throw new WorldTravelRefreshError('FORBIDDEN');
        if (!response.ok) throw responseError(response);
        const current = readWorldPartyResponse(await response.json());
        if (!operationCurrent()) return undefined;
        if (current === undefined) throw new Error('Не удалось прочитать текущее состояние мира.');
        const storage = travelStorage();
        const returnWindowOpen = storage
          ? isWorldTravelReturnWindowOpen(storage, scope, current)
          : false;
        setJourney((state) => {
          if (
            state.status !== 'company-ready' ||
            state.session.accountId !== scope.accountId ||
            state.company.companyId !== scope.companyId
          )
            return state;
          const { travelMessage: _message, ...withoutMessage } = state;
          return { ...withoutMessage, world: current, returnWindowOpen };
        });
        return current;
      } catch (error) {
        if (operationCurrent()) {
          if (error instanceof WorldTravelRefreshError && error.kind === 'FORBIDDEN') {
            clearStoredTravelReturnWindow(scope);
            pendingTravelAttempt.current = undefined;
            activeTravelScope.current = undefined;
            setJourney({ status: 'checking-session' });
            void restoreJourney();
            return undefined;
          }
          setJourney((state) =>
            state.status === 'company-ready' &&
            state.session.accountId === scope.accountId &&
            state.company.companyId === scope.companyId
              ? {
                  ...state,
                  travelMessage:
                    error instanceof WorldTravelRefreshError
                      ? 'Не удалось подтвердить доступ к партии. Обновите сеанс.'
                      : error instanceof Error
                        ? error.message
                        : 'Не удалось обновить состояние мира.',
                }
              : state,
          );
        }
        return undefined;
      } finally {
        if (generation === travelGeneration.current) {
          travelBusy.current = false;
          travelController.current = undefined;
          setTravelBusyState(false);
        }
      }
    },
    [restoreJourney],
  );

  const refreshFreeMovement = useCallback(async (scope: FreeMovementScope) => {
    if (
      travelBusy.current ||
      activeTravelScope.current?.accountId !== scope.accountId ||
      activeTravelScope.current.companyId !== scope.companyId
    )
      return undefined;
    const controller = new AbortController();
    const generation = ++travelGeneration.current;
    travelController.current = controller;
    travelBusy.current = true;
    setTravelBusyState(true);
    const operationCurrent = () =>
      isWorldTravelOperationCurrent({
        operationGeneration: generation,
        currentGeneration: travelGeneration.current,
        operationScope: scope,
        currentScope: activeTravelScope.current ?? { accountId: '', companyId: '' },
        signal: controller.signal,
      });
    try {
      const response = await fetch(`${apiBaseUrl}/world/free-movement?schemaVersion=1`, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: worldPartyReadHeaders(scope),
        signal: controller.signal,
      });
      if (!operationCurrent()) return undefined;
      if (response.status === 401) {
        activeTravelScope.current = undefined;
        pendingFreeMovementAttempt.current = undefined;
        setJourney({ status: 'signed-out' });
        return undefined;
      }
      if (!response.ok) {
        if (response.status === 403) throw new Error('Компания изменилась. Перезагрузите сеанс.');
        if (response.status === 409) return null;
        throw responseError(response);
      }
      const current = readFreeMovementResponse(await response.json());
      if (!current) throw new Error('Не удалось прочитать положение отряда.');
      if (!operationCurrent()) return undefined;
      setJourney((state) =>
        state.status === 'company-ready' &&
        state.session.accountId === scope.accountId &&
        state.company.companyId === scope.companyId
          ? { ...state, freeMovement: current, freeMovementMessage: undefined }
          : state,
      );
      return current;
    } catch (error) {
      if (operationCurrent())
        setJourney((state) =>
          state.status === 'company-ready' && state.company.companyId === scope.companyId
            ? {
                ...state,
                freeMovementMessage:
                  error instanceof Error ? error.message : 'Не удалось обновить карту.',
              }
            : state,
        );
      return undefined;
    } finally {
      if (generation === travelGeneration.current) {
        travelBusy.current = false;
        travelController.current = undefined;
        setTravelBusyState(false);
      }
    }
  }, []);

  const runFreeMovementAttempt = useCallback(async (attempt: FreeMovementAttempt) => {
    const { scope } = attempt;
    if (
      travelBusy.current ||
      activeTravelScope.current?.accountId !== scope.accountId ||
      activeTravelScope.current.companyId !== scope.companyId
    )
      return;
    const storage = travelStorage();
    if (!storage) {
      setJourney((state) =>
        state.status === 'company-ready'
          ? {
              ...state,
              freeMovementMessage: 'Локальное хранилище недоступно; запрос не отправлен.',
            }
          : state,
      );
      return;
    }
    const controller = new AbortController();
    const generation = ++travelGeneration.current;
    travelController.current = controller;
    travelBusy.current = true;
    setTravelBusyState(true);
    const operationCurrent = () =>
      isWorldTravelOperationCurrent({
        operationGeneration: generation,
        currentGeneration: travelGeneration.current,
        operationScope: scope,
        currentScope: activeTravelScope.current ?? { accountId: '', companyId: '' },
        signal: controller.signal,
      });
    const setMessage = (message: string) => {
      if (!operationCurrent()) return;
      setJourney((state) =>
        state.status === 'company-ready' && state.company.companyId === scope.companyId
          ? { ...state, freeMovementMessage: message, freeMovementAttemptPending: true }
          : state,
      );
    };
    try {
      saveFreeMovementAttempt(storage, attempt);
      pendingFreeMovementAttempt.current = attempt;
      setJourney((state) =>
        state.status === 'company-ready' && state.company.companyId === scope.companyId
          ? { ...state, freeMovementAttemptPending: true, freeMovementMessage: undefined }
          : state,
      );
      let response: Response;
      try {
        response = await fetch(`${apiBaseUrl}/world/free-movement?schemaVersion=1`, {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            'content-type': 'application/json',
            ...worldPartyReadHeaders(scope),
          },
          body: JSON.stringify(attempt.request),
          signal: controller.signal,
        });
      } catch {
        if (operationCurrent())
          setMessage('Результат приказа неизвестен. Повтор отправит тот же приказ.');
        return;
      }
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      if (!operationCurrent()) return;
      if (response.status === 401) {
        activeTravelScope.current = undefined;
        pendingFreeMovementAttempt.current = undefined;
        setJourney({ status: 'signed-out' });
        return;
      }
      const result = classifyFreeMovementPost(response.status, body, attempt.request.commandId);
      if (result.kind === 'UNKNOWN') {
        setMessage('Результат приказа неизвестен. Повтор отправит тот же приказ.');
        return;
      }
      const refreshedResponse = await fetch(`${apiBaseUrl}/world/free-movement?schemaVersion=1`, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: worldPartyReadHeaders(scope),
        signal: controller.signal,
      });
      if (!operationCurrent()) return;
      if (!refreshedResponse.ok) {
        setMessage('Приказ получен, но положение не обновилось. Повторите сверку.');
        return;
      }
      const current = readFreeMovementResponse(await refreshedResponse.json());
      if (!current) {
        setMessage('Ответ о положении повреждён. Повторите тот же приказ для сверки.');
        return;
      }
      const worldResponse = await fetch(`${apiBaseUrl}/world/party`, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: worldPartyReadHeaders(scope),
        signal: controller.signal,
      });
      if (!operationCurrent()) return;
      if (!worldResponse.ok) {
        setMessage(
          'Положение обновилось, но доступ к месту не сверился. Повторите ту же проверку.',
        );
        return;
      }
      const world = readWorldPartyResponse(await worldResponse.json());
      if (!world) {
        setMessage('Ответ карты повреждён. Повторите тот же приказ для сверки.');
        return;
      }
      clearFreeMovementAttempt(storage, scope);
      pendingFreeMovementAttempt.current = undefined;
      setJourney((state) =>
        state.status === 'company-ready' && state.company.companyId === scope.companyId
          ? {
              ...state,
              world,
              freeMovement: current,
              freeMovementAttemptPending: false,
              ...(result.kind === 'REJECTED'
                ? { freeMovementMessage: freeMovementRejectionMessage(result.code) }
                : { freeMovementMessage: undefined }),
            }
          : state,
      );
    } catch (error) {
      if (operationCurrent())
        setMessage(
          error instanceof Error ? error.message : 'Не удалось выполнить приказ движения.',
        );
    } finally {
      if (generation === travelGeneration.current) {
        travelBusy.current = false;
        travelController.current = undefined;
        setTravelBusyState(false);
      }
    }
  }, []);

  const startFreeMovement = useCallback(
    (
      action: FreeMovementAction,
      current: WorldFreeMovementResponseDto | null,
      scope: FreeMovementScope,
    ) => {
      if (!current || travelBusy.current || pendingFreeMovementAttempt.current) return;
      try {
        const attempt = createFreeMovementAttempt({
          scope,
          current,
          commandId: crypto.randomUUID(),
          action,
        });
        void runFreeMovementAttempt(attempt);
      } catch (error) {
        setJourney((state) =>
          state.status === 'company-ready'
            ? {
                ...state,
                freeMovementMessage:
                  error instanceof Error ? error.message : 'Не удалось подготовить приказ.',
              }
            : state,
        );
      }
    },
    [runFreeMovementAttempt],
  );

  const retryFreeMovement = useCallback(
    (scope: FreeMovementScope) => {
      const attempt =
        pendingFreeMovementAttempt.current ??
        (() => {
          const storage = travelStorage();
          return storage ? readFreeMovementAttempt(storage, scope) : undefined;
        })();
      if (
        !attempt ||
        attempt.scope.accountId !== scope.accountId ||
        attempt.scope.companyId !== scope.companyId
      )
        return;
      void runFreeMovementAttempt(attempt);
    },
    [runFreeMovementAttempt],
  );

  function freeMovementRejectionMessage(code: string): string {
    if (code === 'STALE_REVISION' || code === 'STALE_ROUTE_EPOCH')
      return 'Карта изменилась. Обновите положение и выберите путь снова.';
    if (code === 'INSUFFICIENT_ITEMS') return 'Пайков не хватит на этот путь.';
    if (code === 'INVALID_ROUTE') return 'Путь недоступен или отряд не может выступить.';
    return 'Сервер отклонил приказ движения.';
  }

  const startWorldTravel = useCallback(
    (action: WorldTravelAction, current: WorldPartyReadResponseDto, scope: WorldTravelScope) => {
      if (travelBusy.current || pendingTravelAttempt.current) return;
      const storage = travelStorage();
      if (!storage) {
        setJourney((state) =>
          state.status === 'company-ready'
            ? { ...state, travelMessage: 'Локальное хранилище недоступно; запрос не отправлен.' }
            : state,
        );
        return;
      }
      const requiresFreshState =
        action.kind === 'ARRIVE' ||
        (action.kind === 'DEPART' && action.departure.purpose === 'RETURN');
      if (requiresFreshState) {
        void (async () => {
          const latest = await refreshWorldParty(scope);
          if (!latest) return;
          if (
            action.kind === 'ARRIVE' &&
            (latest.schemaVersion !== 1 || latest.route?.canArrive !== true)
          ) {
            setJourney((state) =>
              state.status === 'company-ready'
                ? { ...state, travelMessage: 'Прибытие пока не разрешено сервером.' }
                : state,
            );
            return;
          }
          try {
            const attempt = createWorldTravelAttempt({
              scope,
              current: latest,
              commandId: crypto.randomUUID(),
              action,
            });
            runWorldTravelAttempt(attempt, latest, scope);
          } catch (error) {
            setJourney((state) =>
              state.status === 'company-ready'
                ? {
                    ...state,
                    travelMessage:
                      error instanceof Error ? error.message : 'Не удалось подготовить запрос.',
                  }
                : state,
            );
          }
        })();
        return;
      }
      try {
        const attempt = createWorldTravelAttempt({
          scope,
          current,
          commandId: crypto.randomUUID(),
          action,
        });
        runWorldTravelAttempt(attempt, current, scope);
      } catch (error) {
        setJourney((state) =>
          state.status === 'company-ready'
            ? {
                ...state,
                travelMessage:
                  error instanceof Error ? error.message : 'Не удалось подготовить запрос.',
              }
            : state,
        );
      }
    },
    [runWorldTravelAttempt, refreshWorldParty],
  );

  const retryWorldTravel = useCallback(
    (current: WorldPartyReadResponseDto, scope: WorldTravelScope) => {
      const attempt = pendingTravelAttempt.current;
      if (
        !attempt ||
        attempt.scope.accountId !== scope.accountId ||
        attempt.scope.companyId !== scope.companyId
      )
        return;
      runWorldTravelAttempt(attempt, current, scope);
    },
    [runWorldTravelAttempt],
  );

  useEffect(() => {
    const controller = new AbortController();
    void restoreJourney(controller.signal);
    return () => controller.abort();
  }, [restoreJourney]);

  const readyScope =
    journey.status === 'company-ready'
      ? `${journey.session.accountId}\u0000${journey.company.companyId}`
      : undefined;
  const refreshWorldForShell = useCallback(() => {
    if (!readyScope) return;
    const [accountId, companyId] = readyScope.split('\u0000') as [string, string];
    void refreshWorldParty({ accountId, companyId });
  }, [readyScope, refreshWorldParty]);
  const refreshFreeMovementForShell = useCallback(() => {
    if (!readyScope) return;
    const [accountId, companyId] = readyScope.split('\u0000') as [string, string];
    void refreshFreeMovement({ accountId, companyId });
  }, [readyScope, refreshFreeMovement]);

  // Money, items and bodies change with world events (food on the road, battle, payout).
  const worldRevision =
    journey.status === 'company-ready' ? journey.world.publicRevision : undefined;
  useEffect(() => {
    if (!readyScope || worldRevision === undefined) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/company`, {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;
        const body: unknown = await response.json();
        const company = readCompany(body);
        if (!company || controller.signal.aborted) return;
        const holdings = readHoldings(body);
        setJourney((state) =>
          state.status === 'company-ready' && state.company.companyId === company.companyId
            ? { ...state, company, holdings }
            : state,
        );
      } catch {
        // Keep the last company view; the next world change retries.
      }
    })();
    return () => controller.abort();
  }, [readyScope, worldRevision]);

  useEffect(() => {
    // The OIDC callback lands on /auth/session; the game lives at the root.
    if (window.location.pathname === '/auth/session') window.history.replaceState(null, '', '/');
  }, []);

  const equipItem = useCallback(
    async (
      scope: WorldTravelScope,
      expectedPublicRevision: string,
      characterId: string,
      item: CompanyHoldingsDto['items'][number],
    ) => {
      if (item.slot === null) return;
      setEquipBusy(true);
      setEquipMessage(undefined);
      try {
        const response = await fetch(`${apiBaseUrl}/company/commands`, {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            'content-type': 'application/json',
            [WORLD_EXPECTED_COMPANY_ID_HEADER]: scope.companyId,
          },
          body: JSON.stringify({
            schemaVersion: 2,
            commandId: crypto.randomUUID(),
            expectedPublicRevision,
            type: 'EquipItem',
            payload: { characterId, itemId: item.itemId, slotId: item.slot },
          }),
        });
        if (response.status === 401) {
          void restoreJourney();
          return;
        }
        if (!response.ok) {
          let code: unknown;
          try {
            const body: unknown = await response.json();
            if (isObject(body)) code = body['code'];
          } catch {
            // A non-JSON failure keeps the generic message.
          }
          setEquipMessage(
            code === 'STALE_REVISION'
              ? 'Состояние отряда изменилось. Данные обновлены — повторите.'
              : code === 'UNSUPPORTED_ACTION' || code === 'CONTACT_OR_ACCESS_REQUIRED'
                ? 'Сейчас снарядиться нельзя: отряд в пути, в бою или вещь недоступна.'
                : 'Сервер не принял снаряжение.',
          );
        }
        await refreshWorldParty(scope);
      } catch {
        setEquipMessage('Нет связи с сервером. Проверьте снаряжение после обновления.');
      } finally {
        setEquipBusy(false);
      }
    },
    [refreshWorldParty, restoreJourney],
  );

  const toggleCamp = useCallback(
    async (scope: WorldTravelScope, expectedPublicRevision: string, pitch: boolean) => {
      setEquipBusy(true);
      setEquipMessage(undefined);
      try {
        const response = await fetch(`${apiBaseUrl}/company/commands`, {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            'content-type': 'application/json',
            [WORLD_EXPECTED_COMPANY_ID_HEADER]: scope.companyId,
          },
          body: JSON.stringify({
            schemaVersion: 2,
            commandId: crypto.randomUUID(),
            expectedPublicRevision,
            type: pitch ? 'BeginFieldCamp' : 'EndFieldCamp',
            payload: {},
          }),
        });
        if (response.status === 401) {
          void restoreJourney();
          return;
        }
        if (!response.ok)
          setEquipMessage(
            pitch
              ? 'Лагерь здесь не разбить: отряд в пути, рядом враги или лагерь уже стоит.'
              : 'Лагерь не удалось свернуть. Данные обновлены — повторите.',
          );
        await refreshWorldParty(scope);
      } catch {
        setEquipMessage('Нет связи с сервером. Проверьте лагерь после обновления.');
      } finally {
        setEquipBusy(false);
      }
    },
    [refreshWorldParty, restoreJourney],
  );

  const signOut = async () => {
    if (signingOut.current) return;
    signingOut.current = true;
    const generation = ++requestGeneration.current;
    journeyController.current?.abort();
    journeyController.current = undefined;
    travelGeneration.current += 1;
    travelController.current?.abort();
    travelController.current = undefined;
    travelBusy.current = false;
    setTravelBusyState(false);
    if (activeTravelScope.current) clearStoredTravelReturnWindow(activeTravelScope.current);
    activeTravelScope.current = undefined;
    pendingTravelAttempt.current = undefined;
    setJourney({ status: 'signing-out' });
    try {
      const response = await fetch(`${apiBaseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!response.ok) throw responseError(response);
      signingOut.current = false;
      if (requestGeneration.current === generation) setJourney({ status: 'signed-out' });
    } catch (error) {
      signingOut.current = false;
      const message = error instanceof Error ? error.message : 'Не удалось завершить сеанс.';
      if (requestGeneration.current === generation) {
        setJourney({ status: 'error', message, retry: () => void restoreJourney() });
      }
    }
  };

  if (isCombatLab) return <CombatLab />;
  const hasSession =
    journey.status === 'loading-company' ||
    journey.status === 'loading-opening' ||
    journey.status === 'company-opening' ||
    journey.status === 'company-ready';

  if (journey.status === 'company-ready') {
    const scope = { accountId: journey.session.accountId, companyId: journey.company.companyId };
    return (
      <GameShell
        company={journey.company}
        holdings={journey.holdings}
        world={journey.world}
        freeMovement={journey.freeMovement}
        freeMovementScope={scope}
        freeMovementPending={journey.freeMovementAttemptPending}
        {...(journey.freeMovementMessage === undefined
          ? {}
          : { freeMovementMessage: journey.freeMovementMessage })}
        travelBusy={travelBusyState}
        travelPending={journey.travelAttemptPending}
        returnWindowOpen={journey.returnWindowOpen}
        {...(journey.travelMessage === undefined ? {} : { travelMessage: journey.travelMessage })}
        onTravel={(action) => startWorldTravel(action, journey.world, scope)}
        onRetryTravel={() => retryWorldTravel(journey.world, scope)}
        onRefreshWorld={refreshWorldForShell}
        onRefreshFreeMovement={refreshFreeMovementForShell}
        onFreeMovement={(action) => startFreeMovement(action, journey.freeMovement, scope)}
        onRetryFreeMovement={() => retryFreeMovement(scope)}
        onSignOut={() => void signOut()}
        equipBusy={equipBusy}
        {...(equipMessage === undefined ? {} : { equipMessage })}
        onEquip={(characterId, item) =>
          void equipItem(scope, journey.world.publicRevision, characterId, item)
        }
        onToggleCamp={(pitch) => void toggleCamp(scope, journey.world.publicRevision, pitch)}
        placeSlot={(contractVisit) => (
          <>
            <ContractBoard
              {...contractVisit}
              siteId={journey.world.party?.location ?? null}
              refreshKey={contractRefreshGeneration}
              onUnauthorized={() => void restoreJourney()}
              onRewardPaid={refreshWorldForShell}
            />
            <FirstHunt
              {...contractVisit}
              scope={scope}
              location={journey.world.party?.location ?? null}
              onUnauthorized={() => void restoreJourney()}
              refreshKey={contractRefreshGeneration}
              onEncounterDiscovered={() => setEncounterGeneration((generation) => generation + 1)}
            />
            <HuntList
              {...contractVisit}
              scope={scope}
              location={journey.world.party?.location ?? null}
              refreshKey={contractRefreshGeneration}
              onUnauthorized={() => void restoreJourney()}
              onEncounterDiscovered={() => setEncounterGeneration((generation) => generation + 1)}
            />
          </>
        )}
        battleSlot={
          <Suspense
            key={`${scope.accountId}:${scope.companyId}:${encounterGeneration}`}
            fallback={<p className="state-note">Открываем сводку боя…</p>}
          >
            <EncounterPanel
              hideWhenIdle
              unitNames={Object.fromEntries(
                journey.company.characters.map((character) => [
                  character.characterId,
                  character.name,
                ]),
              )}
              scope={scope}
              onUnauthorized={() => void restoreJourney()}
              onTerminal={() => setContractRefreshGeneration((generation) => generation + 1)}
            />
          </Suspense>
        }
      />
    );
  }

  return (
    <main className="journey-shell">
      <header className="masthead">
        <a className="wordmark" href="/" aria-label="Warwrit home">
          <span className="sigil" aria-hidden="true">
            <span>W</span>
          </span>
          <span>Warwrit</span>
        </a>
        <span className="masthead-note">Компания хранит свою историю</span>
      </header>

      <section
        className="journey-card"
        aria-live="polite"
        aria-busy={
          journey.status === 'checking-session' ||
          journey.status === 'loading-company' ||
          journey.status === 'loading-opening' ||
          journey.status === 'signing-out'
        }
      >
        <div className="card-rule" aria-hidden="true" />
        {journey.status === 'checking-session' && (
          <JourneyMessage
            eyebrow="Возвращение на рубеж"
            title="Ищем вашу учётную запись"
            detail="Проверяем сеанс и затем запросим сохранённую компанию."
          />
        )}
        {journey.status === 'signed-out' && (
          <>
            <JourneyMessage
              eyebrow={journey.message ? 'Запрос сохранён' : 'Мир помнит'}
              title={
                journey.message ? 'Вернитесь в исходную учётную запись' : 'Начните путь компании'
              }
              detail={
                journey.message ??
                'Войдите через службу учётной записи. При следующем визите защищённый сеанс восстановит ваш вход.'
              }
            />
            <a className="primary-action" href={`${apiBaseUrl}/auth/login`}>
              Войти <span aria-hidden="true">↗</span>
            </a>
          </>
        )}
        {journey.status === 'signing-out' && (
          <JourneyMessage
            eyebrow="Завершение сеанса"
            title="Выходим из игры"
            detail="Дождитесь подтверждения сервера. Повторная загрузка временно отключена."
          />
        )}
        {journey.status === 'loading-company' && (
          <JourneyMessage
            eyebrow="Учётная запись восстановлена"
            title="Открываем книгу компании"
            detail="Запрашиваем сохранённую компанию с сервера."
          />
        )}
        {journey.status === 'loading-opening' && (
          <JourneyMessage
            eyebrow="Учётная запись восстановлена"
            title="Подбираем начало"
            detail="Запрашиваем проверенные сервером варианты для новой компании."
          />
        )}
        {journey.status === 'company-opening' && (
          <CompanyOpening
            opening={journey.opening}
            accountId={journey.session.accountId}
            onCreate={createCompany}
            onRetryPending={retryPendingCompanyCreate}
            pendingAttempt={hasPendingCreateAttempt}
          />
        )}
        {journey.status === 'error' && (
          <>
            <JourneyMessage
              eyebrow="Книга недоступна"
              title="Нет связи с сервером"
              detail={journey.message}
            />
            <button className="primary-action button-action" type="button" onClick={journey.retry}>
              Повторить проверку
            </button>
          </>
        )}
      </section>

      <footer className="journey-footer">
        {hasSession && (
          <button className="text-action" type="button" onClick={() => void signOut()}>
            Выйти
          </button>
        )}
        <span>Локальная альфа · игра в разработке</span>
      </footer>
      {combatLabEnabled && (
        <a className="lab-link" href="/combat-lab">
          Открыть диагностику боя
        </a>
      )}
    </main>
  );
}

function JourneyMessage(props: {
  readonly eyebrow: string;
  readonly title: string;
  readonly detail: string;
}) {
  return (
    <div className="journey-message">
      <p className="eyebrow">{props.eyebrow}</p>
      <h1>{props.title}</h1>
      <p className="summary">{props.detail}</p>
    </div>
  );
}
