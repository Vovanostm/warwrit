import { applyCombatCommand } from '../combat/engine.js';
import { startBattleV2 } from '../combat/runtime-v2.js';
import type { CombatCommand, CombatEvent, CombatTransition } from '../combat/types.js';
import type { CompanyCommand } from './commands.js';
import { EconomyViolation, requireEconomy } from './economy-state.js';
import { ENCOUNTER_BINDING_VERSION } from './encounter-binding.js';
import type { FrozenEncounterBinding } from './encounter-binding.js';
import { guardCompanyCommand } from './guards.js';
import type { TrustedCompanyContext } from './guards.js';
import { canonicalJson, id, natural } from './input.js';
import { ownPhysical } from './physical-state.js';

type ReceiptCommand = Extract<CompanyCommand, { readonly type: 'ConsumeCombatReceipt' }>;
export interface PreparedCombatReceipt {
  readonly status: 'PREPARED';
  readonly request: ReceiptCommand;
  readonly kernelCommand: CombatCommand | null;
  readonly transition: CombatTransition;
  readonly sourceEventIds: readonly string[];
}
export interface CombatReceiptJournal {
  readonly binding: FrozenEncounterBinding;
  readonly companyId: string;
  readonly receipts: readonly PreparedCombatReceipt[];
  readonly proposedLastAppliedRevision: number;
}
/** Authenticated adapter ONLY: resolve the original G05 binding and actual kernel output.
 * Neither these facts nor internalGrant may be copied from a client payload.
 */
export interface CombatReceiptContext extends TrustedCompanyContext {
  readonly binding: FrozenEncounterBinding;
  readonly kernelCommand: CombatCommand | null;
  readonly transition: CombatTransition;
}

/** Ordinals, never event-body hashes; equal events at distinct positions remain distinct. */
export function combatReceiptEventIds(receiptId: string, events: readonly CombatEvent[]) {
  requireEconomy(id.read(receiptId), 'INVALID_SOURCE');
  return Object.freeze(
    events.map((_, index) => {
      const sourceEventId = `${receiptId}:${index}`;
      requireEconomy(id.read(sourceEventId), 'INVALID_SOURCE');
      return sourceEventId;
    }),
  );
}

/** A fresh internal journal, not a bound company, an applied receipt or a durable commit. */
export function createCombatReceiptJournal(binding: FrozenEncounterBinding, companyId: string) {
  const frozen = ownPhysical(binding);
  requireEconomy(
    frozen.version === ENCOUNTER_BINDING_VERSION &&
      frozen.schemaVersion === 1 &&
      id.read(frozen.bindingId) &&
      id.read(frozen.worldId) &&
      id.read(frozen.setup.battleId) &&
      frozen.participants.some((person) => person.companyId === companyId) &&
      frozen.lastAppliedRevision === frozen.initial.state.revision &&
      canonicalJson(frozen.initial) === canonicalJson(startBattleV2(frozen.setup)),
    'INVALID_SOURCE',
  );
  return Object.freeze({
    binding: frozen,
    companyId,
    receipts: Object.freeze([]) as readonly PreparedCombatReceipt[],
    proposedLastAppliedRevision: frozen.lastAppliedRevision,
  });
}

function checkReceipt(receipt: PreparedCombatReceipt, binding: FrozenEncounterBinding) {
  const p = receipt.request.payload;
  const revision = receipt.transition.state.revision;
  requireEconomy(
    receipt.status === 'PREPARED' &&
      receipt.request.type === 'ConsumeCombatReceipt' &&
      id.read(receipt.request.commandId) &&
      receipt.request.actorRef.kind === 'COMBAT_RECEIPT' &&
      natural().read(revision) &&
      p.bindingId === binding.bindingId &&
      p.revision === String(revision) &&
      p.receiptId === `${binding.setup.battleId}:${revision}` &&
      id.read(p.receiptId) &&
      receipt.request.sourceEventId === p.receiptId &&
      receipt.transition.state.battleId === binding.setup.battleId &&
      receipt.transition.state.schemaVersion === binding.initial.state.schemaVersion &&
      receipt.transition.state.rulesetId === binding.setup.rulesetId &&
      receipt.transition.events.every(
        (event) => event.battleId === binding.setup.battleId && event.revision === revision,
      ) &&
      canonicalJson(p.orderedEvents) === canonicalJson(receipt.transition.events) &&
      canonicalJson(receipt.sourceEventIds) ===
        canonicalJson(combatReceiptEventIds(p.receiptId, receipt.transition.events)),
    'INVALID_SOURCE',
  );
}

/**
 * Revalidates canonical G06 history, not adapter authentication. Callers must source this journal
 * from the authenticated G06 path or trusted storage; this proves its exact kernel sequence.
 */
