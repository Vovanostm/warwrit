import { useEffect, useRef, useState } from 'react';
import {
  WORLD_EXPECTED_COMPANY_ID_HEADER,
  isCompanyEntityId,
  type CompanyCourseResponseDto,
  type CompanyHoldingsDto,
  type OrdinaryPlayerCompanyCommandV2Dto,
  type CompanySummaryDto,
} from '@warwrit/protocol';
import { formatCrowns, itemLabel } from './format.js';
import './course-panel.css';

const API_BASE_URL = (import.meta.env['VITE_API_BASE_URL'] ?? '/api').replace(/\/$/u, '');
const SITE_ID = 'kamenny-brod';
const STORAGE_PREFIX = 'warwrit:company-course:v1';
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

type CourseView = CompanyCourseResponseDto['course'];
type CourseCommand = Extract<
  OrdinaryPlayerCompanyCommandV2Dto,
  { type: 'StartLearning' | 'StopLearning' }
>;
type StoredAttempt = {
  readonly accountId: string;
  readonly companyId: string;
  readonly request: CourseCommand;
};
type CourseState =
  | { readonly scopeKey: string; readonly status: 'loading' }
  | { readonly scopeKey: string; readonly status: 'error'; readonly message: string }
  | { readonly scopeKey: string; readonly status: 'ready'; readonly course: CourseView };
type CommandResult =
  | { readonly kind: 'ACCEPTED' }
  | { readonly kind: 'REJECTED'; readonly code: string }
  | { readonly kind: 'UNKNOWN' };

