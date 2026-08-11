import * as crypto from 'node:crypto';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { verifyText } from '@govp/verifier';

import {
  checkedHttpsUrl,
  checkedMcpEndpoint,
  compareUtf8,
  domainFromCandidates,
  executablePathReason,
  findGovpToolName,
  humanBytes,
  implementationNextAction,
  implementationStateLabel,
  normalizeDomain,
  parseArtifactInventory,
  parseImplementation,
  parseSourceMapping,
  parseToolJson,
  safeArtifactPath,
  shortDigest,
  verifyArtifactContent,
  type ArtifactContent,
  type ArtifactInventory,
  type ImplementationSnapshot,
} from './core.js';
import {
  classifyTask,
  createLocalReceipt,
  defaultPolicy,
  generateLocalIdentity,
  parseLocalIdentity,
  parsePolicy,
  queueItem,
  receiptDigest,
  verifyLocalReceipt,
  type EventClass,
  type LocalIdentity,
  type LocalObservation,
  type LocalReceipt,
  type WorkbenchPolicy,
} from './local.js';

const MCP_PROVIDER_ID = 'govp.automatic-workbench.mcp';
const MCP_VERSION = '0.3.0';
const output = vscode.window.createOutputChannel('GOVP Automatic Workbench', { log: true });
const decoder = new TextDecoder('utf-8', { fatal: true });
const encoder = new TextEncoder();

type LocalStatus = {
  folder: vscode.WorkspaceFolder | null;
  ready: boolean;
  policyPersisted: boolean;
  policy: WorkbenchPolicy | null;
  domain: string | null;
  receiptCount: number;
  queueCount: number;
  missing: EventClass[];
  lastReceipt: LocalReceipt | null;
  warnings: string[];
};

type RemoteState = {
  loading: boolean;
  connected: boolean;
  implementation: ImplementationSnapshot | null;
  inventory: ArtifactInventory | null;
  notice: string;
  error: string;
};

function configuration(folder?: vscode.WorkspaceFolder | null): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration('govp', folder?.uri);
}

