export const scenario = {
  version: 'renderer-scene-3',
  canvas: { width: 1600, height: 900, resolutionScale: 1 },
  camera: { eye: [0, 20, 25] as const, target: [0, 0, 0] as const, fovRadians: 0.72 },
  board: { size: 1.25, columns: 11, rows: 7, fogCells: ['-1,0', '0,0', '1,0'] },
  timeline: {
    walkAtSeconds: 4,
    walkDurationSeconds: 2.5,
    attackAtSeconds: 9,
    hitDurationSeconds: 0.8,
    nightAtSeconds: 18,
    torchAtSeconds: 26,
    loopSeconds: 34,
  },
  lighting: {
    day: { ambient: 0.72, key: 2.4, fog: 0.025 },
    night: { ambient: 0.45, key: 0.9, fog: 0.015 },
    torch: { ambient: 0.45, key: 0.9, fog: 0.015, torch: 2.8 },
  },
  colors: {
    red: '#e9735b',
    blue: '#5aa7e8',
    selected: '#f4cf6f',
    fog: '#29364a',
    dayKey: '#f7e1be',
    nightKey: '#526c9a',
    dayClear: [0.055, 0.072, 0.09] as const,
    nightClear: [0.025, 0.04, 0.075] as const,
    torch: [1, 0.69, 0.35] as const,
  },
  quality: { antialias: true, shadows: false, particleCount: 36 },
} as const;

export type Actor = {
  id: string;
  classId: 'Knight' | 'Rogue' | 'Barbarian';
  team: 'red' | 'blue';
  q: number;
  r: number;
  equipment: 'sword-shield' | 'dagger' | 'axe';
  health: number;
};

const roles: Actor['classId'][] = ['Knight', 'Rogue', 'Barbarian'];

export const actors: Actor[] = (['red', 'blue'] as const).flatMap((team) =>
  Array.from({ length: 9 }, (_, slot) => {
    const row = Math.floor(slot / 3);
    const col = slot % 3;
    const classId = roles[col]!;
    const q = team === 'red' ? -4 + col : 2 + col;
    const r = -1 + row;
    return {
      id: `${team}-${classId.toLowerCase()}-${row + 1}`,
      classId,
      team,
      q,
      r,
      equipment: classId === 'Knight' ? 'sword-shield' : classId === 'Rogue' ? 'dagger' : 'axe',
      health: 100,
    };
  }),
);

export const firstAttacker = actors.find((actor) => actor.id === 'red-knight-1')!;
export const firstTarget = actors.find((actor) => actor.id === 'blue-knight-1')!;

export function hexToWorld(q: number, r: number, size = scenario.board.size) {
  return { x: Math.sqrt(3) * size * (q + r / 2), z: 1.5 * size * r };
}

export const torchPosition = {
  ...hexToWorld(firstAttacker.q, firstAttacker.r),
  y: 2.2,
};

export function sampleTimeline(seconds: number) {
  const t = seconds % scenario.timeline.loopSeconds;
  const { walkAtSeconds, walkDurationSeconds, attackAtSeconds, hitDurationSeconds } =
    scenario.timeline;
  const animationByActor = new Map<
    string,
    'Idle_A' | 'Walking_A' | 'Melee_1H_Attack_Chop' | 'Hit_A'
  >();
  for (const actor of actors) animationByActor.set(actor.id, 'Idle_A');
  if (t >= walkAtSeconds && t < walkAtSeconds + walkDurationSeconds)
    animationByActor.set(firstAttacker.id, 'Walking_A');
  if (t >= attackAtSeconds && t < attackAtSeconds + hitDurationSeconds * 2) {
    animationByActor.set(
      firstAttacker.id,
      t < attackAtSeconds + hitDurationSeconds ? 'Melee_1H_Attack_Chop' : 'Idle_A',
    );
    animationByActor.set(
      firstTarget.id,
      t >= attackAtSeconds + hitDurationSeconds ? 'Hit_A' : 'Idle_A',
    );
  }
  const isNight = t >= scenario.timeline.nightAtSeconds;
  return {
    seconds: t,
    animationByActor,
    lightPreset: t >= scenario.timeline.torchAtSeconds ? 'torch' : isNight ? 'night' : 'day',
    hitVisible: t >= attackAtSeconds && t < attackAtSeconds + hitDurationSeconds * 2,
  } as const;
}
