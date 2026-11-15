import { useEffect, useRef, useState } from 'react';
import {
  WORLD_EXPECTED_COMPANY_ID_HEADER,
  isCompanyEntityId,
  type CompanySummaryDto,
  type DeceasedWageQuoteDto,
  type OrdinaryPlayerCompanyCommandV2Dto,
} from '@warwrit/protocol';
import { formatCrowns } from './format.js';
import './deceased-payroll.css';

const API_BASE_URL = (import.meta.env['VITE_API_BASE_URL'] ?? '/api').replace(/\/$/u, '');
const STORAGE_PREFIX = 'warwrit:deceased-wages:v1';
const REVISION = /^(0|[1-9][0-9]{0,127})$/u;
const REJECTION_CODES = new Set([
  'INVALID_COMMAND',
  'NOT_AUTHORIZED',
  'CONTACT_OR_ACCESS_REQUIRED',
  'UNSUPPORTED_ACTION',
  'IDEMPOTENCY_CONFLICT',
  'STALE_REVISION',
  'INSUFFICIENT_ITEMS',
  'INSUFFICIENT_STAMINA',
  'INSUFFICIENT_FUNDS',
  'CAPACITY',
  'OUT_OF_STOCK',
]);

type PayRequest = Extract<OrdinaryPlayerCompanyCommandV2Dto, { type: 'PayDeceasedWages' }>;
type StoredAttempt = {
  readonly accountId: string;
  readonly companyId: string;
  readonly request: PayRequest;
};
type QuoteState =
  | { readonly scopeKey: string; readonly status: 'loading' }
  | { readonly scopeKey: string; readonly status: 'error'; readonly message: string }
  | { readonly scopeKey: string; readonly status: 'ready'; readonly quote: DeceasedWageQuoteDto };
type CommandResult =
  | { readonly kind: 'ACCEPTED' }
  | { readonly kind: 'REJECTED'; readonly code: string }
  | { readonly kind: 'UNKNOWN' };

