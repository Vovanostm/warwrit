import { useEffect, useRef, useState } from 'react';
import {
  WORLD_EXPECTED_COMPANY_ID_HEADER,
  isCompanyEntityId,
  type CompanyRetrainingResponseDto,
  type CompanySummaryDto,
  type OrdinaryPlayerCompanyCommandV2Dto,
} from '@warwrit/protocol';
import { formatCrowns } from './format.js';
import { lookup } from '../i18n/index.js';
import './retraining-panel.css';

const api = (import.meta.env['VITE_API_BASE_URL'] ?? '/api').replace(/\/$/u, '');
const COURSE_ID = 'retraining.kamenny-brod.blades-25';
const STORAGE_PREFIX = 'warwrit:retraining:v1';

type StartCommand = Extract<
  OrdinaryPlayerCompanyCommandV2Dto,
  { readonly type: 'StartRetraining' | 'StopLearning' }
>;
type Scope = { readonly accountId: string; readonly companyId: string };
type Attempt = { readonly scope: Scope; readonly command: StartCommand; readonly body: string };
type CommandResult =
  | { readonly kind: 'ACCEPTED' }
  | { readonly kind: 'REJECTED'; readonly code: string }
  | { readonly kind: 'SCOPE' }
  | { readonly kind: 'UNKNOWN' };

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

function storageKey(scope: Scope) {
  return `${STORAGE_PREFIX}:${encodeURIComponent(scope.accountId)}:${encodeURIComponent(scope.companyId)}`;
}

function readAttempt(raw: string | null, scope: Scope): Attempt | undefined {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    const envelope = parsed as Record<string, unknown>;
    if (envelope['accountId'] !== scope.accountId || envelope['companyId'] !== scope.companyId)
      return undefined;
    const body = envelope['body'];
    if (typeof body !== 'string') return undefined;
    const value: unknown = JSON.parse(body);
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      JSON.stringify(value) !== body
    )
      return undefined;
    const command = value as Record<string, unknown>;
    if (
      Object.keys(command).toSorted().join('\0') !==
        'commandId\0expectedPublicRevision\0payload\0schemaVersion\0type' ||
      command['schemaVersion'] !== 2 ||
      !isCompanyEntityId(command['commandId']) ||
      typeof command['expectedPublicRevision'] !== 'string' ||
      !/^(0|[1-9][0-9]*)$/u.test(command['expectedPublicRevision']) ||
      !command['payload'] ||
      typeof command['payload'] !== 'object' ||
      Array.isArray(command['payload'])
    )
      return undefined;
    const payload = command['payload'] as Record<string, unknown>;
    if (command['type'] === 'StartRetraining') {
      if (
        Object.keys(payload).toSorted().join('\0') !==
          'characterId\0courseId\0newPerkId\0oldPerkId' ||
        payload['courseId'] !== COURSE_ID ||
        ![payload['characterId'], payload['oldPerkId'], payload['newPerkId']].every(
          isCompanyEntityId,
        )
      )
        return undefined;
    } else if (
      command['type'] !== 'StopLearning' ||
      Object.keys(payload).join('\0') !== 'taskId' ||
      !isCompanyEntityId(payload['taskId'])
    ) {
      return undefined;
    }
    return {
      scope: { ...scope },
      command: command as unknown as StartCommand,
      body,
    };
  } catch {
    return undefined;
  }
}

