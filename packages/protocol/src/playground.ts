import type { EncounterCommandResponse } from './encounter.js';
import type { CombatLabBattleConfig, CombatLabView, CombatLabCatalog } from './combat-lab.js';

export const PLAYGROUND_SCHEMA_REVISION = 2 as const;
export const PLAYGROUND_CONTENT_REVISION = 'playground-v2:m1-domain-bridge-v5' as const;

/** Editor adapter: combat/map/participant/seed entities remain owned by combat-lab. */
export interface PlaygroundScenario {
  readonly schemaRevision: typeof PLAYGROUND_SCHEMA_REVISION;
  readonly contentRevision: string;
  readonly metadata: { readonly name: string };
  readonly mapRef: 'inline';
  readonly initial: CombatLabBattleConfig;
  readonly controls: { readonly mode: 'manual' };
  readonly rulesetId: 'm1-domain-bridge-v5';
  readonly equipment: readonly {
    readonly unitId: string;
    readonly weaponId: 'sword-shield' | 'spear' | 'bow' | 'raider' | 'great-weapon';
  }[];
  readonly resources: readonly {
    readonly unitId: string;
    readonly health: number;
    readonly armor: number;
    readonly stamina: number;
    readonly morale: number;
  }[];
}

export type PlaygroundOperation =
  'create' | 'configure' | 'validate' | 'activate' | 'clone' | 'reset' | 'delete';

export interface PlaygroundCommand {
  readonly commandId: string;
  readonly issuedAt: string;
  readonly operation: PlaygroundOperation;
  readonly sandboxId?: string;
  readonly expectedRevision?: number;
  readonly scenario?: PlaygroundScenario;
}

export interface PlaygroundSandbox {
  readonly id: string;
  readonly ownerId: string;
  readonly contentRevision: string;
  readonly revision: number;
  readonly status: 'draft' | 'validated' | 'active' | 'deleted';
  readonly scenario: PlaygroundScenario;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt: string;
}

export interface PlaygroundReceipt {
  readonly commandId: string;
  readonly receiptId: string;
  readonly sandboxId: string;
  readonly revision: number;
  readonly operation: PlaygroundOperation;
  readonly status: 'accepted';
}

export interface PlaygroundResult {
  readonly sandbox: PlaygroundSandbox;
  readonly receipt: PlaygroundReceipt;
}

export interface PlaygroundTimeReceipt {
  readonly commandId: string;
  readonly worldId: string;
  readonly ticks: number;
  readonly beforeTick: string;
  readonly afterTick: string;
}

export interface PlaygroundBootstrap {
  /** Explicit opt-in QA world, never selected by a client command. */
  readonly campaignTimeWorldId?: string;
  readonly environment: 'development' | 'test';
  /** Authenticated account identity; never a session token. */
  readonly accountId: string;
  readonly contentRevision: string;
  readonly template: PlaygroundScenario;
  readonly catalog: CombatLabCatalog;
  readonly debugScenarios: readonly PlaygroundScenario[];
  readonly sandboxes: readonly PlaygroundSandbox[];
}

export interface PlaygroundInspection {
  readonly validationError?: 'CONTENT_REVISION_MISMATCH';
  readonly sandbox: PlaygroundSandbox;
  readonly view: CombatLabView | null;
  readonly encounterId?: string;
  readonly commands?: readonly unknown[];
  readonly receipts?: readonly EncounterCommandResponse[];
  readonly rejections?: readonly EncounterCommandResponse[];
  readonly events?: readonly unknown[];
  readonly audit: readonly PlaygroundReceipt[];
}

export interface PlaygroundFieldError {
  readonly field: string;
  readonly message: string;
}
export interface PlaygroundReplayReport {
  readonly reason: string | null;
  readonly matches: boolean;
  readonly expectedDigest: string;
  readonly actualDigest: string | null;
  readonly rulesetId: string;
  readonly contentRevision: string;
  readonly replay: unknown;
}