export function CoursePanel(props: {
  readonly accountId: string;
  readonly company: CompanySummaryDto;
  readonly holdings: CompanyHoldingsDto | undefined;
  readonly onRefresh: () => void;
}) {
  const companyId = props.company.companyId;
  const scopeKey = `${props.accountId}\u0000${companyId}`;
  const storageKey = `${STORAGE_PREFIX}:${encodeURIComponent(props.accountId)}:${encodeURIComponent(companyId)}:${SITE_ID}`;
  const scopeRef = useRef(scopeKey);
  scopeRef.current = scopeKey;
  const lock = useRef(false);
  const [quoteRetry, setQuoteRetry] = useState(0);
  const [courseState, setCourseState] = useState<CourseState>({ scopeKey, status: 'loading' });
  const [stored, setStored] = useState<{
    readonly key: string;
    readonly attempt: StoredAttempt | undefined;
  }>(() => ({ key: storageKey, attempt: readAttempt(storageKey, props.accountId, companyId) }));
  const [busy, setBusy] = useState(false);
  const [messageState, setMessageState] = useState<{
    readonly scopeKey: string;
    readonly text: string;
  }>();
  const [learnerId, setLearnerId] = useState('');
  const [selectedResources, setSelectedResources] = useState<readonly string[]>([]);
  const pending =
    stored.key === storageKey
      ? stored.attempt
      : readAttempt(storageKey, props.accountId, companyId);
  const course =
    courseState.scopeKey === scopeKey && courseState.status === 'ready'
      ? courseState.course
      : undefined;
  const visibleState =
    courseState.scopeKey === scopeKey ? courseState : { scopeKey, status: 'loading' as const };
  const message = messageState?.scopeKey === scopeKey ? messageState.text : undefined;
  const setMessage = (text: string) => setMessageState({ scopeKey, text });

  useEffect(() => {
    setStored({ key: storageKey, attempt: readAttempt(storageKey, props.accountId, companyId) });
  }, [storageKey, props.accountId, companyId]);

  useEffect(() => {
    const controller = new AbortController();
    setCourseState({ scopeKey, status: 'loading' });
    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/company/courses/${SITE_ID}`, {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId },
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error('Не удалось проверить условия обучения. Повторите запрос.');
        const result = readCourseResponse(await response.json());
        if (!result) throw new Error('Сведения об обучении неполны. Обновите данные.');
        if (controller.signal.aborted || scopeRef.current !== scopeKey) return;
        setCourseState({ scopeKey, status: 'ready', course: result });
        // The quote endpoint may advance elapsed course time at the current world tick.
        props.onRefresh();
        const firstLearner = result.learners[0];
        setLearnerId((current) =>
          result.learners.some((entry) => entry.characterId === current)
            ? current
            : (firstLearner?.characterId ?? ''),
        );
        setSelectedResources((current) => {
          const learner =
            result.learners.find((entry) => entry.characterId === learnerId) ?? firstLearner;
          if (!learner) return [];
          const available = current.filter((id) => learner.resourceIds.includes(id));
          return available.length ? available : learner.resourceIds.slice(0, 1);
        });
      } catch (error) {
        if (controller.signal.aborted || scopeRef.current !== scopeKey) return;
        props.onRefresh();
        setCourseState({
          scopeKey,
          status: 'error',
          message:
            error instanceof Error ? error.message : 'Не удалось проверить условия обучения.',
        });
      }
    })();
    return () => controller.abort();
  }, [companyId, props.accountId, quoteRetry, scopeKey]);

  const activeLearnerId = learnerId || course?.learners[0]?.characterId || '';
  const activeLearner = course?.learners.find((entry) => entry.characterId === activeLearnerId);
  const resources = activeLearner?.resourceIds ?? [];

  async function command(request?: CourseCommand) {
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
        setMessage('Ответ на приказ не пришёл. Повторите его без изменений.');
        return;
      }
      sessionStorage.removeItem(storageKey);
      setStored({ key: storageKey, attempt: undefined });
      setMessage(
        result.kind === 'ACCEPTED'
          ? attempt.request.type === 'StartLearning'
            ? 'Обучение началось. Плата будет списываться только за прошедшее время.'
            : 'Обучение остановлено. Оплата учтена за прошедшее время.'
          : rejectionText(result.code),
      );
      setQuoteRetry((revision) => revision + 1);
    } catch {
      if (scopeRef.current === scopeKey)
        setMessage('Ответ на приказ не пришёл. Повторите его без изменений.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function start() {
    if (!course || !activeLearner || selectedResources.length === 0 || pending) return;
    void command({
      schemaVersion: 2,
      commandId: crypto.randomUUID(),
      expectedPublicRevision: props.company.revision,
      type: 'StartLearning',
      payload: {
        courseId: course.courseId,
        characterId: activeLearner.characterId,
        resourceIds: selectedResources,
      },
    });
  }

  function stop() {
    if (!course?.progress || pending) return;
    void command({
      schemaVersion: 2,
      commandId: crypto.randomUUID(),
      expectedPublicRevision: props.company.revision,
      type: 'StopLearning',
      payload: { taskId: course.progress.taskId },
    });
  }

  const durationDays = course ? BigInt(course.durationTicks) / 1000n : 0n;
  const totalCostQ = course ? (BigInt(course.costQPerDay) * durationDays).toString() : '0';

  return (
    <section className="panel course-panel" aria-label="Обучение в караульне">
      <h2 className="panel-title">Обучение у Гордея Лапы</h2>
      {visibleState.status === 'loading' && (
        <p className="state-note" role="status">
          Проверяем условия обучения…
        </p>
      )}
      {visibleState.status === 'error' && (
        <div role="alert" className="course-panel-error">
          <p>{visibleState.message}</p>
          <button
            type="button"
            className="action action-quiet"
            onClick={() => setQuoteRetry((value) => value + 1)}
          >
            Обновить условия
          </button>
        </div>
      )}
      {course && (
        <>
          <p className="course-panel-terms">
            Навык: {skillName(course.skillId)} · {durationDays.toString()} игровых дня ×{' '}
            {formatCrowns(course.costQPerDay)} кр. в день · максимум {formatCrowns(totalCostQ)} кр.
          </p>
          <p className="state-note">
            Плата начисляется только за прошедшее время. Обучение можно остановить в любой момент.
          </p>
          {course.progress && (
            <div className="course-panel-progress">
              <p>
                Ученик: {characterName(props.company, course.progress.learnerId)} · пройдено{' '}
                {formatGameDays(course.progress.acceptedTicks)} из{' '}
                {formatGameDays(course.durationTicks)} игровых дней.
              </p>
              <p>
                Осталось: {formatGameDays(course.progress.remainingTicks)}{' '}
                {gameDayUnit(course.progress.remainingTicks)} · уже списано{' '}
                {formatCrowns(course.progress.chargedQ)} кр.
              </p>
              {course.status === 'IN_PROGRESS' && (
                <button
                  type="button"
                  className="action action-quiet"
                  disabled={busy || Boolean(pending)}
                  onClick={stop}
                >
                  Остановить обучение
                </button>
              )}
            </div>
          )}
          {course.status === 'COMPLETE' && <p className="state-note">Курс завершён.</p>}
          {course.status === 'UNAVAILABLE' && (
            <p className="state-note">{unavailableText(course.unavailableReason)}</p>
          )}
          {(course.status === 'AVAILABLE' ||
            (course.status === 'COMPLETE' && course.learners.length > 0)) && (
            <div className="course-panel-choice">
              {course.learners.length === 0 ? (
                <p className="state-note">Сейчас в отряде нет подходящего ученика.</p>
              ) : (
                <>
                  <label>
                    <span>Кто будет учиться</span>
                    <select
                      value={activeLearner?.characterId ?? ''}
                      disabled={busy || Boolean(pending)}
                      onChange={(event) => {
                        const next = course.learners.find(
                          (entry) => entry.characterId === event.target.value,
                        );
                        setLearnerId(next?.characterId ?? '');
                        setSelectedResources(next?.resourceIds.slice(0, 1) ?? []);
                      }}
                    >
                      {course.learners.map((learner) => (
                        <option key={learner.characterId} value={learner.characterId}>
                          {characterName(props.company, learner.characterId)} · уровень{' '}
                          {learner.currentLevel}
                        </option>
                      ))}
                    </select>
                  </label>
                  <fieldset disabled={busy || Boolean(pending) || !activeLearner}>
                    <legend>Предметы для занятий</legend>
                    {resources.map((resourceId) => (
                      <label key={resourceId} className="course-panel-resource">
                        <input
                          type="checkbox"
                          checked={selectedResources.includes(resourceId)}
                          onChange={(event) =>
                            setSelectedResources((current) =>
                              event.target.checked
                                ? [...new Set([...current, resourceId])]
                                : current.filter((id) => id !== resourceId),
                            )
                          }
                        />
                        <span>{resourceName(props.company, props.holdings, resourceId)}</span>
                      </label>
                    ))}
                  </fieldset>
                  <button
                    type="button"
                    className="action"
                    disabled={
                      busy || Boolean(pending) || !activeLearner || selectedResources.length === 0
                    }
                    onClick={start}
                  >
                    {busy ? 'Отправляем приказ…' : 'Начать обучение'}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
      {pending && (
        <div className="course-panel-pending" role="status">
          <p>Ответ на приказ неизвестен. Повторите тот же приказ, чтобы узнать результат.</p>
          <button type="button" className="action" disabled={busy} onClick={() => void command()}>
            {busy ? 'Повторяем приказ…' : 'Повторить тот же приказ'}
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

function readCourseResponse(value: unknown): CourseView | undefined {
  if (!record(value) || !record(value['course'])) return undefined;
  const course = value['course'];
  if (
    !isCompanyEntityId(course['courseId']) ||
    !isCompanyEntityId(course['providerId']) ||
    !isCompanyEntityId(course['skillId']) ||
    !revision(course['durationTicks']) ||
    BigInt(course['durationTicks']) <= 0n ||
    !amount(course['costQPerDay']) ||
    BigInt(course['costQPerDay']) <= 0n ||
    !['AVAILABLE', 'IN_PROGRESS', 'COMPLETE', 'UNAVAILABLE'].includes(String(course['status'])) ||
    !Array.isArray(course['learners'])
  )
    return undefined;
  const learners: CourseView['learners'][number][] = [];
  for (const learner of course['learners']) {
    if (
      !record(learner) ||
      !isCompanyEntityId(learner['characterId']) ||
      !Number.isSafeInteger(learner['currentLevel']) ||
      (learner['currentLevel'] as number) < 0 ||
      !Array.isArray(learner['resourceIds']) ||
      !learner['resourceIds'].every(isCompanyEntityId)
    )
      return undefined;
    learners.push({
      characterId: learner['characterId'],
      currentLevel: learner['currentLevel'] as number,
      resourceIds: learner['resourceIds'],
    });
  }
  const reason = course['unavailableReason'];
  if (
    reason !== undefined &&
    !['NOT_LOCAL', 'NO_RESOURCE', 'NO_ELIGIBLE_LEARNER', 'OTHER_LEARNING'].includes(String(reason))
  )
    return undefined;
  let progress: CourseView['progress'];
  if (course['progress'] !== undefined) {
    const value = course['progress'];
    if (
      !record(value) ||
      !isCompanyEntityId(value['taskId']) ||
      !isCompanyEntityId(value['learnerId']) ||
      !revision(value['acceptedTicks']) ||
      !revision(value['remainingTicks']) ||
      !amount(value['chargedQ'])
    )
      return undefined;
    progress = {
      taskId: value['taskId'],
      learnerId: value['learnerId'],
      acceptedTicks: value['acceptedTicks'],
      remainingTicks: value['remainingTicks'],
      chargedQ: value['chargedQ'],
    };
  }
  return {
    courseId: course['courseId'],
    providerId: course['providerId'],
    skillId: course['skillId'],
    durationTicks: course['durationTicks'],
    costQPerDay: course['costQPerDay'],
    status: course['status'] as CourseView['status'],
    ...(reason === undefined
      ? {}
      : { unavailableReason: reason as NonNullable<CourseView['unavailableReason']> }),
    learners,
    ...(progress ? { progress } : {}),
  };
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
    if (
      request['schemaVersion'] !== 2 ||
      !isCompanyEntityId(request['commandId']) ||
      !revision(request['expectedPublicRevision']) ||
      !record(request['payload'])
    )
      return undefined;
    if (
      request['type'] === 'StartLearning' &&
      isCompanyEntityId(request['payload']['courseId']) &&
      isCompanyEntityId(request['payload']['characterId']) &&
      Array.isArray(request['payload']['resourceIds']) &&
      request['payload']['resourceIds'].length > 0 &&
      request['payload']['resourceIds'].every(isCompanyEntityId)
    )
      return { accountId, companyId, request: request as unknown as CourseCommand };
    if (request['type'] === 'StopLearning' && isCompanyEntityId(request['payload']['taskId']))
      return { accountId, companyId, request: request as unknown as CourseCommand };
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
function characterName(company: CompanySummaryDto, characterId: string): string {
  return (
    company.characters.find((character) => character.characterId === characterId)?.name ??
    'участник'
  );
}
function resourceName(
  company: CompanySummaryDto,
  holdings: CompanyHoldingsDto | undefined,
  resourceId: string,
): string {
  const item = holdings?.items.find((entry) => entry.itemId === resourceId);
  if (!item) return 'Снаряжение для занятий';
  const carrierId = item.equippedBy ?? item.carrierCharacterId;
  const location = carrierId ? characterName(company, carrierId) : 'в обозе';
  return `${itemLabel(item.definitionId)} · ${location}`;
}
function skillName(skillId: string): string {
  return skillId === 'blades' ? 'Клинки' : skillId;
}
function formatGameDays(ticks: string): string {
  const scaled = (BigInt(ticks) * 100n) / 1000n;
  const whole = scaled / 100n;
  const fraction = (scaled % 100n).toString().padStart(2, '0').replace(/0+$/u, '');
  return `${whole}${fraction ? `,${fraction}` : ''}`;
}
function gameDayUnit(ticks: string): string {
  const hundredths = (BigInt(ticks) * 100n) / 1000n;
  if (hundredths % 100n !== 0n) return 'игрового дня';
  const days = Number(hundredths / 100n);
  const lastTwo = days % 100;
  const last = days % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'игровых дней';
  if (last === 1) return 'игровой день';
  if (last >= 2 && last <= 4) return 'игровых дня';
  return 'игровых дней';
}
function unavailableText(reason: CourseView['unavailableReason']): string {
  switch (reason) {
    case 'NOT_LOCAL':
      return 'Отряд должен стоять у караульни и иметь возможность поговорить с Гордеем.';
    case 'NO_RESOURCE':
      return 'В отряде нет подходящих предметов для занятий.';
    case 'OTHER_LEARNING':
      return 'Сначала завершите или остановите другое обучение.';
    case 'NO_ELIGIBLE_LEARNER':
      return 'В отряде нет подходящего ученика с доступом к нужным предметам.';
    default:
      return 'Обучение сейчас недоступно.';
  }
}
function rejectionText(code: string): string {
  const messages: Record<string, string> = {
    INVALID_COMMAND: 'Приказ не удалось выполнить.',
    NOT_AUTHORIZED: 'Компания изменилась. Обновите сведения перед новым приказом.',
    CONTACT_OR_ACCESS_REQUIRED:
      'Обучение доступно только у караульни в Каменном Броде при контакте с Гордеем.',
    UNSUPPORTED_ACTION: 'Обучение сейчас недоступно.',
    IDEMPOTENCY_CONFLICT: 'Этот приказ уже использован. Обновите сведения отряда.',
    STALE_REVISION: 'Состояние отряда изменилось. Выберите действие снова.',
    INSUFFICIENT_ITEMS: 'Подходящий предмет больше недоступен.',
    INSUFFICIENT_STAMINA: 'Ученик не может продолжить занятие.',
    INSUFFICIENT_FUNDS: 'В отряде не хватает денег на прошедшее время обучения.',
    CAPACITY: 'Приказ не удалось выполнить.',
    OUT_OF_STOCK: 'Нужный предмет закончился.',
  };
  return messages[code] ?? 'Сервер отклонил приказ. Сведения отряда обновлены.';
}
