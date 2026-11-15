import { useEffect, useRef, useState } from 'react';
import {
  WORLD_EXPECTED_COMPANY_ID_HEADER,
  type CompanyNicknamesDto,
  type CompanyNicknameHistoryDto,
  type CompanyNicknameProposalDto,
  type CompanySummaryDto,
  type ResolveCompanyNicknameRequestDto,
} from '@warwrit/protocol';

const api = (import.meta.env['VITE_API_BASE_URL'] ?? '/api').replace(/\/$/u, '');
const RESILIENT_TEXT = 'nickname.resilient';
const RESILIENT_REASON = 'nickname.reason.survived_near_death';

type PendingResolution = {
  readonly accountId: string;
  readonly companyId: string;
  readonly request: ResolveCompanyNicknameRequestDto;
};

type NicknameHistoryEntry = CompanyNicknameHistoryDto & {
  readonly resolution?: 'ACCEPTED' | 'REJECTED';
  readonly decidedAt?: string;
  readonly proposedAt?: string | null;
};

function readPending(
  raw: string | null,
  accountId: string,
  companyId: string,
): PendingResolution | undefined {
  if (!raw) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const stored = value as Record<string, unknown>;
    const request = stored['request'];
    if (
      stored['accountId'] !== accountId ||
      stored['companyId'] !== companyId ||
      !request ||
      typeof request !== 'object' ||
      Array.isArray(request)
    )
      return undefined;
    const candidate = request as Record<string, unknown>;
    if (
      candidate['schemaVersion'] !== 1 ||
      typeof candidate['commandId'] !== 'string' ||
      typeof candidate['expectedPublicRevision'] !== 'string' ||
      typeof candidate['proposalId'] !== 'string' ||
      typeof candidate['accept'] !== 'boolean'
    )
      return undefined;
    return {
      accountId,
      companyId,
      request: candidate as unknown as ResolveCompanyNicknameRequestDto,
    };
  } catch {
    return undefined;
  }
}

function isNicknamesDto(value: unknown, companyId: string): value is CompanyNicknamesDto {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const dto = value as Record<string, unknown>;
  const validProposal = (item: unknown): item is CompanyNicknameProposalDto => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const proposal = item as Record<string, unknown>;
    return (
      typeof proposal['proposalId'] === 'string' &&
      typeof proposal['characterId'] === 'string' &&
      (proposal['characterName'] === null || typeof proposal['characterName'] === 'string') &&
      typeof proposal['textKey'] === 'string' &&
      typeof proposal['reasonKey'] === 'string' &&
      typeof proposal['proposedAt'] === 'string'
    );
  };
  const validHistory = (item: unknown): item is CompanyNicknameHistoryDto => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const entry = item as Record<string, unknown>;
    return (
      typeof entry['proposalId'] === 'string' &&
      typeof entry['characterId'] === 'string' &&
      (entry['characterName'] === null || typeof entry['characterName'] === 'string') &&
      typeof entry['sourceEventId'] === 'string' &&
      typeof entry['textKey'] === 'string' &&
      typeof entry['reasonKey'] === 'string' &&
      (entry['proposedAt'] === null || typeof entry['proposedAt'] === 'string') &&
      (entry['resolution'] === 'ACCEPTED' || entry['resolution'] === 'REJECTED') &&
      typeof entry['decidedAt'] === 'string' &&
      (entry['acceptedAt'] === null || typeof entry['acceptedAt'] === 'string')
    );
  };
  return (
    dto['schemaVersion'] === 1 &&
    dto['companyId'] === companyId &&
    typeof dto['publicRevision'] === 'string' &&
    Array.isArray(dto['pending']) &&
    dto['pending'].every(validProposal) &&
    Array.isArray(dto['history']) &&
    dto['history'].every(validHistory)
  );
}

function nicknameText(key: string): string {
  return key === RESILIENT_TEXT ? 'Живучий' : key;
}

function nicknameReason(key: string): string {
  return key === RESILIENT_REASON
    ? 'После победы у бойца осталось не больше четверти здоровья.'
    : key;
}

function proposalLabel(proposal: CompanyNicknameProposalDto): string {
  return `${proposal.characterName ?? 'Боец'}: «${nicknameText(proposal.textKey)}»`;
}

