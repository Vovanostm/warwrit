import { useEffect, useRef, useState } from 'react';
import {
  type CompanyHoldingsDto,
  type CompanySummaryDto,
  type SupplyShopDto,
} from '@warwrit/protocol';
import { formatCrowns } from './format.js';
import { readSupplyPurchaseAttempt } from './supply-purchase-attempt.js';
import {
  sendSupplyPurchase,
  supplyPurchaseQuote,
  type SupplyPurchaseAttempt as Purchase,
  type SupplyPurchaseResult,
  type SupplyQuote,
} from './supply-purchase.js';

const apiBaseUrl = import.meta.env['VITE_API_BASE_URL'] ?? '/api';
const rejectionText: Record<string, string> = {
  STALE_REVISION:
    'Запас или состояние отряда изменились. Данные обновлены — выберите покупку снова.',
  INSUFFICIENT_FUNDS: 'Недостаточно свободного золота.',
  CAPACITY: 'Обоз перегружен. Купите меньше рационов.',
  OUT_OF_STOCK: 'У торговца не хватает рационов. Выберите меньше.',
  CONTACT_OR_ACCESS_REQUIRED: 'Отряд должен находиться в этом поселении.',
  INSUFFICIENT_ITEMS: 'Не хватает еды для уже прошедшего времени. Покупка не выполнена.',
};

