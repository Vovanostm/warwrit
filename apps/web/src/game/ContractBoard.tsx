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

import { formatCrowns } from './format.js';
import {
  issuerBuilding,
  issuerVenue,
  ordinaryStepVenue,
  oldMillVisit,
  visitingIssuer,
  type ContractVisitProps,
} from './contract-visits.js';

const REFRESH_MS = 15_000;

const SITE_NAMES: Readonly<Record<string, string>> = {
  'kamenny-brod': 'Каменный Брод',
  bereznyak: 'Березняк',
  'tikhaya-gat': 'Тихая Гать',
  'severny-dvor': 'Северный Двор',
  'staraya-melnitsa': 'Старая мельница',
};

/** Prepositional case for «нужно быть в …». */
const SITE_IN: Readonly<Record<string, string>> = {
  'kamenny-brod': 'Каменном Броде',
  bereznyak: 'Березняке',
  'tikhaya-gat': 'Тихой Гати',
  'severny-dvor': 'Северном Дворе',
  'staraya-melnitsa': 'Старой мельнице',
};

const CONTRACT_TEXT: Readonly<
  Record<string, { readonly title: string; readonly issuer: string; readonly brief: string }>
> = {
  'ci.m1.road-tracks.01': {
    title: 'Следы на дороге',
    issuer: 'писарь у доски объявлений',
    brief: 'По ночам кто-то ходит дорогой к Тихой Гати. Осмотрите берег и доложите, что нашли.',
  },
  'ci.m1.missing-herbs.01': {
    title: 'Пропавшие травы',
    issuer: 'заготовщица трав',
    brief: 'Из амбара пропали сушёные травы. Узнайте, что пропало, и найдите следы.',
  },
  'ci.m1.cellar-rescue.01': {
    title: 'Пленник в погребе',
    issuer: 'вестовой с реки',
    brief: 'Налётчики держат человека в погребе Старой мельницы. Освободите его и приведите сюда.',
  },
  'ci.m1.lost-scout.01': {
    title: 'Пропавший разведчик',
    issuer: 'городская стража',
    brief: 'Разведчик не вернулся с берега у Тихой Гати. Найдите его и приведите в город.',
  },
  'ci.m1.mill-worker.01': {
    title: 'Когда молчит мельница',
    issuer: 'староста',
    brief:
      'Работник мельницы пропал, а с мельницы увезли зерно. Узнайте, что случилось, и верните работника.',
  },
};

const STEP_TEXT: Readonly<Record<string, string>> = {
  'ci.m1.road-tracks.01:inspect-bank': 'Осмотреть берег у Тихой Гати',
  'ci.m1.road-tracks.01:report': 'Доложить писарю в Каменном Броде',
  'ci.m1.missing-herbs.01:stock-record': 'Узнать у заготовщицы, что пропало',
  'ci.m1.missing-herbs.01:inspect-green': 'Осмотреть луг (только днём)',
  'ci.m1.missing-herbs.01:report': 'Доложить заготовщице',
  'ci.m1.cellar-rescue.01:release': 'Освободить пленника из погреба мельницы',
  'ci.m1.cellar-rescue.01:deliver': 'Привести пленника в Тихую Гать',
  'ci.m1.lost-scout.01:search': 'Обыскать берег у Тихой Гати',
  'ci.m1.lost-scout.01:deliver': 'Привести разведчика в Каменный Брод',
  'ci.m1.mill-worker.01:inspect-yard': 'Осмотреть двор мельницы',
  'ci.m1.mill-worker.01:ask-keeper': 'Расспросить смотрителя Тихой Гати',
  'ci.m1.mill-worker.01:release': 'Вызволить работника из мельницы',
  'ci.m1.mill-worker.01:deliver': 'Привести работника в Северный Двор',
};

