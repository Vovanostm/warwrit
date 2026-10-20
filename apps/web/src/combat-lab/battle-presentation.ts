import type { CombatLabView } from '@warwrit/protocol';

type CombatLabUnit = CombatLabView['units'][number];
type MovementPreview = NonNullable<CombatLabView['movementPreview']>[number];
type ResourcePools = Readonly<
  Partial<
    Record<
      'health' | 'armor' | 'stamina' | 'morale',
      Readonly<{ current: number; maximum?: number }>
    >
  >
>;

/** Finite shared renderer input. Lab identity and private encounter authority stay outside it. */
export type BattlePresentationUnit = Omit<
  CombatLabUnit,
  'weaponId' | 'pools' | 'initiative' | 'wounds' | 'profileId' | 'threat' | 'guarding'
> & {
  readonly profileId?: string;
  readonly weaponId?: CombatLabUnit['weaponId'] | 'fists';
  readonly visualKind?: 'human' | 'creature' | 'unknown';
  readonly pools: ResourcePools;
  readonly initiative?: number;
  readonly wounds?: CombatLabUnit['wounds'];
  readonly guarding?: boolean;
  readonly threat?: Omit<
    NonNullable<CombatLabUnit['threat']>,
    'range' | 'retargeted' | 'targetHex'
  > & {
    readonly targetHex?: NonNullable<CombatLabUnit['threat']>['targetHex'];
    readonly retargeted?: boolean;
  };
};

export type BattlePresentationView = Omit<
  CombatLabView,
  | 'sessionId'
  | 'battleId'
  | 'scenarioId'
  | 'version'
  | 'battle'
  | 'controlledSideId'
  | 'viewRevision'
  | 'units'
  | 'activation'
  | 'events'
  | 'omittedEventPrefix'
  | 'movementPreview'
  | 'sides'
  | 'initiativeOrder'
  | 'turnIndex'
  | 'outcome'
> & {
  readonly sceneKey: string;
  readonly label: string;
  readonly sourceNote?: string;
  readonly sceneEnvironment?: 'old-mill' | 'open-field';
  readonly controlledSideId: string;
  readonly viewerSideKnown?: boolean;
  readonly controlledUnitIds: readonly string[];
  readonly viewRevision: number;
  readonly units: readonly BattlePresentationUnit[];
  readonly initiativeOrder?: CombatLabView['initiativeOrder'];
  readonly turnIndex?: CombatLabView['turnIndex'];
  readonly outcome?: CombatLabView['outcome'];
  readonly events?: CombatLabView['events'];
  readonly omittedEventPrefix?: number;
  readonly movementPreview?: readonly (Omit<MovementPreview, 'reactions'> & {
    readonly reactionCount?: number;
    readonly reactions?: MovementPreview['reactions'];
  })[];
  readonly sides?: readonly {
    readonly id: string;
    readonly retreatHexes?: CombatLabView['sides'][number]['retreatHexes'];
  }[];
  readonly activation: {
    readonly id: string;
    readonly actorId: string;
    readonly actionPoints?: Readonly<{ current: number; maximum?: number }>;
  } | null;
};

export type Unit = BattlePresentationUnit;

export function isBattlePresentationView(
  view: BattlePresentationView | CombatLabView,
): view is BattlePresentationView {
  return 'sceneKey' in view;
}

export function fromCombatLabView(view: CombatLabView): BattlePresentationView {
  return {
    ...view,
    sceneKey: `${view.sessionId}:${view.battleId}`,
    label: view.map.name ?? view.battle?.map.name ?? 'Бой',
    sceneEnvironment: 'old-mill',
    sourceNote: '15 × 11 гексов · без сохранения кампании',
    controlledUnitIds: view.units
      .filter((unit) => unit.sideId === view.controlledSideId)
      .map((unit) => unit.id),
    viewerSideKnown: true,
    units: view.units.map((unit) => ({
      ...unit,
      visualKind:
        unit.sideId === 'human' ? 'human' : unit.sideId === 'opponent' ? 'creature' : 'unknown',
    })),
  };
}
