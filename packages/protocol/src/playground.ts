import type { CombatLabBattleConfig, CombatLabView } from './combat-lab.js';

export const PLAYGROUND_SCHEMA_REVISION = 1 as const;
export const PLAYGROUND_CONTENT_REVISION = 'playground-v1:sprite-prototype-v4' as const;

/** Editor adapter: combat/map/participant/seed entities remain owned by combat-lab. */
export interface PlaygroundScenario {
  readonly schemaRevision: typeof PLAYGROUND_SCHEMA_REVISION;
  readonly contentRevision: string;
  readonly metadata: { readonly name: string };
  readonly mapRef: 'inline';
  readonly initial: CombatLabBattleConfig;
  readonly controls: { readonly mode: 'manual' };
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

export interface PlaygroundBootstrap {
  readonly environment: 'development' | 'test';
  /** Authenticated account identity; never a session token. */
  readonly accountId: string;
  readonly contentRevision: string;
  readonly template: PlaygroundScenario;
  readonly sandboxes: readonly PlaygroundSandbox[];
}

export interface PlaygroundInspection {
  readonly validationError?: 'CONTENT_REVISION_MISMATCH';
  readonly sandbox: PlaygroundSandbox;
  readonly view: CombatLabView | null;
  readonly audit: readonly PlaygroundReceipt[];
}
