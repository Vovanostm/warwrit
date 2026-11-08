import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import './styles.css';

const Playground = import.meta.env.DEV
  ? lazy(() =>
      import('./playground/Playground.js').then((module) => ({ default: module.Playground })),
    )
  : null;
const MapEditor = import.meta.env.DEV
  ? lazy(() =>
      import('./map-editor/MapEditor.js').then((module) => ({ default: module.MapEditor })),
    )
  : null;
const isMapEditor = window.location.pathname.replace(/\/$/u, '') === '/dev/playground/maps';
const isPlayground = /^\/dev\/playground(?:\/(?:combat|maps))?\/?$/u.test(window.location.pathname);

if (import.meta.env.DEV && /^\/dev\/playground\/?$/u.test(window.location.pathname)) {
  window.history.replaceState(null, '', `/dev/playground/combat${window.location.search}`);
}

const rootElement = document.querySelector('#root');
if (rootElement === null) {
  throw new Error('Missing #root element');
}

createRoot(rootElement).render(
  <StrictMode>
    {isPlayground && !Playground ? (
      <main>
        <h1>Инструмент недоступен</h1>
        <p>Developer Playground доступен только в разрешённой среде разработки.</p>
        <a href="/">Вернуться в игру</a>
      </main>
    ) : isPlayground && Playground ? (
      <Suspense fallback={<p>Проверка доступа…</p>}>
        {isMapEditor && MapEditor ? <MapEditor /> : <Playground />}
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
