import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import { MissionLab } from './mission-lab/MissionLab.js';
import './styles.css';

const rootElement = document.querySelector('#root');
if (rootElement === null) {
  throw new Error('Missing #root element');
}

createRoot(rootElement).render(
  <StrictMode>
    {import.meta.env.DEV && window.location.pathname === '/missions-lab' ? <MissionLab /> : <App />}
  </StrictMode>,
);
