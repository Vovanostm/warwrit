import { useEffect, useRef, useState, type RefObject } from 'react';
import { mountSpriteBattleScene, type BattleFieldTarget } from './sprite-battle-scene.js';
import type { BattleViewProps } from './battle-view-props.js';
import type { BattlePresentationView } from './battle-presentation.js';

export function useBattleScene(
  {
    view: normalizedView,
    selectedUnitId,
    selectedHex,
    onSelectUnit,
    onSelectHex,
    onAct,
    onRefusal,
    selectedSkillId = null,
  }: Pick<BattleViewProps, 'selectedUnitId' | 'selectedHex' | 'onSelectUnit' | 'onSelectHex'> & {
    view: BattlePresentationView;
    onAct: BattleViewProps['onAct'];
    onRefusal: BattleViewProps['onRefusal'];
    selectedSkillId: BattleViewProps['selectedSkillId'];
  },
  battleViewRef: RefObject<HTMLElement | null>,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Awaited<ReturnType<typeof mountSpriteBattleScene>> | null>(null);
  const cameraRequests = useRef(createBattleCameraRequests());
  const [tooltipInput, setTooltipInput] = useState<'pointer' | 'keyboard'>('pointer');
  const [sceneError, setSceneError] = useState('');
  const [night, setNight] = useState(false);
  const [fullGrid, setFullGrid] = useState(false);
  const {
    hoveredTarget,
    setHoveredTarget,
    initiativeHover,
    setInitiativePointer,
    setInitiativeFocus,
  } = useFieldInspection();
  const latestCallbacks = useRef({ onSelectUnit, onSelectHex, onAct, onRefusal });
  latestCallbacks.current = { onSelectUnit, onSelectHex, onAct, onRefusal };
  const latestSceneView = useRef({
    view: normalizedView,
    selectedUnitId,
    selectedHex,
    night,
    fullGrid,
    initiativeHover,
    selectedSkillId,
  });
  latestSceneView.current = {
    view: normalizedView,
    selectedUnitId,
    selectedHex,
    night,
    fullGrid,
    initiativeHover,
    selectedSkillId,
  };

  useTooltipAnchor(battleViewRef);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHoveredTarget(null);
    setInitiativePointer(null);
    setInitiativeFocus(null);
    const abort = new AbortController();
    void mountSpriteBattleScene(
      canvas,
      normalizedView,
      selectedUnitId,
      selectedHex,
      {
        onSelectUnit: (id) => latestCallbacks.current.onSelectUnit(id),
        onSelectHex: (hex) => latestCallbacks.current.onSelectHex(hex),
        onHover: setHoveredTarget,
        onRefusal: (reason) => latestCallbacks.current.onRefusal?.(reason),
        onAct: (action) => latestCallbacks.current.onAct?.(action),
      },
      night,
      abort.signal,
    )
      .then((scene) =>
        receiveScene(scene, abort.signal, (readyScene) => {
          sceneRef.current = readyScene;
          const latest = latestSceneView.current;
          readyScene.update(
            latest.view,
            latest.selectedUnitId,
            latest.selectedHex,
            latest.night,
            latest.fullGrid,
            latest.selectedSkillId,
          );
          readyScene.setHighlightedUnit(latest.initiativeHover);
          cameraRequests.current.ready(readyScene);
          setSceneError('');
        }),
      )
      .catch(() => {
        if (!abort.signal.aborted)
          setSceneError('Поле боя не удалось открыть. Данные и команды остаются доступны.');
      });
    return () => {
      abort.abort();
      sceneRef.current?.destroy();
      sceneRef.current = null;
      cameraRequests.current.clear();
    };
  }, [normalizedView.sceneKey]);
  useEffect(() => {
    sceneRef.current?.update(
      normalizedView,
      selectedUnitId,
      selectedHex,
      night,
      fullGrid,
      selectedSkillId,
    );
  }, [normalizedView, selectedUnitId, selectedHex, night, fullGrid, selectedSkillId]);
  useEffect(() => {
    sceneRef.current?.setHighlightedUnit(initiativeHover);
  }, [initiativeHover]);

  return {
    canvasRef,
    showOverview: () => cameraRequests.current.request((scene) => scene.showOverview()),
    frameCombatArea: () => cameraRequests.current.request((scene) => scene.frameCombatArea()),
    focusUnit: (id: string) => cameraRequests.current.request((scene) => scene.focusUnit(id)),
    night,
    setNight,
    fullGrid,
    setFullGrid,
    sceneError,
    hoveredTarget,
    initiativeHover,
    setInitiativePointer,
    setInitiativeFocus,
    setHoveredTarget,
    tooltipInput,
    setTooltipInput,
  };
}

function useTooltipAnchor(battleViewRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = battleViewRef.current;
    const card = root?.querySelector('.battle-acting-unit');
    const dock = root?.querySelector('.battle-action-dock');
    const top = root?.querySelector('.battle-top-band');
    if (!root || !card) return;
    const placeTooltip = () => {
      const bounds = (dock ?? card).getBoundingClientRect();
      root.style.setProperty('--battle-tooltip-left', `${bounds.left}px`);
      root.style.setProperty(
        '--battle-tooltip-bottom',
        `${window.innerHeight - bounds.top + 12}px`,
      );
      root.style.setProperty('--battle-tooltip-width', `${Math.min(264, bounds.width)}px`);
      root.style.setProperty(
        '--battle-safe-top',
        `${(top?.getBoundingClientRect().bottom ?? 132) + 12}px`,
      );
    };
    const observer = new ResizeObserver(placeTooltip);
    observer.observe(root);
    root
      .querySelectorAll('.battle-acting-unit, .battle-action-dock, .battle-top-band')
      .forEach((band) => observer.observe(band));
    window.addEventListener('resize', placeTooltip);
    placeTooltip();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', placeTooltip);
    };
  }, []);
}

function receiveScene(
  scene: Awaited<ReturnType<typeof mountSpriteBattleScene>>,
  signal: AbortSignal,
  onReady: (scene: Awaited<ReturnType<typeof mountSpriteBattleScene>>) => void,
) {
  if (signal.aborted) {
    scene.destroy();
    return;
  }
  onReady(scene);
}

function useFieldInspection() {
  const [hoveredTarget, setHoveredTarget] = useState<BattleFieldTarget | null>(null);
  const [initiativePointer, setInitiativePointer] = useState<string | null>(null);
  const [initiativeFocus, setInitiativeFocus] = useState<string | null>(null);
  const initiativeHover = initiativePointer ?? (hoveredTarget === null ? initiativeFocus : null);
  return {
    hoveredTarget,
    setHoveredTarget,
    initiativeHover,
    setInitiativePointer,
    setInitiativeFocus,
  };
}

/** A pending camera action belongs to this mount and is consumed exactly once. */
export function createBattleCameraRequests() {
  type Scene = Awaited<ReturnType<typeof mountSpriteBattleScene>>;
  type Request = (scene: Scene) => void;
  let scene: Scene | null = null;
  let pending: Request | null = null;
  return {
    request(request: Request) {
      if (scene) request(scene);
      else pending = request;
    },
    ready(readyScene: Scene) {
      scene = readyScene;
      const request = pending;
      pending = null;
      request?.(scene);
    },
    clear() {
      scene = null;
      pending = null;
    },
  };
}
