export type MeasurementState = 'READY' | 'NOT_MEASURED' | 'ERROR';
export type FrameSample = { frameIndex: number; timestampMs: number; intervalMs: number | null };
export type DurationSample = { frameIndex: number; timestampMs: number; durationMs: number };
type PendingGpuQuery = { query: WebGLQuery; frameIndex: number; timestampMs: number };
type GpuTimerExtension = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };

export type RunMetadata = {
  scenarioVersion: string;
  candidate: string;
  startedAt: string;
  endedAt: string | null;
  elapsedMs: number | null;
  captureStartMonotonicMs: number | null;
  captureEndMonotonicMs: number | null;
  cpuSubmitScope: string;
  browser: string;
  viewportCss: [number, number];
  drawingBuffer: [number, number];
  devicePixelRatio: number;
  gpuRenderer: string;
  webgl: 'webgl2' | 'unavailable' | 'NOT_CAPTURED';
  assetsBytes: number;
  assetsReadyAt: string | null;
  firstInteractiveAt: string | null;
  assetsToInteractiveMs: number | null;
  jsBundleTransferredBytes: number | null;
  jsHeapBytes: number | null;
  gpuTimer: MeasurementState;
  gpuTimerReason?: string;
  gpuQueryCount: number;
  gpuDisjointDiscardCount: number;
  gpuSamples: DurationSample[];
  frameSamples: FrameSample[];
  cpuSubmitSamples: DurationSample[];
  errors: string[];
};

const percentile = (samples: number[], percentileValue: number) => {
  if (samples.length === 0) return null;
  const ordered = [...samples].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.floor((ordered.length - 1) * percentileValue))]!;
};

export class MetricsCollector {
  readonly metadata: RunMetadata;
  private lastFrame: number | null = null;
  private currentFrameIndex = -1;
  private extension: GpuTimerExtension | null = null;
  private pendingQueries: PendingGpuQuery[] = [];
  private captureStartMs: number | null = null;
  private captureEndMs: number | null = null;
  private assetsReadyMs: number | null = null;

  constructor(readonly candidate: string, readonly canvas: HTMLCanvasElement, assetsBytes: number) {
    this.metadata = {
      scenarioVersion: 'renderer-scene-1',
      candidate,
      startedAt: 'NOT_STARTED',
      endedAt: null,
      elapsedMs: null,
      captureStartMonotonicMs: null,
      captureEndMonotonicMs: null,
      cpuSubmitScope: 'engine update through CPU render submission',
      browser: 'NOT_CAPTURED',
      viewportCss: [0, 0],
      drawingBuffer: [0, 0],
      devicePixelRatio: 0,
      gpuRenderer: 'NOT_CAPTURED',
      webgl: 'NOT_CAPTURED',
      assetsBytes,
      assetsReadyAt: null,
      firstInteractiveAt: null,
      assetsToInteractiveMs: null,
      jsBundleTransferredBytes: null,
      jsHeapBytes: null,
      gpuTimer: 'NOT_MEASURED',
      gpuTimerReason: 'Renderer context not initialized',
      gpuQueryCount: 0,
      gpuDisjointDiscardCount: 0,
      gpuSamples: [],
      frameSamples: [],
      cpuSubmitSamples: [],
      errors: [],
    };
  }

  attachRendererContext() {
    const gl = this.canvas.getContext('webgl2');
    this.extension = gl?.getExtension('EXT_disjoint_timer_query_webgl2') as GpuTimerExtension | null;
    this.metadata.webgl = gl ? 'webgl2' : 'unavailable';
    this.metadata.gpuTimer = gl && this.extension ? 'READY' : 'NOT_MEASURED';
    if (!gl) this.metadata.gpuTimerReason = 'WebGL2 unavailable';
    else if (!this.extension) this.metadata.gpuTimerReason = 'EXT_disjoint_timer_query_webgl2 unavailable';
    else delete this.metadata.gpuTimerReason;
  }

  markAssetsReady() {
    if (this.assetsReadyMs !== null) return;
    this.assetsReadyMs = performance.now();
    this.metadata.assetsReadyAt = new Date().toISOString();
  }

