import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { actors, scenario } from './shared/scenario.js';
import { MetricsCollector, selectedAssetBytes } from './shared/metrics.js';
import type { SceneEvent, RendererController } from './shared/renderer.js';
import './style.css';

type Candidate = 'babylon' | 'playcanvas';

function readCandidate(): Candidate {
  return new URLSearchParams(location.search).get('engine') === 'playcanvas'
    ? 'playcanvas'
    : 'babylon';
}

function App() {
  const candidate = readCandidate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<RendererController | null>(null);
  const collectorRef = useRef<MetricsCollector | null>(null);
  const measurementStartedAtRef = useRef<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>(['18 actor scenario loading…']);
  const [light, setLight] = useState<'day' | 'night' | 'torch'>('day');
  const [lightingMode, setLightingMode] = useState<'scripted' | 'manual'>('scripted');
  const [preview, setPreview] = useState<'none' | 'move' | 'attack'>('none');
  const previewRef = useRef(preview);
  const [measurement, setMeasurement] = useState<
    'idle' | 'warming' | 'ready' | 'recording' | 'complete'
  >('idle');
  const [measurementSeconds, setMeasurementSeconds] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  const [metrics, setMetrics] = useState<ReturnType<MetricsCollector['summary']> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collector, setCollector] = useState<MetricsCollector | null>(null);
  previewRef.current = preview;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const nextCollector = new MetricsCollector(candidate, canvas, selectedAssetBytes);
    collectorRef.current = nextCollector;
    setCollector(nextCollector);
    let alive = true;
    const mountAbort = new AbortController();
    const emit = (event: SceneEvent) => {
      if (!alive) return;
      switch (event.type) {
        case 'hover':
          setHovered(event.actorId);
          break;
        case 'select':
          setSelected(event.actorId);
          setLog((rows) => [`Selected ${event.actorId}`, ...rows].slice(0, 10));
          break;
        case 'cell':
          if (previewRef.current !== 'none')
            setLog((rows) =>
              [
                `Visual-only ${previewRef.current} preview at hex ${event.q},${event.r}`,
                ...rows,
              ].slice(0, 10),
            );
          break;
        case 'status':
          setLog((rows) => [event.message, ...rows].slice(0, 10));
          break;
        case 'lighting':
          setLight(event.preset);
          setLightingMode(event.mode);
          break;
        case 'error':
          nextCollector.recordError(event.message);
          setError(event.message);
          break;
        case 'assets-ready':
          nextCollector.markAssetsReady();
          break;
      }
    };
    const loadScene =
      candidate === 'babylon'
        ? import('./babylon/scene.js').then(({ BabylonScene }) => BabylonScene)
        : import('./playcanvas/scene.js').then(({ PlayCanvasScene }) => PlayCanvasScene);
    void loadScene
      .then((mount) =>
        mountAbort.signal.aborted ? null : mount(canvas, emit, nextCollector, mountAbort.signal),
      )
      .then((controller) => {
        if (!controller) return;
        if (!alive || mountAbort.signal.aborted) controller.destroy();
        else {
          controllerRef.current = controller;
          nextCollector.markFirstInteractive();
          setSceneReady(true);
          setLog((rows) => [
            'Scenario ready: 18 animated characters, shared fixed timeline.',
            ...rows,
          ]);
        }
      })
      .catch((reason: unknown) => {
        if (mountAbort.signal.aborted) return;
        const message = reason instanceof Error ? reason.message : String(reason);
        emit({ type: 'error', message });
      });
    const resize = () => controllerRef.current?.resize();
    window.addEventListener('resize', resize);
    return () => {
      alive = false;
      window.removeEventListener('resize', resize);
      mountAbort.abort();
      controllerRef.current?.destroy();
      controllerRef.current = null;
      nextCollector.dispose();
      collectorRef.current = null;
    };
    // Candidate is frozen for this page session; controls update the existing scene.
  }, [candidate]);

  useEffect(() => {
    if (measurement !== 'warming' && measurement !== 'recording') return;
    const startedAt = measurementStartedAtRef.current;
    if (startedAt === null) return;
    const durationMs = measurement === 'warming' ? 30_000 : 120_000;
    const timer = window.setInterval(() => {
      const elapsedMs = performance.now() - startedAt;
      setMeasurementSeconds(Math.min(Math.floor(elapsedMs / 1000), durationMs / 1000));
      if (elapsedMs >= durationMs && measurement === 'warming') {
        measurementStartedAtRef.current = null;
        setMeasurement('ready');
        setMeasurementSeconds(0);
      } else if (elapsedMs >= durationMs && measurement === 'recording') {
        measurementStartedAtRef.current = null;
        collectorRef.current?.stopCapture();
        setMetrics(collectorRef.current?.summary() ?? null);
        setMeasurement('complete');
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [measurement]);

  const actor = actors.find((entry) => entry.id === selected);
  const exportData = () => {
    const data = collectorRef.current?.exportRaw();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `warwrit-renderer-${candidate}-${new Date().toISOString().replaceAll(':', '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const switchCandidate = (next: Candidate) => {
    const url = new URL(location.href);
    url.searchParams.set('engine', next);
    location.href = url.href;
  };
  const togglePreview = (mode: 'move' | 'attack') => {
    const next = preview === mode ? 'none' : mode;
    setPreview(next);
    controllerRef.current?.setPreview(next);
    setLog((rows) =>
      [`${next === 'none' ? 'Closed' : `${mode} preview armed`} (visual only)`, ...rows].slice(
        0,
        10,
      ),
    );
  };
  const beginWarmup = () => {
    if (!sceneReady) return;
    setMeasurementSeconds(0);
    setMetrics(null);
    measurementStartedAtRef.current = performance.now();
    setMeasurement('warming');
  };
  const beginCapture = () => {
    if (!sceneReady || measurement !== 'ready') return;
    controllerRef.current?.resetTimeline();
    collectorRef.current?.startCapture();
    setMeasurementSeconds(0);
    measurementStartedAtRef.current = performance.now();
    setMeasurement('recording');
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">ART01–03 · EXPERIMENT ONLY · {scenario.version}</div>
          <h1>Renderer field test</h1>
        </div>
        <nav aria-label="Renderer candidate">
          <button
            className={candidate === 'babylon' ? 'active' : ''}
            onClick={() => switchCandidate('babylon')}
          >
            Babylon.js 9.28.0
          </button>
          <button
            className={candidate === 'playcanvas' ? 'active' : ''}
            onClick={() => switchCandidate('playcanvas')}
          >
            PlayCanvas 2.22.4
          </button>
        </nav>
      </header>
      <section className="workspace">
        <div className="scene-frame">
          <canvas ref={canvasRef} aria-label="Tactical renderer experiment scene" />
          <div className="scene-caption">
            <span className="dot red" /> Red 9 <span className="dot blue" /> Blue 9{' '}
            <span>
              · fixed 18 actor workload · {light} ({lightingMode})
            </span>
          </div>
          {error && <div className="error-banner">Scene error: {error}</div>}
        </div>
        <aside className="panel">
          <section>
            <p className="eyebrow">SCENARIO INPUTS</p>
            <h2>Visual controls</h2>
            <div className="button-row">
              <button
                onClick={() => togglePreview('move')}
                className={preview === 'move' ? 'active' : ''}
              >
                Move preview
              </button>
              <button
                onClick={() => togglePreview('attack')}
                className={preview === 'attack' ? 'active' : ''}
              >
                Attack preview
              </button>
            </div>
            <button className="wide action" onClick={() => controllerRef.current?.triggerAttack()}>
              Scripted attack + hit
            </button>
            <div className="button-row lights">
              {(['day', 'night', 'torch'] as const).map((preset) => (
                <button
                  key={preset}
                  className={light === preset ? 'active' : ''}
                  onClick={() => {
                    controllerRef.current?.setLighting(preset);
                  }}
                >
                  {preset}
                </button>
              ))}
              <button
                className={lightingMode === 'scripted' ? 'active' : ''}
                onClick={() => controllerRef.current?.resumeLightingScript()}
              >
                Resume script
              </button>
            </div>
            <p className="hint">
              Pick a unit or hex. Previews change scene visuals only; no game state is read or
              written.
            </p>
          </section>
          <section className="selection-card">
            <p className="eyebrow">UNIT READOUT</p>
            {actor ? (
              <>
                <div className="unit-heading">
                  <strong>{actor.classId}</strong>
                  <span className={`team ${actor.team}`}>{actor.team.toUpperCase()}</span>
                </div>
                <p className="mono">{actor.id}</p>
                <div className="health-track">
                  <span style={{ width: `${actor.health}%` }} />
                </div>
                <p className="hint">
                  HP {actor.health} · STATUS: ready · {actor.equipment}
                </p>
              </>
            ) : (
              <p className="hint">
                Select a unit to inspect its class silhouette, team and health.
              </p>
            )}
            {hovered && <p className="hint">Hover: {hovered}</p>}
          </section>
          <section className="run-card">
            <p className="eyebrow">MEASUREMENT</p>
            <div className="button-row">
              <button
                disabled={!sceneReady || measurement === 'warming' || measurement === 'recording'}
                onClick={beginWarmup}
              >
                30s warm-up
              </button>
              <button disabled={!sceneReady || measurement !== 'ready'} onClick={beginCapture}>
                Capture 120s
              </button>
            </div>
            <p className="status-line">
              {measurement === 'warming'
                ? `Warm-up ${measurementSeconds}/30s`
                : measurement === 'recording'
                  ? `Capture ${measurementSeconds}/120s`
                  : measurement === 'complete'
                    ? 'Capture complete'
                    : measurement === 'ready'
                      ? 'Warm-up complete; start capture'
                      : 'Ready for warm-up'}
            </p>
            <button className="wide" onClick={exportData}>
              Export raw metrics JSON
            </button>
            <div className="metric-grid">
              <span>GPU timer</span>
              <b>{collector?.metadata.gpuTimer ?? 'NOT_MEASURED'}</b>
              <span>GPU p95</span>
              <b>
                {metrics && metrics.gpuMs.p95 !== null
                  ? `${metrics.gpuMs.p95.toFixed(2)} ms`
                  : 'NOT_MEASURED'}
              </b>
              <span>CPU submit p95</span>
              <b>
                {metrics && metrics.cpuSubmitMs.p95 !== null
                  ? `${metrics.cpuSubmitMs.p95.toFixed(2)} ms`
                  : 'NOT_MEASURED'}
              </b>
              <span>1s FPS samples</span>
              <b>{metrics?.rollingFps1s.length ?? 0}</b>
            </div>
            <p className="hint">
              RAF cadence ≠ CPU submit. GPU query is asynchronous; disjoint samples are discarded.
              No sample is a PASS claim.
            </p>
          </section>
          <section>
            <p className="eyebrow">EVENT LOG</p>
            <ol className="event-log">
              {log.map((line, index) => (
                <li key={`${line}-${index}`}>{line}</li>
              ))}
            </ol>
          </section>
        </aside>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
