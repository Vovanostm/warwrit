import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  OrdinaryContractBoardDto,
  OrdinaryContractCommandDto,
  OrdinaryContractDto,
} from '@warwrit/protocol';
import {
  classifyOrdinaryContractPost,
  selectOrdinaryContractAttempt,
} from './ordinary-contract-attempt.js';

import { lookup } from '../i18n/index.js';
import { formatCrowns } from './format.js';
import {
  contractPlaceFacts,
  issuerBuilding,
  issuerVenue,
  ordinaryStepVenue,
  oldMillVisit,
  visitingIssuer,
  type ContractVisitProps,
} from './contract-visits.js';

const REFRESH_MS = 15_000;

const siteName = (siteId: string) => lookup(`place.${siteId}.name`) ?? siteId;
const siteIn = (siteId: string) => lookup(`place.${siteId}.in`) ?? siteId;
const contractText = (instanceId: string, part: 'title' | 'issuer' | 'brief') =>
  lookup(`contract.${instanceId}.${part}`);
const stepText = (instanceId: string, stepId: string) =>
  lookup(`contract.${instanceId}.step.${stepId}`);
const findingText = (instanceId: string, stepId: string) =>
  lookup(`contract.${instanceId}.finding.${stepId}`);
const conditionText = (instanceId: string, stepId: string) =>
  lookup(`contract.${instanceId}.condition.${stepId}`);
const personName = (personId: string) => lookup(`person.${personId}`) ?? personId;

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

function stepBlockerText(
  contract: OrdinaryContractDto,
  step: OrdinaryContractDto['steps'][number],
) {
  switch (step.blocker) {
    case null:
      return null;
    case 'WRONG_PLACE':
      return `нужно быть ${siteIn(step.location.siteId)}`;
    case 'MISSING_EVIDENCE':
      return 'сначала предыдущие шаги';
    case 'CONDITION_NOT_MET':
      return conditionText(contract.instanceId, step.stepId) ?? 'условие не выполнено';
    case 'ALREADY_DONE':
      return 'сделано';
    case 'NOT_A_PARTICIPANT':
      return 'возьмите контракт';
    case 'NOT_AVAILABLE':
      return 'недоступно';
  }
}

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

