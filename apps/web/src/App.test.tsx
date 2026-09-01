import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

describe('web foundation', () => {
  it('renders the explicit non-gameplay foundation state', () => {
    const markup = renderToStaticMarkup(<App />);
    expect(markup).toContain('Engineering Foundation');
    expect(markup).toContain('Gameplay is intentionally outside');
  });
});
