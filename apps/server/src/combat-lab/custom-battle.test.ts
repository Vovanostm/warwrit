import * as combat from '@warwrit/game-core';
import {
  SPRITE_COMBAT_LAB_SCENARIO,
  type CombatLabAction,
  type CombatLabBattleConfig,
  type CombatLabCatalog,
  type CombatLabView,
} from '@warwrit/protocol';
import { afterEach, assert, describe, expect, it } from 'vitest';
import { decideAction, type CombatLabSession } from './routes.js';
import { buildApp } from '../app.js';
import { projectCombatLabView } from './projection.js';
import { projectCombatLabReplay, type CombatLabReplay } from './replay.js';
import {
  combatLabCatalog,
  defaultSpriteBattle,
  isCustomBattle,
  createCustomBattleFixture,
} from './custom-battle.js';

const settings = { host: '127.0.0.1', port: 3000, origin: 'http://127.0.0.1:5173' };
const headers = { host: '127.0.0.1:3000', origin: settings.origin };
const apps: ReturnType<typeof buildApp>[] = [];
const lab = () => {
  const app = buildApp({ logger: false, combatLab: settings });
  apps.push(app);
  return app;
};
const skillDuel = (): CombatLabBattleConfig => {
  const template = defaultSpriteBattle();
  return {
    ...template,
    map: {
      ...template.map,
      tiles: template.map.tiles.map((tile) => ({
        ...tile,
        blocked: false,
        height: 0,
        terrain: 'plain',
      })),
    },
    units: [
      {
        id: 'fighter',
        profileId: 'W01',
        sideId: 'human',
        position: { q: 3, r: 5 },
        skillRanks: { 'shield-brace': 2, 'armor-pressure': 1 },
      },
      { id: 'enemy', profileId: 'W02', sideId: 'opponent', position: { q: 4, r: 5 } },
    ],
  };
};
async function createSkillDuel(app: ReturnType<typeof buildApp>) {
  const created = await app.inject({
    method: 'POST',
    url: '/dev/combat-lab',
    headers,
    payload: {
      version: 1,
      requestId: 'skill-duel',
      scenarioId: SPRITE_COMBAT_LAB_SCENARIO,
      battle: skillDuel(),
    },
  });
  expect(created.statusCode).toBe(201);
  const before = created.json<CombatLabView>();
  assert(before.activation);
  return {
    before,
    privateHeaders: {
      ...headers,
      'x-combat-lab-capability': created.headers['x-combat-lab-capability'] as string,
    },
    url: `/dev/combat-lab/${before.sessionId}`,
    action: (requestId: string, intent: CombatLabAction['intent']): CombatLabAction => ({
      version: 1,
      requestId,
      sessionId: before.sessionId,
      battleId: before.battleId,
      expectedViewRevision: before.viewRevision,
      activationId: before.activation!.id,
      actorId: before.activation!.actorId,
      intent,
    }),
  };
}
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('custom sprite battle server boundary', () => {
  it('serves detached editable mill and human presets through the ordinary create route', async () => {
    const baseline = defaultSpriteBattle();
    const catalog = combatLabCatalog();
    expect(catalog.defaultBattle).toEqual(baseline);
    expect(catalog.presets?.map(({ id }) => id)).toEqual(['ruined-mill', 'deserter-band']);
    expect(catalog.presets?.[0]?.battle).toEqual(baseline);
    const deserters = catalog.presets![1]!.battle;
    expect(deserters.name).toBe('Банда дезертиров');
    expect(deserters.seed).toBe(baseline.seed);
    expect(deserters.map).toEqual(baseline.map);
    expect(deserters.units.filter((unit) => unit.sideId === 'human')).toEqual(
      baseline.units.filter((unit) => unit.sideId === 'human'),
    );
    expect(
      deserters.units.filter((unit) => unit.sideId === 'opponent').map((unit) => unit.profileId),
    ).toEqual(['W01', 'W04', 'W05', 'W01', 'W04']);
    // Mutating any draft must leave its siblings, subsequent catalogs and the default intact.
    const before = structuredClone(catalog);
    expect(catalog.defaultBattle.map).not.toBe(catalog.presets![0]!.battle.map);
    expect(catalog.presets![0]!.battle.map).not.toBe(deserters.map);
    expect(catalog.defaultBattle.units[0]).not.toBe(deserters.units[0]);
    for (const battle of [
      catalog.defaultBattle,
      ...catalog.presets!.map((preset) => preset.battle),
    ]) {
      const editable = battle as unknown as {
        map: { tiles: { terrain: string }[] };
        units: { position: { q: number }; skillRanks: Record<string, number> }[];
      };
      editable.map.tiles[0]!.terrain = 'fire';
      editable.units[0]!.position.q = 9;
      editable.units[0]!.skillRanks['shield-brace'] = 3;
    }
    expect(combatLabCatalog()).toEqual(before);
    expect(defaultSpriteBattle()).toEqual(baseline);
    const app = lab();
    const response = await app.inject({ method: 'GET', url: '/dev/combat-lab/catalog', headers });
    expect(response.statusCode).toBe(200);
    const served = response.json<CombatLabCatalog>();
    expect(served).toEqual(before);
    for (const { id, battle } of served.presets!) {
      expect(isCustomBattle(battle)).toBe(true);
      const created = await app.inject({
        method: 'POST',
        url: '/dev/combat-lab',
        headers,
        payload: { version: 1, requestId: id, scenarioId: SPRITE_COMBAT_LAB_SCENARIO, battle },
      });
      expect(created.statusCode).toBe(201);
      const view = created.json<CombatLabView>();
      expect(view.battle).toEqual(createCustomBattleFixture('expected', battle).battle);
      expect(view.units).toHaveLength(battle.units.length);
      expect(view.rulesetId).toBe('sprite-prototype-v4');
    }
  });

  it('publishes weapon inspection for both sides separately from the lawful active attack', async () => {
    const { before } = await createSkillDuel(lab());
    expect(before.units.find((unit) => unit.id === 'fighter')?.weaponReach).toEqual(
      expect.objectContaining({
        minimumRange: 1,
        maximumRange: 1,
        cells: expect.arrayContaining([{ q: 4, r: 5 }]),
      }),
    );
    expect(before.units.find((unit) => unit.id === 'enemy')?.weaponReach?.cells).toContainEqual({
      q: 3,
      r: 5,
    });
    expect(before.activation?.actorId).toBe('fighter');
    expect(before.attackPreview?.map((preview) => preview.targetId)).toEqual(['enemy']);
  });

  it('derives the new bow cost from the response and accepts the previewed attack', async () => {
    const app = lab();
    const template = defaultSpriteBattle();
    const battle = {
      ...template,
      map: {
        ...template.map,
        tiles: template.map.tiles.map((tile) => ({
          ...tile,
          blocked: false,
          height: 0 as const,
          terrain: 'plain' as const,
        })),
      },
      units: [
        { id: 'archer', profileId: 'W05', sideId: 'human' as const, position: { q: 3, r: 5 } },
        { id: 'target', profileId: 'W02', sideId: 'opponent' as const, position: { q: 6, r: 5 } },
      ],
    };
    const created = await app.inject({
      method: 'POST',
      url: '/dev/combat-lab',
      headers,
      payload: {
        version: 1,
        requestId: 'bow-cost-preview',
        scenarioId: SPRITE_COMBAT_LAB_SCENARIO,
        battle,
      },
    });
    expect(created.statusCode).toBe(201);
    const before = created.json<CombatLabView>();
    assert(before.activation);
    expect(before.rulesetId).toBe('sprite-prototype-v4');
    const bowRule = before.ruleHints?.weapons.find(({ id }) => id === 'bow');
    const preview = before.attackPreview?.find(({ targetId }) => targetId === 'target');
    expect(bowRule).toEqual({ id: 'bow', actionPointCost: 3, staminaCost: 16 });
    expect(preview).toMatchObject({
      actionPointCost: bowRule!.actionPointCost,
      staminaCost: bowRule!.staminaCost,
    });

    const privateHeaders = {
      ...headers,
      'x-combat-lab-capability': created.headers['x-combat-lab-capability'] as string,
    };
    const accepted = await app.inject({
      method: 'POST',
      url: `/dev/combat-lab/${before.sessionId}/actions`,
      headers: privateHeaders,
      payload: {
        version: 1,
        requestId: 'bow-cost-accepted',
        sessionId: before.sessionId,
        battleId: before.battleId,
        expectedViewRevision: before.viewRevision,
        activationId: before.activation.id,
        actorId: before.activation.actorId,
        intent: { type: 'attack', targetId: 'target' },
      },
    });
    expect(accepted.statusCode).toBe(200);
    const after = accepted.json<CombatLabView>();
    const archerBefore = before.units.find(({ id }) => id === 'archer')!;
    const archerAfter = after.units.find(({ id }) => id === 'archer')!;
    expect(archerBefore.pools.stamina.current - archerAfter.pools.stamina.current).toBe(
      bowRule!.staminaCost,
    );
    expect(after.activation?.actionPoints.current).toBe(
      before.activation.actionPoints.current - preview!.actionPointCost,
    );
  });

  it('accepts a learned skill once and rejects changed retries and stale revisions', async () => {
    const app = lab();
    const { before, privateHeaders, url, action } = await createSkillDuel(app);
    expect(before.rulesetId).toBe('sprite-prototype-v4');
    const payload = action('brace', { type: 'use-skill', skillId: 'shield-brace' });
    const accepted = await app.inject({
      method: 'POST',
      url: `${url}/actions`,
      headers: privateHeaders,
      payload,
    });
    expect(accepted.statusCode).toBe(200);
    const latest = (
      await app.inject({ method: 'GET', url, headers: privateHeaders })
    ).json<CombatLabView>();
    expect(latest.viewRevision).toBe(before.viewRevision + 1);
    expect(latest.activation?.actionPoints.current).toBe(2);
    const fighter = latest.units.find((unit) => unit.id === 'fighter');
    expect(fighter?.guarding).toBe(true);
    expect(fighter?.pools.stamina.current).toBe(
      before.units.find((unit) => unit.id === 'fighter')!.pools.stamina.current - 12,
    );
    const retry = await app.inject({
      method: 'POST',
      url: `${url}/actions`,
      headers: privateHeaders,
      payload,
    });
    expect(retry.json()).toEqual(accepted.json());
    const conflict = await app.inject({
      method: 'POST',
      url: `${url}/actions`,
      headers: privateHeaders,
      payload: {
        ...payload,
        intent: { type: 'use-skill', skillId: 'shield-brace', targetId: 'enemy' },
      },
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().code).toBe('REQUEST_CONFLICT');
    const stale = await app.inject({
      method: 'POST',
      url: `${url}/actions`,
      headers: privateHeaders,
      payload: { ...payload, requestId: 'stale-brace' },
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().code).toBe('STALE_VIEW');
    expect((await app.inject({ method: 'GET', url, headers: privateHeaders })).json()).toEqual(
      latest,
    );
    const replay = (
      await app.inject({ method: 'GET', url: `${url}/replay`, headers: privateHeaders })
    ).json<combat.CombatReplay>();
    expectReadOnlySkillReach(replay);
    expect(latest.skillReach).toEqual(
      combat.previewCombatSkillReach(combat.replayCombat(replay).state, combat.unitId('fighter')),
    );
    expect(replay.commands).toHaveLength(1);
    expect(replay.commands[0]).toMatchObject({ type: 'use-skill', skillId: 'shield-brace' });
    expect(
      combat.replayCombat(replay).state.units.find((unit) => unit.id === 'fighter')
        ?.shieldBraceRank,
    ).toBe(2);
  });

  it('rejects an invalid skill target and rank without changing the admitted battle', async () => {
    const app = lab();
    const { before, privateHeaders, url, action } = await createSkillDuel(app);
    const beforeReplay = (
      await app.inject({ method: 'GET', url: `${url}/replay`, headers: privateHeaders })
    ).json();
    const rejected = await app.inject({
      method: 'POST',
      url: `${url}/actions`,
      headers: privateHeaders,
      payload: action('wrong-target', {
        type: 'use-skill',
        skillId: 'shield-brace',
        targetId: 'enemy',
      }),
    });
    expect(rejected.statusCode).toBe(400);
    expect(rejected.json().code).toBe('INVALID_ACTION');
    for (const skillRanks of [{ 'shield-brace': 4 }, 42, []]) {
      const draft = skillDuel();
      const malformed = await app.inject({
        method: 'POST',
        url: '/dev/combat-lab',
        headers,
        payload: {
          version: 1,
          requestId: 'bad-ranks',
          scenarioId: SPRITE_COMBAT_LAB_SCENARIO,
          battle: {
            ...draft,
            units: draft.units.map((unit, index) => (index === 0 ? { ...unit, skillRanks } : unit)),
          },
        },
      });
      expect(malformed.statusCode).toBe(400);
    }
    expect((await app.inject({ method: 'GET', url, headers: privateHeaders })).json()).toEqual(
      before,
    );
    expect(
      (await app.inject({ method: 'GET', url: `${url}/replay`, headers: privateHeaders })).json(),
    ).toEqual(beforeReplay);
  });

  it('autoplays a canonical action once and reproduces its opponent continuation', async () => {
    const app = lab();
    const { before, privateHeaders, url, action } = await createSkillDuel(app);
    const payload = action('auto-step', { type: 'autoplay' });
    const accepted = await app.inject({
      method: 'POST',
      url: `${url}/actions`,
      headers: privateHeaders,
      payload,
    });
    expect(accepted.statusCode).toBe(200);
    const latest = (
      await app.inject({ method: 'GET', url, headers: privateHeaders })
    ).json<CombatLabView>();
    const replay = (
      await app.inject({ method: 'GET', url: `${url}/replay`, headers: privateHeaders })
    ).json<combat.CombatReplay>();
    const expected = combat.chooseTacticalCombatCommand(combat.startBattle(replay.setup).state);
    expect(replay.commands[0]).toEqual({
      ...expected,
      commandId: combat.commandId('human:auto-step'),
    });
    expect(replay.commands.some((command) => command.commandId.startsWith('ai:'))).toBe(true);
    const reproduced = combat.replayCombat(replay).state;
    expect(reproduced.revision).toBe(latest.viewRevision);
    expect(
      reproduced.units.map((unit) => [
        unit.id,
        unit.health,
        unit.armor,
        unit.stamina,
        unit.position,
        unit.status,
      ]),
    ).toEqual(
      latest.units.map((unit) => [
        unit.id,
        unit.pools.health.current,
        unit.pools.armor.current,
        unit.pools.stamina.current,
        unit.position,
        unit.status,
      ]),
    );
    const retry = await app.inject({
      method: 'POST',
      url: `${url}/actions`,
      headers: privateHeaders,
      payload,
    });
    expect(retry.json()).toEqual(accepted.json());
    expect((await app.inject({ method: 'GET', url, headers: privateHeaders })).json()).toEqual(
      latest,
    );
    expect(
      (await app.inject({ method: 'GET', url: `${url}/replay`, headers: privateHeaders })).json(),
    ).toEqual(replay);
    expect(latest.viewRevision).toBeGreaterThan(before.viewRevision);
  });

  it('finishes a lawful fully panicked corridor beyond 128 forced commands', () => {
    const tiles = defaultSpriteBattle().map.tiles;
    const setup: combat.BattleSetup = {
      schemaVersion: 1,
      battleId: combat.battleId('panic-corridor'),
      rulesetId: 'sprite-prototype-v2',
      seed: 42,
      map: { hexes: tiles, blocked: tiles.filter((tile) => tile.r !== 5) },
      sides: [
        { id: combat.sideId('human'), retreatHexes: [{ q: 0, r: 5 }] },
        { id: combat.sideId('opponent'), retreatHexes: [{ q: 14, r: 5 }] },
      ],
      units: [10, 11, 3, 4].map((q, index) => ({
        id: combat.unitId(`panic-${index}`),
        sideId: combat.sideId(index < 2 ? 'human' : 'opponent'),
        position: { q, r: 5 },
        weaponId: 'sword-shield',
        moralePolicy: 'human',
        attributes: {
          health: 80,
          armor: 20,
          defense: 10,
          accuracy: 10,
          initiative: 100 - index,
          stamina: 100,
          morale: 20,
        },
      })),
    };
    const started = combat.startBattle(setup);
    assert(started.state.activation);
    const session: CombatLabSession = {
      originalSetup: setup,
      capability: Buffer.alloc(32),
      controlledSideId: 'human',
      state: started.state,
      journal: started.events,
      commands: [],
      replayBytes: 1024,
      decisions: new Map(),
    };
    const result = decideAction(session, {
      version: 1,
      requestId: 'panic-start',
      sessionId: 'panic-corridor',
      battleId: setup.battleId,
      expectedViewRevision: 0,
      activationId: started.state.activation.id,
      actorId: started.state.activation.unitId,
      intent: { type: 'wait' },
    });
    expect(result.status).toBe(200);
    expect(result.session.state.status).toBe('resolved');
    expect(result.session.state.outcome?.reason).toBe('round-limit');
    expect(result.session.commands.length).toBeGreaterThan(128);
    expect(
      combat.canonicalCombatState(
        combat.replayCombat({ schemaVersion: 1, setup, commands: result.session.commands }).state,
      ),
    ).toBe(combat.canonicalCombatState(result.session.state));
  });

  it('ends a zero-AP activation once, advances opposition and preserves retry/replay', async () => {
    const app = lab();
    const template = defaultSpriteBattle();
    const battle = {
      ...template,
      map: {
        ...template.map,
        tiles: template.map.tiles.map((tile) => ({
          ...tile,
          blocked: false,
          height: 0 as const,
          terrain: 'plain' as const,
        })),
      },
      units: [
        { id: 'archer', profileId: 'W05', sideId: 'human' as const, position: { q: 2, r: 5 } },
        { id: 'enemy', profileId: 'W01', sideId: 'opponent' as const, position: { q: 13, r: 5 } },
      ],
    };
    const created = await app.inject({
      method: 'POST',
      url: '/dev/combat-lab',
      headers,
      payload: {
        version: 1,
        requestId: 'auto-end',
        scenarioId: SPRITE_COMBAT_LAB_SCENARIO,
        battle,
      },
    });
    expect(created.statusCode).toBe(201);
    const before = created.json<CombatLabView>();
    assert(before.activation);
    const move = before.movementPreview?.find(
      (preview) => preview.actionPointCost === 4 && preview.to.q === 6 && preview.to.r === 5,
    );
    assert(move);
    const privateHeaders = {
      ...headers,
      'x-combat-lab-capability': created.headers['x-combat-lab-capability'] as string,
    };
    const url = `/dev/combat-lab/${before.sessionId}`;
    const payload = {
      version: 1,
      requestId: 'all-ap',
      sessionId: before.sessionId,
      battleId: before.battleId,
      expectedViewRevision: before.viewRevision,
      activationId: before.activation.id,
      actorId: before.activation.actorId,
      intent: { type: 'move', to: move.to },
    };
    const accepted = await app.inject({
      method: 'POST',
      url: `${url}/actions`,
      headers: privateHeaders,
      payload,
    });
    expect(accepted.statusCode).toBe(200);
    const latest = (
      await app.inject({ method: 'GET', url, headers: privateHeaders })
    ).json<CombatLabView>();
    expect(latest.activation?.id).not.toBe(before.activation.id);
    expect(latest.activation?.actionPoints.current).toBe(4);
    const retry = await app.inject({
      method: 'POST',
      url: `${url}/actions`,
      headers: privateHeaders,
      payload,
    });
    expect(retry.json()).toEqual(accepted.json());
    expect((await app.inject({ method: 'GET', url, headers: privateHeaders })).json()).toEqual(
      latest,
    );
    const replay = (
      await app.inject({ method: 'GET', url: `${url}/replay`, headers: privateHeaders })
    ).json<combat.CombatReplay>();
    expect(replay.commands.filter((command) => command.commandId.startsWith('auto:'))).toHaveLength(
      1,
    );
    expect(combat.replayCombat(replay).state.revision).toBe(latest.viewRevision);
  });

  it('projects a bow shot area and on-hit loss ranges without advancing the battle', async () => {
    const app = lab();
    const template = defaultSpriteBattle();
    const battle = {
      ...template,
      map: {
        ...template.map,
        tiles: template.map.tiles.map((tile) => ({
          ...tile,
          height: 0 as const,
          terrain: 'plain' as const,
          blocked: tile.q === 3 && tile.r === 7,
        })),
      },
      units: [
        { id: 'archer', profileId: 'W05', sideId: 'human' as const, position: { q: 3, r: 5 } },
        { id: 'target', profileId: 'W02', sideId: 'opponent' as const, position: { q: 6, r: 5 } },
        {
          id: 'blocked-target',
          profileId: 'W02',
          sideId: 'opponent' as const,
          position: { q: 3, r: 8 },
        },
      ],
    };
    const created = await app.inject({
      method: 'POST',
      url: '/dev/combat-lab',
      headers,
      payload: {
        version: 1,
        requestId: 'archer-preview',
        scenarioId: SPRITE_COMBAT_LAB_SCENARIO,
        battle,
      },
    });
    expect(created.statusCode).toBe(201);
    const view = created.json<CombatLabView>();
    expect(view.activation?.actorId).toBe('archer');
    expect(view.rangedAttackArea).toContainEqual({ q: 6, r: 5 });
    expect(view.rangedAttackArea).not.toContainEqual({ q: 3, r: 8 });
    const attack = view.attackPreview?.find(({ targetId }) => targetId === 'target');
    expect(attack?.damage).toEqual({
      health: { minimum: 2, maximum: 4 },
      armor: { minimum: 12, maximum: 18 },
    });
    expect(view.attackPreview?.some(({ targetId }) => targetId === 'blocked-target')).toBe(false);
    const latest = await app.inject({
      method: 'GET',
      url: `/dev/combat-lab/${view.sessionId}`,
      headers: {
        ...headers,
        'x-combat-lab-capability': created.headers['x-combat-lab-capability'] as string,
      },
    });
    expect(latest.json()).toEqual(view);
  });

  it('rejects malformed maps and placements before allocating a session', async () => {
    const app = lab();
    const draft = defaultSpriteBattle();
    const malformed = [
      {
        ...draft,
        map: {
          ...draft.map,
          tiles: draft.map.tiles.map((tile) => ({ ...tile, blocked: tile.q === 7 })),
        },
      },
      { ...draft, seed: -1 },
      { ...draft, extra: true },
      { ...draft, map: { ...draft.map, tiles: draft.map.tiles.slice(1) } },
      {
        ...draft,
        map: {
          ...draft.map,
          tiles: draft.map.tiles.map((tile, index) => (index === 1 ? draft.map.tiles[0] : tile)),
        },
      },
      {
        ...draft,
        units: draft.units.map((unit, index) =>
          index === 1 ? { ...unit, position: draft.units[0]!.position } : unit,
        ),
      },
      {
        ...draft,
        units: draft.units.map((unit, index) =>
          index === 1 ? { ...unit, profileId: 'unknown' } : unit,
        ),
      },
      {
        ...draft,
        map: {
          ...draft.map,
          tiles: draft.map.tiles.map((tile) => (tile.q === 0 ? { ...tile, blocked: true } : tile)),
        },
      },
      {
        ...draft,
        map: {
          ...draft.map,
          tiles: draft.map.tiles.map((tile) =>
            tile.q === 2 && tile.r === 2 ? { ...tile, blocked: true } : tile,
          ),
        },
      },
    ];
    for (const battle of malformed) {
      expect(isCustomBattle(battle)).toBe(false);
      const reply = await app.inject({
        method: 'POST',
        url: '/dev/combat-lab',
        headers,
        payload: { version: 1, requestId: 'bad', scenarioId: SPRITE_COMBAT_LAB_SCENARIO, battle },
      });
      expect(reply.statusCode).toBe(400);
    }
    const catalog = await app.inject({ method: 'GET', url: '/dev/combat-lab/catalog', headers });
    expect(catalog.json().profiles).toHaveLength(20);
    const created = await app.inject({
      method: 'POST',
      url: '/dev/combat-lab',
      headers,
      payload: {
        version: 1,
        requestId: 'valid',
        scenarioId: SPRITE_COMBAT_LAB_SCENARIO,
        battle: draft,
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().units).toHaveLength(12);
    expect(created.json().map.tiles).toHaveLength(165);
    expect(created.json().movementPreview.length).toBeGreaterThan(0);
  });

  it('plays a custom duel to completion, preserves receipts and reproduces all AI commands', async () => {
    const app = lab();
    const template = defaultSpriteBattle();
    const draft = {
      ...template,
      map: {
        ...template.map,
        tiles: template.map.tiles.map((tile) => ({
          ...tile,
          blocked: false,
          height: 0 as const,
          terrain: 'plain' as const,
        })),
      },
      units: [
        { id: 'fighter', profileId: 'W01', sideId: 'human' as const, position: { q: 3, r: 5 } },
        { id: 'enemy', profileId: 'W02', sideId: 'opponent' as const, position: { q: 4, r: 5 } },
      ],
    };
    const created = await app.inject({
      method: 'POST',
      url: '/dev/combat-lab',
      headers,
      payload: {
        version: 1,
        requestId: 'duel',
        scenarioId: SPRITE_COMBAT_LAB_SCENARIO,
        battle: draft,
      },
    });
    expect(created.statusCode).toBe(201);
    let view = created.json<CombatLabView>();
    const privateHeaders = {
      ...headers,
      'x-combat-lab-capability': created.headers['x-combat-lab-capability'] as string,
    };
    const url = `/dev/combat-lab/${view.sessionId}`;
    let actions = 0;
    while (view.status === 'active' && actions < 200) {
      assert(view.activation);
      expect(view.availableActions).toContain('wait');
      if (view.activation.actionPoints.current < 2)
        expect(view.availableActions).not.toContain('defend');
      const attack = view.attackPreview?.[0];
      const payload = {
        version: 1,
        requestId: `duel-${actions}`,
        sessionId: view.sessionId,
        battleId: view.battleId,
        expectedViewRevision: view.viewRevision,
        activationId: view.activation.id,
        actorId: view.activation.actorId,
        intent: attack ? { type: 'attack', targetId: attack.targetId } : { type: 'wait' },
      };
      const accepted = await app.inject({
        method: 'POST',
        url: `${url}/actions`,
        headers: privateHeaders,
        payload,
      });
      expect(accepted.statusCode).toBe(200);
      const latest = await app.inject({ method: 'GET', url, headers: privateHeaders });
      view = latest.json<CombatLabView>();
      const duplicate = await app.inject({
        method: 'POST',
        url: `${url}/actions`,
        headers: privateHeaders,
        payload,
      });
      expect(duplicate.json()).toEqual(accepted.json());
      expect((await app.inject({ method: 'GET', url, headers: privateHeaders })).json()).toEqual(
        view,
      );
      actions += 1;
    }
    expect(view.status).toBe('resolved');
    expect(view.events.some((event) => event.type === 'battle.resolved')).toBe(true);
    const replayResponse = await app.inject({
      method: 'GET',
      url: `${url}/replay`,
      headers: privateHeaders,
    });
    expect(replayResponse.statusCode).toBe(200);
    const replay = replayResponse.json<combat.CombatReplay>();
    expect(JSON.stringify(replay)).not.toContain(privateHeaders['x-combat-lab-capability']);
    expect(replay.commands.some((command) => command.commandId.startsWith('ai:'))).toBe(true);
    const reproduced = combat.replayCombat(replay);
    expect(reproduced.state.status).toBe(view.status);
    expect(reproduced.state.revision).toBe(view.viewRevision);
    expect(
      reproduced.state.units.map((unit) => [
        unit.id,
        unit.health,
        unit.armor,
        unit.position,
        unit.status,
      ]),
    ).toEqual(
      view.units.map((unit) => [
        unit.id,
        unit.pools.health.current,
        unit.pools.armor.current,
        unit.position,
        unit.status,
      ]),
    );
    const denied = await app.inject({ method: 'GET', url: `${url}/replay`, headers });
    expect(denied.statusCode).toBe(404);
  });

  it('detaches the accepted setup from an editable draft', () => {
    const template = defaultSpriteBattle();
    const draft = {
      ...template,
      map: { ...template.map, tiles: template.map.tiles.map((tile) => ({ ...tile })) },
      units: template.units.map((unit) => ({ ...unit, position: { ...unit.position } })),
    };
    const fixture = createCustomBattleFixture('detached', draft);
    const before = fixture.originalSetup();
    draft.map.tiles[0]!.terrain = 'fire';
    draft.units[0]!.position.q = 9;
    expect(fixture.originalSetup()).toEqual(before);
  });
});

it('serves canonical technique metadata and isolated profile defaults without changing battle version', () => {
  const catalog = combatLabCatalog();
  expect(catalog.skills).toEqual(combat.COMBAT_SKILLS);
  expect(catalog.defaultBattle.version).toBe(1);
  expect(catalog.profiles.find(({ id }) => id === 'W10')?.defaultSkillRanks).toEqual({
    'shield-brace': 1,
    rally: 1,
  });
  const profile = catalog.profiles.find(({ id }) => id === 'W10')!;
  expect(profile.defaultSkillRanks).not.toBe(
    catalog.defaultBattle.units.find(({ profileId }) => profileId === 'W10')?.skillRanks,
  );
});

it('public session reads expose refusal facts without changing the replay', async () => {
  const app = lab();
  const { before, privateHeaders, url } = await createSkillDuel(app);
  const replay = await app.inject({ method: 'GET', url: `${url}/replay`, headers: privateHeaders });
  expect(replay.statusCode).toBe(200);
  const reconstructed = expectReadOnlySkillReach(replay.json<combat.CombatReplay>());
  expect(before.skillReach).toEqual(
    combat.previewCombatSkillReach(reconstructed.state, reconstructed.state.activation!.unitId),
  );
  expect(before.skillReach?.map((row) => row.skillId)).toEqual(['shield-brace', 'armor-pressure']);
  expect(before.attackRefusals).toEqual([]);
  expect(before.attackPreview?.map((row) => row.targetId)).toEqual(['enemy']);
  for (let read = 0; read < 2; read += 1) {
    const response = await app.inject({ method: 'GET', url, headers: privateHeaders });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(before);
  }
  const after = await app.inject({ method: 'GET', url: `${url}/replay`, headers: privateHeaders });
  expect(after.json()).toEqual(replay.json());
});

function expectReadOnlySkillReach(replay: combat.VersionedCombatReplay) {
  const saved = JSON.stringify(replay);
  const reconstructed = combat.replayCombat(JSON.parse(saved) as combat.VersionedCombatReplay);
  const before = structuredClone(reconstructed);
  const canonical = combat.canonicalCombatState(reconstructed.state);
  for (let read = 0; read < 2; read++) {
    for (const unit of reconstructed.state.units)
      combat.previewCombatSkillReach(reconstructed.state, unit.id);
    if (combat.isSpritePrototypeRuleset(reconstructed.state.rulesetId)) {
      const state = reconstructed.state;
      const view = projectCombatLabView('replay', state.sides[0].id, state, reconstructed.events);
      const actor = state.units.find((unit) => unit.id === state.activation?.unitId);
      expect(view.skillReach).toEqual(
        actor?.sideId === state.sides[0].id ? combat.previewCombatSkillReach(state, actor.id) : [],
      );
    }
  }
  expect(reconstructed).toEqual(before);
  expect(combat.canonicalCombatState(reconstructed.state)).toBe(canonical);
  expect(JSON.stringify(replay)).toBe(saved);
  expect(combat.replayCombat(JSON.parse(saved) as combat.VersionedCombatReplay)).toEqual(before);
  expect(reconstructed.commandsApplied).toBe(replay.commands.length);
  return reconstructed;
}
it.each(['sprite-prototype-v1', 'sprite-prototype-v2'] as const)(
  'preserves complete saved %s replay results while deriving empty skill geometry',
  (rulesetId) => {
    const base = createCustomBattleFixture('legacy-reach', skillDuel()).originalSetup();
    const setup: combat.BattleSetup = {
      ...base,
      rulesetId,
      units: base.units.map(({ skillRanks: _skills, moralePolicy: _morale, ...unit }) => unit),
    };
    const state = combat.startBattle(setup).state;
    const replay: combat.CombatReplay = {
      schemaVersion: 1,
      setup,
      commands: [
        {
          type: 'wait',
          commandId: combat.commandId('saved-wait'),
          actorId: state.activation!.unitId,
          activationId: state.activation!.id,
        },
      ],
    };
    const reproduced = expectReadOnlySkillReach(replay);
    expect(
      combat.previewCombatSkillReach(reproduced.state, reproduced.state.activation!.unitId),
    ).toEqual([]);
  },
);
it('preserves supported schema2 bridge replay without inventing a sprite schema3', () => {
  const base = createCustomBattleFixture('schema2-reach', skillDuel()).originalSetup();
  const setup: combat.BattleSetupV2 = {
    ...base,
    schemaVersion: 2,
    rulesetId: 'm1-domain-bridge-v2',
    units: base.units.map(
      ({ skillRanks: _skills, moralePolicy: _morale, trainedMelee: _trained, ...unit }) => ({
        ...unit,
        weaponId: 'spear',
        initialPools: {
          health: unit.attributes.health,
          armor: unit.attributes.armor,
          stamina: unit.attributes.stamina,
          morale: unit.attributes.morale,
        },
      }),
    ),
  };
  const state = combat.startBattleV2(setup).state;
  expectReadOnlySkillReach({
    schemaVersion: 2,
    setup,
    commands: [
      {
        type: 'wait',
        commandId: combat.commandId('bridge-wait'),
        actorId: state.activation!.unitId,
        activationId: state.activation!.id,
      },
    ],
  });
});

const unitNames = (view: CombatLabView) => view.units.map(({ id, name }) => [id, name]);

it('retains every mill label through authenticated reads, orders and export-only reconstruction', async () => {
  const app = lab();
  const created = await app.inject({
    method: 'POST',
    url: '/dev/combat-lab',
    headers,
    payload: { version: 1, requestId: 'names', scenarioId: SPRITE_COMBAT_LAB_SCENARIO },
  });
  expect(created.statusCode).toBe(201);
  let view = created.json<CombatLabView>();
  const names = unitNames(view);
  expect(names).toContainEqual(['opponent-1', 'Волк 1']);
  expect(names).toContainEqual(['opponent-2', 'Волк 2']);
  const privateHeaders = {
    ...headers,
    'x-combat-lab-capability': created.headers['x-combat-lab-capability'] as string,
  };
  const url = `/dev/combat-lab/${view.sessionId}`;
  for (let read = 0; read < 2; read++) {
    expect((await app.inject({ method: 'GET', url, headers: privateHeaders })).json()).toEqual(
      view,
    );
  }
  let actions = 0;
  while (view.status === 'active' && actions < 300) {
    assert(view.activation);
    const accepted = await app.inject({
      method: 'POST',
      url: `${url}/actions`,
      headers: privateHeaders,
      payload: {
        version: 1,
        requestId: `names-${actions}`,
        sessionId: view.sessionId,
        battleId: view.battleId,
        expectedViewRevision: view.viewRevision,
        activationId: view.activation.id,
        actorId: view.activation.actorId,
        intent: { type: 'autoplay' },
      },
    });
    expect(accepted.statusCode).toBe(200);
    view = (
      await app.inject({ method: 'GET', url, headers: privateHeaders })
    ).json<CombatLabView>();
    expect(unitNames(view)).toEqual(names);
    actions++;
    if (view.units.some((unit) => unit.profileId === 'B001' && unit.status !== 'active')) break;
  }
  expect(actions).toBeGreaterThan(0);
  expect(view.units.some((unit) => unit.profileId === 'B001' && unit.status !== 'active')).toBe(
    true,
  );
  const response = await app.inject({
    method: 'GET',
    url: `${url}/replay`,
    headers: privateHeaders,
  });
  expect(response.statusCode).toBe(200);
  // Only JSON bytes survive this boundary; no session or separately retained config is supplied.
  const downloaded = JSON.parse(JSON.stringify(response.json())) as CombatLabReplay;
  const before = structuredClone(downloaded);
  const restored = projectCombatLabReplay(downloaded);
  expect(unitNames(restored)).toEqual(unitNames(view));
  expect(restored.units.map(({ id, status }) => [id, status])).toEqual(
    view.units.map(({ id, status }) => [id, status]),
  );
  const { labPresentation, ...legacy } = downloaded;
  expect(labPresentation?.units).toHaveLength(12);
  expect(JSON.stringify(labPresentation)).not.toContain(privateHeaders['x-combat-lab-capability']);
  expect(Object.keys(labPresentation!).sort()).toEqual([
    'battle',
    'controlledSideId',
    'units',
    'version',
  ]);
  expect(
    labPresentation!.units.every(
      (unit) => Object.keys(unit).sort().join(',') === 'id,name,profileId',
    ),
  ).toBe(true);
  const canonical = combat.replayCombat(legacy);
  expect(combat.replayCombat(downloaded)).toEqual(canonical);
  expect(canonical.commandsApplied).toBe(downloaded.commands.length);
  expect(projectCombatLabReplay(legacy).units.every((unit) => unit.name === undefined)).toBe(true);
  expect(projectCombatLabReplay(downloaded)).toEqual(restored);
  expect(downloaded).toEqual(before);
  expect((await app.inject({ method: 'GET', url: `${url}/replay`, headers })).statusCode).toBe(404);
});
