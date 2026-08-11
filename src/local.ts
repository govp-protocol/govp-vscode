import * as crypto from 'node:crypto';

import {
  canonicalJson,
  envelopeSigningInput,
  verifyEnvelope,
  type EnvelopeResult,
} from '@govp/verifier';

import { canonicalForDomain, normalizeDomain, sha256Text, stableJson } from './core.js';

export const LOCAL_IDENTITY_VERSION = 1;
export const LOCAL_RECEIPT_SCHEMA = 'org.govp.workbench-receipt/1';
export const LOCAL_POLICY_SCHEMA = 'org.govp.workbench-policy/1';
export const LOCAL_EVENT_TYPE = 'org.govp.workbench-event/1';

export type EventClass = 'task' | 'test' | 'build' | 'release' | 'manual';

export type LocalIdentity = {
  version: 1;
  privateKeyPem: string;
  publicKeyBase64: string;
  keyId: string;
  createdAt: string;
};

export type WorkbenchPolicy = {
  schema: typeof LOCAL_POLICY_SCHEMA;
  version: 1;
  projectId: string;
  requiredReceipts: EventClass[];
  observe: Array<'task' | 'test' | 'build' | 'release'>;
  publication: {
    disposition: 'publish' | 'sealed_private';
    enqueue: boolean;
  };
};

export type LocalObservation = {
  eventClass: EventClass;
  source: 'vscode-task' | 'vscode-terminal' | 'manual';
  name: string;
  exitCode: number | null;
  startedAt: string | null;
  completedAt: string;
  details: Record<string, string | number | boolean | null>;
};

export type LayerVerdict = {
  label: 'Íntegro (pendiente de L1)' | 'evidence_authentic' | 'currently_trusted' | 'No íntegro';
  layers: { L0: boolean; L1: boolean | null; L2: boolean | null };
  warnings: string[];
  reasons: string[];
};

export type LocalReceipt = {
  schema: typeof LOCAL_RECEIPT_SCHEMA;
  created_at: string;
  subject_base64: string;
  envelope: Record<string, unknown>;
  verdict: LayerVerdict;
};

export type PublicationQueueItem = {
  schema: 'org.govp.workbench-publication-queue/1';
  id: string;
  enqueued_at: string;
  state: 'queued';
  disposition: 'publish' | 'sealed_private';
  domain: string;
  canonical: string;
  receipt_path: string;
  receipt_sha256: string;
};

function publicRawFromKey(publicKey: crypto.KeyObject): Buffer {
  const der = publicKey.export({ format: 'der', type: 'spki' });
  if (!Buffer.isBuffer(der) || der.length < 32) throw new Error('LOCAL_PUBLIC_KEY_INVALID');
  return der.subarray(-32);
}

export function generateLocalIdentity(now = new Date().toISOString()): LocalIdentity {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const raw = publicRawFromKey(publicKey);
  return {
    version: LOCAL_IDENTITY_VERSION,
    privateKeyPem: String(privateKey.export({ format: 'pem', type: 'pkcs8' })),
    publicKeyBase64: raw.toString('base64'),
    keyId: `sha256:${crypto.createHash('sha256').update(raw).digest('hex')}`,
    createdAt: now,
  };
}

export function parseLocalIdentity(value: string): LocalIdentity {
  const parsed = JSON.parse(value) as Partial<LocalIdentity>;
  if (parsed.version !== 1 || typeof parsed.privateKeyPem !== 'string'
    || typeof parsed.publicKeyBase64 !== 'string' || typeof parsed.keyId !== 'string'
    || typeof parsed.createdAt !== 'string') throw new Error('LOCAL_IDENTITY_INVALID');
  const privateKey = crypto.createPrivateKey(parsed.privateKeyPem);
  const publicRaw = publicRawFromKey(crypto.createPublicKey(privateKey));
  if (publicRaw.toString('base64') !== parsed.publicKeyBase64
    || `sha256:${crypto.createHash('sha256').update(publicRaw).digest('hex')}` !== parsed.keyId) {
    throw new Error('LOCAL_IDENTITY_MISMATCH');
  }
  return parsed as LocalIdentity;
}