  markFirstInteractive() {
    if (this.metadata.firstInteractiveAt !== null) return;
    const now = performance.now();
    if (this.assetsReadyMs === null) this.markAssetsReady();
    this.metadata.firstInteractiveAt = new Date().toISOString();
    this.metadata.assetsToInteractiveMs = now - this.assetsReadyMs!;
  }

  startCapture() {
    this.clearPendingQueries();
    const now = performance.now();
    this.captureStartMs = now;
    this.captureEndMs = null;
    this.lastFrame = null;
    this.currentFrameIndex = -1;
    this.metadata.startedAt = new Date().toISOString();
    this.metadata.endedAt = null;
    this.metadata.elapsedMs = null;
    this.metadata.captureStartMonotonicMs = now;
    this.metadata.captureEndMonotonicMs = null;
    this.metadata.browser = navigator.userAgent;
    this.metadata.viewportCss = [this.canvas.clientWidth, this.canvas.clientHeight];
    this.metadata.drawingBuffer = [this.canvas.width, this.canvas.height];
    this.metadata.devicePixelRatio = window.devicePixelRatio;
    this.metadata.gpuRenderer = this.readGpuRenderer();
    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const bundleBytes = resourceEntries
      .filter((entry) => new URL(entry.name, location.href).origin === location.origin && /\.js(?:\?|$)/u.test(entry.name))
      .reduce((total, entry) => total + entry.transferSize, 0);
    this.metadata.jsBundleTransferredBytes = bundleBytes || null;
    const heap = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    this.metadata.jsHeapBytes = heap?.usedJSHeapSize ?? null;
    this.metadata.gpuQueryCount = 0;
    this.metadata.gpuDisjointDiscardCount = 0;
    this.metadata.gpuSamples.length = 0;
    this.metadata.frameSamples.length = 0;
    this.metadata.cpuSubmitSamples.length = 0;
    this.metadata.errors.length = 0;
  }

  stopCapture() {
    if (this.captureStartMs === null || this.captureEndMs !== null) return;
    this.captureEndMs = performance.now();
    this.metadata.captureEndMonotonicMs = this.captureEndMs;
    this.metadata.endedAt = new Date().toISOString();
    this.metadata.elapsedMs = this.captureEndMs - this.captureStartMs;
    this.pollGpu();
  }

  get isCapturing() {
    return this.captureStartMs !== null && this.captureEndMs === null;
  }

  frameStart(now: number) {
    if (!this.isCapturing) {
      this.lastFrame = null;
      return;
    }
    this.pollGpu();
    this.currentFrameIndex += 1;
    const intervalMs = this.lastFrame === null ? null : now - this.lastFrame;
    this.metadata.frameSamples.push({
      frameIndex: this.currentFrameIndex,
      timestampMs: now,
      intervalMs,
    });
    this.lastFrame = now;
  }

  cpuSubmit(start: number, end: number) {
    if (this.isCapturing)
      this.metadata.cpuSubmitSamples.push({
        frameIndex: this.currentFrameIndex,
        timestampMs: end,
        durationMs: end - start,
      });
  }

  gpuBegin() {
    if (!this.isCapturing) return null;
    const gl = this.canvas.getContext('webgl2');
    const ext = this.extension;
    if (!gl || !ext) return null;
    try {
      const query = gl.createQuery();
      if (!query) throw new Error('Unable to create GPU timer query');
      gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
      return query;
    } catch (error) {
      this.metadata.gpuTimer = 'ERROR';
      this.metadata.gpuTimerReason = error instanceof Error ? error.message : String(error);
      return null;
    }
  }

  gpuEnd(query: WebGLQuery | null) {
    if (!query) return;
    const gl = this.canvas.getContext('webgl2');
    const ext = this.extension;
    if (!gl || !ext) return;
    try {
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      this.pendingQueries.push({
        query,
        frameIndex: this.currentFrameIndex,
        timestampMs: performance.now(),
      });
      this.metadata.gpuQueryCount += 1;
    } catch (error) {
      gl.deleteQuery(query);
      this.metadata.gpuTimer = 'ERROR';
      this.metadata.gpuTimerReason = error instanceof Error ? error.message : String(error);
    }
  }