/** What the company learned by taking a step; shown once the step is done. */
const FINDINGS: Readonly<Record<string, string>> = {
  'ci.m1.road-tracks.01:inspect-bank': 'Следы отряда налётчиков ведут к Старой мельнице.',
  'ci.m1.missing-herbs.01:stock-record': 'Пропали связки сушёных трав из амбара.',
  'ci.m1.missing-herbs.01:inspect-green': 'Срезанные стебли и тропа в сторону Северного Двора.',
  'ci.m1.cellar-rescue.01:release': 'Пленник освобождён и идёт с отрядом.',
  'ci.m1.lost-scout.01:search': 'Разведчик найден живым, но ранен; он идёт с отрядом.',
  'ci.m1.mill-worker.01:inspect-yard': 'Во дворе колея гружёной телеги и просыпанное зерно.',
  'ci.m1.mill-worker.01:ask-keeper':
    'Смотритель видел, как ночью у мельницы работника утащило что-то огромное.',
  'ci.m1.mill-worker.01:release': 'Работник жив и идёт с отрядом.',
};

const CONDITION_TEXT: Readonly<Record<string, string>> = {
  'ci.m1.missing-herbs.01:inspect-green': 'ночью следов не разглядеть',
  'ci.m1.cellar-rescue.01:release': 'налётчики у мельницы ещё живы',
  'ci.m1.mill-worker.01:release': 'зверь у мельницы ещё жив',
};

const PERSON_NAMES: Readonly<Record<string, string>> = {
  'person.cellar-captive.01': 'пленник из погреба',
  'person.lost-scout.01': 'раненый разведчик',
  'person.mill-worker.01': 'работник мельницы',
};

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
      return `нужно быть в ${SITE_IN[step.location.siteId] ?? step.location.siteId}`;
    case 'MISSING_EVIDENCE':
      return 'сначала предыдущие шаги';
    case 'CONDITION_NOT_MET':
      return CONDITION_TEXT[`${contract.instanceId}:${step.stepId}`] ?? 'условие не выполнено';
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

  const refresh = useCallback(async () => {
    const next = await readBoard();
    if (next === 'unauthorized') onUnauthorized();
    else if (next) setBoard(next);
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

  const text = CONTRACT_TEXT[contract.instanceId];
  const atIssuer = visitingIssuer(props.visit, contract.instanceId, contract.issuerLocation.siteId);
  if (contract.yourRole === 'NONE' && !atIssuer) return <ContractLead {...props} />;
  return (
    <article key={contract.instanceId} className="contract-card">
      <header>
        <h4>{text?.title ?? contract.instanceId}</h4>
        <span className="contract-reward">{formatCrowns(contract.rewardQ)} кр.</span>
      </header>
      <p className="contract-issuer">
        {text?.issuer}, {SITE_NAMES[contract.issuerLocation.siteId]}
        {{ OWNER: ' · ваш контракт', HELPER: ' · вы помогаете', NONE: '' }[contract.yourRole]}
        {contract.state === 'COMPLETED' &&
          (contract.completedByYou ? ' · выполнен, оплачен вам' : ' · выполнен')}
      </p>
      {atIssuer ? (
        <>
          <details className="contract-conversation" open={contract.yourRole !== 'NONE'}>
            <summary>Что произошло?</summary>
            <p className="contract-brief">{text?.brief}</p>
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
        <p className="contract-brief">{text?.brief}</p>
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
          С отрядом: {contract.yourCustody.map((id) => PERSON_NAMES[id] ?? id).join(', ')}
        </p>
      )}
    </article>
  );
}

function ContractStep(
  props: ConversationProps & { readonly step: OrdinaryContractDto['steps'][number] },
) {
  const { contract, step } = props;
  const key = `${contract.instanceId}:${step.stepId}`;
  return (
    <li className={step.doneByYou ? 'contract-step-done' : ''}>
      <span>{STEP_TEXT[key] ?? step.stepId}</span>
      {step.doneByYou && FINDINGS[key] && <span className="contract-finding">{FINDINGS[key]}</span>}
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
          : (STEP_TEXT[`${contract.instanceId}:${step.stepId}`] ?? 'Продолжить')}
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
  return (
    <span className="contract-blocker">
      Вернитесь в {SITE_IN[step.location.siteId] ?? step.location.siteId}, чтобы встретиться с
      заказчиком.
    </span>
  );
}

function ContractLead(props: ConversationProps) {
  const { contract } = props;
  const text = CONTRACT_TEXT[contract.instanceId];
  const building = issuerBuilding(contract.instanceId);
  return (
    <article className="contract-card contract-lead">
      <h4>{text?.title ?? contract.instanceId}</h4>
      <p>
        {text?.issuer} · {issuerVenue(contract.instanceId)}
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
