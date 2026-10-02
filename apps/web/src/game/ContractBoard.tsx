import { useCallback, useEffect, useState } from 'react';

import type {
  OrdinaryContractBoardDto,
  OrdinaryContractCommandDto,
  OrdinaryContractCommandResponseDto,
  OrdinaryContractDto,
} from '@warwrit/protocol';

import { formatCrowns } from './format.js';

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
export function ContractBoard(props: {
  readonly siteId: string | null;
  readonly refreshKey: number;
  readonly onUnauthorized: () => void;
  readonly onRewardPaid: () => void;
}) {
  const [board, setBoard] = useState<OrdinaryContractBoardDto | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState<OrdinaryContractCommandDto | undefined>(undefined);
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

  const send = async (command: OrdinaryContractCommandDto) => {
    setBusy(true);
    setMessage(undefined);
    setPending(command);
    try {
      const response = await fetch('/api/contracts/ordinary/commands', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(command),
      });
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      const body = (await response.json()) as OrdinaryContractCommandResponseDto;
      setPending(undefined);
      if (body.ok) {
        if (body.rewardQ !== null) {
          setMessage(`Заказчик заплатил ${formatCrowns(body.rewardQ)} кр.`);
          onRewardPaid();
        }
      } else setMessage(REJECTION_TEXT[body.code] ?? 'Сервер отклонил запрос.');
      await refresh();
    } catch {
      // Unknown outcome: the same command can be sent again and is applied at most once.
      setMessage('Связь прервалась, результат неизвестен. Повторите тот же запрос.');
    } finally {
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
  const visible = board.contracts.filter(
    (contract) =>
      contract.yourRole !== 'NONE' ||
      (contract.state !== 'COMPLETED' && contract.issuerLocation.siteId === props.siteId),
  );
  if (visible.length === 0 && !message) return null;

  return (
    <section className="contract-board" aria-label="Контракты">
      <h3>Контракты</h3>
      {message && (
        <p className="contract-message" role="status">
          {message}
          {pending && (
            <button
              type="button"
              className="gear-action"
              disabled={busy}
              onClick={() => void send(pending)}
            >
              Повторить
            </button>
          )}
        </p>
      )}
      {visible.map((contract) => {
        const text = CONTRACT_TEXT[contract.instanceId];
        return (
          <article key={contract.instanceId} className="contract-card">
            <header>
              <h4>{text?.title ?? contract.instanceId}</h4>
              <span className="contract-reward">{formatCrowns(contract.rewardQ)} кр.</span>
            </header>
            <p className="contract-issuer">
              {text?.issuer}, {SITE_NAMES[contract.issuerLocation.siteId]}
              {contract.yourRole === 'OWNER'
                ? ' · ваш контракт'
                : contract.yourRole === 'HELPER'
                  ? ' · вы помогаете'
                  : ''}
              {contract.state === 'COMPLETED'
                ? contract.completedByYou
                  ? ' · выполнен, оплачен вам'
                  : ' · выполнен'
                : ''}
            </p>
            <p className="contract-brief">{text?.brief}</p>
            {(contract.canAccept || contract.canHelp) && (
              <button
                type="button"
                className="primary-action button-action"
                disabled={busy}
                onClick={() =>
                  void send(command(contract, contract.canAccept ? 'ACCEPT' : 'HELP', null))
                }
              >
                {contract.canAccept ? 'Взять контракт' : 'Помочь владельцу'}
              </button>
            )}
            {contract.yourRole !== 'NONE' && (
              <ol className="contract-steps">
                {contract.steps.map((step) => {
                  const key = `${contract.instanceId}:${step.stepId}`;
                  const blocker = stepBlockerText(contract, step);
                  return (
                    <li key={step.stepId} className={step.doneByYou ? 'contract-step-done' : ''}>
                      <span>{STEP_TEXT[key] ?? step.stepId}</span>
                      {step.doneByYou && FINDINGS[key] && (
                        <span className="contract-finding">{FINDINGS[key]}</span>
                      )}
                      {!step.doneByYou &&
                        contract.state !== 'COMPLETED' &&
                        (step.blocker === null ? (
                          <button
                            type="button"
                            className="gear-action"
                            disabled={busy}
                            onClick={() => void send(command(contract, 'STEP', step.stepId))}
                          >
                            {step.completes ? 'Сдать и получить плату' : 'Сделать'}
                          </button>
                        ) : (
                          <span className="contract-blocker">{blocker}</span>
                        ))}
                    </li>
                  );
                })}
              </ol>
            )}
            {contract.yourCustody.length > 0 && (
              <p className="contract-custody">
                С отрядом: {contract.yourCustody.map((id) => PERSON_NAMES[id] ?? id).join(', ')}
              </p>
            )}
          </article>
        );
      })}
    </section>
  );
}