function isNotFound(error: unknown): boolean {
  return error instanceof vscode.FileSystemError && error.code === 'FileNotFound';
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function nonce(): string {
  return crypto.randomBytes(18).toString('base64url');
}

function workspaceFolderFor(uri?: vscode.Uri): vscode.WorkspaceFolder | null {
  if (uri) return vscode.workspace.getWorkspaceFolder(uri) ?? null;
  const active = vscode.window.activeTextEditor?.document.uri;
  if (active) {
    const folder = vscode.workspace.getWorkspaceFolder(active);
    if (folder) return folder;
  }
  return vscode.workspace.workspaceFolders?.[0] ?? null;
}

async function readJson(uri: vscode.Uri, maximumBytes = 2 * 1024 * 1024): Promise<unknown> {
  const bytes = await vscode.workspace.fs.readFile(uri);
  if (bytes.byteLength > maximumBytes) throw new Error(`El archivo supera ${humanBytes(maximumBytes)}.`);
  return JSON.parse(decoder.decode(bytes)) as unknown;
}

async function exists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

async function atomicCreate(uri: vscode.Uri, bytes: Uint8Array): Promise<void> {
  if (await exists(uri)) throw new Error(`No se sobrescribe un archivo existente: ${uri.fsPath}`);
  const parent = vscode.Uri.joinPath(uri, '..');
  await vscode.workspace.fs.createDirectory(parent);
  const temporary = vscode.Uri.joinPath(parent, `.${path.posix.basename(uri.path)}.${crypto.randomBytes(8).toString('hex')}.tmp`);
  await vscode.workspace.fs.writeFile(temporary, bytes);
  try {
    await vscode.workspace.fs.rename(temporary, uri, { overwrite: false });
  } catch (error) {
    try { await vscode.workspace.fs.delete(temporary); } catch { /* Best effort. */ }
    throw error;
  }
}

async function resolveDomain(folder: vscode.WorkspaceFolder): Promise<string | null> {
  const configured = configuration(folder).get<string>('domain', '').trim();
  if (configured) {
    try {
      return normalizeDomain(configured);
    } catch {
      throw new Error('govp.domain debe ser un origen HTTPS sin ruta, consulta ni credenciales.');
    }
  }
  let homepage: string | null = null;
  try {
    const packageJson = await readJson(vscode.Uri.joinPath(folder.uri, 'package.json'), 256 * 1024);
    if (packageJson && typeof packageJson === 'object' && typeof Reflect.get(packageJson, 'homepage') === 'string') {
      homepage = String(Reflect.get(packageJson, 'homepage'));
    }
  } catch (error) {
    if (!isNotFound(error) && !(error instanceof SyntaxError)) output.warn(`No se pudo resolver homepage: ${String(error)}`);
  }
  return domainFromCandidates([homepage]);
}

function projectId(folder: vscode.WorkspaceFolder): string {
  const cleaned = folder.name.normalize('NFKC').replace(/[^A-Za-z0-9._-]+/gu, '-').replace(/^-+|-+$/gu, '');
  return (cleaned.length >= 3 ? cleaned : `project-${crypto.createHash('sha256').update(folder.uri.toString()).digest('hex').slice(0, 12)}`).slice(0, 128);
}

class LocalWorkbench implements vscode.Disposable {
  private readonly diagnostics = vscode.languages.createDiagnosticCollection('govp');
  private readonly changedEmitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.changedEmitter.event;
  private readonly startedTasks = new WeakMap<vscode.TaskExecution, string>();
  private readonly startedShell = new WeakMap<vscode.TerminalShellExecution, string>();
  private readonly recent = new Map<string, number>();
  private recording = Promise.resolve();

  constructor(private readonly context: vscode.ExtensionContext) {
    context.subscriptions.push(
      this.diagnostics,
      this.changedEmitter,
      vscode.tasks.onDidStartTask((event) => this.startedTasks.set(event.execution, new Date().toISOString())),
      vscode.tasks.onDidEndTaskProcess((event) => {
        const folder = event.execution.task.scope && typeof event.execution.task.scope !== 'number'
          ? event.execution.task.scope : workspaceFolderFor();
        if (!folder) return;
        const name = event.execution.task.name;
        this.enqueueObservation(folder, {
          eventClass: classifyTask(name), source: 'vscode-task', name,
          exitCode: event.exitCode ?? null, startedAt: this.startedTasks.get(event.execution) ?? null,
          completedAt: new Date().toISOString(), details: { taskSource: event.execution.task.source },
        });
      }),
      vscode.window.onDidStartTerminalShellExecution((event) => this.startedShell.set(event.execution, new Date().toISOString())),
      vscode.window.onDidEndTerminalShellExecution((event) => {
        const command = event.execution.commandLine;
        output.debug(`Terminal execution ended: confidence=${command.confidence}, trusted=${command.isTrusted}, exit=${String(event.exitCode)}, command=${command.value.slice(0, 160)}`);
        const folder = event.execution.cwd ? vscode.workspace.getWorkspaceFolder(event.execution.cwd) : workspaceFolderFor();
        if (!folder) return;
        const eventClass = classifyTask(command.value);
        if (eventClass === 'task') return;
        this.enqueueObservation(folder, {
          eventClass, source: 'vscode-terminal', name: command.value.slice(0, 512),
          exitCode: event.exitCode ?? null, startedAt: this.startedShell.get(event.execution) ?? null,
          completedAt: new Date().toISOString(),
          details: {
            confidence: command.confidence === vscode.TerminalShellExecutionCommandLineConfidence.High ? 'high'
              : command.confidence === vscode.TerminalShellExecutionCommandLineConfidence.Medium ? 'medium' : 'low',
            trustedCommandLine: command.isTrusted,
            terminal: event.terminal.name,
          },
        });
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('govp')) void this.refreshDiagnostics();
      }),
      vscode.workspace.onDidCreateFiles(() => void this.refreshDiagnostics()),
      vscode.workspace.onDidDeleteFiles(() => void this.refreshDiagnostics()),
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (document.uri.path.endsWith('/.govp/policy.json')) void this.refreshDiagnostics();
      }),
    );
  }

  dispose(): void {
    this.diagnostics.dispose();
    this.changedEmitter.dispose();
  }

  private identitySecretKey(folder: vscode.WorkspaceFolder): string {
    const suffix = crypto.createHash('sha256').update(folder.uri.toString()).digest('hex');
    return `govp.local.identity.v1.${suffix}`;
  }

  async identity(folder: vscode.WorkspaceFolder): Promise<LocalIdentity> {
    const key = this.identitySecretKey(folder);
    const stored = await this.context.secrets.get(key);
    if (stored) return parseLocalIdentity(stored);
    const created = generateLocalIdentity();
    await this.context.secrets.store(key, JSON.stringify(created));
    const persisted = await this.context.secrets.get(key);
    if (!persisted) throw new Error('VS Code no confirmó la custodia de la identidad local.');
    return parseLocalIdentity(persisted);
  }

  async policy(folder: vscode.WorkspaceFolder): Promise<{ policy: WorkbenchPolicy; persisted: boolean }> {
    const uri = vscode.Uri.joinPath(folder.uri, '.govp', 'policy.json');
    try {
      return { policy: parsePolicy(await readJson(uri, 256 * 1024)), persisted: true };
    } catch (error) {
      if (isNotFound(error)) return { policy: defaultPolicy(projectId(folder)), persisted: false };
      throw error;
    }
  }

  async initialize(folder: vscode.WorkspaceFolder): Promise<void> {
    if (!vscode.workspace.isTrusted) throw new Error('Confía en el proyecto para preparar GOVP.');
    await this.identity(folder);
    const policyUri = vscode.Uri.joinPath(folder.uri, '.govp', 'policy.json');
    if (!(await exists(policyUri))) {
      const text = `${JSON.stringify(defaultPolicy(projectId(folder)), null, 2)}\n`;
      await atomicCreate(policyUri, encoder.encode(text));
    }
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(folder.uri, '.govp', 'receipts'));
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(folder.uri, '.govp', 'publication-queue'));
    await this.refreshDiagnostics();
  }

  private enqueueObservation(folder: vscode.WorkspaceFolder, observation: LocalObservation): void {
    if (!vscode.workspace.isTrusted || !configuration(folder).get<boolean>('observeLocalExecution', true)) return;
    // A VS Code task may also surface as a terminal-shell event. Treat both callbacks
    // for the same class/exit in this short window as one real execution.
    const dedupe = `${folder.uri.toString()}\0${observation.eventClass}\0${observation.exitCode}`;
    const now = Date.now();
    if (now - (this.recent.get(dedupe) ?? 0) < 2_500) return;
    this.recent.set(dedupe, now);
    for (const [key, timestamp] of this.recent) if (now - timestamp > 60_000) this.recent.delete(key);
    this.recording = this.recording.then(async () => {
      const { policy } = await this.policy(folder);
      if (!policy.observe.includes(observation.eventClass as Exclude<EventClass, 'manual'>)) return;
      await this.captureInternal(folder, observation);
    }).catch((error) => {
      output.error(`No se pudo registrar ${observation.eventClass}: ${String(error)}`);
      void vscode.window.showErrorMessage(`GOVP no pudo registrar la ejecución: ${errorMessage(error)}`);
    });
  }

  async captureManual(folder: vscode.WorkspaceFolder): Promise<vscode.Uri> {
    const name = await vscode.window.showInputBox({
      title: 'Crear evidencia local', prompt: '¿Qué trabajo terminado quieres justificar?',
      placeHolder: 'Revisión de configuración completada', validateInput: (value) => value.trim().length < 3 ? 'Escribe al menos 3 caracteres.' : null,
    });
    if (!name) throw new vscode.CancellationError();
    return this.capture(folder, {
      eventClass: 'manual', source: 'manual', name: name.trim(), exitCode: null,
      startedAt: null, completedAt: new Date().toISOString(), details: { declaredBy: 'human' },
    });
  }

  async capture(folder: vscode.WorkspaceFolder, observation: LocalObservation): Promise<vscode.Uri> {
    const run = this.recording.then(() => this.captureInternal(folder, observation));
    this.recording = run.then(() => undefined, () => undefined);
    return run;
  }

  private async latestReceipt(folder: vscode.WorkspaceFolder): Promise<{ receipt: LocalReceipt; digest: string } | null> {
    const dir = vscode.Uri.joinPath(folder.uri, '.govp', 'receipts');
    let entries: [string, vscode.FileType][];
    try { entries = await vscode.workspace.fs.readDirectory(dir); } catch (error) { if (isNotFound(error)) return null; throw error; }
    const files = entries.filter(([name, type]) => type === vscode.FileType.File && name.endsWith('.json')).map(([name]) => name);
    if (files.length > 1000) throw new Error('La carpeta local supera 1000 recibos; archiva y publica antes de continuar.');
    const expectedKeyId = (await this.identity(folder)).keyId;
    let latest: LocalReceipt | null = null;
    for (const file of files) {
      const checked = await verifyLocalReceipt(await readJson(vscode.Uri.joinPath(dir, file)), expectedKeyId);
      if (!checked.result.ok) throw new Error(`El recibo ${file} no es íntegro; no se ampliará la cadena.`);
      if (!latest || compareUtf8(`${checked.receipt.created_at}\0${String(checked.receipt.envelope.id)}`, `${latest.created_at}\0${String(latest.envelope.id)}`) > 0) latest = checked.receipt;
    }
    return latest ? { receipt: latest, digest: receiptDigest(latest) } : null;
  }

  private async captureInternal(folder: vscode.WorkspaceFolder, observation: LocalObservation): Promise<vscode.Uri> {
    if (!vscode.workspace.isTrusted) throw new Error('La captura está desactivada en proyectos no confiables.');
    const [{ policy }, identity, domain, previous] = await Promise.all([
      this.policy(folder), this.identity(folder), resolveDomain(folder), this.latestReceipt(folder),
    ]);
    const receipt = await createLocalReceipt(observation, identity, {
      domain, previousReceipt: previous ? { id: String(previous.receipt.envelope.id), digest: previous.digest } : null,
    });
    const preflight = await verifyLocalReceipt(receipt);
    if (!preflight.result.ok) throw new Error('El recibo no superó la verificación previa al guardado.');
    const id = safeArtifactPath(String(receipt.envelope.id));
    const receiptUri = vscode.Uri.joinPath(folder.uri, '.govp', 'receipts', `${id}.json`);
    await atomicCreate(receiptUri, encoder.encode(`${JSON.stringify(receipt, null, 2)}\n`));
    const persisted = await verifyLocalReceipt(await readJson(receiptUri));
    if (!persisted.result.ok || receiptDigest(persisted.receipt) !== receiptDigest(receipt)) {
      try { await vscode.workspace.fs.delete(receiptUri); } catch { /* Keep the failure visible if deletion fails. */ }
      throw new Error('La comprobación posterior al guardado no coincide.');
    }
    if (domain && policy.publication.enqueue) {
      const item = queueItem(receipt, path.posix.relative(folder.uri.path, receiptUri.path), domain, policy.publication.disposition);
      const queueUri = vscode.Uri.joinPath(folder.uri, '.govp', 'publication-queue', `${id}.json`);
      await atomicCreate(queueUri, encoder.encode(`${JSON.stringify(item, null, 2)}\n`));
    }
    output.info(`Receipt ${id} verified and persisted (${receipt.verdict.label}).`);
    await this.refreshDiagnostics();
    return receiptUri;
  }

  async status(folder: vscode.WorkspaceFolder | null = workspaceFolderFor()): Promise<LocalStatus> {
    if (!folder) return { folder: null, ready: false, policyPersisted: false, policy: null, domain: null, receiptCount: 0, queueCount: 0, missing: [], lastReceipt: null, warnings: ['Abre una carpeta para usar GOVP.'] };
    const warnings: string[] = [];
    let policy: WorkbenchPolicy | null = null;
    let policyPersisted = false;
    try {
      const loaded = await this.policy(folder);
      policy = loaded.policy;
      policyPersisted = loaded.persisted;
    } catch (error) { warnings.push(errorMessage(error)); }
    let domain: string | null = null;
    try { domain = await resolveDomain(folder); } catch (error) { warnings.push(errorMessage(error)); }
    const receipts = await this.scanReceipts(folder, warnings);
    const receiptClasses = new Set<EventClass>();
    for (const item of receipts) {
      const observation = Reflect.get(Reflect.get(item.receipt.envelope, 'payload') ?? {}, 'observation');
      const eventClass = observation && typeof observation === 'object' ? Reflect.get(observation, 'eventClass') : null;
      if (['task', 'test', 'build', 'release', 'manual'].includes(String(eventClass))) receiptClasses.add(eventClass as EventClass);
    }
    const missing = policy?.requiredReceipts.filter((item) => !receiptClasses.has(item)) ?? [];
    let queueCount = 0;
    try {
      queueCount = (await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(folder.uri, '.govp', 'publication-queue')))
        .filter(([name, type]) => type === vscode.FileType.File && name.endsWith('.json')).length;
    } catch (error) { if (!isNotFound(error)) warnings.push(errorMessage(error)); }
    return { folder, ready: vscode.workspace.isTrusted, policyPersisted, policy, domain, receiptCount: receipts.length, queueCount, missing, lastReceipt: receipts.at(-1)?.receipt ?? null, warnings };
  }

  private async scanReceipts(folder: vscode.WorkspaceFolder, warnings: string[]): Promise<Array<{ uri: vscode.Uri; receipt: LocalReceipt }>> {
    const dir = vscode.Uri.joinPath(folder.uri, '.govp', 'receipts');
    let entries: [string, vscode.FileType][];
    try { entries = await vscode.workspace.fs.readDirectory(dir); } catch (error) { if (isNotFound(error)) return []; throw error; }
    const names = entries.filter(([name, type]) => type === vscode.FileType.File && name.endsWith('.json')).map(([name]) => name).sort();
    if (names.length > 1000) { warnings.push('La carpeta local supera 1000 recibos; el gate no acepta una revisión parcial.'); return []; }
    const expectedKeyId = names.length && vscode.workspace.isTrusted ? (await this.identity(folder)).keyId : undefined;
    const result: Array<{ uri: vscode.Uri; receipt: LocalReceipt }> = [];
    for (const name of names) {
      const uri = vscode.Uri.joinPath(dir, name);
      try {
        const checked = await verifyLocalReceipt(await readJson(uri), expectedKeyId);
        if (!checked.result.ok) warnings.push(`${name}: ${checked.verdict.reasons.join(', ')}`);
        else result.push({ uri, receipt: checked.receipt });
      } catch (error) { warnings.push(`${name}: ${errorMessage(error)}`); }
    }
    const byId = new Map(result.map((entry) => [String(entry.receipt.envelope.id), entry.receipt]));
    for (const entry of result) {
      const references = entry.receipt.envelope.references;
      if (!Array.isArray(references)) { warnings.push(`${path.posix.basename(entry.uri.path)}: referencias inválidas`); continue; }
      for (const reference of references) {
        if (!reference || typeof reference !== 'object' || Reflect.get(reference, 'type') !== 'govp') continue;
        const previous = byId.get(String(Reflect.get(reference, 'id')));
        const expected = String(Reflect.get(reference, 'digest'));
        if (!previous) warnings.push(`${path.posix.basename(entry.uri.path)}: falta el recibo anterior ${String(Reflect.get(reference, 'id'))}`);
        else if (expected !== `sha256:${receiptDigest(previous)}`) warnings.push(`${path.posix.basename(entry.uri.path)}: la cadena anterior no coincide`);
      }
    }
    result.sort((left, right) => compareUtf8(left.receipt.created_at, right.receipt.created_at));
    return result;
  }

  async refreshDiagnostics(): Promise<void> {
    this.diagnostics.clear();
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      const status = await this.status(folder);
      const policyUri = vscode.Uri.joinPath(folder.uri, '.govp', 'policy.json');
      const diagnostics: vscode.Diagnostic[] = [];
      for (const missing of status.missing) {
        const diagnostic = new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), `Falta un recibo íntegro de ${missing}.`, vscode.DiagnosticSeverity.Warning);
        diagnostic.code = 'GOVP_RECEIPT_MISSING'; diagnostic.source = 'GOVP'; diagnostics.push(diagnostic);
      }
      for (const warning of status.warnings) {
        const diagnostic = new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), warning, vscode.DiagnosticSeverity.Error);
        diagnostic.code = 'GOVP_RECEIPT_INVALID'; diagnostic.source = 'GOVP'; diagnostics.push(diagnostic);
      }
      if (diagnostics.length) this.diagnostics.set(policyUri, diagnostics);
    }
    this.changedEmitter.fire();
  }
}

