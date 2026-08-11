import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyTask, createLocalReceipt, defaultPolicy, generateLocalIdentity, parseLocalIdentity, receiptDigest, verifyLocalReceipt } from '../src/local.js';

const observation = { eventClass: 'test' as const, source: 'vscode-terminal' as const, name: 'npm test', exitCode: 0, startedAt: '2026-08-11T08:00:00.000Z', completedAt: '2026-08-11T08:00:01.000Z', details: { trustedCommandLine: true } };

test('a local receipt is signed and verified before persistence', async () => {
  const identity = generateLocalIdentity('2026-08-11T08:00:00.000Z');
  assert.equal(parseLocalIdentity(JSON.stringify(identity)).keyId, identity.keyId);
  const receipt = await createLocalReceipt(observation, identity, { domain: 'https://example.com' });
  const checked = await verifyLocalReceipt(receipt);
  assert.equal(checked.result.ok, true);
  assert.equal(checked.verdict.label, 'Íntegro (pendiente de L1)');
  assert.match(receiptDigest(receipt), /^[0-9a-f]{64}$/u);
});

test('payload and subject tampering fail', async () => {
  const receipt = await createLocalReceipt(observation, generateLocalIdentity());
  const tampered = structuredClone(receipt);
  const payload = tampered.envelope.payload as { observation: { exitCode: number } };
  payload.observation.exitCode = 1;
  await assert.rejects(() => verifyLocalReceipt(tampered), /SUBJECT_PAYLOAD_MISMATCH/u);
  const subject = structuredClone(receipt); subject.subject_base64 = Buffer.from('different').toString('base64');
  await assert.rejects(() => verifyLocalReceipt(subject), /SUBJECT_PAYLOAD_MISMATCH/u);
});

test('derived verdict, event binding and workspace identity cannot be substituted', async () => {
  const identity = generateLocalIdentity();
  const receipt = await createLocalReceipt(observation, identity);
  const verdict = structuredClone(receipt); verdict.verdict.label = 'currently_trusted';
  await assert.rejects(() => verifyLocalReceipt(verdict), /VERDICT_MISMATCH/u);
  const unbound = structuredClone(receipt); (unbound.envelope.payload as { observation: { name: string } }).observation.name = 'another test';
  await assert.rejects(() => verifyLocalReceipt(unbound), /SUBJECT_PAYLOAD_MISMATCH/u);
  await assert.rejects(() => verifyLocalReceipt(receipt, generateLocalIdentity().keyId), /WORKSPACE_IDENTITY_MISMATCH/u);
});

test('receipt references bind the previous receipt digest', async () => {
  const identity = generateLocalIdentity();
  const first = await createLocalReceipt(observation, identity);
  const second = await createLocalReceipt({ ...observation, eventClass: 'build', name: 'npm run build', completedAt: '2026-08-11T08:00:02.000Z' }, identity, { previousReceipt: { id: String(first.envelope.id), digest: receiptDigest(first) } });
  const reference = (second.envelope.references as Array<{ digest: string }>)[0]!;
  assert.equal(reference.digest, `sha256:${receiptDigest(first)}`);
  assert.equal((await verifyLocalReceipt(second)).result.ok, true);
});

test('policy defaults and execution classification are minimal', () => {
  assert.deepEqual(defaultPolicy('sample-project').requiredReceipts, ['build', 'test', 'release']);
  assert.equal(classifyTask('npm test'), 'test'); assert.equal(classifyTask('release production'), 'release'); assert.equal(classifyTask('compile'), 'build'); assert.equal(classifyTask('lint'), 'task');
});