export function NicknamePanel(props: {
  readonly accountId: string;
  readonly company: CompanySummaryDto;
  readonly onRefresh: () => void;
}) {
  const { accountId, company, onRefresh } = props;
  const storageKey = `warwrit:nickname-resolution:${accountId}:${company.companyId}`;
  const scopeKey = `${accountId}\u0000${company.companyId}`;
  const currentScope = useRef(scopeKey);
  const active = useRef(true);
  const postController = useRef<AbortController | undefined>(undefined);
  const [readAttempt, setReadAttempt] = useState(0);
  const [readback, setReadback] = useState<CompanyNicknamesDto>();
  const [pending, setPending] = useState<PendingResolution>();
  const [busyProposalId, setBusyProposalId] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [readError, setReadError] = useState<string>();

  useEffect(() => {
    currentScope.current = scopeKey;
    active.current = true;
    setReadback(undefined);
    setReadback(undefined);
    setMessage(undefined);
    setReadError(undefined);
    try {
      let restored: PendingResolution | undefined;
      try {
        restored = readPending(sessionStorage.getItem(storageKey), accountId, company.companyId);
      } catch {
        restored = undefined;
      }
      setPending(restored);
    } catch {
      setPending(undefined);
    }

    const controller = new AbortController();
    void fetch(`${api}/company/nicknames`, {
      credentials: 'same-origin',
      headers: { [WORLD_EXPECTED_COMPANY_ID_HEADER]: company.companyId },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 403 ? 'COMPANY' : 'READ');
        const value: unknown = await response.json();
        if (!isNicknamesDto(value, company.companyId)) throw new Error('READ');
        if (active.current && currentScope.current === scopeKey) {
          const restored = readPending(
            sessionStorage.getItem(storageKey),
            accountId,
            company.companyId,
          );
          const decided =
            restored &&
            value.history.some((entry) => entry.proposalId === restored.request.proposalId);
          if (restored && decided) {
            sessionStorage.removeItem(storageKey);
            setPending(undefined);
          } else {
            setPending(restored);
          }
          setReadback(value);
          setReadError(undefined);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || !active.current || currentScope.current !== scopeKey)
          return;
        setReadError(
          error instanceof Error && error.message === 'COMPANY'
            ? 'Не удалось прочитать прозвища этой компании. Обновите сведения.'
            : 'Не удалось прочитать историю прозвищ. Повторите попытку.',
        );
      });
    return () => {
      active.current = false;
      controller.abort();
      postController.current?.abort();
    };
  }, [accountId, company.companyId, company.revision, scopeKey, storageKey, readAttempt]);

  async function resolve(proposal: CompanyNicknameProposalDto, accept: boolean) {
    if (busyProposalId || !active.current || currentScope.current !== scopeKey) return;
    let attempt = pending?.request;
    if (attempt && (attempt.proposalId !== proposal.proposalId || attempt.accept !== accept))
      return;
    if (!attempt) {
      attempt = {
        schemaVersion: 1,
        commandId: crypto.randomUUID(),
        expectedPublicRevision: readback?.publicRevision ?? company.revision,
        proposalId: proposal.proposalId,
        accept,
      };
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ accountId, companyId: company.companyId, request: attempt }),
        );
        setPending({ accountId, companyId: company.companyId, request: attempt });
      } catch {
        setMessage('Не удалось сохранить выбор. Решение не отправлено.');
        return;
      }
    }

    const request = attempt;
    const requestScope = scopeKey;
    const controller = new AbortController();
    postController.current = controller;
    setBusyProposalId(proposal.proposalId);
    setMessage(undefined);
    try {
      const response = await fetch(`${api}/company/nicknames/resolve`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          [WORLD_EXPECTED_COMPANY_ID_HEADER]: company.companyId,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      if (!active.current || currentScope.current !== requestScope) return;
      if (response.status === 403) {
        sessionStorage.removeItem(storageKey);
        setPending(undefined);
        setMessage('Компания изменилась. Обновите сведения и выберите снова.');
        return;
      }
      if (response.status === 409) {
        sessionStorage.removeItem(storageKey);
        setPending(undefined);
        const result: unknown = await response.json().catch(() => undefined);
        const code =
          result && typeof result === 'object'
            ? (result as Record<string, unknown>)['code']
            : undefined;
        setMessage(
          code === 'STALE_REVISION'
            ? 'Сведения о предложении изменились. Обновите список и выберите снова.'
            : 'Предложение уже недоступно. Обновите список.',
        );
        onRefresh();
        setReadAttempt((value) => value + 1);
        return;
      }
      const result: unknown = await response.json().catch(() => undefined);
      if (
        !response.ok ||
        !result ||
        typeof result !== 'object' ||
        (result as Record<string, unknown>)['commandId'] !== request.commandId ||
        (result as Record<string, unknown>)['ok'] !== true
      ) {
        setMessage('Ответ о выборе неизвестен. Повторите тот же выбор.');
        return;
      }
      sessionStorage.removeItem(storageKey);
      setPending(undefined);
      setMessage(accept ? 'Прозвище принято.' : 'Предложение отклонено.');
      onRefresh();
      setReadAttempt((value) => value + 1);
    } catch {
      if (active.current && currentScope.current === requestScope)
        setMessage('Ответ о выборе неизвестен. Повторите тот же выбор.');
    } finally {
      if (postController.current === controller) postController.current = undefined;
      if (active.current && currentScope.current === requestScope) setBusyProposalId(undefined);
    }
  }

  const knownHistory = (readback?.history ?? []) as readonly NicknameHistoryEntry[];
  const pendingRequest =
    pending?.accountId === accountId && pending.companyId === company.companyId
      ? pending.request
      : undefined;
  if (!readback && !readError) return null;
  if (
    readback &&
    readback.pending.length === 0 &&
    knownHistory.length === 0 &&
    !pendingRequest &&
    !message
  )
    return null;

  return (
    <section className="nickname-panel" aria-label="Прозвища отряда">
      <h3 className="panel-subtitle">Прозвища</h3>
      {readError && (
        <p role="status" className="state-note">
          {readError}
        </p>
      )}
      {readError && (
        <button
          type="button"
          className="action action-quiet"
          onClick={() => setReadAttempt((value) => value + 1)}
        >
          Повторить загрузку
        </button>
      )}
      {readback?.pending.map((proposal) => {
        const retrying = pendingRequest?.proposalId === proposal.proposalId;
        return (
          <div key={proposal.proposalId} className="nickname-proposal">
            <p>
              <strong>{proposalLabel(proposal)}</strong>
            </p>
            <p className="state-note">{nicknameReason(proposal.reasonKey)}</p>
            {retrying ? (
              <div role="status">
                <p>
                  {busyProposalId
                    ? 'Отправляем сохранённый выбор…'
                    : 'Ответ неизвестен. Повторите тот же выбор без изменений.'}
                </p>
                <button
                  type="button"
                  className="action"
                  disabled={Boolean(busyProposalId)}
                  onClick={() => void resolve(proposal, pendingRequest.accept)}
                >
                  Повторить тот же выбор
                </button>
              </div>
            ) : pendingRequest ? (
              <p className="state-note">
                Сначала подтвердите сохранённый выбор для другого предложения.
              </p>
            ) : (
              <div className="nickname-actions">
                <button
                  type="button"
                  className="action"
                  disabled={Boolean(busyProposalId)}
                  onClick={() => void resolve(proposal, true)}
                >
                  Принять
                </button>
                <button
                  type="button"
                  className="action action-quiet"
                  disabled={Boolean(busyProposalId)}
                  onClick={() => void resolve(proposal, false)}
                >
                  Отказать
                </button>
              </div>
            )}
          </div>
        );
      })}
      {knownHistory.length > 0 && (
        <>
          <h4 className="panel-subtitle">История</h4>
          <ul className="nickname-history">
            {knownHistory.map((entry) => (
              <li key={entry.proposalId}>
                {entry.characterName ?? 'Боец'}: «{nicknameText(entry.textKey)}» —{' '}
                {entry.resolution === 'REJECTED' ? 'предложение отклонено' : 'прозвище принято'}.
              </li>
            ))}
          </ul>
        </>
      )}
      {message && (
        <p role="status" className="state-note">
          {message}
        </p>
      )}
    </section>
  );
}
