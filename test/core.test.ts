import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  artifactSetDigest, domainFromCandidates, executablePathReason, findGovpToolName, parseArtifactInventory,
  parseImplementation, parseSourceMapping, safeArtifactPath, verifyArtifactContent,
} from '../src/core.js';

test('artifact set matches the shared UTF-8 vector', async () => {
  const vectors = JSON.parse(await readFile('conformance/artifact-set-vectors.json', 'utf8')) as { vectors: Array<{ artifacts: Parameters<typeof artifactSetDigest>[0]; artifactSetSha256: string }> };
  for (const vector of vectors.vectors) assert.equal(artifactSetDigest(vector.artifacts), vector.artifactSetSha256);
});

test('provider selection never falls back to an unrelated tool', () => {
  assert.equal(findGovpToolName([{ name: 'evil_get_implementation' }], 'get_implementation', 'govp'), null);
  assert.equal(findGovpToolName([{ name: 'get_implementation', description: '[govp-provider:govp]' }], 'get_implementation', 'govp'), 'get_implementation');
  assert.equal(findGovpToolName([{ name: 'govp_get_implementation' }, { name: 'govp.get_implementation' }], 'get_implementation', 'govp'), null);
  assert.equal(findGovpToolName([{ name: 'mcp_govp_implemen_get_implementation' }], 'get_implementation', 'mcp_govp_implemen'), 'mcp_govp_implemen_get_implementation');
});

test('an inferred project URL resolves only to its HTTPS owner origin', () => {
  assert.equal(domainFromCandidates(['https://example.com/project/docs?lang=es']), 'https://example.com');
  assert.equal(domainFromCandidates(['http://example.com', 'https://safe.example/path']), 'https://safe.example');
  assert.equal(domainFromCandidates(['https://user:pass@example.com/path']), null);
});

test('runtime safety flags and test digest are enforced', () => {
  const digest = 'a'.repeat(64);
  const base = { id: 'x', state: 'active_lab', servicePackId: 's', specVersion: 1, specSha256: digest, artifactSetSha256: digest, tests: { artifact_set_sha256: digest }, approvalsAreHumanOnly: true, productionMutationAllowed: false };
  assert.equal(parseImplementation(base).state, 'active_lab');
  assert.throws(() => parseImplementation({ ...base, productionMutationAllowed: true }));
  assert.throws(() => parseImplementation({ ...base, tests: { artifact_set_sha256: 'b'.repeat(64) } }));
});

test('inventory and content remain bound to the approved digest', () => {
  const content = 'hello\n'; const sha256 = '5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03';
  const artifacts = [{ path: 'govp/example.txt', artifactType: 'text', sha256, sizeBytes: 6 }];
  const approved = artifactSetDigest(artifacts);
  const inventory = parseArtifactInventory({ artifactSetSha256: approved, count: 1, artifacts }, approved);
  assert.equal(verifyArtifactContent(inventory.artifacts[0]!, { ...artifacts[0], content }).content, content);
  assert.throws(() => verifyArtifactContent(inventory.artifacts[0]!, { ...artifacts[0], content: 'evil!\n', sizeBytes: 6 }));
});

test('executable and ambiguous paths are denied', () => {
  for (const value of ['.git/hooks/pre-commit', '.vscode/tasks.json', '.github/workflows/x.yml', '.devcontainer/a', '.envrc', 'package.json', 'Makefile']) assert.ok(executablePathReason(value));
  for (const value of ['/tmp/x', '../x', 'a//b', 'a/./b']) assert.throws(() => safeArtifactPath(value));
});

test('source mappings use an exact allowlist', () => {
  const good = { schema: 'org.govp.source-mapping/1', version: 1, fields: [{ sourceField: 'order.id', targetField: 'subject.id', sourceType: 'string', required: true }] };
  assert.equal(parseSourceMapping(good).fields.length, 1);
  assert.throws(() => parseSourceMapping({ ...good, execute: 'curl attacker' }));
  assert.throws(() => parseSourceMapping({ ...good, fields: [...good.fields, good.fields[0]] }));
});
