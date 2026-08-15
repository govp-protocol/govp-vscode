import * as crypto from 'node:crypto';

export const IMPLEMENTATION_STATES = [
  'queued',
  'specifying',
  'awaiting_spec_approval',
  'building',
  'testing',
  'awaiting_deployment_approval',
  'activating_reference',
  'active_lab',
  'frozen',
  'failed',
] as const;

export type ImplementationState = (typeof IMPLEMENTATION_STATES)[number];

export type ImplementationSnapshot = {
  id: string;
  state: ImplementationState;
  servicePackId: string;
  specVersion: number | null;
  specSha256: string | null;
  artifactSetSha256: string | null;
  tests: {
    status?: string;
    total_count?: number;
    passed_count?: number;
    artifact_set_sha256?: string;
    created_at?: string;
  } | null;
  deploymentApproved: boolean;
  approvalsAreHumanOnly: true;
  productionMutationAllowed: false;
};

export type ConformanceRun = {
  status: 'passed';
  total_count: number;
  passed_count: number;
  artifact_set_sha256: string;
  created_at: string;
  results: Record<string, unknown>[];
};

export type BundleArtifact = {
  path: string;
  artifactType: string;
  sha256: string;
  sizeBytes: number;
};

export type ArtifactInventory = {
  artifactSetSha256: string;
  count: number;
  artifacts: BundleArtifact[];
};

export type ArtifactContent = BundleArtifact & { content: string };
export type ArtifactBundle = { inventory: ArtifactInventory; artifacts: ArtifactContent[]; detachedManifestContent: string };

export type NextAction = {
  label: string;
  detail: string;
  command: 'specify' | 'refresh' | 'human-spec' | 'human-deployment' | 'integrate' | 'recover';
  humanRequired: boolean;
};

export class UserError extends Error {
  constructor(readonly template: string, readonly arguments_: Array<string | number | boolean> = []) {
    super(template.replace(/\{(\d+)\}/gu, (_match, index: string) => String(arguments_[Number(index)] ?? '')));
    this.name = 'UserError';
  }
}

export type SourceMapping = {
  schema: 'org.govp.source-mapping/1';
  version: 1;
  fields: Array<{
    sourceField: string;
    targetField: string;
    sourceType: 'string' | 'number' | 'boolean' | 'timestamp' | 'digest';
    required: boolean;
  }>;
};

const SHA256 = /^[0-9a-f]{64}$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SAFE_FIELD = /^[A-Za-z][A-Za-z0-9_.-]{0,127}$/u;
const MAX_ARTIFACTS = 500;
const MAX_ARTIFACT_BYTES = 2 * 1024 * 1024;
const MAX_BUNDLE_BYTES = 32 * 1024 * 1024;
const encoder = new TextEncoder();

const stateLabels: Record<ImplementationState, string> = {
  queued: 'Ready to define',
  specifying: 'Preparing specification',
  awaiting_spec_approval: 'Specification ready',
  building: 'Building',
  testing: 'Testing',
  awaiting_deployment_approval: 'Bundle ready',
  activating_reference: 'Activating Lab',
  active_lab: 'Active in Lab',
  frozen: 'Paused',
  failed: 'Requires review',
};

const nextActions: Record<ImplementationState, NextAction> = {
  queued: { label: 'Prepare specification', detail: 'GOVP will define the authorized process.', command: 'specify', humanRequired: false },
  specifying: { label: 'Refresh status', detail: 'The specification is being prepared.', command: 'refresh', humanRequired: false },
  awaiting_spec_approval: { label: 'Review and decide', detail: 'Approval belongs to the partner.', command: 'human-spec', humanRequired: true },
  building: { label: 'Refresh status', detail: 'The bundle is being built.', command: 'refresh', humanRequired: false },
  testing: { label: 'Refresh status', detail: 'Tests are in progress.', command: 'refresh', humanRequired: false },
  awaiting_deployment_approval: { label: 'Review tests and decide', detail: 'GOVP will show the tests before opening the human decision.', command: 'human-deployment', humanRequired: true },
  activating_reference: { label: 'Refresh status', detail: 'The signed reference is being activated.', command: 'refresh', humanRequired: false },
  active_lab: { label: 'Integrate into this project', detail: 'Applies only safe files after verifying the bundle.', command: 'integrate', humanRequired: false },
  frozen: { label: 'Open partner channel', detail: 'Only the partner can reactivate the implementation.', command: 'recover', humanRequired: true },
  failed: { label: 'Review incident', detail: 'The failure must be reviewed before retrying.', command: 'recover', humanRequired: true },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => allowed.has(key));
}

