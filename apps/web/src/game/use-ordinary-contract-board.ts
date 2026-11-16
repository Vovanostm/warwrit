import { useCallback, useEffect, useRef, useState } from 'react';
import type { OrdinaryContractBoardDto, OrdinaryContractCommandDto } from '@warwrit/protocol';
import {
  ordinaryContractCommandAvailability,
  prepareOrdinaryContractAttempt,
  postOrdinaryContractAttempt,
  settleOrdinaryContractAttempt,
} from './ordinary-contract-attempt.js';
import {
  browserOrdinaryContractAttemptStorage,
  readOrdinaryContractAttempt,
  type OrdinaryContractAttempt,
  type OrdinaryContractAttemptScope,
} from './ordinary-contract-attempt-storage.js';
import { contractPlaceFacts, type ContractPlaceFact } from './contract-visits.js';
import { formatCrowns } from './format.js';

const REFRESH_MS = 15_000;

const REJECTION_TEXT: Readonly<Record<string, string>> = {
  STALE_REVISION: 'Контракт только что изменился. Обновили сведения — попробуйте ещё раз.',
  NOT_AVAILABLE: 'Это действие сейчас недоступно.',
  NOT_A_PARTICIPANT: 'Сначала возьмите контракт или помогите его владельцу.',
  WRONG_PLACE: 'Отряд должен стоять в нужном месте.',
  ALREADY_DONE: 'Это уже сделано.',
  MISSING_EVIDENCE: 'Сначала выполните предыдущие шаги.',
  CONDITION_NOT_MET: 'Условие ещё не выполнено.',
  INSUFFICIENT_FUNDS: 'У заказчика нет денег на выплату.',
  NOT_AUTHORIZED: 'Сеанс не подтверждён. Войдите снова.',
  INVALID_COMMAND: 'Сервер отклонил запрос.',
};