type SupplyShopProps = {
  readonly company: CompanySummaryDto;
  readonly holdings: CompanyHoldingsDto | undefined;
  readonly siteId: string;
  readonly venueName: string;
  readonly onPurchased: () => void;
};
export function SupplyShop(props: SupplyShopProps) {
  const [shop, setShop] = useState<SupplyShopDto>();
  const [quantity, setQuantity] = useState(10);
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const key = `warwrit:supply-purchase:${props.company.companyId}`;
  const [pending, setPending] = useState<Purchase | undefined>(() => {
    try {
      return readSupplyPurchaseAttempt(sessionStorage.getItem(key));
    } catch {
      return undefined;
    }
  });
  async function refresh() {
    const response = await fetch(
      `${apiBaseUrl}/company/supplies/${encodeURIComponent(props.siteId)}`,
      { credentials: 'same-origin', cache: 'no-store' },
    );
    if (!response.ok)
      throw new Error('Не удалось открыть торговца. Обновите страницу или войдите снова.');
    setShop((await response.json()) as SupplyShopDto);
  }
  useEffect(() => {
    let active = true;
    void fetch(`${apiBaseUrl}/company/supplies/${encodeURIComponent(props.siteId)}`, {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Базар недоступен. Обновите страницу или войдите снова.');
        const value = (await response.json()) as SupplyShopDto;
        if (active) setShop(value);
      })
      .catch((error: unknown) => {
        if (active) setMessage(supplyError(error));
      });
    return () => {
      active = false;
    };
  }, [props.siteId]);
  const quote = supplyPurchaseQuote(
    shop,
    props.holdings,
    quantity,
    pending,
    busy,
    props.company.runStatus === 'ACTIVE',
  );
  async function purchase() {
    if (lock.current) return;
    if (!quote.canPurchase) return;
    lock.current = true;
    setBusy(true);
    setMessage(undefined);
    const attempt = purchaseAttempt(pending, props, shop!, quantity); /* exact retained retry */
    try {
      // Persist before sending. An uncertain result must repeat the same identity and body.
      sessionStorage.setItem(key, JSON.stringify(attempt));
      setPending(attempt);
      const result = await sendSupplyPurchase(apiBaseUrl, props.company.companyId, attempt);
      sessionStorage.removeItem(key);
      setPending(undefined);
      setMessage(purchaseMessage(result, attempt));
      props.onPurchased();
      await refresh();
    } catch (error) {
      setMessage(supplyError(error));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <SupplyShopPanel
      props={props}
      shop={shop}
      quote={quote}
      quantity={quantity}
      setQuantity={setQuantity}
      pending={pending}
      message={message}
      purchase={() => void purchase()}
    />
  );
}

function purchaseAttempt(
  pending: Purchase | undefined,
  props: SupplyShopProps,
  shop: SupplyShopDto,
  quantity: number,
): Purchase {
  return (
    pending ?? {
      schemaVersion: 2,
      commandId: crypto.randomUUID(),
      expectedPublicRevision: props.company.revision,
      type: 'BuySupplies',
      payload: { siteId: props.siteId, quantity, shopRevision: shop.revision },
    }
  );
}
function supplyError(error: unknown): string {
  return error instanceof Error ? error.message : 'Связь прервалась. Повторите эту же покупку.';
}
function purchaseMessage(result: SupplyPurchaseResult, attempt: Purchase): string {
  if (result.ok) return `Куплено ${attempt.payload.quantity} рационов. Они в обозе.`;
  return rejectionText[result.code] ?? 'Покупка отклонена. Данные отряда обновлены.';
}
type ShopPanelProps = {
  readonly props: SupplyShopProps;
  readonly shop: SupplyShopDto | undefined;
  readonly quote: SupplyQuote;
  readonly quantity: number;
  readonly setQuantity: (quantity: number) => void;
  readonly pending: Purchase | undefined;
  readonly message: string | undefined;
  readonly purchase: () => void;
};
function SupplyShopPanel(panel: ShopPanelProps) {
  return (
    <section className="panel supply-shop" aria-label="Купить припасы">
      <p className="eyebrow">{panel.props.venueName} · припасы в дорогу</p>
      <h2 className="panel-title">Походные рационы</h2>
      <p className="state-note">
        Один рацион кормит одного человека один игровой день. Покупка сразу попадает в обоз.
      </p>
      <SupplyShopDetails {...panel} />
      <PendingPurchase attempt={panel.pending} />
      <button
        type="button"
        className="action"
        disabled={panel.quote.disabled}
        onClick={panel.purchase}
      >
        {panel.quote.buttonText}
      </button>
      {panel.message && (
        <p role="status" className="state-note">
          {panel.message}
        </p>
      )}
    </section>
  );
}
function SupplyShopDetails(panel: ShopPanelProps) {
  const shop = panel.shop;
  if (!shop) return null;
  return (
    <>
      <p>
        {formatCrowns(shop.rationPriceQ)} кр. за рацион · в наличии {shop.rations}
      </p>
      <p>Доступное золото: {formatCrowns(shop.availableCashQ ?? '0')} кр.</p>
      <CurrentSupplies supplies={panel.props.holdings?.supplies} />
      <label className="supply-quantity">
        Количество рационов
        <input
          type="number"
          min="1"
          max={Math.min(100, shop.rations)}
          step="1"
          value={panel.quantity}
          disabled={panel.quote.inputDisabled}
          onChange={(event) => panel.setQuantity(Number(event.target.value))}
        />
      </label>
      <PurchaseTotals quote={panel.quote} />
    </>
  );
}
function CurrentSupplies(props: { readonly supplies: CompanyHoldingsDto['supplies'] }) {
  if (!props.supplies) return null;
  return (
    <p>
      Сейчас: {props.supplies.rations} рационов · на{' '}
      {props.supplies.days.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} игровых дней.
    </p>
  );
}
function PurchaseTotals(props: { readonly quote: SupplyQuote }) {
  if (props.quote.hideTotals) return null;
  return (
    <>
      <p>
        Итого {formatCrowns(props.quote.costQ)} кр. · {props.quote.weight} кг · ещё{' '}
        {props.quote.days.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} игровых дней.
      </p>
      {!props.quote.affordable && (
        <p className="travel-error">Недостаточно золота — уменьшите количество.</p>
      )}
    </>
  );
}
function PendingPurchase(props: { readonly attempt: Purchase | undefined }) {
  if (!props.attempt) return null;
  return (
    <p className="state-note">
      Незавершённая покупка: {props.attempt.payload.quantity} рационов. Сначала уточним её
      результат.
    </p>
  );
}
