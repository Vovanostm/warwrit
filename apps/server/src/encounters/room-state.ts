import { schema, t, type SchemaType } from '@colyseus/schema';

export const EncounterMapHexStateSchema = schema(
  {
    q: t.number(),
    r: t.number(),
  },
  'EncounterMapHexState',
);

export const EncounterUnitStateSchema = schema(
  {
    id: t.string(),
    sideId: t.string(),
    /** Empty string is the explicit transport sentinel for an unknown weapon. */
    weaponId: t.string(),
    q: t.number(),
    r: t.number(),
    health: t.number(),
    status: t.string(),
    /** Zero is the transport sentinel for an unknown cap. */
    maximumHealth: t.number(),
    armor: t.number(),
    stamina: t.number(),
    morale: t.number(),
    guarding: t.boolean(),
    panicking: t.boolean(),
    threatTargetId: t.string(),
    threatDamageMinimum: t.number(),
    threatDamageMaximum: t.number(),
    threatResponseReceived: t.boolean(),
    weaponReachMinimum: t.number(),
    weaponReachMaximum: t.number(),
    weaponReachCells: t.array(EncounterMapHexStateSchema),
  },
  'EncounterUnitState',
);

export const EncounterMapTileStateSchema = schema(
  {
    q: t.number(),
    r: t.number(),
    height: t.number(),
    terrain: t.string(),
  },
  'EncounterMapTileState',
);

const EncounterMapStateSchema = schema(
  {
    hexes: t.array(EncounterMapHexStateSchema),
    blocked: t.array(EncounterMapHexStateSchema),
    tiles: t.array(EncounterMapTileStateSchema),
  },
  'EncounterMapState',
);

export const EncounterRoomState = schema(
  {
    version: t.number(),
    encounterId: t.string(),
    revision: t.number(),
    status: t.string(),
    round: t.number(),
    activationId: t.string(),
    actorUnitId: t.string(),
    deadlineAt: t.string(),
    initiativeOrder: t.array('string'),
    turnIndex: t.number(),
    nextRound: t.number(),
    nextRoundUnitIds: t.array('string'),
    outcomeReason: t.string(),
    winnerSideId: t.string(),
    map: EncounterMapStateSchema,
    units: t.map(EncounterUnitStateSchema),
  },
  'EncounterRoomState',
);

export type EncounterRoomState = SchemaType<typeof EncounterRoomState>;
