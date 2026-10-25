import type { Pixel } from './porechye-navigation.js';

export interface MapView {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
interface MapExtent {
  readonly width: number;
  readonly height: number;
}

export function boundedMapView(view: MapView, extent: MapExtent): MapView {
  return {
    ...view,
    x: Math.max(0, Math.min(extent.width - view.width, view.x)),
    y: Math.max(0, Math.min(extent.height - view.height, view.y)),
  };
}

// Wheel deltas are pixels, lines or pages. Preserve fine trackpad increments.
export function wheelPixels(delta: number, mode: number, viewportHeight: number): number {
  if (mode === 1) return delta * 16;
  return mode === 2 ? delta * viewportHeight : delta;
}

export function zoomMapView(
  target: MapView,
  cursorFraction: Pixel,
  delta: number,
  extent: MapExtent,
): MapView {
  const width = Math.max(
    extent.width * 0.18,
    Math.min(extent.width, target.width * Math.exp(delta * 0.0015)),
  );
  const height = (width * extent.height) / extent.width;
  return boundedMapView(
    {
      x: target.x + cursorFraction[0] * (target.width - width),
      y: target.y + cursorFraction[1] * (target.height - height),
      width,
      height,
    },
    extent,
  );
}

// Time-based easing has the same response on 60Hz and 120Hz displays.
export function advanceMapView(current: MapView, target: MapView, elapsedMs: number): MapView {
  const gap = Math.max(
    Math.abs(current.x - target.x),
    Math.abs(current.y - target.y),
    Math.abs(current.width - target.width),
  );
  if (gap < 0.2) return target;
  const blend = 1 - Math.exp(-Math.min(elapsedMs, 64) / 75);
  return {
    x: current.x + (target.x - current.x) * blend,
    y: current.y + (target.y - current.y) * blend,
    width: current.width + (target.width - current.width) * blend,
    height: current.height + (target.height - current.height) * blend,
  };
}
