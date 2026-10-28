import type { CompanySummaryDto } from '@warwrit/protocol';
import { formatCrowns } from './format.js';
import type { PayrollAttempt } from './payroll-attempt.js';

type PayeeKind = 'CHARACTER' | 'COMPANY' | 'ESTATE' | 'WORLD' | undefined;

const PAYEE_KIND_LABELS: Record<Exclude<PayeeKind, 'CHARACTER' | undefined>, () => string> = {
  COMPANY: () => 'Казна компании',
  ESTATE: () => 'Наследство',
  WORLD: () => 'Получатель',
};

export function payrollPayeeName(payeeId: string, kind: PayeeKind, company: CompanySummaryDto) {
  if (kind === 'CHARACTER')
    return (
      company.characters.find((character) => character.characterId === payeeId)?.name ?? payeeId
    );
  return PAYEE_KIND_LABELS[kind ?? 'WORLD']();
}

export function payrollPaymentDescription(attempt: PayrollAttempt, company: CompanySummaryDto) {
  const amount = `${formatCrowns(attempt.payload.amountQ)} кр.`;
  if (attempt.payload.mode === 'DEFAULT') return `${amount} · по очереди`;
  const payeeId = attempt.payload.payeeId;
  const payee = payeeId ? payrollPayeeName(payeeId, 'CHARACTER', company) : 'указанному получателю';
  return `${amount} · выбранному получателю ${payee}`;
}

export function payrollDeadline(dueAt: string, ticksPerDay: number) {
  const tick = BigInt(dueAt);
  const dayLength = BigInt(ticksPerDay);
  const day = tick / dayLength + 1n;
  const dayTick = tick % dayLength;
  return `День ${day} · такт ${dayTick}`;
}