function isRetrainingResponse(value: unknown): value is CompanyRetrainingResponseDto {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const dto = value as Record<string, unknown>;
  if (
    !isRevision(dto['publicRevision']) ||
    !dto['retraining'] ||
    typeof dto['retraining'] !== 'object'
  )
    return false;
  const info = dto['retraining'] as Record<string, unknown>;
  if (
    !isCompanyEntityId(info['courseId']) ||
    !isCompanyEntityId(info['providerId']) ||
    !isCompanyEntityId(info['skillId']) ||
    !isPositiveAmount(info['durationTicks']) ||
    !isAmount(info['costQPerDay']) ||
    !['AVAILABLE', 'IN_PROGRESS', 'COMPLETE', 'STOPPED', 'INTERRUPTED', 'UNAVAILABLE'].includes(
      String(info['status']),
    ) ||
    !Array.isArray(info['learners'])
  )
    return false;
  if (
    info['unavailableReason'] !== undefined &&
    !['NOT_LOCAL', 'OTHER_LEARNING', 'NO_ELIGIBLE_LEARNER'].includes(
      String(info['unavailableReason']),
    )
  )
    return false;
  if (
    info['learners'].length > 128 ||
    !info['learners'].every((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
      const learner = value as Record<string, unknown>;
      return (
        isCompanyEntityId(learner['characterId']) &&
        isCompanyEntityId(learner['masteredPerkId']) &&
        isCompanyEntityId(learner['replacementPerkId'])
      );
    })
  )
    return false;
  if (info['progress'] !== undefined) {
    const progress = info['progress'];
    if (!progress || typeof progress !== 'object' || Array.isArray(progress)) return false;
    const entry = progress as Record<string, unknown>;
    if (
      !isCompanyEntityId(entry['taskId']) ||
      !isCompanyEntityId(entry['learnerId']) ||
      !isCompanyEntityId(entry['oldPerkId']) ||
      !isCompanyEntityId(entry['newPerkId']) ||
      !isAmount(entry['acceptedTicks']) ||
      !isAmount(entry['remainingTicks']) ||
      !isAmount(entry['chargedQ'])
    )
      return false;
  }
  return true;
}

function isRevision(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 128 && /^(0|[1-9][0-9]*)$/u.test(value);
}

function isAmount(value: unknown): value is string {
  return isRevision(value);
}

function isPositiveAmount(value: unknown): value is string {
  return isAmount(value) && BigInt(value) > 0n;
}

