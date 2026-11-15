import { useEffect, useRef, useState } from 'react';
import type {
  EquipmentMarketDto,
  EquipmentSaleRequestDto,
  EquipmentSaleResponseDto,
} from '@warwrit/protocol';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import { formatCrowns, itemLabel } from './format.js';
import './EquipmentTrader.css';

const API_BASE_URL = import.meta.env['VITE_API_BASE_URL'] ?? '/api';
const SITE_ID = 'kamenny-brod';
const REVISION = /^(0|[1-9][0-9]{0,127})$/u;
const AMOUNT = /^(0|[1-9][0-9]{0,127})$/u;
const IDENTIFIER = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 256;
const RESULT_CODES = new Set([
  'INVALID_COMMAND',
  'NOT_AUTHORIZED',
  'CONTACT_OR_ACCESS_REQUIRED',
  'UNSUPPORTED_ACTION',
  'IDEMPOTENCY_CONFLICT',
  'STALE_REVISION',
  'INSUFFICIENT_FUNDS',
  'INSUFFICIENT_ITEMS',
  'CAPACITY',
  'UNSALEABLE_ITEM',
]);
const STORAGE_PREFIX = 'warwrit:equipment-sale:v1';

type Scope = { readonly accountId: string; readonly companyId: string };
type MarketState =
  | { readonly scopeKey: string; readonly status: 'loading' }
  | { readonly scopeKey: string; readonly status: 'error'; readonly message: string }
  | { readonly scopeKey: string; readonly status: 'ready'; readonly market: EquipmentMarketDto };
type PendingState = {
  readonly storageKey: string;
  readonly attempt: EquipmentSaleRequestDto | undefined;
};

