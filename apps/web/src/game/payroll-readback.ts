import type { CompanyHoldingsDto } from '@warwrit/protocol';

type Payroll = NonNullable<CompanyHoldingsDto['payroll']>;
export interface PayrollReadback {
  readonly revision: string;
  readonly payroll: Payroll | undefined;
}

export async function verifyPayrollSession(apiBaseUrl: string, accountId: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/auth/session`, {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!response.ok)
    throw new Error('Сессия закончилась. Войдите снова, затем обновите книгу компании.');
  const value: unknown = await response.json();
  if (!isRecord(value) || value['accountId'] !== accountId)
    throw new Error('Учётная запись изменилась. Обновите отряд перед выплатой.');
}

export async function fetchPayrollReadback(
  apiBaseUrl: string,
  companyId: string,
): Promise<PayrollReadback> {
  const response = await fetch(`${apiBaseUrl}/company`, {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Жалованье не обновлено. Обновите отряд и попробуйте снова.');
  const value: unknown = await response.json();
  const readback = parsePayrollReadback(value, companyId);
  if (!readback) throw new Error('Не удалось сверить жалованье с книгой компании.');
  return readback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Validate the current company envelope before accepting its typed payroll projection. */
export function parsePayrollReadback(
  value: unknown,
  expectedCompanyId: string,
): PayrollReadback | undefined {
  if (
    !isRecord(value) ||
    !isRecord(value['company']) ||
    value['company']['companyId'] !== expectedCompanyId ||
    typeof value['company']['revision'] !== 'string' ||
    !/^(0|[1-9][0-9]*)$/u.test(value['company']['revision']) ||
    !isRecord(value['holdings'])
  )
    return undefined;

  return {
    revision: value['company']['revision'],
    payroll: value['holdings']['payroll'] as Payroll | undefined,
  };
}
