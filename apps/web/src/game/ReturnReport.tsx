import { useEffect, useRef, useState } from 'react';
import type {
  CompanyReturnReportDto,
  CompanyReturnReportEventDto,
  CompanyReturnReportEventType,
} from '@warwrit/protocol';
import {
  COMPANY_RETURN_REPORT_EVENT_TYPES,
  WORLD_EXPECTED_COMPANY_ID_HEADER,
} from '@warwrit/protocol';
import { formatCrowns } from './format.js';
import { lookup } from '../i18n/index.js';
import './ReturnReport.css';

type ReturnReportEvent = Pick<CompanyReturnReportEventDto, 'atTick' | 'subjectIds'> & {
  readonly type: string;
};
type SafeReturnReport = Omit<CompanyReturnReportDto, 'events'> & {
  readonly events: readonly ReturnReportEvent[];
};
type Scope = { readonly accountId: string; readonly companyId: string };
type State =
  | { readonly scopeKey: string; readonly status: 'loading' }
  | { readonly scopeKey: string; readonly status: 'empty' | 'closed' }
  | { readonly scopeKey: string; readonly status: 'error'; readonly message: string }
  | {
      readonly scopeKey: string;
      readonly status: 'report';
      readonly report: SafeReturnReport;
      readonly acknowledging: boolean;
      readonly ackError?: string;
    };

const API_BASE_URL = import.meta.env['VITE_API_BASE_URL'] ?? '/api';
const INTEGER = /^(0|[1-9][0-9]{0,127})$/u;
const MONEY = /^-?(0|[1-9][0-9]{0,127})$/u;
const DECIMAL_DAYS = /^(0|[1-9][0-9]{0,127})(?:\.[0-9]{1,3})?$/u;
const EVENT_TYPES = new Set<string>(COMPANY_RETURN_REPORT_EVENT_TYPES);

function contractOutcomeTextKey(
  outcome: NonNullable<CompanyReturnReportDto['contractOutcomes']>[number],
): string {
  if (outcome.instanceId === 'ci.m1.stretcher-and-sword.01') {
    const key =
      outcome.outcome === 'LUKA_RESCUED'
        ? 'luka-rescued'
        : outcome.outcome === 'NASTYA_ONLY'
          ? 'nastya-only'
          : outcome.outcome === 'LUKA_DEATH_OBSERVED'
            ? 'luka-death-observed'
            : 'luka-recruit-offer';
    return `contract.ci.m1.stretcher-and-sword.01.report.${key}`;
  }
  if (outcome.instanceId === 'ci.m1.whose-wolves.01') {
    const key =
      outcome.outcome === 'WOLVES_PACK_KILLED'
        ? 'pack-killed'
        : outcome.outcome === 'WOLVES_PACK_SPARED'
          ? 'pack-spared'
          : 'raid';
    return `contract.ci.m1.whose-wolves.01.report.${key}`;
  }
  if (outcome.instanceId === 'ci.m1.foul-well.01') {
    const key =
      outcome.outcome === 'FOUL_WELL_TRUTH_REPORTED'
        ? 'truth-reported'
        : outcome.outcome === 'FOUL_WELL_AGHAFYA_ACCUSED'
          ? 'aghafya-accused'
          : 'herbalist-exiled';
    return `contract.ci.m1.foul-well.01.report.${key}`;
  }
  const key =
    outcome.outcome === 'PROKOP_HANDED_OVER'
      ? 'handed-over'
      : outcome.outcome === 'PROOF_DESTROYED'
        ? 'proof-destroyed'
        : outcome.outcome === 'REFUGEE_CAMP_REMOVED'
          ? 'camp-removed'
          : 'old-ford-revealed';
  return `contract.ci.m1.empty-watch-record.01.report.${key}`;
}