export function compareUtf8(left: string, right: string): number {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  const size = Math.min(a.length, b.length);
  for (let index = 0; index < size; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return a.length - b.length;
}

export function stableJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new TypeError('JSON numbers must be safe integers');
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (!isRecord(value)) throw new TypeError('unsupported JSON value');
  return `{${Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => compareUtf8(left, right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
    .join(',')}}`;
}

export function sha256Text(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

export function isImplementationState(value: unknown): value is ImplementationState {
  return typeof value === 'string' && (IMPLEMENTATION_STATES as readonly string[]).includes(value);
}

export function implementationStateLabel(state: ImplementationState, deploymentApproved = false): string {
  if (state === 'awaiting_deployment_approval' && deploymentApproved) return 'Bundle authorized';
  return stateLabels[state];
}

export function implementationNextAction(state: ImplementationState, deploymentApproved = false): NextAction {
  if (state === 'awaiting_deployment_approval' && deploymentApproved) return nextActions.active_lab;
  return nextActions[state];
}

export function checkedHttpsUrl(value: string, label: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw new UserError('{0} must use HTTPS and contain no credentials or fragment.', [label]);
  }
  return url.toString();
}

export function checkedMcpEndpoint(value: string): string {
  const url = new URL(checkedHttpsUrl(value, 'El endpoint MCP'));
  if (url.pathname !== '/mcp') throw new UserError('The MCP endpoint must end exactly in /mcp.');
  url.search = '';
  return url.toString();
}

export function normalizeDomain(value: string): string {
  const url = new URL(checkedHttpsUrl(value, 'El dominio'));
  if (url.pathname !== '/' || url.search) throw new UserError('The domain must be an HTTPS origin only, without a path or query.');
  return url.origin;
}

export function canonicalForDomain(domain: string): string {
  return `${normalizeDomain(domain)}/.well-known/govp.txt`;
}

export function domainFromCandidates(candidates: readonly (string | null | undefined)[]): string | null {
  for (const candidate of candidates) {
    if (!candidate?.trim()) continue;
    try {
      return new URL(checkedHttpsUrl(candidate.trim(), 'El dominio inferido')).origin;
    } catch {
      // Invalid candidates are ignored; a configured invalid value is reported by the adapter.
    }
  }
  return null;
}

export function findGovpToolName(
  tools: readonly { name: string; description?: string }[],
  logicalName: string,
  providerNamespace: string,
): string | null {
  if (!/^[a-z0-9_.-]+$/u.test(providerNamespace) || !/^[a-z0-9_]+$/u.test(logicalName)) return null;
  const prefixes = [
    `${providerNamespace}_`,
    `${providerNamespace}.`,
    `${providerNamespace}-`,
  ];
  const matches = tools.filter((tool) => prefixes.some((prefix) => tool.name === `${prefix}${logicalName}`));
  if (matches.length === 1) return matches[0]?.name ?? null;
  const tagged = tools.filter((tool) => tool.name === logicalName
    && tool.description?.includes(`[govp-provider:${providerNamespace}]`));
  return tagged.length === 1 ? tagged[0]?.name ?? null : null;
}

