import { useEffect, useRef, useState } from 'react';
import {
  WORLD_EXPECTED_COMPANY_ID_HEADER,
  type CompanyHoldingsDto,
  type CompanySummaryDto,
} from '@warwrit/protocol';
import {
  itemTransferResult,
  readItemTransferAttempt,
  type ItemTransferAttempt,
} from './item-transfer-attempt.js';

const api = import.meta.env['VITE_API_BASE_URL'] ?? '/api';
export function useItemTransfer(
  accountId: string,
  company: CompanySummaryDto,
  onRefresh: () => void,
) {
  const companyId = company.companyId;
  const key = `warwrit:item-transfer:${accountId}:${companyId}`;
  const generation = useRef(0),
    lock = useRef(false),
    readSequence = useRef(0),
    companyRevision = useRef(company.revision);
  companyRevision.current = company.revision;
  const [stored, setStored] = useState<{ key: string; request: ItemTransferAttempt }>();
  const pending = stored?.key === key ? stored.request : undefined;
  const [readState, setReading] = useState<{
    key: string;
    sourceRevision: string;
    revision: string;
    holdings: CompanyHoldingsDto;
  }>();
  const reading =
    readState?.key === key && readState.sourceRevision === company.revision ? readState : undefined;
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function refresh(expectedGeneration = generation.current, failureMessage?: string) {
    const sequence = ++readSequence.current;
    const sourceRevision = companyRevision.current;
    const isCurrent = () =>
      expectedGeneration === generation.current &&
      sequence === readSequence.current &&
      sourceRevision === companyRevision.current;
    try {
      const session = await fetch(`${api}/auth/session`, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const identity: unknown = await session.json();
      if (
        !session.ok ||
        !identity ||
        typeof identity !== 'object' ||
        !('accountId' in identity) ||
        identity.accountId !== accountId
      )
        throw new Error('Войдите в прежнюю учётную запись, чтобы сверить передачу.');
      const response = await fetch(`${api}/company`, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Не удалось обновить вещи компании.');
      const value = (await response.json()) as {
        company?: CompanySummaryDto;
        holdings?: CompanyHoldingsDto;
      };
      if (
        value.company?.companyId !== companyId ||
        !value.holdings ||
        !/^(0|[1-9][0-9]*)$/u.test(value.company.revision)
      )
        throw new Error('Не удалось сверить вещи этой компании.');
      if (isCurrent()) {
        setReading({
          key,
          sourceRevision,
          revision: value.company.revision,
          holdings: value.holdings,
        });
        return true;
      }
    } catch (error) {
      if (isCurrent())
        setMessage(failureMessage ?? (error instanceof Error ? error.message : 'Вещи недоступны.'));
    }
    return false;
  }
  useEffect(() => {
    generation.current++;
    lock.current = false;
    setBusy(false);
    setMessage(undefined);
    setReading(undefined);
    try {
      const request = readItemTransferAttempt(sessionStorage.getItem(key), accountId, companyId);
      setStored(request ? { key, request } : undefined);
    } catch {
      setStored(undefined);
    }
    return () => {
      generation.current++;
    };
  }, [accountId, companyId]);
  useEffect(() => {
    const current = generation.current;
    setReading(undefined);
    void refresh(current);
    return () => {
      readSequence.current++;
    };
  }, [accountId, companyId, company.revision]);

  async function finishTransfer(result: string, current: number) {
    sessionStorage.removeItem(key);
    setStored(undefined);
    setReading(undefined);
    const message = result === 'ACCEPTED' ? 'Вещи переданы.' : transferRejection(result);
    setMessage(message);
    const refreshed = await refresh(
      current,
      result === 'ACCEPTED' ? 'Вещи переданы, но обоз не обновлён. Обновите список.' : message,
    );
    if (refreshed && current === generation.current) onRefresh();
  }

  async function transfer(payload?: ItemTransferAttempt['payload']) {
    if (lock.current || !reading || (!pending && company.runStatus !== 'ACTIVE')) return;
    const current = generation.current;
    let request = pending;
    if (!request && payload)
      request = {
        schemaVersion: 2,
        commandId: crypto.randomUUID(),
        expectedPublicRevision: reading.revision,
        type: 'TransferItem',
        payload,
      };
    if (!request) return;
    lock.current = true;
    setBusy(true);
    setMessage(undefined);
    let sent = false;
    try {
      if (!pending) {
        sessionStorage.setItem(key, JSON.stringify({ accountId, companyId, request }));
        setStored({ key, request });
      }
      sent = true;
      const response = await fetch(`${api}/company/commands`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId,
        },
        body: JSON.stringify(request),
      });
      const result = itemTransferResult(
        response.status,
        await response.json().catch(() => undefined),
        request.commandId,
      );
      if (current !== generation.current) return;
      if (result === 'UNKNOWN') {
        setMessage('Ответ о передаче неизвестен. Повторите тот же приказ.');
        return;
      }
      await finishTransfer(result, current);
    } catch (error) {
      if (current !== generation.current) return;
      setMessage(transferFailureMessage(sent, error));
    } finally {
      if (current === generation.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  async function reload() {
    const current = generation.current;
    setReading(undefined);
    await refresh(current);
  }
  return { pending, reading, message, busy, transfer, refresh: reload };
}
function transferFailureMessage(sent: boolean, error: unknown) {
  if (sent) return 'Ответ о передаче неизвестен. Повторите тот же приказ.';
  return error instanceof Error
    ? error.message
    : 'Не удалось сохранить приказ; вещи не передавались.';
}
function transferRejection(code: string) {
  if (code === 'CAPACITY')
    return 'В выбранном контейнере или отряде не хватает места. Вещи не переданы.';
  if (code === 'STALE_REVISION') return 'Обоз изменился. Выберите передачу по обновлённому списку.';
  return 'Передача недоступна. Проверьте вещи, место и получателя по обновлённому списку.';
}