export function ReturnReport(props: {
  readonly scope: Scope;
  readonly companyCharacters: readonly { readonly characterId: string; readonly name: string }[];
}) {
  const scopeKey = `${props.scope.accountId}\u0000${props.scope.companyId}`;
  const scopeKeyRef = useRef(scopeKey);
  scopeKeyRef.current = scopeKey;
  const requestGeneration = useRef(0);
  const readController = useRef<AbortController | undefined>(undefined);
  const ackController = useRef<AbortController | undefined>(undefined);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [retry, setRetry] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [state, setState] = useState<State>({ scopeKey, status: 'loading' });
  const visibleState =
    state.scopeKey === scopeKey ? state : { scopeKey, status: 'loading' as const };

  useEffect(() => {
    const generation = ++requestGeneration.current;
    const controller = new AbortController();
    readController.current?.abort();
    readController.current = controller;
    setDismissed(false);
    setState({ scopeKey, status: 'loading' });
    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/company/return-report`, {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { [WORLD_EXPECTED_COMPANY_ID_HEADER]: props.scope.companyId },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Не удалось получить сводку. Можно повторить запрос.');
        const value: unknown = await response.json();
        const report = readReportResponse(value);
        if (report === undefined)
          throw new Error('Сервер вернул неполную сводку. Можно повторить запрос.');
        if (
          controller.signal.aborted ||
          scopeKeyRef.current !== scopeKey ||
          requestGeneration.current !== generation
        )
          return;
        setState(
          report === null
            ? { scopeKey, status: 'empty' }
            : {
                scopeKey,
                status: 'report',
                report,
                acknowledging: false,
              },
        );
      } catch {
        if (
          controller.signal.aborted ||
          scopeKeyRef.current !== scopeKey ||
          requestGeneration.current !== generation
        )
          return;
        setState({
          scopeKey,
          status: 'error',
          message: 'Не удалось получить сводку. Можно повторить запрос.',
        });
      }
    })();
    return () => {
      controller.abort();
      if (readController.current === controller) readController.current = undefined;
      ackController.current?.abort();
      if (requestGeneration.current === generation) requestGeneration.current += 1;
    };
  }, [props.scope.companyId, props.scope.accountId, retry, scopeKey]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal?.();
    return () => dialog.close?.();
  }, [dismissed, scopeKey, visibleState.status]);

  if (dismissed || visibleState.status === 'empty' || visibleState.status === 'closed') return null;

  const continueWithoutAck = () => {
    readController.current?.abort();
    setDismissed(true);
  };

  const acknowledge = async (report: SafeReturnReport) => {
    const current = visibleState;
    if (current.status !== 'report' || current.acknowledging) return;
    const controller = new AbortController();
    ackController.current?.abort();
    ackController.current = controller;
    const generation = requestGeneration.current;
    setState({
      scopeKey,
      status: 'report',
      report: current.report,
      acknowledging: true,
    });
    try {
      const response = await fetch(`${API_BASE_URL}/company/return-report/ack`, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'content-type': 'application/json',
          [WORLD_EXPECTED_COMPANY_ID_HEADER]: props.scope.companyId,
        },
        body: JSON.stringify({ schemaVersion: 1, reportId: report.reportId }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Не удалось закрыть сводку. Повторите попытку.');
      const value: unknown = await response.json();
      if (!validAcknowledgement(value))
        throw new Error('Сервер не подтвердил закрытие сводки. Повторите попытку.');
      if (
        controller.signal.aborted ||
        scopeKeyRef.current !== scopeKey ||
        requestGeneration.current !== generation
      )
        return;
      setState({ scopeKey, status: 'closed' });
    } catch {
      if (
        controller.signal.aborted ||
        scopeKeyRef.current !== scopeKey ||
        requestGeneration.current !== generation
      )
        return;
      setState({
        ...current,
        acknowledging: false,
        ackError: 'Не удалось закрыть сводку. Повторите попытку.',
      });
    } finally {
      if (ackController.current === controller) ackController.current = undefined;
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="return-report-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-report-title"
      aria-busy={
        visibleState.status === 'loading' ||
        (visibleState.status === 'report' && visibleState.acknowledging)
      }
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => {
        event.preventDefault();
        if (visibleState.status === 'report') void acknowledge(visibleState.report);
        else continueWithoutAck();
      }}
    >
      <section className="return-report">
        <h1 id="return-report-title">Пока вас не было</h1>
        {visibleState.status === 'loading' && (
          <>
            <p>Проверяем, что изменилось в компании.</p>
            <div className="return-report-actions">
              <button
                type="button"
                className="return-report-secondary"
                onClick={continueWithoutAck}
              >
                Продолжить в игру
              </button>
            </div>
          </>
        )}
        {visibleState.status === 'error' && (
          <>
            <p className="return-report-error" role="alert">
              {visibleState.message}
            </p>
            <div className="return-report-actions">
              <button type="button" onClick={() => setRetry((value) => value + 1)}>
                Повторить запрос
              </button>
              <button
                type="button"
                className="return-report-secondary"
                onClick={continueWithoutAck}
              >
                Продолжить без сводки
              </button>
            </div>
          </>
        )}
        {visibleState.status === 'report' && (
          <>
            <dl className="return-report-facts">
              <div>
                <dt>Прошло дней</dt>
                <dd>{visibleState.report.elapsedDays.replace('.', ',')}</dd>
              </div>
              <div>
                <dt>Учтён расход пайков</dt>
                <dd>{formatRationCount(visibleState.report.rationsConsumed)}</dd>
              </div>
              <div>
                <dt>Начислено жалованья за период</dt>
                <dd>{formatCrowns(visibleState.report.wages.accruedQ)} кр.</dd>
              </div>
              <div>
                <dt>Выплачено жалованья за период</dt>
                <dd>{formatCrowns(visibleState.report.wages.paidQ)} кр.</dd>
              </div>
              <div>
                <dt>Сейчас не выплачено жалованья</dt>
                <dd>{formatCrowns(visibleState.report.wages.currentOwedQ)} кр.</dd>
              </div>
              <div>
                <dt>Прочие долги компании</dt>
                <dd>{formatCrowns(visibleState.report.debt.currentQ)} кр.</dd>
              </div>
            </dl>
            {visibleState.report.includesLateFoodSettlement && (
              <p className="return-report-note">
                В сумму вошёл расход пайков из более раннего периода.
              </p>
            )}
            {visibleState.report.events.length > 0 && (
              <div className="return-report-events">
                <h2>События компании</h2>
                <ul>
                  {visibleState.report.events.map((event, index) => (
                    <li key={`${event.atTick}:${index}`}>
                      {describeEvent(event, props.companyCharacters)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(visibleState.report.contractOutcomes?.length ?? 0) > 0 && (
              <div className="return-report-events">
                <h2>Итоги поручений</h2>
                <ul>
                  {visibleState.report.contractOutcomes!.map((outcome) => (
                    <li key={`${outcome.instanceId}:${outcome.atTick}`}>
                      {lookup(contractOutcomeTextKey(outcome))}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {visibleState.ackError && (
              <p className="return-report-error" role="alert">
                {visibleState.ackError}
              </p>
            )}
            <div className="return-report-actions">
              <button
                type="button"
                disabled={visibleState.acknowledging}
                onClick={() => void acknowledge(visibleState.report)}
              >
                {visibleState.acknowledging
                  ? 'Закрываем…'
                  : visibleState.ackError
                    ? 'Повторить закрытие'
                    : 'Закрыть сводку'}
              </button>
              {visibleState.ackError && (
                <button
                  type="button"
                  className="return-report-secondary"
                  onClick={continueWithoutAck}
                >
                  Продолжить без отметки
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </dialog>
  );
}

function readReportResponse(value: unknown): SafeReturnReport | null | undefined {
  if (!isRecord(value) || !Object.hasOwn(value, 'report')) return undefined;
  if (value['report'] === null) return null;
  const report = value['report'];
  if (
    !isRecord(report) ||
    report['schemaVersion'] !== 1 ||
    typeof report['reportId'] !== 'string' ||
    report['reportId'].length === 0 ||
    report['reportId'].length > 200 ||
    !isTick(report['fromTick']) ||
    !isTick(report['toTick']) ||
    BigInt(report['toTick']) < BigInt(report['fromTick']) ||
    !isTick(report['elapsedCampaignTicks']) ||
    typeof report['elapsedDays'] !== 'string' ||
    !DECIMAL_DAYS.test(report['elapsedDays']) ||
    !isTick(report['rationsConsumed']) ||
    typeof report['includesLateFoodSettlement'] !== 'boolean' ||
    (Object.hasOwn(report, 'earliestFoodFromTick') && !isTick(report['earliestFoodFromTick'])) ||
    !isRecord(report['wages']) ||
    !isMoney(report['wages']['accruedQ']) ||
    !isMoney(report['wages']['paidQ']) ||
    !isMoney(report['wages']['currentOwedQ']) ||
    !isRecord(report['debt']) ||
    !isMoney(report['debt']['currentQ']) ||
    !Array.isArray(report['events']) ||
    (Object.hasOwn(report, 'contractOutcomes') &&
      (!Array.isArray(report['contractOutcomes']) ||
        !report['contractOutcomes'].every((outcome) => {
          if (!isRecord(outcome) || !isTick(outcome['atTick'])) return false;
          if (outcome['instanceId'] === 'ci.m1.empty-watch-record.01')
            return (
              outcome['outcome'] === 'PROKOP_HANDED_OVER' ||
              outcome['outcome'] === 'PROOF_DESTROYED' ||
              outcome['outcome'] === 'REFUGEE_CAMP_REMOVED' ||
              outcome['outcome'] === 'OLD_FORD_REVEALED'
            );
          if (outcome['instanceId'] === 'ci.m1.stretcher-and-sword.01')
            return (
              outcome['outcome'] === 'LUKA_RESCUED' ||
              outcome['outcome'] === 'NASTYA_ONLY' ||
              outcome['outcome'] === 'LUKA_DEATH_OBSERVED' ||
              outcome['outcome'] === 'LUKA_RECRUIT_OFFER'
            );
          if (outcome['instanceId'] === 'ci.m1.whose-wolves.01')
            return (
              outcome['outcome'] === 'WOLVES_PACK_KILLED' ||
              outcome['outcome'] === 'WOLVES_PACK_SPARED' ||
              outcome['outcome'] === 'WOLVES_RAID'
            );
          if (outcome['instanceId'] === 'ci.m1.foul-well.01')
            return (
              outcome['outcome'] === 'FOUL_WELL_TRUTH_REPORTED' ||
              outcome['outcome'] === 'FOUL_WELL_AGHAFYA_ACCUSED' ||
              outcome['outcome'] === 'FOUL_WELL_HERBALIST_EXILED'
            );
          return false;
        })))
  )
    return undefined;

  const events: ReturnReportEvent[] = [];
  for (const event of report['events']) {
    if (
      !isRecord(event) ||
      typeof event['type'] !== 'string' ||
      event['type'].length === 0 ||
      event['type'].length > 80 ||
      !isTick(event['atTick']) ||
      !Array.isArray(event['subjectIds']) ||
      event['subjectIds'].length > 32 ||
      !event['subjectIds'].every(
        (id) => typeof id === 'string' && id.length > 0 && [...id].length <= 256,
      )
    )
      return undefined;
    events.push({
      type: EVENT_TYPES.has(event['type']) ? event['type'] : 'unknown',
      atTick: event['atTick'],
      subjectIds: event['subjectIds'] as string[],
    });
  }

  return {
    schemaVersion: 1,
    reportId: report['reportId'],
    fromTick: report['fromTick'],
    toTick: report['toTick'],
    elapsedCampaignTicks: report['elapsedCampaignTicks'],
    elapsedDays: report['elapsedDays'] as string,
    rationsConsumed: report['rationsConsumed'],
    includesLateFoodSettlement: report['includesLateFoodSettlement'],
    ...(Object.hasOwn(report, 'earliestFoodFromTick')
      ? { earliestFoodFromTick: report['earliestFoodFromTick'] as string }
      : {}),
    wages: {
      accruedQ: report['wages']['accruedQ'],
      paidQ: report['wages']['paidQ'],
      currentOwedQ: report['wages']['currentOwedQ'],
    },
    debt: { currentQ: report['debt']['currentQ'] },
    events,
    ...(Array.isArray(report['contractOutcomes'])
      ? {
          contractOutcomes: report['contractOutcomes'] as NonNullable<
            CompanyReturnReportDto['contractOutcomes']
          >,
        }
      : {}),
  };
}

function validAcknowledgement(
  value: unknown,
): value is { readonly ok: true; readonly duplicate: boolean } {
  return isRecord(value) && value['ok'] === true && typeof value['duplicate'] === 'boolean';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTick(value: unknown): value is string {
  return typeof value === 'string' && INTEGER.test(value);
}

function isMoney(value: unknown): value is string {
  return typeof value === 'string' && MONEY.test(value);
}

function formatRationCount(value: string): string {
  const count = BigInt(value);
  const lastTwo = count % 100n;
  const last = count % 10n;
  const noun =
    lastTwo >= 11n && lastTwo <= 14n
      ? 'пайков'
      : last === 1n
        ? 'паёк'
        : last >= 2n && last <= 4n
          ? 'пайка'
          : 'пайков';
  return `${count.toLocaleString('ru-RU')} ${noun}`;
}

function describeEvent(
  event: ReturnReportEvent,
  characters: readonly { readonly characterId: string; readonly name: string }[],
): string {
  const descriptions: Record<CompanyReturnReportEventType | 'unknown', string> = {
    CompanyStarted: 'Компания создана.',
    CompanyEnded: 'Служба компании завершилась.',
    LeadershipResolved: 'Назначен глава компании.',
    HeirDesignated: 'Назначен наследник.',
    HeirNotified: 'Наследник получил весть.',
    ServiceStarted: 'Боец поступил на службу.',
    JoinedFieldParty: 'Боец вошёл в полевой отряд.',
    Arrived: 'Компания добралась до места.',
    AssignmentChanged: 'Изменилось назначение бойца.',
    ReturnedToService: 'Боец вернулся на службу.',
    PerkChosen: 'Боец выбрал умение.',
    NicknameProposed: 'Бойцу предложили прозвище.',
    NicknameAccepted: 'Прозвище принято.',
    NicknameRejected: 'Прозвище отклонено.',
    CompanyRenamed: 'Изменилось имя компании.',
    unknown: 'Произошло событие в компании.',
  };
  const namesById = new Map(
    characters
      .filter((character) => character.name.length > 0)
      .map((character) => [character.characterId, character.name]),
  );
  const names = event.subjectIds
    .map((id) => namesById.get(id))
    .filter((name) => name !== undefined);
  const description = descriptions[event.type as CompanyReturnReportEventType | 'unknown'];
  return names.length > 0 ? `${names.join(', ')} · ${description}` : description;
}