function mcpEndpoint(folder?: vscode.WorkspaceFolder | null): string | null {
  const raw = configuration(folder).get<string>('mcpEndpoint', '').trim();
  return raw ? checkedMcpEndpoint(raw) : null;
}

function safeMcpEndpoint(folder?: vscode.WorkspaceFolder | null): string | null {
  try { return mcpEndpoint(folder); } catch { return null; }
}

function providerNamespace(folder?: vscode.WorkspaceFolder | null): string {
  return configuration(folder).get<string>('mcpProviderNamespace', 'mcp_govp_aw');
}

async function invokeGovp<T>(logicalName: string, input: Record<string, unknown> = {}): Promise<T> {
  const endpoint = mcpEndpoint();
  if (!endpoint) throw new Error('Configura govp.mcpEndpoint para usar la capa remota opcional.');
  const name = findGovpToolName(vscode.lm.tools, logicalName, providerNamespace());
  if (!name) throw new Error(`El proveedor GOVP configurado no publica la herramienta ${logicalName}. No se usará otro proveedor como sustituto.`);
  const cancellation = new vscode.CancellationTokenSource();
  const timer = setTimeout(() => cancellation.cancel(), 30_000);
  try {
    output.info(`Invoking provider-bound tool ${name}.`);
    const result = await vscode.lm.invokeTool(name, { input, toolInvocationToken: undefined }, cancellation.token);
    return parseToolJson<T>(result.content);
  } finally { clearTimeout(timer); cancellation.dispose(); }
}

