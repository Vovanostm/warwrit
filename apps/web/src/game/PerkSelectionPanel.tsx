import { useEffect, useRef, useState } from 'react';
import {
  WORLD_EXPECTED_COMPANY_ID_HEADER,
  isCompanyEntityId,
  type CompanySummaryDto,
  type OrdinaryPlayerCompanyCommandV2Dto,
} from '@warwrit/protocol';
import './perk-selection-panel.css';

const api = (import.meta.env['VITE_API_BASE_URL'] ?? '/api').replace(/\/$/u, '');
const STORAGE_PREFIX = 'warwrit:perk-selection:v1';
const REJECTION_CODES = new Set([
  'INVALID_COMMAND',
  'NOT_AUTHORIZED',
  'CONTACT_OR_ACCESS_REQUIRED',
  'UNSUPPORTED_ACTION',
  'IDEMPOTENCY_CONFLICT',
  'STALE_REVISION',
]);

type ChoosePerkCommand = Extract<
  OrdinaryPlayerCompanyCommandV2Dto,
  { readonly type: 'ChoosePerk' }
>;
type Attempt = {
  readonly accountId: string;
  readonly companyId: string;
  readonly command: ChoosePerkCommand;
  readonly body: string;
};

function storageKey(accountId: string, companyId: string) {
  return `${STORAGE_PREFIX}:${encodeURIComponent(accountId)}:${encodeURIComponent(companyId)}`;
}

function readAttempt(
  raw: string | null,
  accountId: string,
  companyId: string,
): Attempt | undefined {
  if (!raw) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value['accountId'] !== accountId ||
      value['companyId'] !== companyId ||
      typeof value['body'] !== 'string'
    )
      return undefined;
    const body = value['body'];
    const commandValue: unknown = JSON.parse(body);
    if (!isRecord(commandValue) || JSON.stringify(commandValue) !== body) return undefined;
    const request = commandValue;
    const payload = request['payload'];
    if (
      Object.keys(request).toSorted().join('\0') !==
        'commandId\0expectedPublicRevision\0payload\0schemaVersion\0type' ||
      request['schemaVersion'] !== 2 ||
      request['type'] !== 'ChoosePerk' ||
      !isCompanyEntityId(request['commandId']) ||
      !isRevision(request['expectedPublicRevision']) ||
      !isRecord(payload) ||
      Object.keys(payload).toSorted().join('\0') !== 'characterId\0milestone\0perkId' ||
      !isCompanyEntityId(payload['characterId']) ||
      !isCompanyEntityId(payload['perkId']) ||
      payload['milestone'] !== 25
    )
      return undefined;
    return { accountId, companyId, command: request as unknown as ChoosePerkCommand, body };
  } catch {
    return undefined;
  }
}

function classify(status: number, value: unknown, commandId: string) {
  if (!isRecord(value)) return { kind: 'UNKNOWN' as const };
  const keys = Object.keys(value).toSorted().join('|');
  if (status === 403 && keys === 'error' && value['error'] === 'company required')
    return { kind: 'SCOPE' as const };
  if (value['commandId'] !== commandId || !isRevision(value['publicRevision']))
    return { kind: 'UNKNOWN' as const };
  if (status === 200 && value['ok'] === true && keys === 'commandId|ok|publicRevision')
    return { kind: 'ACCEPTED' as const };
  if (
    (status === 403 || status === 409) &&
    value['ok'] === false &&
    typeof value['code'] === 'string' &&
    REJECTION_CODES.has(value['code']) &&
    (status === 403 ? value['code'] === 'NOT_AUTHORIZED' : value['code'] !== 'NOT_AUTHORIZED') &&
    keys === 'code|commandId|ok|publicRevision'
  )
    return { kind: 'REJECTED' as const, code: value['code'] };
  return { kind: 'UNKNOWN' as const };
}

