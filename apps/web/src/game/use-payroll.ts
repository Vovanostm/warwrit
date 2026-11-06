import { useEffect, useRef, useState } from 'react';
import type { CompanyHoldingsDto, CompanySummaryDto } from '@warwrit/protocol';
import { postPayrollAttempt, readPayrollAttempt } from './payroll-attempt.js';
import type { PayrollAttempt } from './payroll-attempt.js';
import { payrollPaymentDescription } from './payroll-presentation.js';
import { fetchPayrollReadback, verifyPayrollSession } from './payroll-readback.js';

const apiBaseUrl = import.meta.env['VITE_API_BASE_URL'] ?? '/api';
type Payroll = NonNullable<CompanyHoldingsDto['payroll']>;

export function usePayroll(
  accountId: string,
  company: CompanySummaryDto,
  holdings: CompanyHoldingsDto | undefined,
  onRefresh: () => void,
) {
  const companyId = company.companyId;
  const key = `warwrit:payroll-attempt:${accountId}:${companyId}`;
  const lock = useRef(false);
  const scopeGeneration = useRef(0);
  const scope = useRef({ accountId, companyId });
  const [stored, setStored] = useState<{
    readonly accountId: string;
    readonly companyId: string;
    readonly request: PayrollAttempt;
  }>();
  const pending =
    stored?.accountId === accountId && stored.companyId === companyId ? stored.request : undefined;
  const [payroll, setPayroll] = useState<Payroll | undefined>(holdings?.payroll);
  const [authoritativeRevision, setAuthoritativeRevision] = useState(company.revision);
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState(false);

  async function refreshReadback(generation: number) {
    await verifyPayrollSession(apiBaseUrl, accountId);
    if (generation !== scopeGeneration.current) return;
    const readback = await fetchPayrollReadback(apiBaseUrl, companyId);
    if (generation !== scopeGeneration.current) return;
    setPayroll(readback.payroll);
    setAuthoritativeRevision(readback.revision);
    setFresh(true);
    onRefresh();
  }

  useEffect(() => {
    const generation = ++scopeGeneration.current;
    const scopeChanged =
      scope.current.accountId !== accountId || scope.current.companyId !== companyId;
    scope.current = { accountId, companyId };
    lock.current = false;
    setBusy(false);
    setFresh(false);
    setPayroll(undefined);
    setAuthoritativeRevision(company.revision);
    if (scopeChanged) setMessage(undefined);
    let attempt: PayrollAttempt | undefined;
    try {
      attempt = readPayrollAttempt(sessionStorage.getItem(key), accountId, companyId);
    } catch {
      attempt = undefined;
    }
    setStored(attempt ? { accountId, companyId, request: attempt } : undefined);
    void refreshReadback(generation).catch((error: unknown) => {
      if (generation === scopeGeneration.current) {
        const readbackMessage =
          error instanceof Error ? error.message : 'Не удалось открыть книгу компании.';
        setMessage((current) =>
          scopeChanged || current === undefined ? readbackMessage : current,
        );
      }
    });
    return () => {
      scopeGeneration.current++;
    };
  }, [accountId, companyId, company.revision]);

  async function pay(input: {
    readonly poolId: string;
    readonly amountQ: string;
    readonly mode: 'DEFAULT' | 'TARGETED';
    readonly payeeId?: string;
  }) {
    if (lock.current || !fresh || (company.runStatus !== 'ACTIVE' && !pending)) return;
    const generation = scopeGeneration.current;
    lock.current = true;
    setBusy(true);
    setMessage(undefined);
    let attempt: PayrollAttempt | undefined;
    let requestStarted = false;
    try {
      attempt = pending ?? createPayrollAttempt(input, authoritativeRevision);
      if (!pending) retainAttempt(key, accountId, companyId, attempt, setStored);
      requestStarted = true;
      const result = await postPayrollAttempt(apiBaseUrl, companyId, attempt);
      if (generation !== scopeGeneration.current) return;
      await completePayrollAttempt(result, generation, attempt);
    } catch (error) {
      await recoverPayrollAttempt(error, generation, requestStarted ? attempt : undefined);
    } finally {
      if (generation === scopeGeneration.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }

  async function completePayrollAttempt(
    result: Awaited<ReturnType<typeof postPayrollAttempt>>,
    generation: number,
    attempt: PayrollAttempt,
  ) {
    const description = payrollPaymentDescription(attempt, company);
    if (result.kind === 'UNAUTHENTICATED') {
      setMessage(
        `Сессия закончилась во время выплаты ${description}. Войдите снова и повторите её.`,
      );
      return;
    }
    if (result.kind === 'UNKNOWN') {
      setMessage(
        `Ответ на выплату ${description} неясен. Повторите тот же приказ, чтобы проверить результат.`,
      );
      return;
    }

    sessionStorage.removeItem(key);
    setStored(undefined);
    setMessage(
      result.kind === 'ACCEPTED'
        ? `Выплата записана: ${description}. Сверяем книгу компании.`
        : `${rejectionMessage(result.code)} Выплата: ${description}.`,
    );
    setFresh(false);
    try {
      await refreshReadback(generation);
    } catch {
      if (generation === scopeGeneration.current) {
        setFresh(false);
        if (result.kind === 'ACCEPTED')
          setMessage(`Выплата записана: ${description}, но книгу компании не удалось обновить.`);
      }
      return;
    }
    if (generation === scopeGeneration.current && result.kind === 'ACCEPTED')
      setMessage(`Выплата записана: ${description}. Книга компании обновлена.`);
  }

  async function recoverPayrollAttempt(
    error: unknown,
    generation: number,
    attempt?: PayrollAttempt,
  ) {
    if (generation === scopeGeneration.current) {
      setMessage(
        attempt
          ? `Ответ на выплату ${payrollPaymentDescription(attempt, company)} неясен. Повторите тот же приказ, чтобы проверить результат.`
          : error instanceof Error
            ? `${error.message} Повторите эту же выплату.`
            : 'Ответ неясен. Повторите эту же выплату.',
      );
    }
    try {
      await refreshReadback(generation);
    } catch {
      if (generation === scopeGeneration.current) setFresh(false);
    }
  }

  async function refresh() {
    const generation = scopeGeneration.current;
    setFresh(false);
    try {
      await refreshReadback(generation);
      if (generation !== scopeGeneration.current) return;
      setMessage(undefined);
    } catch (error) {
      if (generation === scopeGeneration.current)
        setMessage(error instanceof Error ? error.message : 'Не удалось обновить книгу компании.');
    }
  }

  return { payroll, pending, message, busy, fresh, pay, refresh };
}

function createPayrollAttempt(
  input: {
    readonly poolId: string;
    readonly amountQ: string;
    readonly mode: 'DEFAULT' | 'TARGETED';
    readonly payeeId?: string;
  },
  expectedPublicRevision: string,
): PayrollAttempt {
  return {
    schemaVersion: 2,
    commandId: crypto.randomUUID(),
    expectedPublicRevision,
    type: 'PayClaims',
    payload: {
      poolId: input.poolId,
      amountQ: input.amountQ,
      claimIds: [],
      mode: input.mode,
      ...(input.payeeId === undefined ? {} : { payeeId: input.payeeId }),
    },
  };
}

function retainAttempt(
  key: string,
  accountId: string,
  companyId: string,
  request: PayrollAttempt,
  setStored: (value: {
    readonly accountId: string;
    readonly companyId: string;
    readonly request: PayrollAttempt;
  }) => void,
) {
  sessionStorage.setItem(key, JSON.stringify({ accountId, companyId, request }));
  setStored({ accountId, companyId, request });
}

function rejectionMessage(code: string) {
  switch (code) {
    case 'INSUFFICIENT_FUNDS':
      return 'В этом кошельке не хватает свободного золота. Выплата не прошла.';
    case 'CONTACT_OR_ACCESS_REQUIRED':
      return 'Для выплаты отряд должен быть у этого кошелька.';
    case 'STALE_REVISION':
      return 'Книга компании изменилась. Выберите выплату по обновлённым данным.';
    case 'NOT_AUTHORIZED':
      return 'Эта компания недоступна в текущей учётной записи.';
    default:
      return 'Выплата не прошла. Книга компании обновлена.';
  }
}
