import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const output = new URL('../output', import.meta.url);
await mkdir(output, { recursive: true });
const destination = new URL('../output/govp-partner-workbench-0.3.7.vsix', import.meta.url).pathname;
const result = spawnSync(
  process.execPath,
  [new URL('../node_modules/@vscode/vsce/vsce', import.meta.url).pathname, 'package', '--out', destination],
  { encoding: 'utf8', stdio: 'inherit' },
);
if (result.status !== 0) throw new Error(`VSCE_FAILED:${result.status}`);
console.log(destination);