class RemoteWorkbench {
  state: RemoteState = { loading: false, connected: false, implementation: null, inventory: null, notice: 'MCP opcional sin conectar.', error: '' };
  constructor(private readonly changed: () => void) {}
  private update(value: Partial<RemoteState>): void { this.state = { ...this.state, ...value }; this.changed(); }
  private fail(error: unknown): void { this.update({ loading: false, error: errorMessage(error), notice: '' }); output.error(errorMessage(error)); }

  async connect(): Promise<void> {
    if (!mcpEndpoint()) {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'govp.mcpEndpoint');
      return;
    }
    if (findGovpToolName(vscode.lm.tools, 'get_implementation', providerNamespace())) { await this.refresh(); return; }
    this.update({ notice: 'Arranca GOVP Automatic Workbench en la lista MCP para autorizarlo.', error: '' });
    try { await vscode.commands.executeCommand('workbench.mcp.list'); }
    catch { await vscode.commands.executeCommand('workbench.action.showCommands'); }
  }

  async refresh(): Promise<void> {
    this.update({ loading: true, error: '', notice: 'Consultando la implantación…' });
    try {
      const implementation = parseImplementation(await invokeGovp<unknown>('get_implementation'));
      this.update({ loading: false, connected: true, implementation, inventory: null, notice: 'Implantación remota comprobada.' });
    } catch (error) { this.fail(error); }
  }

  async continueImplementation(): Promise<void> {
    if (!this.state.implementation) { await this.connect(); return; }
    const next = implementationNextAction(this.state.implementation.state);
    if (next.command === 'refresh') { await this.refresh(); return; }
    if (next.command === 'human-spec' || next.command === 'human-deployment') {
      await invokeGovp('request_approval', { gate: next.command === 'human-spec' ? 'specification' : 'deployment' });
      const url = partnerUrl(); if (url) await vscode.env.openExternal(url); else void vscode.window.showInformationMessage('La aprobación es humana. Configura govp.partnerUrl para abrir el canal.');
      return;
    }
    if (next.command === 'specify') { await invokeGovp('generate_specification'); await this.refresh(); return; }
    if (next.command === 'integrate') { await vscode.commands.executeCommand('govp.applyBundle'); return; }
    const url = partnerUrl(); if (url) await vscode.env.openExternal(url); else throw new Error('Configura govp.partnerUrl para revisar esta incidencia.');
  }

  async loadInventory(): Promise<ArtifactInventory> {
    const implementation = this.state.implementation;
    if (!implementation || implementation.state !== 'active_lab' || !implementation.artifactSetSha256) throw new Error('No existe un bundle activo y aprobado para integrar.');
    const inventory = parseArtifactInventory(await invokeGovp<unknown>('list_bundle_artifacts', { implementationId: implementation.id }), implementation.artifactSetSha256);
    this.update({ inventory }); return inventory;
  }

  async artifact(expected: ArtifactInventory['artifacts'][number]): Promise<ArtifactContent> {
    const implementation = this.state.implementation;
    if (!implementation) throw new Error('No hay implantación remota.');
    return verifyArtifactContent(expected, await invokeGovp<unknown>('get_bundle_artifact', {
      implementationId: implementation.id, artifactSetSha256: implementation.artifactSetSha256, path: expected.path,
    }));
  }
}