/** Ordinary contracts offered where the party stands, and those the company has taken. */
export function ContractBoard(
  props: ContractVisitProps & {
    readonly siteId: string | null;
    readonly refreshKey: number;
    readonly onUnauthorized: () => void;
    readonly onRewardPaid: () => void;
  },
) {
  const [board, setBoard] = useState<OrdinaryContractBoardDto | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState<OrdinaryContractCommandDto | undefined>(undefined);
  const pendingRef = useRef<OrdinaryContractCommandDto | undefined>(undefined);
  const sendingRef = useRef(false);
  const { onUnauthorized, onRewardPaid } = props;
  const onPlaceFacts = useRef(props.onPlaceFacts);
  onPlaceFacts.current = props.onPlaceFacts;

  const refresh = useCallback(async () => {
    const next = await readBoard();
    if (next === 'unauthorized') onUnauthorized();
    else if (next) {
      setBoard(next);
      onPlaceFacts.current?.(contractPlaceFacts(next.contracts));
    }
  }, [onUnauthorized]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh, props.siteId, props.refreshKey]);

  const send = async (requested: OrdinaryContractCommandDto, retry = false) => {
    if (sendingRef.current) return;
    const command = selectOrdinaryContractAttempt(pendingRef.current, requested, retry);
    if (!command) return;
    sendingRef.current = true;
    if (!pendingRef.current) {
      // Reserve synchronously so same-turn clicks cannot replace an in-flight command.
      pendingRef.current = command;
      setPending(command);
    }
    setBusy(true);
    setMessage(undefined);
    try {
      const response = await fetch('/api/contracts/ordinary/commands', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(command),
      });
      const body: unknown = response.status === 401 ? null : await response.json();
      const result = classifyOrdinaryContractPost(response.status, body, command.commandId);
      if (result.kind === 'UNAUTHENTICATED') {
        onUnauthorized();
        return;
      }
      if (result.kind === 'UNKNOWN') {
        // Keep the command ID and body until a matching terminal receipt is verified.
        setMessage('Связь прервалась, результат неизвестен. Повторите тот же запрос.');
        return;
      }
      pendingRef.current = undefined;
      setPending(undefined);
      if (result.kind === 'REJECTED')
        setMessage(REJECTION_TEXT[result.response.code] ?? 'Сервер отклонил запрос.');
      else if (result.response.rewardQ !== null) {
        setMessage(`Заказчик заплатил ${formatCrowns(result.response.rewardQ)} кр.`);
        onRewardPaid();
      }
      await refresh();
    } catch {
      // Unknown outcome: only this exact command can safely be sent again.
      setMessage('Связь прервалась, результат неизвестен. Повторите тот же запрос.');
    } finally {
      sendingRef.current = false;
      setBusy(false);
    }
  };

  const command = (
    contract: OrdinaryContractDto,
    type: OrdinaryContractCommandDto['type'],
    stepId: string | null,
  ): OrdinaryContractCommandDto => ({
    schemaVersion: 1,
    commandId: crypto.randomUUID(),
    instanceId: contract.instanceId,
    expectedRevision: contract.revision,
    type,
    stepId,
  });

  if (!board) return null;
  const visit = props.visit;
  const visible =
    visit === null
      ? board.contracts.filter(
          (contract) =>
            contract.yourRole !== 'NONE' ||
            (contract.state !== 'COMPLETED' && contract.issuerLocation.siteId === props.siteId),
        )
      : board.contracts.filter(
          (contract) =>
            visitingIssuer(visit, contract.instanceId, contract.issuerLocation.siteId) ||
            (contract.yourRole !== 'NONE' &&
              contract.steps.some(
                (step) =>
                  step.location.siteId === visit.siteId &&
                  (ordinaryStepVenue(contract.instanceId, step.action, step.stepId) ===
                    visit.building ||
                    oldMillVisit(visit, step.location.siteId)),
              )),
        );
  if (visible.length === 0 && !message) return null;

  return (
    <section className="contract-board" aria-label="Контракты">
      <h3>{props.visit ? 'Местные поручения' : 'Поручения'}</h3>
      {message && (
        <p className="contract-message" role="status">
          {message}
          {pending && (
            <button
              type="button"
              className="gear-action"
              disabled={busy}
              onClick={() => void send(pending, true)}
            >
              Повторить
            </button>
          )}
        </p>
      )}
      {visible.map((contract) => (
        <ContractConversation
          key={contract.instanceId}
          contract={contract}
          currentSiteId={props.siteId}
          visit={props.visit}
          canVisit={props.canVisit}
          onVisitIssuer={props.onVisitIssuer}
          onJournal={props.onJournal}
          busy={busy || pending !== undefined}
          onCommand={(type, stepId) => void send(command(contract, type, stepId))}
        />
      ))}
    </section>
  );
}

/** Render established offer/state; callbacks alone submit the existing commands. */
type ConversationProps = ContractVisitProps & {
  readonly contract: OrdinaryContractDto;
  readonly currentSiteId: string | null;
  readonly busy: boolean;
  readonly onCommand: (type: OrdinaryContractCommandDto['type'], stepId: string | null) => void;
};

