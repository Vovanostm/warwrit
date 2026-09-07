import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  canonicalJson,
  COMPANY_CATALOGUE,
  COMPANY_COMMAND_JSON_SCHEMA,
  COMPANY_RULES,
} from './index.js';

describe('WP-02.1 reconstructed source fingerprint', () => {
  it('pins semantic exports without pretending to possess the original archive', () => {
    const manifest = JSON.parse(
      readFileSync(
        new URL('../../../../docs/work-packages/WP-02.1-SOURCES.json', import.meta.url),
        'utf8',
      ),
    ) as {
      semanticSha256: { catalogue: string; rules: string; commandSchema: string };
      archiveConcordance: string;
    };
    const digest = (value: unknown): string =>
      createHash('sha256').update(canonicalJson(value)).digest('hex');
    expect(digest(COMPANY_CATALOGUE)).toBe(manifest.semanticSha256.catalogue);
    expect(digest(COMPANY_RULES)).toBe(manifest.semanticSha256.rules);
    expect(digest(COMPANY_COMMAND_JSON_SCHEMA)).toBe(manifest.semanticSha256.commandSchema);
    expect(manifest.archiveConcordance).toBe('NOT_RUN');
  });
});