export function defaultPolicy(projectId: string): WorkbenchPolicy {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/u.test(projectId)) throw new Error('PROJECT_ID_INVALID');
  return {
    schema: LOCAL_POLICY_SCHEMA,
    version: 1,
    projectId,
    requiredReceipts: ['build', 'test', 'release'],
    observe: ['task', 'test', 'build', 'release'],
    publication: { disposition: 'sealed_private', enqueue: true },
  };
}

export function parsePolicy(value: unknown): WorkbenchPolicy {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('POLICY_INVALID');
  const policy = value as Partial<WorkbenchPolicy>;
  const classes = new Set<EventClass>(['task', 'test', 'build', 'release', 'manual']);
  const observed = new Set(['task', 'test', 'build', 'release']);
  if (policy.schema !== LOCAL_POLICY_SCHEMA || policy.version !== 1
    || typeof policy.projectId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/u.test(policy.projectId)
    || !Array.isArray(policy.requiredReceipts) || policy.requiredReceipts.some((item) => !classes.has(item))
    || new Set(policy.requiredReceipts).size !== policy.requiredReceipts.length
    || !Array.isArray(policy.observe) || policy.observe.some((item) => !observed.has(item))
    || new Set(policy.observe).size !== policy.observe.length
    || !policy.publication || !['publish', 'sealed_private'].includes(policy.publication.disposition)
    || typeof policy.publication.enqueue !== 'boolean') throw new Error('POLICY_INVALID');
  return policy as WorkbenchPolicy;
}

export function observationSubject(observation: LocalObservation): Uint8Array {
  return new TextEncoder().encode(stableJson(observation));
}

export async function createLocalReceipt(
  observation: LocalObservation,
  identity: LocalIdentity,
  options: { domain?: string | null; previousReceipt?: { id: string; digest: string } | null } = {},
): Promise<LocalReceipt> {
  const subject = observationSubject(observation);
  const subjectHash = crypto.createHash('sha256').update(subject).digest('hex');
  const domain = options.domain ? normalizeDomain(options.domain) : 'https://local.govp.invalid';
  const id = `WB-${subjectHash.slice(0, 20)}-${crypto.randomBytes(4).toString('hex')}`;
  const unsigned: Record<string, unknown> = {
    govp: 'GOVP-EXT-1',
    extension: { id: 'org.govp.workbench', version: '1.0.0' },
    type: LOCAL_EVENT_TYPE,
    id,
    issuer: { canonical: canonicalForDomain(domain), name: new URL(domain).hostname },
    subject: { type: 'development-event', id: `${observation.eventClass}:${subjectHash.slice(0, 24)}` },
    created_at: observation.completedAt,
    hash: { alg: 'sha256', value: subjectHash },
    payload: { observation },
    references: options.previousReceipt ? [{
      type: 'govp', id: options.previousReceipt.id, digest: `sha256:${options.previousReceipt.digest}`,
    }] : [],
    evidence: [],
    origin: {
      origin: 'system_observed',
      observed_by: 'govp-vscode/0.3.1',
      observation: { source: observation.source, event_class: observation.eventClass },
    },
  };
  const input = envelopeSigningInput(unsigned);
  const inputHash = crypto.createHash('sha256').update(input).digest('hex');
  const signature = crypto.sign(null, input, crypto.createPrivateKey(identity.privateKeyPem));
  const envelope = {
    ...unsigned,
    signature: {
      alg: 'Ed25519',
      key_id: identity.keyId,
      public_key: identity.publicKeyBase64,
      signing_input_sha256: inputHash,
      value: signature.toString('base64'),
    },
  };
  const verification = await verifyEnvelope(envelope, { subjectBytes: subject });
  if (!verification.ok) throw new Error(`LOCAL_RECEIPT_SELF_VERIFICATION_FAILED:${failedChecks(verification).join(',')}`);
  return {
    schema: LOCAL_RECEIPT_SCHEMA,
    created_at: observation.completedAt,
    subject_base64: Buffer.from(subject).toString('base64'),
    envelope,
    verdict: layeredVerdict(verification, null, null),
  };
}

function failedChecks(result: EnvelopeResult): string[] {
  return Object.entries(result.checks).filter(([, value]) => value === false).map(([key]) => key);
}