async function readBoard(): Promise<OrdinaryContractBoardDto | 'unauthorized' | undefined> {
  try {
    const response = await fetch('/api/contracts/board', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (response.status === 401) return 'unauthorized';
    if (!response.ok) return undefined;
    const body = (await response.json()) as OrdinaryContractBoardDto;
    return body.schemaVersion === 1 && Array.isArray(body.contracts) ? body : undefined;
  } catch {
    return undefined;
  }
}

type AttemptState = {
  readonly scopeKey: string;
  readonly attempt?: OrdinaryContractAttempt;
  readonly ready: boolean;
  readonly message?: string;
};

function loadAttemptState(scope: OrdinaryContractAttemptScope): AttemptState {
  const scopeKey = `${scope.accountId}\u0000${scope.companyId}`;
  const storage = browserOrdinaryContractAttemptStorage();
  if (!storage)
    return {
      scopeKey,
      ready: false,
      message: 'Не удалось проверить сохранённый запрос; команды временно недоступны.',
    };
  const result = readOrdinaryContractAttempt(storage, scope);
  if (result.kind === 'FOUND')
    return {
      scopeKey,
      attempt: result.attempt,
      ready: true,
      message: 'Ответ на прежний запрос неизвестен. Повтор отправит ту же команду.',
    };
  if (result.kind === 'EMPTY') return { scopeKey, ready: true };
  return {
    scopeKey,
    ready: false,
    message: 'Не удалось восстановить сохранённый запрос; команды временно недоступны.',
  };
}

type AttemptStateSettlement = ReturnType<typeof settleOrdinaryContractAttempt>;

function applyAcceptedSettlement(
  settlement: Extract<AttemptStateSettlement, { readonly kind: 'ACCEPTED' }>,
  setMessage: (message: string) => void,
  onRewardPaid: () => void,
): void {
  if (settlement.response.rewardQ === null) return;
  setMessage(`Заказчик заплатил ${formatCrowns(settlement.response.rewardQ)} кр.`);
  onRewardPaid();
}

function applyAttemptSettlement(
  settlement: AttemptStateSettlement,
  scopeKey: string,
  setAttemptState: (state: AttemptState) => void,
  setMessage: (message: string) => void,
  onUnauthorized: () => void,
  onRewardPaid: () => void,
): boolean {
  switch (settlement.kind) {
    case 'UNAUTHENTICATED':
      onUnauthorized();
      return false;
    case 'UNKNOWN':
      setMessage('Связь прервалась, результат неизвестен. Повторите тот же запрос.');
      return false;
    case 'RETAINED':
      setMessage('Ответ подтверждён, но запись запроса не удалена. Повторите тот же запрос.');
      return false;
    case 'REJECTED':
      setAttemptState({ scopeKey, ready: true });
      setMessage(REJECTION_TEXT[settlement.response.code] ?? 'Сервер отклонил запрос.');
      return true;
    case 'ACCEPTED':
      setAttemptState({ scopeKey, ready: true });
      applyAcceptedSettlement(settlement, setMessage, onRewardPaid);
      return true;
  }
}

type SendContext = {
  readonly scope: OrdinaryContractAttemptScope;
  readonly scopeKey: string;
  readonly pendingAttempt: OrdinaryContractAttempt | undefined;
  readonly attemptState: AttemptState;
  readonly currentScopeKey: { readonly current: string };
  readonly generation: { readonly current: number };
  readonly sendingRef: { current: boolean };
  readonly setAttemptState: (state: AttemptState) => void;
  readonly setBusy: (busy: boolean) => void;
  readonly setMessage: (message: string | undefined) => void;
  readonly onUnauthorized: () => void;
  readonly onRewardPaid: () => void;
  readonly refresh: () => Promise<void>;
};

function createSender(input: SendContext) {
  return async (requested: OrdinaryContractCommandDto, retry = false): Promise<void> => {
    const availability = ordinaryContractCommandAvailability({
      scopeKey: input.scopeKey,
      currentScopeKey: input.currentScopeKey.current,
      attemptScopeKey: input.attemptState.scopeKey,
      ready: input.attemptState.ready,
      hasPending: input.pendingAttempt !== undefined,
      inFlight: input.sendingRef.current,
      retry,
    });
    if (availability.inFlight) return;
    if (!availability.scopeReady) {
      input.setMessage(
        input.attemptState.message ??
          'Не удалось сохранить запрос. Проверьте доступ к хранилищу и повторите.',
      );
      return;
    }
    if (!availability.canSend) return;
    const prepared = prepareOrdinaryContractAttempt({
      scope: input.scope,
      pending: input.pendingAttempt,
      requested,
      retry,
    });
    if (prepared.kind === 'NO_COMMAND') return;
    if (prepared.kind === 'BLOCKED') {
      input.setMessage(prepared.message);
      return;
    }
    const { attempt, storage } = prepared;
    input.setAttemptState({ scopeKey: input.scopeKey, attempt, ready: true });
    const sendGeneration = input.generation.current;
    input.sendingRef.current = true;
    input.setBusy(true);
    input.setMessage(undefined);
    try {
      const result = await postOrdinaryContractAttempt(attempt);
      if (
        sendGeneration !== input.generation.current ||
        input.scopeKey !== input.currentScopeKey.current
      )
        return;
      const settlement = settleOrdinaryContractAttempt(storage, attempt, result);
      if (
        !applyAttemptSettlement(
          settlement,
          input.scopeKey,
          input.setAttemptState,
          input.setMessage,
          input.onUnauthorized,
          input.onRewardPaid,
        )
      )
        return;
      await input.refresh();
    } catch {
      if (
        sendGeneration !== input.generation.current ||
        input.scopeKey !== input.currentScopeKey.current
      )
        return;
      input.setMessage('Связь прервалась, результат неизвестен. Повторите тот же запрос.');
    } finally {
      if (
        sendGeneration === input.generation.current &&
        input.scopeKey === input.currentScopeKey.current
      ) {
        input.sendingRef.current = false;
        input.setBusy(false);
      }
    }
  };
}

export function useOrdinaryContractBoard(input: {
  readonly scope: OrdinaryContractAttemptScope;
  readonly siteId: string | null;
  readonly refreshKey: number;
  readonly onUnauthorized: () => void;
  readonly onRewardPaid: () => void;
  readonly onPlaceFacts?: (facts: readonly ContractPlaceFact[]) => void;
}) {
  const scopeKey = `${input.scope.accountId}\u0000${input.scope.companyId}`;
  const currentScopeKey = useRef(scopeKey);
  currentScopeKey.current = scopeKey;
  const generation = useRef(0);
  const sendingRef = useRef(false);
  const [board, setBoard] = useState<OrdinaryContractBoardDto | undefined>();
  const [boardScopeKey, setBoardScopeKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [attemptState, setAttemptState] = useState(() => loadAttemptState(input.scope));
  const pendingAttempt = attemptState.scopeKey === scopeKey ? attemptState.attempt : undefined;
  const pending = pendingAttempt?.command;
  const onPlaceFacts = useRef(input.onPlaceFacts);
  onPlaceFacts.current = input.onPlaceFacts;

  const refresh = useCallback(async () => {
    const requestGeneration = generation.current;
    const next = await readBoard();
    if (requestGeneration !== generation.current || scopeKey !== currentScopeKey.current) return;
    if (next === 'unauthorized') input.onUnauthorized();
    else if (next) {
      setBoard(next);
      setBoardScopeKey(scopeKey);
      onPlaceFacts.current?.(contractPlaceFacts(next.contracts));
    }
  }, [input.onUnauthorized, scopeKey]);

  useEffect(() => {
    const currentGeneration = ++generation.current;
    const loaded = loadAttemptState(input.scope);
    setBoard(undefined);
    setBoardScopeKey('');
    setAttemptState(loaded);
    setMessage(loaded.message);
    sendingRef.current = false;
    setBusy(false);
    return () => {
      if (generation.current === currentGeneration) generation.current += 1;
    };
  }, [scopeKey]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh, input.siteId, input.refreshKey]);

  const commandAvailability = ordinaryContractCommandAvailability({
    scopeKey,
    currentScopeKey: currentScopeKey.current,
    attemptScopeKey: attemptState.scopeKey,
    ready: attemptState.ready,
    hasPending: pendingAttempt !== undefined,
    inFlight: busy,
    retry: false,
  });
  const send = createSender({
    scope: input.scope,
    scopeKey,
    pendingAttempt,
    attemptState,
    currentScopeKey,
    generation,
    sendingRef,
    setAttemptState,
    setBusy,
    setMessage,
    onUnauthorized: input.onUnauthorized,
    onRewardPaid: input.onRewardPaid,
    refresh,
  });

  return {
    board: boardScopeKey === scopeKey ? board : undefined,
    busy,
    commandBusy: commandAvailability.commandsBusy,
    message,
    pending,
    send,
  };
}
