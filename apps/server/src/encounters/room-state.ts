import { schema, t, type SchemaType } from '@colyseus/schema';

export const EncounterUnitStateSchema = schema(
  {
    id: t.string(),
    sideId: t.string(),
    q: t.number(),
    r: t.number(),
    health: t.number(),
    status: t.string(),
  },
  'EncounterUnitState',
);

export const EncounterMapHexStateSchema = schema(
  {
    q: t.number(),
    r: t.number(),
  },
  'EncounterMapHexState',
);

const EncounterMapStateSchema = schema(
  {
    hexes: t.array(EncounterMapHexStateSchema),
    blocked: t.array(EncounterMapHexStateSchema),
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
    map: EncounterMapStateSchema,
    units: t.map(EncounterUnitStateSchema),
  },
  'EncounterRoomState',
);

export type EncounterRoomState = SchemaType<typeof EncounterRoomState>;