export function ContractConversation(props: ConversationProps) {
  const contract = props.contract;

  const title = contractText(contract.instanceId, 'title');
  const issuer = contractText(contract.instanceId, 'issuer');
  const brief = contractText(contract.instanceId, 'brief');
  const atIssuer = visitingIssuer(props.visit, contract.instanceId, contract.issuerLocation.siteId);
  if (contract.yourRole === 'NONE' && !atIssuer) return <ContractLead {...props} />;
  return (
    <article key={contract.instanceId} className="contract-card">
      <header>
        <h4>{title ?? contract.instanceId}</h4>
        <span className="contract-reward">{formatCrowns(contract.rewardQ)} кр.</span>
      </header>
      <p className="contract-issuer">
        {issuer}, {siteName(contract.issuerLocation.siteId)}
        {{ OWNER: ' · ваш контракт', HELPER: ' · вы помогаете', NONE: '' }[contract.yourRole]}
        {contract.state === 'COMPLETED' &&
          (contract.completedByYou ? ' · выполнен, оплачен вам' : ' · выполнен')}
      </p>
      {atIssuer ? (
        <>
          <details className="contract-conversation" open={contract.yourRole !== 'NONE'}>
            <summary>Что произошло?</summary>
            <p className="contract-brief">{brief}</p>
          </details>
          <details className="contract-conversation">
            <summary>Что нужно для оплаты?</summary>
            <p>
              {contract.template === 'RESCUE'
                ? 'Верните живого человека заказчику. Победа в бою сама по себе не завершает спасение.'
                : 'Соберите сведения и лично доложите заказчику. Принятые условия и награда фиксированы.'}
            </p>
            <p>
              Награда — {formatCrowns(contract.rewardQ)} кр. тому, кто сдаст результат.
              Автоматической доли помощнику нет.
            </p>
          </details>
        </>
      ) : (
        <p className="contract-brief">{brief}</p>
      )}
      {atIssuer && (contract.canAccept || contract.canHelp) && (
        <button
          type="button"
          className="primary-action button-action"
          disabled={props.busy}
          onClick={() => props.onCommand(contract.canAccept ? 'ACCEPT' : 'HELP', null)}
        >
          {contract.canAccept ? 'Договориться и взять поручение' : 'Предложить помощь'}
        </button>
      )}
      {contract.yourRole !== 'NONE' && (
        <ol className="contract-steps">
          {contract.steps.map((step) => (
            <ContractStep key={step.stepId} {...props} step={step} />
          ))}
        </ol>
      )}
      {contract.yourCustody.length > 0 && (
        <p className="contract-custody">
          С отрядом: {contract.yourCustody.map(personName).join(', ')}
        </p>
      )}
    </article>
  );
}

function ContractStep(
  props: ConversationProps & { readonly step: OrdinaryContractDto['steps'][number] },
) {
  const { contract, step } = props;
  const finding = findingText(contract.instanceId, step.stepId);
  return (
    <li className={step.doneByYou ? 'contract-step-done' : ''}>
      <span>{stepText(contract.instanceId, step.stepId) ?? step.stepId}</span>
      {step.doneByYou && finding && <span className="contract-finding">{finding}</span>}
      {!step.doneByYou && contract.state !== 'COMPLETED' && <ContractStepAction {...props} />}
    </li>
  );
}

function ContractStepAction(
  props: ConversationProps & { readonly step: OrdinaryContractDto['steps'][number] },
) {
  const { contract, step, visit } = props;
  const blocker = stepBlockerText(contract, step);
  if (blocker) return <span className="contract-blocker">{blocker}</span>;
  const venue = ordinaryStepVenue(contract.instanceId, step.action, step.stepId);
  const inMeeting = venue
    ? visit?.siteId === step.location.siteId && visit.building === venue
    : visit === null || oldMillVisit(visit, step.location.siteId);
  if (inMeeting)
    return (
      <button
        type="button"
        className="gear-action"
        disabled={props.busy}
        onClick={() => props.onCommand('STEP', step.stepId)}
      >
        {step.completes
          ? 'Передать результат заказчику'
          : (stepText(contract.instanceId, step.stepId) ?? 'Продолжить')}
      </button>
    );
  if (venue && step.location.siteId === props.currentSiteId)
    return (
      <button
        type="button"
        className="quiet-action"
        disabled={!props.canVisit}
        onClick={() => props.onVisitIssuer(step.location.siteId, venue)}
      >
        Встретиться · {venue === 'inn' ? 'Трактир' : issuerVenue(contract.instanceId)} →
      </button>
    );
  if (!venue)
    return (
      <button type="button" className="quiet-action" onClick={props.onJournal}>
        Выйти на площадь и продолжить →
      </button>
    );
  return <span className="contract-blocker">Заказчик ждёт {siteIn(step.location.siteId)}.</span>;
}

function ContractLead(props: ConversationProps) {
  const { contract } = props;
  const building = issuerBuilding(contract.instanceId);
  return (
    <article className="contract-card contract-lead">
      <h4>{contractText(contract.instanceId, 'title') ?? contract.instanceId}</h4>
      <p>
        {contractText(contract.instanceId, 'issuer')} · {issuerVenue(contract.instanceId)}
      </p>
      <p className="state-note">Узнайте условия у заказчика.</p>
      {building && (
        <button
          type="button"
          className="quiet-action"
          disabled={!props.canVisit}
          onClick={() => props.onVisitIssuer(contract.issuerLocation.siteId, building)}
        >
          Поговорить →
        </button>
      )}
    </article>
  );
}
