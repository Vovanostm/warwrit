import { accrueFinance } from './economy-accrual.js';
import { updateArrears } from './economy-departure.js';
import { recordQualification } from './economy-knowledge.js';
import { closeMaintenance } from './economy-maintenance.js';
import {
  financeEffectKey,
  recordSource,
  requireEconomy,
  validateFinanceFact,
} from './economy-state.js';
import { campaignTick, isExactInteger } from './values.js';
import type { CommandOf } from './lifecycle-types.js';
import type {
  CompanyEconomyState,
  EconomyContext,
  EconomyRequirement,
  FinanceChange,
} from './economy-types.js';

/** Ordered canonical boundaries; opaque IDs resolve only against finite trusted context variants. */
export function advanceEconomy(
  state: CompanyEconomyState,
  command: CommandOf<'AdvanceCampaign'>,
  context: EconomyContext,
): FinanceChange {
  let finance = state.finance;
  const requirements: EconomyRequirement[] = [];
  const to = campaignTick(command.payload.toTick);
  const facts = command.payload.authoritativeInputs
    .map((id) => {
      const matches = context.financeFacts.filter((f) => f.id === id);
      requireEconomy(matches.length === 1, 'INVALID_SOURCE');
      const fact = matches[0]!;
      requireEconomy(isExactInteger(fact.atTick), 'INVALID_TIME');
      requireEconomy(
        ['QUALIFICATION_NOTICE', 'WAGE_COMMUNICATION', 'MAINTENANCE_BOUNDARY'].includes(fact.kind),
        'UNSUPPORTED_ACTION',
      );
      return fact;
    })
    .sort((a, b) =>
      BigInt(a.atTick) < BigInt(b.atTick)
        ? -1
        : BigInt(a.atTick) > BigInt(b.atTick)
          ? 1
          : a.id < b.id
            ? -1
            : 1,
    );
  for (const atTick of [...new Set(facts.map((f) => f.atTick))]) {
    const atContext = { ...context, atTick };
    const current = facts.filter((f) => f.atTick === atTick);
    const fresh = current.filter((fact) => {
      if (!finance.sourceEffects.some((s) => s.key === financeEffectKey(fact))) return true;
      recordSource(finance, fact); // An old source with a different immutable body is a conflict.
      return false;
    });
    if (fresh.length === 0) continue;
    requireEconomy(
      BigInt(atTick) >= BigInt(finance.processedTick) && BigInt(atTick) <= BigInt(to),
      'INVALID_TIME',
    );
    for (const fact of fresh) validateFinanceFact(fact, atContext);
    const accrued = accrueFinance(finance, state.lifecycle, atTick);
    finance = accrued.finance;
    requirements.push(...accrued.requirements);
    for (const fact of fresh) {
      if (fact.kind === 'QUALIFICATION_NOTICE')
        finance = recordQualification(finance, fact, atContext);
      else if (fact.kind === 'MAINTENANCE_BOUNDARY') {
        const mode = finance.maintenance.find(
          (m) => m.agreementId === fact.agreementId && m.endedAt === null,
        );
        requireEconomy(mode, 'INVALID_SOURCE');
        requireEconomy(
          fact.reason !== 'LAST_FIELD_WORKER_LOST' || mode.kind === 'FIELD_CAMP',
          'INVALID_SOURCE',
        );
        finance = closeMaintenance(
          recordSource(finance, fact).finance,
          fact.agreementId,
          atTick,
          true,
        );
      }
    }
    const warned = updateArrears(finance, state.lifecycle, { ...atContext, financeFacts: fresh });
    finance = warned.finance;
    requirements.push(...warned.requirements);
    for (const fact of fresh.filter((f) => f.kind === 'WAGE_COMMUNICATION'))
      finance = recordSource(finance, fact).finance;
  }
  const accrued = accrueFinance(finance, state.lifecycle, to);
  const warned = updateArrears(accrued.finance, state.lifecycle, {
    ...context,
    atTick: to,
    financeFacts: [],
  });
  return {
    finance: warned.finance,
    requirements: [...requirements, ...accrued.requirements, ...warned.requirements],
    allocations: [],
  };
}
