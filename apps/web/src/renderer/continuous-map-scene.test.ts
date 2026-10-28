import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Babylon from '@babylonjs/core';

const { acquire, release, constructionError } = vi.hoisted(() => ({
  acquire: vi.fn(),
  release: vi.fn(),
  constructionError: new Error('scene construction failed'),
}));

vi.mock('./canvas-engine.js', () => ({
  acquireCanvasEngine: acquire,
  releaseCanvasEngine: release,
}));

vi.mock('@babylonjs/core', async (importOriginal) => {
  const actual = await importOriginal<typeof Babylon>();
  return {
    ...actual,
    Scene: class {
      constructor() {
        throw constructionError;
      }
    },
  };
});

import { mountContinuousMapScene } from './continuous-map-scene.js';

describe('mountContinuousMapScene cleanup', () => {
  beforeEach(() => {
    acquire.mockReset().mockReturnValue({});
    release.mockReset();
  });

  it('releases the canvas engine when scene construction throws before returning a handle', () => {
    const canvas = {} as HTMLCanvasElement;
    const callbacks = {
      onMove: vi.fn(),
      onSelectSite: vi.fn(),
      onLabels: vi.fn(),
      onParty: vi.fn(),
      onRoute: vi.fn(),
    };

    expect(() => mountContinuousMapScene(canvas, {} as never, [], callbacks)).toThrow(
      constructionError,
    );
    expect(acquire).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledWith(canvas);
  });
});