  recordError(error: unknown) {
    this.metadata.errors.push(error instanceof Error ? error.message : String(error));
  }

  summary() {
    const elapsedMs = this.metadata.elapsedMs ?? (this.captureStartMs === null ? 0 : performance.now() - this.captureStartMs);
    const completeSecondCount = Math.floor(elapsedMs / 1000);
    const rollingFps1s = Array.from({ length: completeSecondCount }, (_, second) => {
      const from = (this.captureStartMs ?? 0) + second * 1000;
      const to = from + 1000;
      return this.metadata.frameSamples.filter((sample) => sample.timestampMs >= from && sample.timestampMs < to).length;
    });
    const frameIntervals = this.metadata.frameSamples
      .map((sample) => sample.intervalMs)
      .filter((value): value is number => value !== null && Number.isFinite(value));
    const cpuSamples = this.metadata.cpuSubmitSamples.map((sample) => sample.durationMs);
    const gpuSamples = this.metadata.gpuSamples.map((sample) => sample.durationMs);
    return {
      elapsedMs,
      completeSecondCount,
      omittedTrailingPartialSecondMs: elapsedMs % 1000,
      sampleCount: this.metadata.frameSamples.length,
      rafIntervalMs: { p50: percentile(frameIntervals, 0.5), p95: percentile(frameIntervals, 0.95) },
      cpuSubmitMs: { p50: percentile(cpuSamples, 0.5), p95: percentile(cpuSamples, 0.95) },
      gpuMs: {
        status: this.metadata.gpuTimer,
        p50: percentile(gpuSamples, 0.5),
        p95: percentile(gpuSamples, 0.95),
        queryCount: this.metadata.gpuQueryCount,
        validSamples: gpuSamples.length,
        disjointDiscardCount: this.metadata.gpuDisjointDiscardCount,
        reason: this.metadata.gpuTimerReason ?? null,
      },
      rollingFps1s,
      lowFps1s: rollingFps1s.length > 0 ? Math.min(...rollingFps1s) : null,
      jsHeapBytes: this.metadata.jsHeapBytes,
      jsBundleTransferredBytes: this.metadata.jsBundleTransferredBytes,
    };
  }

  exportRaw() {
    if (this.isCapturing) this.stopCapture();
    else this.pollGpu();
    return { metadata: this.metadata, summary: this.summary() };
  }

  private pollGpu() {
    const gl = this.canvas.getContext('webgl2');
    const ext = this.extension;
    if (!gl || !ext || this.pendingQueries.length === 0) return;
    if (gl.getParameter(ext.GPU_DISJOINT_EXT)) {
      this.metadata.gpuDisjointDiscardCount += this.pendingQueries.length;
      this.clearPendingQueries();
      return;
    }
    const stillPending: PendingGpuQuery[] = [];
    for (const pending of this.pendingQueries) {
      if (!gl.getQueryParameter(pending.query, gl.QUERY_RESULT_AVAILABLE)) {
        stillPending.push(pending);
        continue;
      }
      this.metadata.gpuSamples.push({
        frameIndex: pending.frameIndex,
        timestampMs: pending.timestampMs,
        durationMs: gl.getQueryParameter(pending.query, gl.QUERY_RESULT) / 1e6,
      });
      gl.deleteQuery(pending.query);
    }
    this.pendingQueries = stillPending;
  }

  private clearPendingQueries() {
    const gl = this.canvas.getContext('webgl2');
    for (const pending of this.pendingQueries) gl?.deleteQuery(pending.query);
    this.pendingQueries = [];
  }

  private readGpuRenderer() {
    const gl = this.canvas.getContext('webgl2');
    if (!gl) return 'WebGL2 unavailable';
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debug) return 'renderer string unavailable';
    try {
      return String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));
    } catch {
      return 'renderer string unavailable';
    }
  }

  dispose() {
    this.clearPendingQueries();
    this.captureEndMs = performance.now();
  }
}

export const selectedAssetBytes = 3_754_893;