export function toolResultText(parts: readonly unknown[], maximumBytes = 1024 * 1024): string {
  let text = '';
  for (const part of parts) {
    const value = typeof part === 'string' ? part
      : part && typeof part === 'object' && typeof Reflect.get(part, 'value') === 'string'
        ? String(Reflect.get(part, 'value'))
        : '';
    text += value;
    if (Buffer.byteLength(text, 'utf8') > maximumBytes) throw new UserError('The MCP response exceeds 1 MiB.');
  }
  return text;
}

export function parseToolJson<T>(parts: readonly unknown[]): T {
  const text = toolResultText(parts).trim();
  if (!text) throw new UserError('GOVP returned no content.');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new UserError('GOVP returned an unstructured response.');
  }
}

export function parseImplementation(value: unknown): ImplementationSnapshot {
  if (!isRecord(value) || !exactKeys(value, [
    'id', 'state', 'servicePackId', 'specVersion', 'specSha256', 'artifactSetSha256',
    'tests', 'deploymentApproved', 'approvalsAreHumanOnly', 'productionMutationAllowed',
  ])) throw new UserError('The implementation format is invalid.');
  if (!isImplementationState(value.state) || typeof value.id !== 'string' || typeof value.servicePackId !== 'string') {
    throw new UserError('The implementation is incomplete.');
  }
  if (value.approvalsAreHumanOnly !== true || value.productionMutationAllowed !== false) {
    throw new UserError('The remote implementation does not preserve human and production boundaries.');
  }
  if (typeof value.deploymentApproved !== 'boolean'
    || (value.deploymentApproved && (!value.artifactSetSha256
      || !['awaiting_deployment_approval', 'activating_reference', 'active_lab'].includes(value.state)))) {
    throw new UserError('Deployment approval does not match the current bundle.');
  }
  for (const digest of [value.specSha256, value.artifactSetSha256]) {
    if (digest !== null && (typeof digest !== 'string' || !SHA256.test(digest))) throw new UserError('The implementation contains an invalid digest.');
  }
  if (value.tests !== null) {
    if (!isRecord(value.tests)) throw new UserError('The remote test format is invalid.');
    const testDigest = value.tests.artifact_set_sha256;
    if (testDigest !== undefined && (!SHA256.test(String(testDigest)) || testDigest !== value.artifactSetSha256)) {
      throw new UserError('The tests are not bound to the approved bundle.');
    }
  }
  return value as ImplementationSnapshot;
}

export function parseConformanceRun(value: unknown, expectedDigest: string): ConformanceRun {
  if (!SHA256.test(expectedDigest) || !isRecord(value) || !exactKeys(value, [
    'status', 'total_count', 'passed_count', 'artifact_set_sha256', 'created_at', 'results',
  ])) throw new UserError('The remote test format is invalid.');
  if (value.status !== 'passed'
    || !Number.isSafeInteger(value.total_count) || Number(value.total_count) < 1 || Number(value.total_count) > 50
    || !Number.isSafeInteger(value.passed_count) || value.passed_count !== value.total_count
    || value.artifact_set_sha256 !== expectedDigest
    || typeof value.created_at !== 'string' || !Number.isFinite(Date.parse(value.created_at))
    || !Array.isArray(value.results) || value.results.length !== value.total_count
    || value.results.some((result) => !isRecord(result))) {
    throw new UserError('The tests are incomplete or not bound to the current bundle.');
  }
  return value as ConformanceRun;
}

