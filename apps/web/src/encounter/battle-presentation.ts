import type {
  CombatLabTile,
  EncounterControlGrantDto,
  EncounterPublicProjectionDto,
} from '@warwrit/protocol';
import type { BattlePresentationView, Unit } from '../combat-lab/battle-presentation.js';

/** Project public encounter facts into the renderer contract, adding quotes only from its matching private grant. */
export function toEncounterBattlePresentation(
  projection: EncounterPublicProjectionDto,
  grant: EncounterControlGrantDto | undefined,
  labelForUnit: (unit: EncounterPublicProjectionDto['units'][number]) => string,
  knownOwnUnitIds: readonly string[] = [],
): BattlePresentationView {
  const matchingGrant = matchingEncounterGrant(projection, grant);
  const visibleIds = new Set(projection.units.map(({ id }) => id));
  const controlledUnitIds = (matchingGrant?.controllableUnitIds ?? []).filter((id) =>
    visibleIds.has(id),
  );
  const controlledIds = new Set(controlledUnitIds);
  const controlledSideId = controlledSide(projection, controlledIds, knownOwnUnitIds);
  const tactical = matchingTacticalGrant(projection, matchingGrant, controlledIds);
  const unitsById = new Map(projection.units.map((unit) => [unit.id, unit]));

  return {
    sceneKey: `encounter:${projection.encounterId}`,
    label: 'Сражение',
    sceneEnvironment: 'open-field',
    controlledSideId,
    viewerSideKnown: controlledSideId !== '',
    controlledUnitIds,
    viewRevision: projection.revision,
    status: projection.status === 'active' ? 'active' : 'resolved',
    round: projection.round,
    map: {
      ...presentationMap(projection),
    },
    ...(projection.nextRoundInitiative
      ? { nextRoundInitiative: projection.nextRoundInitiative }
      : {}),
    ...(projection.initiativeOrder ? { initiativeOrder: projection.initiativeOrder } : {}),
    ...(projection.turnIndex !== undefined ? { turnIndex: projection.turnIndex } : {}),
    ...(projection.outcome !== undefined ? { outcome: projection.outcome } : {}),
    units: projection.units.map((unit) =>
      presentationUnit(unit, unitsById, labelForUnit, controlledIds),
    ),
    sides: [...new Set(projection.units.map(({ sideId }) => sideId))].map((id) => ({ id })),
    activation:
      projection.activationId !== null && projection.actorUnitId !== null
        ? {
            id: projection.activationId,
            actorId: projection.actorUnitId,
            ...(tactical ? { actionPoints: { current: tactical.actionPoints } } : {}),
          }
        : null,
    ...(tactical
      ? {
          attackPreview: tactical.attacks.map((attack) => ({
            targetId: attack.targetId,
            hitChance: attack.hitChance,
            actionPointCost: attack.actionPointCost,
            staminaCost: attack.staminaCost,
            damage: attack.damage,
          })),
          movementPreview: tactical.moves.map((move) => ({
            to: move.to,
            path: move.path,
            actionPointCost: move.actionPointCost,
            staminaCost: move.staminaCost,
            fireDamage: move.fireDamage,
            reactionCount: move.reactionCount,
          })),
        }
      : {}),
  };
}

function matchingEncounterGrant(
  projection: EncounterPublicProjectionDto,
  grant: EncounterControlGrantDto | undefined,
) {
  return grant?.encounterId === projection.encounterId && grant.revision === projection.revision
    ? grant
    : undefined;
}

function controlledSide(
  projection: EncounterPublicProjectionDto,
  controlledIds: ReadonlySet<string>,
  knownOwnUnitIds: readonly string[],
) {
  return (
    projection.units.find(({ id }) => controlledIds.has(id))?.sideId ??
    projection.units.find(({ id }) => knownOwnUnitIds.includes(id))?.sideId ??
    ''
  );
}

function matchingTacticalGrant(
  projection: EncounterPublicProjectionDto,
  grant: EncounterControlGrantDto | undefined,
  controlledIds: ReadonlySet<string>,
) {
  const tactical = grant?.tactical;
  return tactical?.activationId === projection.activationId &&
    tactical.actorId === projection.actorUnitId &&
    projection.actorUnitId !== null &&
    controlledIds.has(projection.actorUnitId)
    ? tactical
    : undefined;
}

function presentationMap(projection: EncounterPublicProjectionDto) {
  const map = projection.map;
  return {
    hexes: map?.hexes ?? [],
    blocked: map?.blocked ?? [],
    ...(map?.tiles
      ? {
          tiles: map.tiles.map<CombatLabTile>((tile) => ({
            ...tile,
            blocked: map.blocked.some(({ q, r }) => q === tile.q && r === tile.r),
          })),
        }
      : {}),
  };
}

function presentationUnit(
  unit: EncounterPublicProjectionDto['units'][number],
  unitsById: ReadonlyMap<string, EncounterPublicProjectionDto['units'][number]>,
  labelForUnit: (unit: EncounterPublicProjectionDto['units'][number]) => string,
  controlledIds: ReadonlySet<string>,
): Unit {
  const target = unit.threat ? unitsById.get(unit.threat.targetId) : undefined;
  return {
    id: unit.id,
    name: labelForUnit(unit),
    sideId: unit.sideId,
    position: { q: unit.q, r: unit.r },
    status: unit.status,
    visualKind: visualKind(unit, controlledIds),
    ...(unit.weaponId !== undefined ? { weaponId: unit.weaponId } : {}),
    ...(unit.weaponReach ? { weaponReach: unit.weaponReach } : {}),
    ...(unit.guarding !== undefined ? { guarding: unit.guarding } : {}),
    ...(unit.panicking !== undefined ? { panicking: unit.panicking } : {}),
    pools: {
      health: {
        current: unit.health,
        ...(unit.maximumHealth !== undefined ? { maximum: unit.maximumHealth } : {}),
      },
      ...(unit.armor !== undefined ? { armor: { current: unit.armor } } : {}),
      ...(unit.stamina !== undefined ? { stamina: { current: unit.stamina } } : {}),
      ...(unit.morale !== undefined ? { morale: { current: unit.morale } } : {}),
    },
    ...(unit.threat
      ? {
          threat: {
            targetId: unit.threat.targetId,
            damage: unit.threat.damage,
            responseReceived: unit.threat.responseReceived,
            ...(target ? { targetHex: { q: target.q, r: target.r } } : {}),
          },
        }
      : {}),
  };
}

function visualKind(
  unit: EncounterPublicProjectionDto['units'][number],
  controlledIds: ReadonlySet<string>,
): NonNullable<Unit['visualKind']> {
  if (unit.id.startsWith('world.wolf.') || unit.id.startsWith('world.beast.')) return 'creature';
  if (
    unit.weaponId !== undefined ||
    unit.id.startsWith('world.raider.') ||
    controlledIds.has(unit.id)
  )
    return 'human';
  return 'unknown';
}