export function validateCombatReceiptJournal(value: CombatReceiptJournal): CombatReceiptJournal {
  const binding = ownPhysical(value.binding);
  createCombatReceiptJournal(binding, value.companyId);
  const receipts = value.receipts.map((receipt) => ownPhysical(receipt));
  const requests = new Map<string, string>();
  for (let index = 0; index < receipts.length; index += 1) {
    const receipt = receipts[index]!;
    checkReceipt(receipt, binding);
    requireEconomy(
      receipt.transition.state.revision === binding.initial.state.revision + index &&
        receipt.request.companyId === value.companyId &&
        receipt.request.worldId === binding.worldId,
      'INVALID_STATE',
    );
    const requestBody = canonicalJson(receipt.request);
    const priorRequest = requests.get(receipt.request.commandId);
    requireEconomy(!priorRequest || priorRequest === requestBody, 'IDEMPOTENCY_CONFLICT');
    requests.set(receipt.request.commandId, requestBody);

    if (index === 0) {
      requireEconomy(
        receipt.kernelCommand === null &&
          canonicalJson(receipt.transition) === canonicalJson(binding.initial),
        'INVALID_SOURCE',
      );
      continue;
    }

    const kernelCommand = receipt.kernelCommand;
    requireEconomy(
      kernelCommand !== null &&
        id.read(kernelCommand.commandId) &&
        id.read(kernelCommand.actorId) &&
        id.read(kernelCommand.activationId) &&
        (kernelCommand.type !== 'attack' || id.read(kernelCommand.targetId)),
      'INVALID_SOURCE',
    );
    const result = applyCombatCommand(receipts[index - 1]!.transition.state, kernelCommand);
    requireEconomy(result?.ok, 'INVALID_SOURCE');
    requireEconomy(
      canonicalJson(receipt.transition) ===
        canonicalJson({ state: result.state, events: result.events }),
      'INVALID_SOURCE',
    );
  }

  const lastRevision = receipts.at(-1)?.transition.state.revision ?? binding.lastAppliedRevision;
  requireEconomy(value.proposedLastAppliedRevision === lastRevision, 'INVALID_STATE');
  const validated = Object.freeze({
    binding,
    companyId: value.companyId,
    receipts: Object.freeze(receipts),
    proposedLastAppliedRevision: lastRevision,
  });
  requireEconomy(
    canonicalJson(binding) === canonicalJson(value.binding) &&
      validated.companyId === value.companyId &&
      validated.proposedLastAppliedRevision === value.proposedLastAppliedRevision &&
      receipts.length === value.receipts.length &&
      receipts.every(
        (receipt, index) => canonicalJson(receipt) === canonicalJson(value.receipts[index]),
      ),
    'INVALID_STATE',
  );
  return validated;
}

/** G06 admission only. G07-G10 must prepare all effects with the proposed offset together.
 * This never updates binding.lastAppliedRevision or activates public company commands.
 */
export function prepareCombatReceipt(
  journal: CombatReceiptJournal,
  value: unknown,
  context: CombatReceiptContext,
) {
  const guarded = guardCompanyCommand(value, context);
  if (!guarded.ok) throw new EconomyViolation(guarded.error);
  requireEconomy(guarded.command.type === 'ConsumeCombatReceipt', 'INVALID_SOURCE');
  const request = guarded.command;
  const binding = ownPhysical(context.binding);
  requireEconomy(
    binding.worldId === context.worldId &&
      journal.companyId === context.companyId &&
      binding.participants.some((person) => person.companyId === context.companyId) &&
      canonicalJson(journal.binding) === canonicalJson(binding),
    'AUTHORIZATION',
  );
  // Own each retained body separately: the journal is not one bounded wire envelope.
  const validatedJournal = validateCombatReceiptJournal(journal);
  const receipts = validatedJournal.receipts;
  requireEconomy(
    canonicalJson(validatedJournal.binding) === canonicalJson(binding),
    'AUTHORIZATION',
  );
  const lastRevision = validatedJournal.proposedLastAppliedRevision;
  const priorRequest = receipts.find((receipt) => receipt.request.commandId === request.commandId);
  requireEconomy(
    !priorRequest || canonicalJson(priorRequest.request) === canonicalJson(request),
    'IDEMPOTENCY_CONFLICT',
  );
  const transition = ownPhysical(context.transition);
  const kernelCommand = ownPhysical(context.kernelCommand);
  const candidate = Object.freeze({
    status: 'PREPARED' as const,
    request,
    kernelCommand,
    transition,
    sourceEventIds: combatReceiptEventIds(request.payload.receiptId, transition.events),
  });
  checkReceipt(candidate, binding);
  const prior = receipts.find(
    (receipt) => receipt.request.payload.receiptId === request.payload.receiptId,
  );
  if (prior) {
    requireEconomy(
      canonicalJson(prior.request.payload) === canonicalJson(request.payload) &&
        canonicalJson(prior.kernelCommand) === canonicalJson(kernelCommand) &&
        canonicalJson(prior.transition) === canonicalJson(transition),
      'IDEMPOTENCY_CONFLICT',
    );
    return Object.freeze({
      journal: Object.freeze({ ...validatedJournal, binding, receipts: Object.freeze(receipts) }),
      receipt: prior,
    });
  }
  requireEconomy(request.expectedRevision === context.canonicalRevision, 'STALE_REVISION');
  const nextRevision = receipts.length ? lastRevision + 1 : binding.initial.state.revision;
  requireEconomy(transition.state.revision === nextRevision, 'STALE_REVISION');
  let expected = binding.initial;
  if (receipts.length) {
    requireEconomy(
      kernelCommand &&
        id.read(kernelCommand.commandId) &&
        id.read(kernelCommand.actorId) &&
        id.read(kernelCommand.activationId) &&
        (kernelCommand.type !== 'attack' || id.read(kernelCommand.targetId)),
      'INVALID_SOURCE',
    );
    const result = applyCombatCommand(receipts.at(-1)!.transition.state, kernelCommand);
    requireEconomy(result?.ok, 'INVALID_SOURCE');
    expected = { state: result.state, events: result.events };
  } else requireEconomy(kernelCommand === null, 'INVALID_SOURCE');
  requireEconomy(canonicalJson(transition) === canonicalJson(expected), 'INVALID_SOURCE');
  return Object.freeze({
    journal: Object.freeze({
      binding: validatedJournal.binding,
      companyId: validatedJournal.companyId,
      receipts: Object.freeze([...receipts, candidate]),
      proposedLastAppliedRevision: transition.state.revision,
    }),
    receipt: candidate,
  });
}