export function layeredVerdict(
  l0: EnvelopeResult,
  l1: boolean | null,
  l2: boolean | null,
  reasons: string[] = [],
): LayerVerdict {
  const layers = { L0: l0.ok, L1: l1, L2: l2 };
  const warnings = [...l0.warnings];
  if (!l0.ok) return { label: 'No íntegro', layers, warnings, reasons: [...failedChecks(l0), ...reasons] };
  if (l1 !== true) return { label: 'Íntegro (pendiente de L1)', layers, warnings, reasons };
  if (l2 !== true) return { label: 'evidence_authentic', layers, warnings, reasons };
  return { label: 'currently_trusted', layers, warnings, reasons };
}

export async function verifyLocalReceipt(value: unknown, expectedKeyId?: string): Promise<{ receipt: LocalReceipt; result: EnvelopeResult; verdict: LayerVerdict }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('LOCAL_RECEIPT_INVALID');
  const receipt = value as Partial<LocalReceipt>;
  if (receipt.schema !== LOCAL_RECEIPT_SCHEMA || typeof receipt.subject_base64 !== 'string'
    || typeof receipt.created_at !== 'string' || !receipt.verdict || !receipt.envelope
    || typeof receipt.envelope !== 'object' || Object.keys(receipt).some((key) => !['schema', 'created_at', 'subject_base64', 'envelope', 'verdict'].includes(key))) {
    throw new Error('LOCAL_RECEIPT_INVALID');
  }
  const subject = Buffer.from(receipt.subject_base64, 'base64');
  if (subject.length > 1024 * 1024 || subject.toString('base64') !== receipt.subject_base64) throw new Error('LOCAL_RECEIPT_SUBJECT_INVALID');
  const envelope = receipt.envelope as Record<string, unknown>;
  const payload = envelope.payload;
  const observation = payload && typeof payload === 'object' ? Reflect.get(payload, 'observation') : undefined;
  let subjectText: string;
  try { subjectText = new TextDecoder('utf-8', { fatal: true }).decode(subject); } catch { throw new Error('LOCAL_RECEIPT_SUBJECT_UTF8_INVALID'); }
  if (observation === undefined || subjectText !== stableJson(observation)) throw new Error('LOCAL_RECEIPT_SUBJECT_PAYLOAD_MISMATCH');
  if (receipt.created_at !== envelope.created_at) throw new Error('LOCAL_RECEIPT_CREATED_AT_MISMATCH');
  if (expectedKeyId) {
    const signature = envelope.signature;
    if (!signature || typeof signature !== 'object' || Reflect.get(signature, 'key_id') !== expectedKeyId) throw new Error('LOCAL_RECEIPT_WORKSPACE_IDENTITY_MISMATCH');
  }
  const result = await verifyEnvelope(envelope, { subjectBytes: subject });
  const verdict = layeredVerdict(result, null, null);
  if (stableJson(receipt.verdict) !== stableJson(verdict)) throw new Error('LOCAL_RECEIPT_VERDICT_MISMATCH');
  return { receipt: receipt as LocalReceipt, result, verdict };
}

export function receiptDigest(receipt: LocalReceipt): string {
  return sha256Text(canonicalJson(receipt));
}

export function queueItem(
  receipt: LocalReceipt,
  receiptPath: string,
  domain: string,
  disposition: 'publish' | 'sealed_private',
): PublicationQueueItem {
  const origin = normalizeDomain(domain);
  const id = String(receipt.envelope.id ?? '');
  if (!id) throw new Error('LOCAL_RECEIPT_ID_MISSING');
  return {
    schema: 'org.govp.workbench-publication-queue/1',
    id,
    enqueued_at: new Date().toISOString(),
    state: 'queued',
    disposition,
    domain: origin,
    canonical: canonicalForDomain(origin),
    receipt_path: receiptPath,
    receipt_sha256: receiptDigest(receipt),
  };
}

export function classifyTask(name: string): EventClass {
  const normalized = name.toLowerCase();
  if (/\b(release|publish|deploy)\b/u.test(normalized)) return 'release';
  if (/\b(test|spec|check)\b/u.test(normalized)) return 'test';
  if (/\b(build|compile|bundle|package)\b/u.test(normalized)) return 'build';
  return 'task';
}