export function EquipmentTrader(props: {
  readonly scope: Scope;
  readonly onRefreshCompany: () => void;
}) {
  const scopeKey = `${props.scope.accountId}\u0000${props.scope.companyId}`;
  const storageKey = `${STORAGE_PREFIX}:${encodeURIComponent(props.scope.accountId)}:${encodeURIComponent(props.scope.companyId)}:${SITE_ID}`;
  const scopeKeyRef = useRef(scopeKey);
  scopeKeyRef.current = scopeKey;
  const [quoteRetry, setQuoteRetry] = useState(0);
  const [marketState, setMarketState] = useState<MarketState>({ scopeKey, status: 'loading' });
  const [pendingState, setPendingState] = useState<PendingState>(() => ({
    storageKey,
    attempt: readStoredAttempt(storageKey),
  }));
  const [busyState, setBusyState] = useState({ scopeKey, busy: false });
  const [messageState, setMessageState] = useState<{ scopeKey: string; text: string }>();
  const lock = useRef(false);
  const saleController = useRef<AbortController | undefined>(undefined);
  const activeMarket =
    marketState.scopeKey === scopeKey ? marketState : { scopeKey, status: 'loading' as const };
  const pending =
    pendingState.storageKey === storageKey ? pendingState.attempt : readStoredAttempt(storageKey);
  const busy = busyState.scopeKey === scopeKey && busyState.busy;
  const message = messageState?.scopeKey === scopeKey ? messageState.text : undefined;

  useEffect(() => {
    setPendingState({ storageKey, attempt: readStoredAttempt(storageKey) });
  }, [storageKey]);

  useEffect(() => {
    const controller = new AbortController();
    setMarketState({ scopeKey, status: 'loading' });
    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/company/equipment-market/${SITE_ID}`, {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { [WORLD_EXPECTED_COMPANY_ID_HEADER]: props.scope.companyId },
          signal: controller.signal,
        });
        if (!response.ok) {
          const message =
            response.status === 409 || response.status === 403
              ? 'Скупщик работает только при стоянке отряда в Каменном Броде.'
              : 'Не удалось получить цены торговца. Повторите запрос.';
          throw new Error(message);
        }
        const market = readEquipmentMarket(await response.json());
        if (!market)
          throw new Error('Сервер вернул неполные сведения о торговце. Повторите запрос.');
        if (controller.signal.aborted || scopeKeyRef.current !== scopeKey) return;
        setMarketState({ scopeKey, status: 'ready', market });
      } catch (error) {
        if (controller.signal.aborted || scopeKeyRef.current !== scopeKey) return;
        const reason = error instanceof Error ? error.message : '';
        setMarketState({
          scopeKey,
          status: 'error',
          message:
            reason.startsWith('Скупщик ') || reason.startsWith('Сервер ')
              ? reason
              : 'Не удалось получить цены торговца. Повторите запрос.',
        });
      }
    })();
    return () => controller.abort();
  }, [props.scope.companyId, props.scope.accountId, quoteRetry, scopeKey]);

  useEffect(
    () => () => {
      saleController.current?.abort();
    },
    [scopeKey],
  );

  const setMessage = (text: string) => setMessageState({ scopeKey, text });
  const clearAttempt = () => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // The resolved sale remains safe to repeat from its server receipt.
    }
    setPendingState({ storageKey, attempt: undefined });
  };

  const sell = async (item?: EquipmentMarketDto['items'][number]) => {
    if (lock.current) return;
    const market = activeMarket.status === 'ready' ? activeMarket.market : undefined;
    if (!pending && (!item || !market || !item.canSell)) return;
    const attempt =
      pending ??
      (market && item
        ? {
            schemaVersion: 1 as const,
            commandId: crypto.randomUUID(),
            expectedRevision: market.publicRevision,
            itemId: item.itemId,
            shopRevision: market.revision,
          }
        : undefined);
    if (!attempt) return;
    lock.current = true;
    const controller = new AbortController();
    saleController.current = controller;
    setBusyState({ scopeKey, busy: true });
    setMessageState(undefined);

    if (!pending) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(attempt));
        setPendingState({ storageKey, attempt });
      } catch {
        setMessage('Локальное хранилище недоступно; продажа не отправлена.');
        lock.current = false;
        setBusyState({ scopeKey, busy: false });
        return;
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/company/equipment-market/${SITE_ID}/sell`, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'content-type': 'application/json',
          [WORLD_EXPECTED_COMPANY_ID_HEADER]: props.scope.companyId,
        },
        body: JSON.stringify(attempt),
        signal: controller.signal,
      });
      const result = await readResolvedSaleResponse(response, attempt.commandId);
      if (!result) throw new Error('Ответ торговца неизвестен. Повторите ту же продажу.');
      if (controller.signal.aborted || scopeKeyRef.current !== scopeKey) return;
      clearAttempt();
      if (result.ok) {
        setMessage('Продажа завершена. Деньги и инвентарь обновляются.');
      } else {
        setMessage(saleRejectionText(result.code));
      }
      props.onRefreshCompany();
      setQuoteRetry((revision) => revision + 1);
    } catch {
      if (controller.signal.aborted || scopeKeyRef.current !== scopeKey) return;
      setMessage('Ответ о продаже не пришёл. Повторите эту же продажу.');
    } finally {
      if (saleController.current === controller) saleController.current = undefined;
      lock.current = false;
      if (scopeKeyRef.current === scopeKey) setBusyState({ scopeKey, busy: false });
    }
  };

  return (
    <section className="panel equipment-trader" aria-label="Скупка снаряжения">
      <h2 className="panel-title">Скупка снаряжения</h2>
      {activeMarket.status === 'ready' && (
        <p className="equipment-trader-funds">
          У торговца: {formatCrowns(activeMarket.market.merchantCashQ)} кр.
        </p>
      )}
      {activeMarket.status === 'loading' && (
        <p className="state-note" role="status">
          Запрашиваем цены на предметы…
        </p>
      )}
      {activeMarket.status === 'error' && (
        <div className="equipment-trader-error" role="alert">
          <p>{activeMarket.message}</p>
          <button
            type="button"
            className="action action-quiet"
            disabled={busy}
            onClick={() => setQuoteRetry((revision) => revision + 1)}
          >
            Обновить цены
          </button>
        </div>
      )}
      {pending && (
        <div className="equipment-trader-pending" role="status">
          <p>Ответ о продаже не пришёл. Повторите эту же продажу.</p>
          <button type="button" className="action" disabled={busy} onClick={() => void sell()}>
            {busy ? 'Повторяем продажу…' : 'Повторить ту же продажу'}
          </button>
        </div>
      )}
      {message && !pending && (
        <p className="state-note" role="status">
          {message}
        </p>
      )}
      {activeMarket.status === 'ready' && activeMarket.market.items.length === 0 && !pending && (
        <p className="state-note">У торговца пока нет подходящих предметов.</p>
      )}
      {activeMarket.status === 'ready' && activeMarket.market.items.length > 0 && (
        <ul className="equipment-trader-items">
          {activeMarket.market.items.map((item) => (
            <li key={item.itemId}>
              <div>
                <strong>{displayItemName(item.definitionId)}</strong>
                <span className="equipment-trader-detail">
                  Состояние {item.currentCondition}/{item.maximumCondition} ·{' '}
                  {item.equipped ? 'Надето' : 'Не надето'}
                </span>
                {item.interruptsLearning && (
                  <span className="equipment-trader-warning">Продажа прервёт обучение.</span>
                )}
                {!item.canSell && item.refusal === 'INSUFFICIENT_FUNDS' && (
                  <span className="equipment-trader-refusal">
                    У торговца сейчас недостаточно денег на этот предмет.
                  </span>
                )}
                {!item.canSell && item.refusal === null && (
                  <span className="equipment-trader-refusal">
                    Этот предмет сейчас нельзя продать.
                  </span>
                )}
              </div>
              <div className="equipment-trader-price">
                <span>{formatCrowns(item.priceQ)} кр.</span>
                <button
                  type="button"
                  className="action action-quiet"
                  disabled={busy || Boolean(pending) || !item.canSell}
                  onClick={() => void sell(item)}
                >
                  Продать
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function readEquipmentMarket(value: unknown): EquipmentMarketDto | undefined {
  if (
    !isRecord(value) ||
    !isRevision(value['publicRevision']) ||
    value['siteId'] !== SITE_ID ||
    !isRevision(value['revision']) ||
    !isAmount(value['merchantCashQ']) ||
    !Array.isArray(value['items'])
  )
    return undefined;
  const items: EquipmentMarketDto['items'][number][] = [];
  for (const item of value['items']) {
    if (
      !isRecord(item) ||
      !isIdentifier(item['itemId']) ||
      !isIdentifier(item['definitionId']) ||
      !isAmount(item['priceQ']) ||
      !Number.isSafeInteger(item['currentCondition']) ||
      (item['currentCondition'] as number) < 0 ||
      !Number.isSafeInteger(item['maximumCondition']) ||
      (item['maximumCondition'] as number) <= 0 ||
      (item['currentCondition'] as number) > (item['maximumCondition'] as number) ||
      typeof item['equipped'] !== 'boolean' ||
      typeof item['interruptsLearning'] !== 'boolean' ||
      typeof item['canSell'] !== 'boolean' ||
      (item['refusal'] !== null && item['refusal'] !== 'INSUFFICIENT_FUNDS')
    )
      return undefined;
    items.push({
      itemId: item['itemId'],
      definitionId: item['definitionId'],
      priceQ: item['priceQ'],
      currentCondition: item['currentCondition'] as number,
      maximumCondition: item['maximumCondition'] as number,
      equipped: item['equipped'],
      interruptsLearning: item['interruptsLearning'],
      canSell: item['canSell'],
      refusal: item['refusal'],
    });
  }
  return {
    publicRevision: value['publicRevision'],
    siteId: SITE_ID,
    revision: value['revision'],
    merchantCashQ: value['merchantCashQ'],
    items,
  };
}

function readSaleResponse(value: unknown, commandId: string): EquipmentSaleResponseDto | undefined {
  if (
    !isRecord(value) ||
    value['commandId'] !== commandId ||
    !isRevision(value['publicRevision']) ||
    typeof value['ok'] !== 'boolean'
  )
    return undefined;
  if (value['ok'])
    return {
      commandId,
      ok: true,
      publicRevision: value['publicRevision'],
    };
  if (typeof value['code'] !== 'string' || !RESULT_CODES.has(value['code'])) return undefined;
  return {
    commandId,
    ok: false,
    publicRevision: value['publicRevision'],
    code: value['code'] as Extract<EquipmentSaleResponseDto, { ok: false }>['code'],
  };
}

async function readResolvedSaleResponse(
  response: Response,
  commandId: string,
): Promise<EquipmentSaleResponseDto | undefined> {
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    return undefined;
  }
  const result = readSaleResponse(value, commandId);
  if (response.ok) return result?.ok ? result : undefined;
  if (response.status === 403)
    return result && !result.ok && result.code === 'NOT_AUTHORIZED' ? result : undefined;
  if (response.status === 409) return result && !result.ok ? result : undefined;
  return undefined;
}

function readStoredAttempt(storageKey: string): EquipmentSaleRequestDto | undefined {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
    if (
      !isRecord(value) ||
      value['schemaVersion'] !== 1 ||
      !isIdentifier(value['commandId']) ||
      !isRevision(value['expectedRevision']) ||
      !isIdentifier(value['itemId']) ||
      !isRevision(value['shopRevision'])
    )
      return undefined;
    return {
      schemaVersion: 1,
      commandId: value['commandId'],
      expectedRevision: value['expectedRevision'],
      itemId: value['itemId'],
      shopRevision: value['shopRevision'],
    };
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRevision(value: unknown): value is string {
  return typeof value === 'string' && REVISION.test(value);
}

function isAmount(value: unknown): value is string {
  return typeof value === 'string' && AMOUNT.test(value);
}

function isIdentifier(value: unknown): value is string {
  return IDENTIFIER(value);
}

function displayItemName(definitionId: string): string {
  const name = itemLabel(definitionId);
  return name === definitionId ? 'Предмет снаряжения' : name;
}

function saleRejectionText(code: Extract<EquipmentSaleResponseDto, { ok: false }>['code']): string {
  const messages: Record<typeof code, string> = {
    INVALID_COMMAND: 'Продажу не удалось выполнить.',
    NOT_AUTHORIZED: 'Компания изменилась. Обновите данные перед продажей.',
    CONTACT_OR_ACCESS_REQUIRED: 'Продажа доступна только при стоянке в Каменном Броде.',
    UNSUPPORTED_ACTION: 'Продажа сейчас недоступна.',
    IDEMPOTENCY_CONFLICT: 'Этот приказ уже использован. Обновите состояние компании.',
    STALE_REVISION: 'Состояние компании или торговца изменилось. Выберите предмет снова.',
    INSUFFICIENT_FUNDS: 'У торговца сейчас недостаточно денег на этот предмет.',
    INSUFFICIENT_ITEMS: 'Предмет больше не принадлежит компании.',
    CAPACITY: 'Продажу не удалось выполнить.',
    UNSALEABLE_ITEM: 'Этот предмет нельзя продать.',
  };
  return messages[code];
}