function classifyCommand(status: number, value: unknown, commandId: string): CommandResult {
  if (!isRecord(value)) return { kind: 'UNKNOWN' };
  const keys = Object.keys(value).toSorted().join('|');
  if (status === 403 && keys === 'error' && value['error'] === 'company required')
    return { kind: 'SCOPE' };
  if (value['commandId'] !== commandId || !isRevision(value['publicRevision']))
    return { kind: 'UNKNOWN' };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function perkName(id: string) {
  return id === 'blades-25-a' ? 'точность' : id === 'blades-25-b' ? 'инициатива' : id;
}

function elapsedDays(ticks: string, ticksPerDay: number) {
  const ticksValue = BigInt(ticks);
  if (!Number.isSafeInteger(ticksPerDay) || ticksPerDay <= 0) return `${ticks} тактов`;
  const dayTicks = BigInt(ticksPerDay);
  if (dayTicks <= 0n) return `${ticks} тактов`;
  const days = ticksValue / dayTicks;
  const remainder = ticksValue % dayTicks;
  if (remainder === 0n) return `${days.toLocaleString('ru-RU')} ${dayWord(Number(days))}`;
  const tenths = Number((remainder * 10n + dayTicks / 2n) / dayTicks);
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(Number(days) + tenths / 10)} ${dayWord(Number(days) + tenths / 10)}`;
}

function dayWord(days: number) {
  const rule = new Intl.PluralRules('ru-RU').select(days);
  return rule === 'one' ? 'день' : rule === 'few' ? 'дня' : 'дней';
}

function providerLabel(providerId: string) {
  return providerId === 'npc.city-watch-contact.kamenny-brod.01'
    ? 'Гордей Лапа, десятник стражи'
    : (lookup(providerId) ?? 'учитель отряда');
}

export function RetrainingPanel(props: {
  readonly accountId: string;
  readonly company: CompanySummaryDto;
  readonly ticksPerDay: number;
  readonly onRefresh: () => void;
}) {
  const scope = { accountId: props.accountId, companyId: props.company.companyId };
  const key = storageKey(scope);
  const [readback, setReadback] = useState<CompanyRetrainingResponseDto>();
  const [pending, setPending] = useState<Attempt>();
  const [readError, setReadError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const activeScope = useRef(`${scope.accountId}\0${scope.companyId}`);
  const postController = useRef<AbortController | undefined>(undefined);
  const [retryRead, setRetryRead] = useState(0);

  useEffect(() => {
    const scopeId = `${scope.accountId}\0${scope.companyId}`;
    activeScope.current = scopeId;
    setReadback(undefined);
    setMessage(undefined);
    try {
      setPending(readAttempt(sessionStorage.getItem(key), scope));
    } catch {
      setPending(undefined);
    }
    setReadError(undefined);
    const controller = new AbortController();
    void fetch(`${api}/company/retraining/kamenny-brod`, {
      credentials: 'same-origin',
      headers: { [WORLD_EXPECTED_COMPANY_ID_HEADER]: scope.companyId },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 409 ? 'SCOPE' : 'READ');
        const value: unknown = await response.json();
        if (!isRetrainingResponse(value)) throw new Error('READ');
        if (activeScope.current === scopeId) {
          setReadback(value);
          setReadError(undefined);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || activeScope.current !== scopeId) return;
        setReadError(
          error instanceof Error && error.message === 'SCOPE'
            ? 'Компания изменилась. Обновите сведения о переобучении.'
            : 'Не удалось прочитать предложение Гордея. Повторите загрузку.',
        );
      });
    return () => {
      controller.abort();
      postController.current?.abort();
    };
  }, [key, scope.accountId, scope.companyId, props.company.revision, retryRead]);

  function prepare(characterId: string, oldPerkId: string, newPerkId: string): Attempt | undefined {
    const command: StartCommand = {
      schemaVersion: 2,
      commandId: crypto.randomUUID(),
      expectedPublicRevision: readback?.publicRevision ?? props.company.revision,
      type: 'StartRetraining',
      payload: { courseId: COURSE_ID, characterId, oldPerkId, newPerkId },
    };
    const attempt: Attempt = { scope, command, body: JSON.stringify(command) };
    try {
      sessionStorage.setItem(key, JSON.stringify({ ...scope, body: attempt.body }));
      setPending(attempt);
      return attempt;
    } catch {
      setMessage('Не удалось сохранить приказ. Переобучение не начато.');
      return undefined;
    }
  }

  function stop() {
    if (info?.status !== 'IN_PROGRESS' || !info.progress || pending) return;
    const command = {
      schemaVersion: 2,
      commandId: crypto.randomUUID(),
      expectedPublicRevision: readback?.publicRevision ?? props.company.revision,
      type: 'StopLearning',
      payload: { taskId: info.progress.taskId },
    } satisfies Extract<StartCommand, { readonly type: 'StopLearning' }>;
    const attempt: Attempt = { scope, command, body: JSON.stringify(command) };
    try {
      sessionStorage.setItem(key, JSON.stringify({ ...scope, body: attempt.body }));
      setPending(attempt);
      void send(attempt);
    } catch {
      setMessage('Не удалось сохранить приказ. Курс не остановлен.');
    }
  }

  async function send(attempt: Attempt | undefined) {
    if (!attempt || lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage(undefined);
    const scopeId = `${scope.accountId}\0${scope.companyId}`;
    const controller = new AbortController();
    postController.current = controller;
    try {
      const response = await fetch(`${api}/company/commands`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          [WORLD_EXPECTED_COMPANY_ID_HEADER]: attempt.scope.companyId,
        },
        body: attempt.body,
        signal: controller.signal,
      });
      if (activeScope.current !== scopeId) return;
      const value: unknown = await response.json().catch(() => undefined);
      const result = classifyCommand(response.status, value, attempt.command.commandId);
      if (result.kind === 'ACCEPTED') {
        sessionStorage.removeItem(key);
        setPending(undefined);
        setMessage(
          attempt.command.type === 'StopLearning'
            ? 'Курс остановлен. Прежний приём остался у бойца; плата учтена за прошедшее время.'
            : 'Курс начался. Прежний приём останется у бойца до конца занятий.',
        );
        props.onRefresh();
        setRetryRead((value) => value + 1);
      } else if (result.kind === 'REJECTED') {
        sessionStorage.removeItem(key);
        setPending(undefined);
        setMessage(rejectionText(result.code));
        props.onRefresh();
        setRetryRead((value) => value + 1);
      } else if (result.kind === 'SCOPE') {
        sessionStorage.removeItem(key);
        setPending(undefined);
        setMessage('Компания изменилась. Обновите сведения и начните снова.');
      } else {
        setMessage(
          response.status === 401
            ? 'Войдите снова и повторите тот же приказ.'
            : 'Ответ неизвестен. Повторите тот же приказ о переобучении.',
        );
      }
    } catch {
      if (activeScope.current === scopeId)
        setMessage('Ответ неизвестен. Повторите тот же приказ о переобучении.');
    } finally {
      if (postController.current === controller) postController.current = undefined;
      if (activeScope.current === scopeId) {
        lock.current = false;
        setBusy(false);
      }
    }
  }

  const info = readback?.retraining;
  const progress = info?.progress;
  const lastHistory = progress !== undefined && info?.status !== 'IN_PROGRESS';
  if (!readback && !readError) return null;
  if (
    readback &&
    info?.status === 'UNAVAILABLE' &&
    !progress &&
    pending === undefined &&
    !message &&
    !readError
  )
    return null;

  return (
    <section className="retraining-panel" aria-label="Переобучение у Гордея Лапы">
      <h3 className="panel-subtitle">Переобучение у Гордея Лапы</h3>
      {info && <p className="state-note">Курс проводит {providerLabel(info.providerId)}.</p>}
      {readError && (
        <p role="status" className="state-note">
          {readError}
        </p>
      )}
      {readError && (
        <button
          type="button"
          className="action action-quiet"
          onClick={() => setRetryRead((value) => value + 1)}
        >
          Повторить загрузку
        </button>
      )}
      {info && (
        <p className="state-note">
          Курс длится {elapsedDays(info.durationTicks, props.ticksPerDay)}. За каждый игровой день
          занятий Гордей берёт {formatCrowns(info.costQPerDay)} кр.
        </p>
      )}
      {pending && (
        <div role="status" className="retraining-pending">
          <p>
            {busy
              ? 'Отправляем сохранённый приказ…'
              : 'Ответ на приказ неизвестен. Повторите его без изменений.'}
          </p>
          <button
            type="button"
            className="action"
            disabled={busy}
            onClick={() => void send(pending)}
          >
            Повторить тот же приказ
          </button>
        </div>
      )}
      {(info?.status === 'AVAILABLE' || info?.status === 'COMPLETE') &&
        info.learners.length > 0 &&
        !pending &&
        info.learners.map((learner) => (
          <div className="retraining-choice" key={learner.characterId}>
            <p>
              {props.company.characters.find(
                (character) => character.characterId === learner.characterId,
              )?.name ?? 'Боец'}
              : {perkName(learner.masteredPerkId)} +3 → {perkName(learner.replacementPerkId)} +3.
            </p>
            <p className="state-note">
              Пока курс не закончился, боец сохраняет прежний приём. Новый появится после занятий.
            </p>
            <button
              type="button"
              className="action"
              disabled={busy || props.company.runStatus !== 'ACTIVE'}
              onClick={() => {
                const attempt = prepare(
                  learner.characterId,
                  learner.masteredPerkId,
                  learner.replacementPerkId,
                );
                if (attempt) void send(attempt);
              }}
            >
              Начать переобучение
            </button>
          </div>
        ))}
      {info?.status === 'UNAVAILABLE' && !progress && !pending && (
        <p className="state-note">
          {info.unavailableReason === 'NOT_LOCAL'
            ? 'Для курса нужно быть у Гордея в Каменном Броде.'
            : info.unavailableReason === 'OTHER_LEARNING'
              ? 'Сначала завершите или остановите другое обучение.'
              : 'Сейчас в отряде нет бойца, который может пройти этот курс.'}
        </p>
      )}
      {progress && (
        <div className="retraining-progress">
          <p>
            {props.company.characters.find(
              (character) => character.characterId === progress.learnerId,
            )?.name ?? 'Боец'}
            : {perkName(progress.oldPerkId)} +3 → {perkName(progress.newPerkId)} +3.
            {info.status === 'IN_PROGRESS'
              ? ' Старый приём пока действует.'
              : info.status === 'COMPLETE'
                ? ' Боец освоил новый приём.'
                : ' Старый приём сохранён.'}
          </p>
          <p className="state-note">
            {lastHistory ? 'История последнего курса: ' : 'Принято времени: '}
            {elapsedDays(progress.acceptedTicks, props.ticksPerDay)} · оплачено{' '}
            {formatCrowns(progress.chargedQ)} кр.
            {info.status === 'IN_PROGRESS' &&
              ` · осталось ${elapsedDays(progress.remainingTicks, props.ticksPerDay)}`}
          </p>
          {info.status === 'IN_PROGRESS' && (
            <button
              type="button"
              className="action action-quiet"
              disabled={busy || Boolean(pending)}
              onClick={stop}
            >
              Остановить переобучение
            </button>
          )}
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

function rejectionText(code: string) {
  return code === 'STALE_REVISION'
    ? 'Предложение изменилось. Обновите сведения и выберите снова.'
    : code === 'NOT_AUTHORIZED'
      ? 'Нет доступа к этой компании. Обновите сведения.'
      : 'Приказ отклонён: переобучение сейчас недоступно. Обновите сведения.';
}