export function DeceasedPayrollPanel(props: {
  readonly accountId: string;
  readonly company: CompanySummaryDto;
  readonly onRefresh: () => void;
}) {
  const companyId = props.company.companyId;
  const scopeKey = `${props.accountId}\u0000${companyId}`;
  const storageKey = `${STORAGE_PREFIX}:${encodeURIComponent(props.accountId)}:${encodeURIComponent(companyId)}`;
  const scopeRef = useRef(scopeKey);
  scopeRef.current = scopeKey;
  const lock = useRef(false);
  const [quoteRetry, setQuoteRetry] = useState(0);
  const [quoteState, setQuoteState] = useState<QuoteState>({ scopeKey, status: 'loading' });
  const [stored, setStored] = useState<{
    readonly key: string;
    readonly attempt: StoredAttempt | undefined;
  }>(() => ({ key: storageKey, attempt: readAttempt(storageKey, props.accountId, companyId) }));
  const [confirmCharacterId, setConfirmCharacterId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [messageState, setMessageState] = useState<{
    readonly scopeKey: string;
    readonly text: string;
  }>();
  const pending =
    stored.key === storageKey
      ? stored.attempt
      : readAttempt(storageKey, props.accountId, companyId);
  const visibleState =
    quoteState.scopeKey === scopeKey ? quoteState : { scopeKey, status: 'loading' as const };
  const quote = visibleState.status === 'ready' ? visibleState.quote : undefined;
  const message = messageState?.scopeKey === scopeKey ? messageState.text : undefined;
  const setMessage = (text: string) => setMessageState({ scopeKey, text });

  useEffect(() => {
    setStored({ key: storageKey, attempt: readAttempt(storageKey, props.accountId, companyId) });
  }, [storageKey, props.accountId, companyId]);

  useEffect(() => {
    const controller = new AbortController();
    setQuoteState({ scopeKey, status: 'loading' });
    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/company/deceased-wages`, {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId },
          signal: controller.signal,
        });
        if (!response.ok) {
          const message =
            response.status === 401
              ? 'Войдите снова, чтобы проверить невыплаченное жалованье.'
              : response.status === 403 || response.status === 400
                ? 'Не удалось сверить компанию. Обновите сведения отряда.'
                : 'Не удалось получить сведения о выплатах. Повторите запрос.';
          throw new Error(message);
        }
        const quote = readQuote(await response.json());
        if (!quote) throw new Error('Сведения о выплатах неполны. Обновите данные.');
        if (controller.signal.aborted || scopeRef.current !== scopeKey) return;
        setQuoteState({ scopeKey, status: 'ready', quote });
        if (quote.people.length === 0) setConfirmCharacterId(undefined);
      } catch (error) {
        if (controller.signal.aborted || scopeRef.current !== scopeKey) return;
        setQuoteState({
          scopeKey,
          status: 'error',
          message:
            error instanceof Error ? error.message : 'Не удалось получить сведения о выплатах.',
        });
      }
    })();
    return () => controller.abort();
  }, [companyId, props.accountId, quoteRetry, scopeKey]);

  async function pay(request?: PayRequest) {
    if (lock.current) return;
    let attempt = pending;
    if (!attempt && request) attempt = { accountId: props.accountId, companyId, request };
    if (!attempt) return;
    lock.current = true;
    setBusy(true);
    setMessageState(undefined);
    try {
      if (!pending) {
        sessionStorage.setItem(storageKey, JSON.stringify(attempt));
        setStored({ key: storageKey, attempt });
      }
      const response = await fetch(`${API_BASE_URL}/company/commands`, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'content-type': 'application/json',
          [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId,
        },
        body: JSON.stringify(attempt.request),
      });
      const result = classifyCommand(
        response.status,
        await response.json().catch(() => undefined),
        attempt.request.commandId,
      );
      if (scopeRef.current !== scopeKey) return;
      if (result.kind === 'UNKNOWN') {
        setMessage('Ответ о выплате неизвестен. Повторите ту же выплату.');
        return;
      }
      sessionStorage.removeItem(storageKey);
      setStored({ key: storageKey, attempt: undefined });
      setConfirmCharacterId(undefined);
      setMessage(
        result.kind === 'ACCEPTED'
          ? 'Выплата родным подтверждена. Казна отряда обновляется.'
          : rejectionText(result.code),
      );
      props.onRefresh();
      setQuoteRetry((revision) => revision + 1);
    } catch {
      if (scopeRef.current === scopeKey)
        setMessage('Ответ о выплате неизвестен. Повторите ту же выплату.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function confirm(person: DeceasedWageQuoteDto['people'][number]) {
    if (!quote?.local || pending || props.company.runStatus !== 'ACTIVE') return;
    void pay({
      schemaVersion: 2,
      commandId: crypto.randomUUID(),
      expectedPublicRevision: quote.publicRevision,
      type: 'PayDeceasedWages',
      payload: { characterId: person.characterId },
    });
  }

  return (
    <section className="deceased-payroll-panel" aria-label="Жалованье погибших">
      <h3 className="panel-subtitle">Жалованье погибших</h3>
      {visibleState.status === 'loading' && (
        <p className="state-note" role="status">
          Проверяем невыплаченное жалованье…
        </p>
      )}
      {visibleState.status === 'error' && (
        <div className="deceased-payroll-error" role="alert">
          <p>{visibleState.message}</p>
          <button
            type="button"
            className="quiet-action"
            disabled={busy}
            onClick={() => setQuoteRetry((value) => value + 1)}
          >
            Обновить сведения
          </button>
        </div>
      )}
      {quote && (
        <>
          <p className="state-note">
            {quote.local
              ? 'Невыплаченное жалованье погибших можно один раз передать их родным. Деньги уйдут из казны отряда.'
              : 'Чтобы передать деньги родным, остановитесь в Каменном Броде.'}
          </p>
          {quote.people.length === 0 ? (
            <p className="state-note">
              Нет известного невыплаченного жалованья погибших участников.
            </p>
          ) : (
            <ul className="deceased-payroll-people">
              {quote.people.map((person) => {
                const confirming = confirmCharacterId === person.characterId;
                return (
                  <li key={person.characterId}>
                    <div className="deceased-payroll-person">
                      <strong>{person.name}</strong>
                      <span>{formatCrowns(person.amountQ)} кр.</span>
                    </div>
                    {confirming && !pending ? (
                      <div
                        className="deceased-payroll-confirm"
                        role="group"
                        aria-label={`Подтвердить выплату семье ${person.name}`}
                      >
                        <p>
                          Передать родным {formatCrowns(person.amountQ)} кр.? Выплату нельзя
                          повторить, деньги уйдут из казны отряда.
                        </p>
                        <div>
                          <button
                            type="button"
                            className="action"
                            disabled={busy || !quote.local || props.company.runStatus !== 'ACTIVE'}
                            onClick={() => confirm(person)}
                          >
                            Подтвердить выплату
                          </button>
                          <button
                            type="button"
                            className="quiet-action"
                            disabled={busy}
                            onClick={() => setConfirmCharacterId(undefined)}
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="quiet-action"
                        disabled={
                          busy ||
                          Boolean(pending) ||
                          !quote.local ||
                          props.company.runStatus !== 'ACTIVE'
                        }
                        onClick={() => setConfirmCharacterId(person.characterId)}
                      >
                        Выплатить родным
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {!quote.local && quote.people.length > 0 && (
            <p className="state-note">Выплата доступна только в Каменном Броде.</p>
          )}
        </>
      )}
      {pending && (
        <div className="deceased-payroll-pending" role="status">
          <p>Ответ о выплате неизвестен. Повторите ту же выплату, чтобы проверить её результат.</p>
          <button type="button" className="action" disabled={busy} onClick={() => void pay()}>
            {busy ? 'Повторяем выплату…' : 'Повторить ту же выплату'}
          </button>
        </div>
      )}
      {message && !pending && (
        <p className="state-note" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

function readQuote(value: unknown): DeceasedWageQuoteDto | undefined {
  if (
    !record(value) ||
    !revision(value['publicRevision']) ||
    typeof value['local'] !== 'boolean' ||
    !Array.isArray(value['people'])
  )
    return undefined;
  const people: DeceasedWageQuoteDto['people'][number][] = [];
  for (const person of value['people']) {
    if (
      !record(person) ||
      !isCompanyEntityId(person['characterId']) ||
      typeof person['name'] !== 'string' ||
      person['name'].trim().length === 0 ||
      [...person['name']].length > 120 ||
      !amount(person['amountQ']) ||
      BigInt(person['amountQ']) <= 0n
    )
      return undefined;
    people.push({
      characterId: person['characterId'],
      name: person['name'],
      amountQ: person['amountQ'],
    });
  }
  if (new Set(people.map((person) => person.characterId)).size !== people.length) return undefined;
  return { publicRevision: value['publicRevision'], local: value['local'], people };
}

function readAttempt(key: string, accountId: string, companyId: string): StoredAttempt | undefined {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    if (
      !record(value) ||
      value['accountId'] !== accountId ||
      value['companyId'] !== companyId ||
      !record(value['request'])
    )
      return undefined;
    const request = value['request'];
    const payload = request['payload'];
    if (
      request['schemaVersion'] === 2 &&
      request['type'] === 'PayDeceasedWages' &&
      isCompanyEntityId(request['commandId']) &&
      revision(request['expectedPublicRevision']) &&
      record(payload) &&
      isCompanyEntityId(payload['characterId'])
    )
      return { accountId, companyId, request: request as unknown as PayRequest };
    return undefined;
  } catch {
    return undefined;
  }
}

function classifyCommand(status: number, value: unknown, commandId: string): CommandResult {
  if (!record(value) || value['commandId'] !== commandId || !revision(value['publicRevision']))
    return { kind: 'UNKNOWN' };
  const keys = Object.keys(value).toSorted().join('|');
  if (status === 200 && value['ok'] === true && keys === 'commandId|ok|publicRevision')
    return { kind: 'ACCEPTED' };
  if (
    (status === 403 || status === 409) &&
    value['ok'] === false &&
    typeof value['code'] === 'string' &&
    REJECTION_CODES.has(value['code']) &&
    (status === 403 ? value['code'] === 'NOT_AUTHORIZED' : value['code'] !== 'NOT_AUTHORIZED') &&
    keys === 'code|commandId|ok|publicRevision'
  )
    return { kind: 'REJECTED', code: value['code'] };
  return { kind: 'UNKNOWN' };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function revision(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 128 && REVISION.test(value);
}
function amount(value: unknown): value is string {
  return revision(value);
}

function rejectionText(code: string): string {
  const messages: Record<string, string> = {
    INVALID_COMMAND: 'Приказ о выплате не удалось выполнить.',
    NOT_AUTHORIZED: 'Компания изменилась. Обновите сведения перед выплатой.',
    CONTACT_OR_ACCESS_REQUIRED: 'Выплату можно провести только при остановке в Каменном Броде.',
    UNSUPPORTED_ACTION: 'Эту выплату сейчас нельзя провести.',
    IDEMPOTENCY_CONFLICT: 'Этот приказ уже использован. Обновите сведения отряда.',
    STALE_REVISION: 'Сведения о долге изменились. Проверьте сумму и подтвердите выплату снова.',
    INSUFFICIENT_ITEMS: 'Жалованье уже выплачено или больше недоступно.',
    INSUFFICIENT_STAMINA: 'Приказ не удалось выполнить.',
    INSUFFICIENT_FUNDS: 'В казне отряда не хватает денег для выплаты.',
    CAPACITY: 'Приказ не удалось выполнить.',
    OUT_OF_STOCK: 'Приказ не удалось выполнить.',
  };
  return messages[code] ?? 'Сервер отклонил приказ. Сведения отряда обновлены.';
}
