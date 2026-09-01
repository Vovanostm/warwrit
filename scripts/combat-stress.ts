import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import {
  canonicalCombatState,
  replayCombat,
  runAiBattle,
  type AiDoctrine,
} from '../packages/game-core/src/index.js';
import { createGeneratedBattleSetup } from '../packages/testkit/src/index.js';

const battleCount = Number.parseInt(process.argv[2] ?? '10000', 10);
assert(Number.isInteger(battleCount) && battleCount > 0, 'Battle count must be a positive integer');

const startedAt = performance.now();
const digest = createHash('sha256');
let totalCommands = 0;
let maximumCommands = 0;
let maximumRounds = 0;
let totalRandomDraws = 0;
let deterministicReruns = 0;
let replayChecks = 0;
const outcomes = new Map<string, number>();

for (let index = 1; index <= battleCount; index += 1) {
  const setup = createGeneratedBattleSetup(index);
  const doctrines: readonly {
    readonly sideId: (typeof setup.sides)[number]['id'];
    readonly doctrine: AiDoctrine;
  }[] = [
    { sideId: setup.sides[0].id, doctrine: index % 5 === 0 ? 'survivor' : 'aggressive' },
    { sideId: setup.sides[1].id, doctrine: index % 7 === 0 ? 'survivor' : 'aggressive' },
  ];
  const simulation = runAiBattle(setup, { doctrines, captureEvents: false });
  const canonical = canonicalCombatState(simulation.state);

  assert.equal(simulation.state.status, 'resolved');
  if (index % 100 === 0) {
    const replayed = replayCombat(simulation.replay);
    assert.equal(canonicalCombatState(replayed.state), canonical);
    replayChecks += 1;
  }
  if (index % 500 === 0) {
    const repeated = runAiBattle(setup, { doctrines, captureEvents: false });
    assert.equal(canonicalCombatState(repeated.state), canonical);
    deterministicReruns += 1;
  }

  digest.update(canonical);
  totalCommands += simulation.commands.length;
  maximumCommands = Math.max(maximumCommands, simulation.commands.length);
  maximumRounds = Math.max(maximumRounds, simulation.state.round);
  totalRandomDraws += simulation.state.random.draws;
  const outcome = simulation.state.outcome?.winnerSideId ?? 'draw';
  outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + 1);
}

process.stdout.write(
  `${JSON.stringify({
    event: 'combat.stress',
    status: 'ok',
    battles: battleCount,
    deterministicReruns,
    replayChecks,
    totalCommands,
    maximumCommands,
    maximumRounds,
    totalRandomDraws,
    outcomes: Object.fromEntries(
      [...outcomes].toSorted(([left], [right]) => left.localeCompare(right)),
    ),
    digest: digest.digest('hex'),
    durationMs: Math.round(performance.now() - startedAt),
  })}\n`,
);
