import { invariant } from '../primitives.js';
import { COMBAT_RANDOM_ALGORITHM, type RandomState } from './types.js';

const UINT32_RANGE = 0x1_0000_0000;
const NON_ZERO_DEFAULT_SEED = 0x9e37_79b9;

export interface RandomDraw {
  readonly value: number;
  readonly state: RandomState;
}

export function createRandomState(seed: number): RandomState {
  invariant(Number.isSafeInteger(seed), 'Random seed must be a safe integer');
  const normalized = seed >>> 0;
  return {
    algorithm: COMBAT_RANDOM_ALGORITHM,
    value: normalized === 0 ? NON_ZERO_DEFAULT_SEED : normalized,
    draws: 0,
  };
}

export function nextUint32(state: RandomState): RandomDraw {
  invariant(state.algorithm === COMBAT_RANDOM_ALGORITHM, `Unsupported RNG: ${state.algorithm}`);
  let value = state.value >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  const nextValue = value >>> 0;
  return {
    value: nextValue,
    state: {
      algorithm: state.algorithm,
      value: nextValue,
      draws: state.draws + 1,
    },
  };
}

export function drawRandomInt(state: RandomState, minimum: number, maximum: number): RandomDraw {
  invariant(Number.isSafeInteger(minimum), 'Random minimum must be a safe integer');
  invariant(Number.isSafeInteger(maximum), 'Random maximum must be a safe integer');
  invariant(maximum >= minimum, 'Random maximum must not be lower than minimum');
  const range = maximum - minimum + 1;
  invariant(range > 0 && range <= UINT32_RANGE, 'Random integer range must fit uint32');
  const rejectionLimit = Math.floor(UINT32_RANGE / range) * range;
  let nextState = state;

  while (true) {
    const draw = nextUint32(nextState);
    nextState = draw.state;
    if (draw.value < rejectionLimit) {
      return {
        value: minimum + (draw.value % range),
        state: nextState,
      };
    }
  }
}
