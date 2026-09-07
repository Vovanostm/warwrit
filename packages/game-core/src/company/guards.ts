import { canonicalJson } from './input.js';
import { parseCompanyCommand } from './commands.js';
import type {
  ActorKind,
  CompanyCommand,
  CompanyCommandType,
  CompanyInputError,
  InternalActor,
} from './commands.js';
import type { CanonicalRevision, PublicRevision } from './values.js';

/** Construct ONLY inside an authenticated adapter, never from the command payload. */
export type TrustedCompanyContext = {
  readonly worldId: string;
  readonly companyId: string;
  readonly principal:
    | { readonly kind: 'PLAYER'; readonly id: string }
    | { readonly kind: InternalActor; readonly id: string };
  readonly publicRevision: PublicRevision;
  readonly canonicalRevision: CanonicalRevision;
  /** Required for every non-player command: adapter-verified full immutable request. */
  readonly internalGrant?: {
    readonly commandId: string;
    readonly sourceEventId: string;
    readonly canonicalRequest: string;
  };
};
const systemTypes: readonly CompanyCommandType[] = [
  'ExecuteDeparture',
  'AdvanceCampaign',
  'BeginEncounterBinding',
];
const receiptActors: Partial<Record<CompanyCommandType, ActorKind>> = {
  Arrive: 'WORLD_RECEIPT',
  ResolveMissing: 'WORLD_RECEIPT',
  ApplyContainerLifecycle: 'WORLD_RECEIPT',
  CreditPractice: 'DOMAIN_RECEIPT',
  ApplyCondition: 'DOMAIN_RECEIPT',
  Observe: 'DOMAIN_RECEIPT',
  ProposeNickname: 'DOMAIN_RECEIPT',
  Capture: 'OUTCOME_RECEIPT',
  ReleaseCaptive: 'OUTCOME_RECEIPT',
  TransferCaptive: 'OUTCOME_RECEIPT',
  RecordDeath: 'OUTCOME_RECEIPT',
  ConsumeCombatReceipt: 'COMBAT_RECEIPT',
  FinalizeEncounter: 'COMBAT_RECEIPT',
};
export function requiredActor(command: CompanyCommand): readonly ActorKind[] {
  switch (command.type) {
    case 'RequestDeparture':
      return [command.payload.reason === 'DISMISSED' ? 'PLAYER' : 'SYSTEM'];
    case 'EndMaintenance':
      return [command.payload.reason === 'LEAVE' ? 'PLAYER' : 'SYSTEM'];
    case 'StopLearning':
      return [command.payload.reason === 'PLAYER' ? 'PLAYER' : 'SYSTEM'];
    case 'ResolveLeadership':
      return command.payload.mode === 'ACTING' || command.payload.mode === 'REGENCY'
        ? ['PLAYER', 'SYSTEM']
        : ['PLAYER'];
    default:
      return [
        receiptActors[command.type] ?? (systemTypes.includes(command.type) ? 'SYSTEM' : 'PLAYER'),
      ];
  }
}
export type CompanyGuardError = CompanyInputError | 'AUTHORIZATION' | 'INVALID_SOURCE';
export type CompanyGuardResult =
  | { readonly ok: true; readonly command: CompanyCommand }
  | { readonly ok: false; readonly error: CompanyGuardError };

/** Deliberately no CAS check: durable retry lookup must happen BEFORE fresh-command CAS. */
export function guardCompanyCommand(
  value: unknown,
  context: TrustedCompanyContext,
): CompanyGuardResult {
  const parsed = parseCompanyCommand(value);
  if (!parsed.ok) return parsed;
  const command = parsed.command;
  if (
    command.worldId !== context.worldId ||
    command.companyId !== context.companyId ||
    command.actorRef.kind !== context.principal.kind ||
    command.actorRef.id !== context.principal.id ||
    !requiredActor(command).includes(context.principal.kind)
  )
    return { ok: false, error: 'AUTHORIZATION' };
  if (context.principal.kind !== 'PLAYER') {
    const grant = context.internalGrant;
    if (
      !command.sourceEventId ||
      !grant ||
      grant.commandId !== command.commandId ||
      grant.sourceEventId !== command.sourceEventId ||
      grant.canonicalRequest !== canonicalJson(command)
    )
      return { ok: false, error: 'INVALID_SOURCE' };
  }
  return parsed;
}
/** Only call for a NEW authenticated command after durable receipt lookup. */
export function checkFreshCompanyRevision(
  command: CompanyCommand,
  context: TrustedCompanyContext,
): boolean {
  return (
    command.expectedRevision ===
    (command.actorRef.kind === 'PLAYER' ? context.publicRevision : context.canonicalRevision)
  );
}
/** WP-02.1 has no gameplay handlers. Even valid requests never report a successful no-op. */
export function executeCompanyCommand<State>(
  state: State,
  value: unknown,
  context: TrustedCompanyContext,
): {
  readonly ok: false;
  readonly state: State;
  readonly error: CompanyGuardError | 'UNSUPPORTED_ACTION';
} {
  const guarded = guardCompanyCommand(value, context);
  return { ok: false, state, error: guarded.ok ? 'UNSUPPORTED_ACTION' : guarded.error };
}