export function safeArtifactPath(input: string): string {
  const normalized = input.replaceAll('\\', '/').replace(/^\.\//u, '');
  const segments = normalized.split('/');
  if (!normalized || normalized.startsWith('/') || normalized.includes('\0')
    || segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new UserError('Artifact path is not allowed: {0}', [input]);
  }
  return normalized;
}

export function executablePathReason(input: string): string | null {
  const path = safeArtifactPath(input);
  const lower = path.toLowerCase();
  const basename = lower.split('/').at(-1) ?? '';
  if (lower.startsWith('.git/hooks/') || lower.includes('/.git/hooks/')) return '.git/hooks';
  if (lower.startsWith('.vscode/') || lower.includes('/.vscode/')) return '.vscode';
  if (lower.startsWith('.github/workflows/') || lower.includes('/.github/workflows/')) return '.github/workflows';
  if (lower.startsWith('.devcontainer/') || lower.includes('/.devcontainer/')) return '.devcontainer';
  if (basename === '.envrc') return '.envrc';
  if (basename === 'package.json') return 'package.json';
  if (basename === 'makefile') return 'Makefile';
  return null;
}

export function artifactSetDigest(artifacts: readonly BundleArtifact[]): string {
  const entries = artifacts.map((artifact) => ({
    path: safeArtifactPath(artifact.path),
    artifactType: artifact.artifactType,
    sha256: artifact.sha256.toLowerCase(),
  })).sort((left, right) => compareUtf8(left.path, right.path));
  return sha256Text(stableJson(entries));
}

export function parseArtifactInventory(value: unknown, approvedDigest: string): ArtifactInventory {
  if (!isRecord(value) || !exactKeys(value, ['artifactSetSha256', 'count', 'artifacts'])
    || typeof value.artifactSetSha256 !== 'string' || !SHA256.test(value.artifactSetSha256)
    || value.artifactSetSha256 !== approvedDigest || !Number.isInteger(value.count)
    || !Array.isArray(value.artifacts) || value.count !== value.artifacts.length
    || value.count < 1 || value.count > MAX_ARTIFACTS) {
    throw new UserError('The inventory does not match the approved bundle.');
  }
  let total = 0;
  const seen = new Set<string>();
  const artifacts = value.artifacts.map((item) => {
    if (!isRecord(item) || !exactKeys(item, ['path', 'artifactType', 'sha256', 'sizeBytes'])
      || typeof item.path !== 'string' || typeof item.artifactType !== 'string'
      || typeof item.sha256 !== 'string' || !SHA256.test(item.sha256.toLowerCase())
      || !Number.isInteger(item.sizeBytes) || Number(item.sizeBytes) < 0 || Number(item.sizeBytes) > MAX_ARTIFACT_BYTES) {
      throw new UserError('The inventory contains an invalid artifact.');
    }
    const path = safeArtifactPath(item.path);
    const collisionKey = path.normalize('NFC').toLowerCase();
    if (seen.has(collisionKey)) throw new UserError('The inventory contains duplicate or ambiguous paths: {0}', [path]);
    seen.add(collisionKey);
    total += Number(item.sizeBytes);
    return { path, artifactType: item.artifactType, sha256: item.sha256.toLowerCase(), sizeBytes: Number(item.sizeBytes) };
  });
  if (total > MAX_BUNDLE_BYTES) throw new UserError('The bundle exceeds 32 MiB.');
  if (artifactSetDigest(artifacts) !== approvedDigest) throw new UserError('The inventory digest does not match the approved artifactSetSha256.');
  return { artifactSetSha256: approvedDigest, count: artifacts.length, artifacts };
}

export function verifyArtifactContent(expected: BundleArtifact, value: unknown): ArtifactContent {
  if (!isRecord(value) || !exactKeys(value, ['path', 'artifactType', 'sha256', 'sizeBytes', 'content'])
    || typeof value.content !== 'string' || typeof value.path !== 'string'
    || typeof value.artifactType !== 'string' || typeof value.sha256 !== 'string'
    || typeof value.sizeBytes !== 'number') throw new UserError('Artifact {0} has an invalid format.', [expected.path]);
  const bytes = Buffer.from(value.content, 'utf8');
  if (safeArtifactPath(value.path) !== expected.path || value.artifactType !== expected.artifactType
    || value.sha256.toLowerCase() !== expected.sha256 || value.sizeBytes !== expected.sizeBytes
    || bytes.length !== expected.sizeBytes || crypto.createHash('sha256').update(bytes).digest('hex') !== expected.sha256) {
    throw new UserError('The artifact does not match the approved inventory: {0}', [expected.path]);
  }
  return { ...expected, content: value.content };
}

export function parseArtifactBundle(value: unknown, approvedDigest: string): ArtifactBundle {
  if (!isRecord(value) || !exactKeys(value, ['artifactSetSha256', 'count', 'artifacts', 'detachedManifest'])
    || !Array.isArray(value.artifacts)) throw new UserError('The remote bundle format is invalid.');
  const remoteArtifacts = value.artifacts;
  const inventory = parseArtifactInventory({
    artifactSetSha256: value.artifactSetSha256,
    count: value.count,
    artifacts: remoteArtifacts.map((item) => {
      if (!isRecord(item)) throw new UserError('The remote bundle contains an invalid artifact.');
      return {
        path: item.path,
        artifactType: item.artifactType,
        sha256: item.sha256,
        sizeBytes: item.sizeBytes,
      };
    }),
  }, approvedDigest);
  const artifacts = inventory.artifacts.map((expected, index) =>
    verifyArtifactContent(expected, remoteArtifacts[index]));
  const manifest = value.detachedManifest;
  if (!isRecord(manifest) || !exactKeys(manifest, ['schema', 'serviceProjectId', 'servicePackId', 'bundleVersion', 'artifactSetSha256', 'files'])
    || manifest.schema !== 'org.govp.partner.bundle-manifest/0.1'
    || typeof manifest.serviceProjectId !== 'string' || !UUID.test(manifest.serviceProjectId)
    || typeof manifest.servicePackId !== 'string' || !manifest.servicePackId
    || !Number.isSafeInteger(manifest.bundleVersion) || Number(manifest.bundleVersion) < 1
    || manifest.artifactSetSha256 !== approvedDigest || !Array.isArray(manifest.files)
    || manifest.files.length !== inventory.artifacts.length) throw new UserError('The detached manifest is invalid.');
  manifest.files.forEach((file, index) => {
    const expected = inventory.artifacts[index];
    if (!expected || !isRecord(file) || !exactKeys(file, ['path', 'artifactType', 'sha256'])
      || file.path !== expected.path || file.artifactType !== expected.artifactType || file.sha256 !== expected.sha256) {
      throw new UserError('The detached manifest does not match the approved inventory.');
    }
  });
  return { inventory, artifacts, detachedManifestContent: `${JSON.stringify(manifest, null, 2)}\n` };
}

export function parseSourceMapping(value: unknown): SourceMapping {
  if (!isRecord(value) || !exactKeys(value, ['schema', 'version', 'fields'])
    || value.schema !== 'org.govp.source-mapping/1' || value.version !== 1
    || !Array.isArray(value.fields) || value.fields.length < 1 || value.fields.length > 128) {
    throw new UserError('The mapping does not comply with org.govp.source-mapping/1.');
  }
  const allowedTypes = new Set(['string', 'number', 'boolean', 'timestamp', 'digest']);
  const targets = new Set<string>();
  const fields = value.fields.map((field) => {
    if (!isRecord(field) || !exactKeys(field, ['sourceField', 'targetField', 'sourceType', 'required'])
      || typeof field.sourceField !== 'string' || !SAFE_FIELD.test(field.sourceField)
      || typeof field.targetField !== 'string' || !SAFE_FIELD.test(field.targetField)
      || typeof field.sourceType !== 'string' || !allowedTypes.has(field.sourceType)
      || typeof field.required !== 'boolean') throw new UserError('The mapping contains disallowed fields.');
    if (targets.has(field.targetField)) throw new UserError('Duplicate target in the mapping: {0}', [field.targetField]);
    targets.add(field.targetField);
    return field as SourceMapping['fields'][number];
  });
  return { schema: 'org.govp.source-mapping/1', version: 1, fields };
}

export function humanBytes(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function shortDigest(value: string | null | undefined): string {
  return value ? `sha256:${value.slice(0, 12)}…` : 'Not yet available';
}