function partnerUrl(): vscode.Uri | null {
  const raw = configuration().get<string>('partnerUrl', '').trim();
  if (!raw) return null;
  return vscode.Uri.parse(checkedHttpsUrl(raw, 'La URL del canal de partners'));
}

async function assertNoSymlink(uri: vscode.Uri, root: vscode.Uri): Promise<void> {
  if (uri.scheme !== 'file' || root.scheme !== 'file') throw new Error('La integración automática solo admite carpetas locales.');
  const relative = path.relative(root.fsPath, uri.fsPath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('La ruta sale del proyecto.');
  let current = root;
  for (const segment of relative.split(path.sep)) {
    current = vscode.Uri.joinPath(current, segment);
    try {
      const stat = await vscode.workspace.fs.stat(current);
      if ((stat.type & vscode.FileType.SymbolicLink) !== 0) throw new Error(`No se integra sobre enlaces simbólicos: ${relative}`);
    } catch (error) { if (!isNotFound(error)) throw error; break; }
  }
}

async function preflightBundle(folder: vscode.WorkspaceFolder, remote: RemoteWorkbench): Promise<{ inventory: ArtifactInventory; artifacts: ArtifactContent[]; creates: ArtifactContent[]; identical: string[]; excluded: string[] }> {
  const inventory = await remote.loadInventory();
  const artifacts: ArtifactContent[] = [];
  for (const item of inventory.artifacts) artifacts.push(await remote.artifact(item));
  const creates: ArtifactContent[] = []; const identical: string[] = []; const excluded: string[] = [];
  for (const artifact of artifacts) {
    const reason = executablePathReason(artifact.path);
    if (reason) { excluded.push(`${artifact.path} (${reason})`); continue; }
    const target = vscode.Uri.joinPath(folder.uri, ...safeArtifactPath(artifact.path).split('/'));
    await assertNoSymlink(target, folder.uri);
    try {
      const current = await vscode.workspace.fs.readFile(target);
      const digest = crypto.createHash('sha256').update(current).digest('hex');
      if (digest !== artifact.sha256) throw new Error(`Conflicto: ${artifact.path} ya existe con otro contenido.`);
      identical.push(artifact.path);
    } catch (error) { if (isNotFound(error)) creates.push(artifact); else throw error; }
  }
  return { inventory, artifacts, creates, identical, excluded };
}

async function previewJson(value: unknown, title: string): Promise<void> {
  const document = await vscode.workspace.openTextDocument({ language: 'json', content: `${JSON.stringify(value, null, 2)}\n` });
  await vscode.window.showTextDocument(document, { preview: true, viewColumn: vscode.ViewColumn.Beside });
  output.info(`${title} opened read-only as an untitled preview.`);
}

class GovpView implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private status: LocalStatus | null = null;
  constructor(private readonly local: LocalWorkbench, readonly remote: RemoteWorkbench) {}
  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view; view.webview.options = { enableScripts: true };
    view.webview.onDidReceiveMessage((message: unknown) => {
      const command = message && typeof message === 'object' ? Reflect.get(message, 'command') : null;
      if (typeof command === 'string' && command.startsWith('govp.')) void vscode.commands.executeCommand(command);
    });
    void this.refresh();
  }
  async refresh(): Promise<void> { this.status = await this.local.status(); this.render(); }
  render(): void {
    if (!this.view) return;
    const status = this.status;
    const remote = this.remote.state;
    const token = nonce();
    const lastVerdict = status?.lastReceipt?.verdict;
    const mcpConfigured = Boolean(safeMcpEndpoint());
    const upsell = status?.receiptCount && !status.domain ? '<div class="notice">Tu evidencia es íntegra pero todavía no es atribuible a tu dominio.</div>' : '';
    this.view.webview.html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style nonce="${token}">
      :root{color-scheme:light dark}body{font-family:var(--vscode-font-family);padding:14px;color:var(--vscode-foreground)}h2{font-size:17px;margin:0 0 6px}h3{font-size:13px;margin:18px 0 8px}.muted{color:var(--vscode-descriptionForeground);font-size:12px;line-height:1.45}.card{border:1px solid var(--vscode-widget-border);border-radius:10px;padding:12px;margin:10px 0}.status{display:flex;gap:8px;align-items:center}.dot{width:9px;height:9px;border-radius:50%;background:var(--vscode-testing-iconPassed)}button{width:100%;border:0;border-radius:6px;padding:9px;margin-top:8px;background:var(--vscode-button-background);color:var(--vscode-button-foreground);cursor:pointer}button.secondary{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground)}.notice{border-left:3px solid var(--vscode-editorWarning-foreground);padding:7px 9px;margin-top:9px;font-size:12px}.error{color:var(--vscode-errorForeground);font-size:12px}.pill{display:inline-block;border:1px solid var(--vscode-widget-border);border-radius:99px;padding:3px 7px;margin:3px 3px 0 0;font-size:11px}</style></head><body>
      <h2>Evidencia del proyecto</h2><div class="muted">Funciona en este equipo. El canal remoto es opcional.</div>
      <div class="card"><div class="status"><span class="dot"></span><strong>${status?.folder ? 'Listo en este equipo' : 'Abre una carpeta'}</strong></div>
        <div class="muted">${status?.receiptCount ?? 0} recibos comprobados · ${status?.queueCount ?? 0} pendientes de publicación</div>
        ${lastVerdict ? `<div class="pill">${escapeHtml(lastVerdict.label)}</div><div class="muted">L0 ${lastVerdict.layers.L0 ? 'sí' : 'no'} · L1 ${lastVerdict.layers.L1 === null ? 'pendiente' : lastVerdict.layers.L1} · L2 ${lastVerdict.layers.L2 === null ? 'pendiente' : lastVerdict.layers.L2}</div>${lastVerdict.warnings.length ? `<div class="notice">Advertencias: ${escapeHtml(lastVerdict.warnings.join(', '))}</div>` : ''}` : ''}
        ${upsell}${status?.missing.length ? `<div class="notice">Falta evidencia de: ${escapeHtml(status.missing.join(', '))}</div>` : ''}
        ${status?.warnings.length ? `<div class="error">${escapeHtml(status.warnings.join(' · '))}</div>` : ''}
        <button data-command="govp.${status?.policyPersisted ? 'captureEvidence' : 'initializeLocal'}">${status?.policyPersisted ? 'Registrar trabajo terminado' : 'Preparar este proyecto'}</button>
        <button class="secondary" data-command="govp.showLocalStatus">Comprobar estado</button>
      </div>
      <h3>Implantación remota</h3><div class="card"><strong>${remote.implementation ? escapeHtml(implementationStateLabel(remote.implementation.state)) : mcpConfigured ? 'Preparada para conectar' : 'Opcional'}</strong>
        <div class="muted">${escapeHtml(remote.notice)}</div>${remote.implementation ? `<div class="muted">${escapeHtml(shortDigest(remote.implementation.artifactSetSha256))}</div>` : ''}${remote.error ? `<div class="error">${escapeHtml(remote.error)}</div>` : ''}
        <button class="secondary" data-command="govp.${remote.implementation ? 'continue' : 'connect'}">${remote.implementation ? escapeHtml(implementationNextAction(remote.implementation.state).label) : mcpConfigured ? 'Conectar GOVP' : 'Configurar MCP'}</button>
      </div>
      <script nonce="${token}">const vscode=acquireVsCodeApi();document.querySelectorAll('button[data-command]').forEach((button)=>button.addEventListener('click',()=>vscode.postMessage({command:button.dataset.command})));</script></body></html>`;
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof vscode.CancellationError) return 'Operación cancelada.';
  return error instanceof Error ? error.message : String(error);
}

async function commandGuard(action: () => Promise<void>): Promise<void> {
  try { await action(); } catch (error) { if (!(error instanceof vscode.CancellationError)) { output.error(errorMessage(error)); void vscode.window.showErrorMessage(errorMessage(error)); } }
}

export function activate(context: vscode.ExtensionContext): void {
  const local = new LocalWorkbench(context);
  let view!: GovpView;
  const remote = new RemoteWorkbench(() => view?.render());
  view = new GovpView(local, remote);
  context.subscriptions.push(output, local, vscode.window.registerWebviewViewProvider('govp.workspace', view));
  local.onDidChange(() => void view.refresh());
  const register = (name: string, callback: (...args: unknown[]) => Promise<void>) => context.subscriptions.push(vscode.commands.registerCommand(name, (...args) => commandGuard(() => callback(...args))));

  register('govp.initializeLocal', async () => { const folder = workspaceFolderFor(); if (!folder) throw new Error('Abre una carpeta.'); await local.initialize(folder); await view.refresh(); void vscode.window.showInformationMessage('GOVP está preparado en este proyecto.'); });
  register('govp.captureEvidence', async () => { const folder = workspaceFolderFor(); if (!folder) throw new Error('Abre una carpeta.'); const uri = await local.captureManual(folder); const checked = await verifyLocalReceipt(await readJson(uri)); void vscode.window.showInformationMessage(`${checked.verdict.label}. Recibo guardado después de comprobarlo.`); });
  register('govp.showLocalStatus', async () => { const status = await local.status(); await view.refresh(); if (!status.folder) throw new Error('Abre una carpeta.'); const message = `${status.receiptCount} recibos íntegros; ${status.queueCount} en cola; ${status.missing.length ? `faltan ${status.missing.join(', ')}` : 'gate local completo'}.`; void vscode.window.showInformationMessage(message); });
  register('govp.inspectQueue', async () => { const folder = workspaceFolderFor(); if (!folder) throw new Error('Abre una carpeta.'); const uri = vscode.Uri.joinPath(folder.uri, '.govp', 'publication-queue'); await vscode.commands.executeCommand('revealInExplorer', uri); });
  register('govp.verifyRecord', async (candidate?: unknown) => {
    let uri = candidate instanceof vscode.Uri ? candidate : vscode.window.activeTextEditor?.document.uri;
    if (!uri) { const picked = await vscode.window.showOpenDialog({ canSelectMany: false, filters: { 'Evidencia GOVP': ['json', 'govp', 'txt'] } }); uri = picked?.[0]; }
    if (!uri) throw new vscode.CancellationError();
    const bytes = await vscode.workspace.fs.readFile(uri);
    if (bytes.byteLength > 2 * 1024 * 1024) throw new Error('La evidencia supera 2 MiB.');
    const text = decoder.decode(bytes);
    let parsed: unknown = null;
    try { parsed = JSON.parse(text) as unknown; } catch { /* A GOVP L0 record is text, not JSON. */ }
    if (parsed && typeof parsed === 'object' && Reflect.get(parsed, 'schema') === 'org.govp.workbench-receipt/1') {
      const checked = await verifyLocalReceipt(parsed);
      const warnings = checked.verdict.warnings.length ? ` Advertencias: ${checked.verdict.warnings.join(', ')}.` : '';
      if (!checked.result.ok) throw new Error(`No íntegro: ${checked.verdict.reasons.join(', ')}.${warnings}`);
      void vscode.window.showInformationMessage(`${checked.verdict.label}. L1 y L2 siguen pendientes.${warnings}`);
      return;
    }
    const checked = await verifyText(text);
    const warnings = checked.warnings.length ? ` Advertencias: ${checked.warnings.join(', ')}.` : '';
    if (!checked.ok) {
      const failures = Object.entries(checked.checks).filter(([, value]) => value === false).map(([key]) => key);
      throw new Error(`No íntegro: ${failures.join(', ') || 'formato no reconocido'}.${warnings}`);
    }
    void vscode.window.showInformationMessage(`Íntegro (pendiente de L1). L2 sigue pendiente.${warnings}`);
  });
  register('govp.connect', () => remote.connect());
  register('govp.refresh', async () => { await remote.refresh(); await view.refresh(); });
  register('govp.continue', () => remote.continueImplementation());
  register('govp.runTests', async () => { await remote.refresh(); const tests = remote.state.implementation?.tests; if (!tests) throw new Error('La implantación no contiene resultados de pruebas ligados al bundle.'); await previewJson(tests, 'Pruebas remotas'); });
  register('govp.showArtifacts', async () => { const inventory = await remote.loadInventory(); const verified: Array<{ path: string; sha256: string; sizeBytes: number }> = []; for (const item of inventory.artifacts) { const artifact = await remote.artifact(item); verified.push({ path: artifact.path, sha256: artifact.sha256, sizeBytes: artifact.sizeBytes }); } await previewJson({ approvedArtifactSetSha256: inventory.artifactSetSha256, verified }, 'Bundle verificado'); });
  register('govp.applyBundle', async () => {
    const folder = workspaceFolderFor(); if (!folder) throw new Error('Abre una carpeta local.'); if (!vscode.workspace.isTrusted) throw new Error('Confía en el proyecto para integrar archivos.');
    const plan = await preflightBundle(folder, remote);
    await previewJson({ phase: 'preflight', approvedArtifactSetSha256: plan.inventory.artifactSetSha256, create: plan.creates.map((item) => item.path), identical: plan.identical, excludedExecutablePaths: plan.excluded }, 'Previsualización del bundle');
    const answer = await vscode.window.showWarningMessage(`Crear ${plan.creates.length} archivos del bundle ${shortDigest(plan.inventory.artifactSetSha256)}. No se sobrescribirá nada.`, { modal: true }, 'Aplicar exactamente este bundle');
    if (answer !== 'Aplicar exactamente este bundle') throw new vscode.CancellationError();
    const created: vscode.Uri[] = [];
    try {
      for (const artifact of plan.creates) {
        const target = vscode.Uri.joinPath(folder.uri, ...artifact.path.split('/')); await assertNoSymlink(target, folder.uri);
        await atomicCreate(target, encoder.encode(artifact.content)); created.push(target);
      }
    } catch (error) {
      for (const target of created.reverse()) try { await vscode.workspace.fs.delete(target); } catch { /* Report original failure. */ }
      throw new Error(`La integración se revirtió: ${errorMessage(error)}`);
    }
    void vscode.window.showInformationMessage(`${created.length} archivos creados y ${plan.identical.length} ya idénticos. ${plan.excluded.length} rutas ejecutables excluidas.`);
  });
  register('govp.compareWorkspace', async () => { const plan = await preflightBundle(workspaceFolderFor() ?? (() => { throw new Error('Abre una carpeta.'); })(), remote); await previewJson({ approvedArtifactSetSha256: plan.inventory.artifactSetSha256, toCreate: plan.creates.map((item) => item.path), identical: plan.identical, excluded: plan.excluded }, 'Comparación'); });
  register('govp.validateMapping', async () => {
    const folder = workspaceFolderFor(); if (!folder) throw new Error('Abre una carpeta.');
    const uri = vscode.Uri.joinPath(folder.uri, '.govp', 'source-mapping.json');
    const mapping = parseSourceMapping(await readJson(uri, 256 * 1024)); await previewJson(mapping, 'Mapeo permitido');
    const answer = await vscode.window.showInformationMessage('El mapeo cumple la lista permitida. ¿Validarlo también con el proveedor GOVP configurado?', { modal: true }, 'Validar con MCP');
    if (answer === 'Validar con MCP') await invokeGovp('validate_source_mapping', { mapping });
  });
  register('govp.openPartner', async () => { const url = partnerUrl(); if (!url) { await vscode.commands.executeCommand('workbench.action.openSettings', 'govp.partnerUrl'); return; } await vscode.env.openExternal(url); });

  const mcpDefinitionsChanged = new vscode.EventEmitter<void>();
  context.subscriptions.push(mcpDefinitionsChanged, vscode.workspace.onDidChangeConfiguration((event) => {
    if (!event.affectsConfiguration('govp.mcpEndpoint')) return;
    void vscode.commands.executeCommand('setContext', 'govp.mcpConfigured', Boolean(safeMcpEndpoint()));
    mcpDefinitionsChanged.fire();
  }), vscode.lm.registerMcpServerDefinitionProvider(MCP_PROVIDER_ID, {
    onDidChangeMcpServerDefinitions: mcpDefinitionsChanged.event,
    provideMcpServerDefinitions: async () => {
      const endpoint = safeMcpEndpoint();
      await vscode.commands.executeCommand('setContext', 'govp.mcpConfigured', Boolean(endpoint));
      // Keep this server label short and stable: VS Code derives the MCP tool namespace
      // from it and truncates long labels. This produces mcp_govp_aw_<tool>.
      return endpoint ? [new vscode.McpHttpServerDefinition('GOVP AW', vscode.Uri.parse(endpoint), {}, MCP_VERSION)] : [];
    },
  }));
  void vscode.commands.executeCommand('setContext', 'govp.mcpConfigured', Boolean(safeMcpEndpoint()));
  void local.refreshDiagnostics();
}

export function deactivate(): void {}
