import { useEffect, useRef, useState } from 'react';

import type { EncounterPublicProjectionDto } from '@warwrit/protocol';

import {
  mountEncounterScene,
  type EncounterHighlights,
  type EncounterScene,
} from './battle-scene.js';
import { toEncounterRenderProjection } from './projection.js';

/** The Babylon.js battlefield; picks report a unit or a hex, the panel decides what it means. */
export function BattleField(props: {
  readonly projection: EncounterPublicProjectionDto;
  readonly ownUnitIds: readonly string[];
  readonly selectedUnitId: string | null;
  readonly targetUnitId: string | null;
  readonly destination: { readonly q: number; readonly r: number } | null;
  readonly onPickUnit: (unitId: string) => void;
  readonly onPickHex: (hex: { readonly q: number; readonly r: number }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<EncounterScene | undefined>(undefined);
  const [sceneError, setSceneError] = useState<string | undefined>(undefined);
  const projection = toEncounterRenderProjection(props.projection);
  const highlights: EncounterHighlights = {
    ownUnitIds: props.ownUnitIds,
    selectedUnitId: props.selectedUnitId,
    targetUnitId: props.targetUnitId,
    destination: props.destination,
  };
  const latest = useRef({ projection, highlights, props });
  latest.current = { projection, highlights, props };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = new AbortController();
    let mounted: EncounterScene | undefined;
    setSceneError(undefined);
    void mountEncounterScene(
      canvas,
      latest.current.projection,
      latest.current.highlights,
      {
        onPickUnit: (unitId) => latest.current.props.onPickUnit(unitId),
        onPickHex: (hex) => latest.current.props.onPickHex(hex),
      },
      controller.signal,
    )
      .then((scene) => {
        if (controller.signal.aborted) {
          scene.destroy();
          return;
        }
        scene.update(latest.current.projection, latest.current.highlights);
        mounted = scene;
        sceneRef.current = scene;
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setSceneError(
            error instanceof Error && error.message.includes('WebGL')
              ? 'В этой среде недоступна WebGL-сцена. Используйте список участников ниже.'
              : 'Поле боя не удалось отобразить. Список участников остаётся доступен ниже.',
          );
      });
    return () => {
      controller.abort();
      mounted?.destroy();
      if (sceneRef.current === mounted) sceneRef.current = undefined;
    };
    // The engine mounts once per encounter; later public snapshots use update().
  }, [props.projection.encounterId]);

  useEffect(() => {
    sceneRef.current?.update(projection, highlights);
  });

  return (
    <div className="encounter-renderer">
      <div className="encounter-canvas-frame">
        <canvas
          ref={canvasRef}
          className="encounter-canvas"
          aria-label="Поле боя: щёлкните по врагу, чтобы выбрать цель, или по клетке, чтобы выбрать место"
        />
      </div>
      <p className="encounter-renderer-caption">
        Щелчок по врагу — цель, по свободной клетке — место. Перетаскивание или WASD двигают камеру,
        колесо — масштаб.
      </p>
      {sceneError && (
        <p className="encounter-renderer-error" role="status">
          {sceneError}
        </p>
      )}
    </div>
  );
}
