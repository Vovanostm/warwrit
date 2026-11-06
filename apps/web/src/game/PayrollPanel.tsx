import type { CompanyHoldingsDto, CompanySummaryDto } from '@warwrit/protocol';
import './payroll.css';
import { formatCrowns } from './format.js';
import {
  payrollDeadline,
  payrollPaymentDescription,
  payrollPayeeName,
} from './payroll-presentation.js';
import { usePayroll } from './use-payroll.js';

type Props = {
  readonly accountId: string;
  readonly company: CompanySummaryDto;
  readonly holdings: CompanyHoldingsDto | undefined;
  readonly ticksPerDay: number;
  readonly onRefresh: () => void;
};

export function PayrollPanel(props: Props) {
  const state = usePayroll(props.accountId, props.company, props.holdings, props.onRefresh);
  const payroll = state.payroll;
  if (!payroll)
    return (
      <section className="payroll-panel" aria-label="Жалованье">
        <h3 className="panel-subtitle">Жалованье</h3>
        <p className="state-note" role="status">
          {state.message ??
            (state.fresh ? 'Книга жалованья пока недоступна.' : 'Загружаем книгу жалованья…')}
        </p>
        <button
          type="button"
          className="quiet-action"
          disabled={state.busy}
          onClick={() => void state.refresh()}
        >
          Обновить книгу
        </button>
      </section>
    );

  const pending = state.pending;
  const rows = payroll.pools.map((pool) => {
    const due = payroll.claims.filter(
      (claim) => claim.poolId === pool.poolId && BigInt(claim.dueAt) <= BigInt(payroll.atTick),
    );
    const payeeAmounts = new Map<string, { id: string; amountQ: bigint }>();
    for (const claim of due) {
      const unpaidQ = BigInt(claim.unsecuredQ);
      if (unpaidQ === 0n) continue;
      const existing = payeeAmounts.get(claim.payee.id) ?? { id: claim.payee.id, amountQ: 0n };
      existing.amountQ += unpaidQ;
      payeeAmounts.set(claim.payee.id, existing);
    }
    const dueAmountQ = due.reduce((sum, claim) => sum + BigInt(claim.unsecuredQ), 0n);
    return {
      pool,
      dueAmountQ: dueAmountQ.toString(),
      paymentLimitQ: (dueAmountQ < BigInt(pool.spendableQ)
        ? dueAmountQ
        : BigInt(pool.spendableQ)
      ).toString(),
      payees: [...payeeAmounts.values()].filter((payee) => payee.amountQ > 0n),
    };
  });
  const canAct =
    (props.company.runStatus === 'ACTIVE' || Boolean(pending)) && state.fresh && !state.busy;
  const pay = (poolId: string, amountQ: string, mode: 'DEFAULT' | 'TARGETED', payeeId?: string) =>
    void state.pay({ poolId, amountQ, mode, ...(payeeId === undefined ? {} : { payeeId }) });

  return (
    <section className="payroll-panel" aria-label="Жалованье">
      <h3 className="panel-subtitle">Жалованье</h3>
      <p className="state-note">
        Долг: {formatCrowns(payroll.owedQ)} кр. · к сроку, включая ожидание:{' '}
        {formatCrowns(payroll.dueQ)} кр. · просрочено: {formatCrowns(payroll.duePayableQ)} кр.
      </p>
      {payroll.claims.some((claim) => BigInt(claim.pendingQ) > 0n) && (
        <p className="state-note">
          Часть жалованья ждёт выдачи:{' '}
          {formatCrowns(
            payroll.claims.reduce((sum, claim) => sum + BigInt(claim.pendingQ), 0n).toString(),
          )}{' '}
          кр.
        </p>
      )}
      {pending ? (
        <div className="payroll-pending" role="status">
          <p>
            Выплата {payrollPaymentDescription(pending, props.company)} ещё не подтверждена. Сначала
            повторите тот же приказ.
          </p>
          <button
            type="button"
            className="action"
            disabled={!canAct}
            onClick={() =>
              pay(
                pending.payload.poolId,
                pending.payload.amountQ,
                pending.payload.mode,
                pending.payload.payeeId,
              )
            }
          >
            {state.busy ? 'Проверяем выплату…' : 'Повторить эту же выплату'}
          </button>
        </div>
      ) : (
        <div className="payroll-pools">
          {rows.map(({ pool, dueAmountQ, paymentLimitQ, payees }) => {
            const wallet = props.holdings?.wallets.find(
              (entry) => entry.walletId === pool.walletId,
            );
            const poolName = wallet?.ownerCharacterId
              ? (props.company.characters.find(
                  (character) => character.characterId === wallet.ownerCharacterId,
                )?.name ?? 'Кошелёк участника')
              : 'Казна компании';
            return (
              <div className="payroll-pool" key={pool.poolId}>
                <div className="payroll-pool-head">
                  <strong>{poolName}</strong>
                  <span className="payroll-pool-balance">
                    Свободно {formatCrowns(pool.spendableQ)} кр.
                  </span>
                </div>
                {BigInt(dueAmountQ) > 0n && BigInt(paymentLimitQ) > 0n ? (
                  <>
                    <button
                      type="button"
                      className="quiet-action"
                      disabled={!canAct}
                      onClick={() => pay(pool.poolId, paymentLimitQ, 'DEFAULT')}
                    >
                      Выплатить по очереди · {formatCrowns(paymentLimitQ)} кр.
                    </button>
                    {payees.map((payee) => {
                      const targetLimitQ =
                        payee.amountQ < BigInt(pool.spendableQ)
                          ? payee.amountQ
                          : BigInt(pool.spendableQ);
                      const name = payrollPayeeName(
                        payee.id,
                        payroll.claims.find((claim) => claim.payee.id === payee.id)?.payee.kind,
                        props.company,
                      );
                      return (
                        <div className="payroll-target" key={payee.id}>
                          <span>Получатель: {name}</span>
                          <button
                            type="button"
                            className="quiet-action"
                            disabled={!canAct}
                            onClick={() =>
                              pay(pool.poolId, targetLimitQ.toString(), 'TARGETED', payee.id)
                            }
                          >
                            Выдать жалованье · {formatCrowns(targetLimitQ.toString())} кр.
                          </button>
                        </div>
                      );
                    })}
                  </>
                ) : BigInt(dueAmountQ) > 0n ? (
                  <p className="state-note">В этом кошельке нет свободных денег для выплаты.</p>
                ) : (
                  <p className="state-note">Просроченного жалованья для этого кошелька нет.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {state.message && (
        <p className="state-note" role="status">
          {state.message}
        </p>
      )}
      {!state.fresh && (
        <button
          type="button"
          className="quiet-action"
          disabled={state.busy}
          onClick={() => void state.refresh()}
        >
          Обновить книгу
        </button>
      )}
      <ul className="payroll-history" aria-label="История жалованья">
        {payroll.claims.map((claim) => (
          <li key={claim.claimId}>
            <span>
              {payrollPayeeName(claim.payee.id, claim.payee.kind, props.company)} · срок:{' '}
              {payrollDeadline(claim.dueAt, props.ticksPerDay)}
            </span>
            <span className="payroll-history-balance">
              Выдано {formatCrowns(claim.cashPaidQ)} кр. · ожидает {formatCrowns(claim.pendingQ)}{' '}
              кр. · долг {formatCrowns(claim.unsecuredQ)} кр.
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
