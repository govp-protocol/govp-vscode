import { mkdir } from 'node:fs/promises';

import { build } from 'esbuild';

await mkdir(new URL('../dist', import.meta.url), { recursive: true });
await build({
  bundle: true,
  entryPoints: [new URL('../src/extension.ts', import.meta.url).pathname],
  external: ['vscode'],
  format: 'cjs',
  logLevel: 'info',
  minify: false,
  outfile: new URL('../dist/extension.js', import.meta.url).pathname,
  platform: 'node',
  sourcemap: false,
  target: 'node20',
});
