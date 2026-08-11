import { spawnSync } from 'node:child_process';

for (const [label, command, args] of [
  ['TypeScript mirror', process.execPath, ['--test', 'dist-tests/test/core.test.js', 'dist-tests/test/local.test.js']],
  ['Python reference', 'python3', ['reference/workbench_reference.py', 'conformance/artifact-set-vectors.json']],
]) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${label} failed`);
}
console.log('GOVP Automatic Workbench conformance: PASS');