function isRevision(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 128 && /^(0|[1-9][0-9]*)$/u.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectionText(code: string) {
  return code === 'STALE_REVISION'
    ? 'Сведения об отряде изменились. Обновите их и выберите снова.'
    : code === 'NOT_AUTHORIZED'
      ? 'Нет доступа к этой компании.'
      : 'Этот выбор сейчас недоступен. Обновите сведения об отряде.';
}

function perkEffectLabel(attribute: string, value: number) {
  const label =
    attribute === 'accuracy' ? 'Точность' : attribute === 'initiative' ? 'Инициатива' : attribute;
  return `${label} ${value >= 0 ? '+' : ''}${value}`;
}

export function PerkSelectionPanel(props: {
  readonly accountId: string;
  readonly company: CompanySummaryDto;
  readonly onRefresh: () => void;
}) {
  const { accountId, company } = props;
  const key = storageKey(accountId, company.companyId);
  const [pending, setPending] = useState<Attempt | undefined>(() => {
    try {
      return readAttempt(sessionStorage.getItem(key), accountId, company.companyId);
    } catch {
      return undefined;
    }
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const lock = useRef(false);
  const scopeRef = useRef(`${accountId}\0${company.companyId}`);
  scopeRef.current = `${accountId}\0${company.companyId}`;
  const scopeKey = `${accountId}\0${company.companyId}`;

  useEffect(() => {
    try {
      setPending(readAttempt(sessionStorage.getItem(key), accountId, company.companyId));
    } catch {
      setPending(undefined);
    }
  }, [key, accountId, company.companyId]);

  async function send(attempt: Attempt | undefined) {
    if (!attempt || lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage(undefined);
    try {
      const response = await fetch(`${api}/company/commands`, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'content-type': 'application/json',
          [WORLD_EXPECTED_COMPANY_ID_HEADER]: attempt.companyId,
        },
        body: attempt.body,
      });
      const result = classify(
        response.status,
        await response.json().catch(() => undefined),
        attempt.command.commandId,
      );
      if (scopeRef.current !== scopeKey) return;
      if (result.kind === 'UNKNOWN') {
        setMessage(
          response.status === 401
            ? 'Войдите снова и повторите тот же выбор.'
            : 'Ответ на выбор неизвестен. Повторите его без изменений.',
        );
        return;
      }
      sessionStorage.removeItem(key);
      setPending(undefined);
      setMessage(
        result.kind === 'ACCEPTED'
          ? 'Приём выбран.'
          : result.kind === 'SCOPE'
            ? 'Компания изменилась. Обновите сведения и выберите снова.'
            : rejectionText(result.code),
      );
      props.onRefresh();
    } catch {
      if (scopeRef.current === scopeKey)
        setMessage('Ответ на выбор неизвестен. Повторите его без изменений.');
    } finally {
      if (scopeRef.current === scopeKey) {
        lock.current = false;
        setBusy(false);
      }
    }
  }

  function choose(characterId: string, perkId: string) {
    if (pending || lock.current) return;
    const command: ChoosePerkCommand = {
      schemaVersion: 2,
      commandId: crypto.randomUUID(),
      expectedPublicRevision: company.revision,
      type: 'ChoosePerk',
      payload: { characterId, perkId, milestone: 25 },
    };
    const attempt = {
      accountId,
      companyId: company.companyId,
      command,
      body: JSON.stringify(command),
    };
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({ accountId, companyId: company.companyId, body: attempt.body }),
      );
      setPending(attempt);
      void send(attempt);
    } catch {
      setMessage('Не удалось сохранить выбор. Приём не отправлен.');
    }
  }

  const candidates = company.characters.flatMap((character) =>
    character.perkChoices?.length ? [{ character, choices: character.perkChoices }] : [],
  );
  if (!candidates.length && !pending && !message) return null;
  const pendingCharacter =
    pending &&
    company.characters.find(
      (character) => character.characterId === pending.command.payload.characterId,
    );
  const pendingChoice =
    pending &&
    pendingCharacter?.perkChoices?.find(
      (choice) => choice.perkId === pending.command.payload.perkId,
    );

  return (
    <section className="perk-selection-panel" aria-label="Выбор боевого приёма">
      <h3 className="panel-subtitle">Новый приём</h3>
      {candidates.map(({ character, choices }) => (
        <div className="perk-selection-choice" key={character.characterId}>
          <p>Выберите специализацию владения клинком для бойца «{character.name}».</p>
          <div className="perk-selection-actions">
            {choices.map((choice) => (
              <button
                type="button"
                className="action"
                key={choice.perkId}
                disabled={busy || Boolean(pending) || company.runStatus !== 'ACTIVE'}
                onClick={() => choose(character.characterId, choice.perkId)}
              >
                {perkEffectLabel(choice.effect.attribute, choice.effect.value)}
              </button>
            ))}
          </div>
        </div>
      ))}
      {pending && (
        <div className="perk-selection-pending" role="status">
          <p>
            {pendingCharacter?.name ?? 'Боец'}:{' '}
            {pendingChoice
              ? perkEffectLabel(pendingChoice.effect.attribute, pendingChoice.effect.value)
              : 'выбор приёма'}
            .{' '}
            {busy ? 'Отправляем сохранённый приказ…' : 'Ответ неизвестен. Повторите тот же выбор.'}
          </p>
          <button
            type="button"
            className="action"
            disabled={busy}
            onClick={() => void send(pending)}
          >
            Повторить тот же выбор
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="state-note">
          {message}
        </p>
      )}
    </section>
  );
}
