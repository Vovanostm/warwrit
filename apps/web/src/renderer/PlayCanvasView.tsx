import { useEffect, useRef, useState } from 'react';

import type { EncounterPublicProjectionDto } from '@warwrit/protocol';

import { selectableUnitIds, toEncounterRenderProjection } from './projection.js';
import { mountEncounterScene, type EncounterScene } from './scene.js';

export function PlayCanvasView(props: {
  readonly projection: EncounterPublicProjectionDto;
  readonly controllableUnitIds: readonly string[];
  readonly selectedUnitId: string | null;
  readonly onSelectUnit: (unitId: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<EncounterScene | undefined>(undefined);
  const [sceneError, setSceneError] = useState<string | undefined>(undefined);
  const projection = toEncounterRenderProjection(props.projection);
  const selectableIds = selectableUnitIds(props.projection, {
    version: 1,
    encounterId: props.projection.encounterId,
    revision: props.projection.revision,
    controllableUnitIds: props.controllableUnitIds,
  });
  const latestRender = useRef({ projection, selectableIds, selectedUnitId: props.selectedUnitId });
  latestRender.current = { projection, selectableIds, selectedUnitId: props.selectedUnitId };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = new AbortController();
    let mountedScene: EncounterScene | undefined;
    setSceneError(undefined);
    void mountEncounterScene(
      canvas,
      projection,
      selectableIds,
      props.selectedUnitId,
      { onSelectUnit: props.onSelectUnit },
      controller.signal,
    )
      .then((scene) => {
        if (controller.signal.aborted) {
          scene.destroy();
          return;
        }
        const latest = latestRender.current;
        scene.update(latest.projection, latest.selectableIds, latest.selectedUnitId);
        mountedScene = scene;
        sceneRef.current = scene;
        setSceneError(undefined);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setSceneError(
            error instanceof Error && error.message.includes('WebGL')
              ? 'В этой среде недоступна WebGL-сцена. Используйте список участников ниже.'
              : 'Схему боя пока не удалось отобразить. Список участников остаётся доступен ниже.',
          );
      });
    return () => {
      controller.abort();
      mountedScene?.destroy();
      if (sceneRef.current === mountedScene) sceneRef.current = undefined;
    };
    // The engine mounts once per encounter; later public snapshots use update().
  }, [props.projection.encounterId]);

  useEffect(() => {
    sceneRef.current?.update(projection, selectableIds, props.selectedUnitId);
  }, [projection, props.selectedUnitId, selectableIds]);

  return (
    <div className="encounter-renderer">
      <div className="encounter-canvas-frame">
        <canvas
          ref={canvasRef}
          className="encounter-canvas"
          aria-label="Схема расположения участников по открытым координатам"
        />
      </div>
      <p className="encounter-renderer-caption">
        Схема координат по данным боя; рельеф, препятствия и укрытия не показаны.
      </p>
      {sceneError && (
        <p className="encounter-renderer-error" role="status">
          {sceneError}
        </p>
      )}
    </div>
  );
}
