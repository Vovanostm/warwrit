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

export function bindMapPanKeys(map: SVGSVGElement, onSpace?: () => void, onStop?: () => void) {
  const held = new Set<string>();
  const clear = () => held.clear();
  const onKeyDown = (event: KeyboardEvent) => {
    if (
      onStop &&
      event.code === 'KeyS' &&
      !isTypingTarget(event.target) &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      onStop();
      return;
    }
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
  };
  const onKeyUp = (event: KeyboardEvent) => held.delete(event.code);
  const onVisibilityChange = () => {
    if (document.hidden) clear();
  };
  const onFocusIn = (event: FocusEvent) => {
    if (isTypingTarget(event.target)) clear();
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('focusin', onFocusIn);

  return {
    held,
    clear,
    direction(): Pixel {
      return [
        Number(held.has('KeyD')) - Number(held.has('KeyA')),
        Number(held.has('KeyS')) - Number(held.has('KeyW')),
      ];
    },
    destroy() {
      clear();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('focusin', onFocusIn);
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

  const onPointerDown = (event: PointerEvent) => {
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
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4) {
      drag.moved = true;
      map.setPointerCapture(event.pointerId);
    }
    if (!drag.moved) return;
    const scale = map.getScreenCTM()!.a;
    options.setView({
      ...drag.view,
      x: drag.view.x - (event.clientX - drag.x) / scale,
      y: drag.view.y - (event.clientY - drag.y) / scale,
    });
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    const clicked = !drag.moved;
    const pointerId = drag.id;
    drag = undefined;
    if (map.hasPointerCapture(pointerId)) map.releasePointerCapture(pointerId);
    if (clicked) options.onClick?.(event);
  };
  const onPointerCancel = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    const pointerId = drag.id;
    drag = undefined;
    if (map.hasPointerCapture(pointerId)) map.releasePointerCapture(pointerId);
  };
  map.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);

  return {
    isDragging: () => drag !== undefined,
    destroy() {
      if (drag && map.hasPointerCapture(drag.id)) map.releasePointerCapture(drag.id);
      drag = undefined;
      map.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    },
  };
}
