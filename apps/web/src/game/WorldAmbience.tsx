import { useEffect, useRef, useState, type RefObject } from 'react';
import type { WorldContinuousMapDto } from '@warwrit/protocol';
import { insidePolygon } from '../renderer/map-geography.js';
import { createAmbientSound, type SoundHabitat } from './ambient-sound.js';

const terrainSounds: Readonly<Record<string, SoundHabitat>> = {
  forest: 'woodland',
  marsh: 'wetland',
  riverbank: 'wetland',
  grassland: 'meadow',
  hills: 'meadow',
};
function soundHabitat({
  region,
  point,
  siteId,
}: {
  region: WorldContinuousMapDto | undefined;
  point: RefObject<{ xFp: number; zFp: number } | null>;
  siteId: string | null;
}): SoundHabitat {
  const settlement = settlementSounds[siteId ?? ''];
  return settlement ?? localTerrainSound(region, point.current);
}
const settlementSounds: Readonly<Record<string, SoundHabitat>> = {
  bereznyak: 'settlement',
  'kamenny-brod': 'settlement',
  'severny-dvor': 'settlement',
  'tikhaya-gat': 'wetland',
};
function localTerrainSound(
  region: WorldContinuousMapDto | undefined,
  point: { xFp: number; zFp: number } | null,
): SoundHabitat {
  if (!region || !point) return 'stone';
  return terrainSound(region, point);
}

function terrainSound(
  region: WorldContinuousMapDto,
  { xFp, zFp }: { xFp: number; zFp: number },
): SoundHabitat {
  const terrain = [...region.terrainShapes]
    .sort((a, b) => b.paintPriority - a.paintPriority)
    .find((shape) => insidePolygon(xFp, zFp, shape.polygon))?.terrainId;
  return terrainSounds[terrain ?? ''] ?? 'stone';
}

export function WorldAmbience(props: {
  region: WorldContinuousMapDto | undefined;
  point: RefObject<{ xFp: number; zFp: number } | null>;
  siteId: string | null;
  night: boolean;
}) {
  const audio = useRef<ReturnType<typeof createAmbientSound> | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => {
      const { night } = latest.current;
      audio.current?.environment(soundHabitat(latest.current), night);
      audio.current?.update();
    }, 500);
    return () => {
      clearInterval(timer);
      audio.current?.dispose();
      audio.current = null;
    };
  }, []);
  async function toggle() {
    try {
      const sound = audio.current ?? createAmbientSound();
      audio.current = sound;
      if (enabled) await sound.context.suspend();
      else {
        sound.volume(volume);
        await sound.context.resume();
      }
      setEnabled(sound.context.state === 'running');
      setFailed(false);
    } catch {
      setFailed(true);
      setEnabled(false);
    }
  }
  return (
    <div className="world-sound">
      <button
        className="action action-quiet"
        type="button"
        aria-pressed={enabled}
        onClick={() => void toggle()}
      >
        Звуки мира · {enabled ? 'вкл.' : 'выкл.'}
      </button>
      {enabled && (
        <label>
          Громкость{' '}
          <input
            aria-label="Громкость звуков мира"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(event) => {
              const value = Number(event.target.value);
              setVolume(value);
              audio.current?.volume(value);
            }}
          />
        </label>
      )}
      {failed && <span role="status">Звук недоступен</span>}
    </div>
  );
}
