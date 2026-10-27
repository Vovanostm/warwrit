import type { Pixel } from './porechye-navigation.js';
import type { MapView } from './map-camera.js';

const panKeyCodes = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    !!target.closest(
      'dialog[open], input:not([type="checkbox"]), button, select, textarea, [contenteditable]:not([contenteditable="false"])',
    )
  );
}

export function bindMapPanKeys(map: SVGSVGElement, onSpace?: () => void) {
  const held = new Set<string>();
  const clear = () => held.clear();

  window.addEventListener('keydown', (event) => {
    if (
      onSpace &&
      event.code === 'Space' &&
      event.target === map &&
      !event.repeat &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      onSpace();
      return;
    }
    if (
      !panKeyCodes.has(event.code) ||
      isTypingTarget(event.target) ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey
    )
      return;
    event.preventDefault();
    held.add(event.code);
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clear();
  });
  document.addEventListener('focusin', (event) => {
    if (isTypingTarget(event.target)) clear();
  });

  return {
    held,
    clear,
    direction(): Pixel {
      return [
        Number(held.has('KeyD')) - Number(held.has('KeyA')),
        Number(held.has('KeyS')) - Number(held.has('KeyW')),
      ];
    },
  };
}

export function bindMapPanDrag(
  map: SVGSVGElement,
  options: {
    getView: () => MapView;
    setView: (view: MapView) => void;
    cancelZoom: () => void;
    onClick?: (event: PointerEvent) => void;
  },
) {
  let drag: { id: number; x: number; y: number; view: MapView; moved: boolean } | undefined;

  map.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    map.focus({ preventScroll: true });
    options.cancelZoom();
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      view: options.getView(),
      moved: false,
    };
    map.setPointerCapture(event.pointerId);
  });
  map.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4) drag.moved = true;
    if (!drag.moved) return;
    const scale = map.getScreenCTM()!.a;
    options.setView({
      ...drag.view,
      x: drag.view.x - (event.clientX - drag.x) / scale,
      y: drag.view.y - (event.clientY - drag.y) / scale,
    });
  });
  map.addEventListener('pointerup', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const clicked = !drag.moved;
    drag = undefined;
    if (clicked) options.onClick?.(event);
  });
  map.addEventListener('pointercancel', () => {
    drag = undefined;
  });

  return { isDragging: () => drag !== undefined };
}
