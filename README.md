# GOVP Automatic Workbench

[Español](README.es.md) · [Deutsch](README.de.md)

Create and verify evidence of completed work inside Visual Studio Code. The local layer works without an account, network access, or MCP; remote integration is optional and has no default endpoint.

## First minute

1. Open a trusted local folder.
2. Open **GOVP → Evidence** and select **Prepare this project**.
3. Run a real task such as `npm test` or `npm run build`, or use **GOVP: Record completed work**.
4. Find the signed receipt in `.govp/receipts/` and use **GOVP: Verify local evidence** to check it again.

The local Ed25519 identity is generated on the device. Its private key is kept in VS Code `SecretStorage` and is never written to the project. Every receipt is checked before and after persistence.

## Meaning of a result

- `Integrity verified (L1 pending)`: local signature, hash, and content match. Domain attribution has not been published.
- `evidence_authentic`: L0 and L1 publication are confirmed; current L2 trust remains to be evaluated.
- `currently_trusted`: all three layers are confirmed for the evaluated context and time.
- `Not integral`: a cryptographic or content check failed.

The extension never collapses these states into a generic “GOVP valid” claim. A result is technical evidence, not legal certification or proof that a declared event was truthful.

## Domain and publication queue

Set `govp.domain` to an owned HTTPS origin such as `https://example.com`, or declare an HTTPS `homepage` in the project's `package.json`. Each new receipt is added to `.govp/publication-queue/` with its domain, canonical reference, and digest.

The extension does not publish the queue and never receives the domain private key. A separately authorized publisher may consume it. Without a domain, local evidence remains available but is not yet attributable to an owned domain.

## Optional MCP

Set `govp.mcpEndpoint` to an HTTPS endpoint ending exactly in `/mcp`. The provider must expose tools bound to `govp.mcpProviderNamespace`; a same-named tool from another provider is rejected.

VS Code performs OAuth discovery and authorization when required. The extension does not read or retain the token. Bundle integration is two-phase: it downloads and verifies the complete inventory against the approved digest, shows a preview, and asks for human confirmation. It then creates files only in an isolated digest-bound directory. It does not overwrite files, follow symlinks, register tasks, or run scripts automatically.

## Deliberate limits

- VS Code does not expose a global event for tests started by other extensions. The Workbench observes completed tasks and commands reported by shell integration, preserving source and confidence without promoting them to L1 attribution.
- L1 and L2 require a domain publisher/verifier and are never inferred locally.
- MCP does not replace human approval and cannot authorize production mutation.
- Command lines can contain sensitive content. Disable `govp.observeLocalExecution` when automatic local evidence is unsuitable.

## Trust, privacy, and support

The extension has no telemetry and no configured remote destination by default. Read the [privacy notice](PRIVACY.md), [terms](TERMS.md), [security policy](SECURITY.md), [support lifecycle](SUPPORT.md), [Apache-2.0 licence](LICENSE), and [third-party notices](THIRD_PARTY_NOTICES.md) before deployment.

Source, schemas, conformance vectors, SBOM, threat model and release controls are included in the public repository. Official package identity: `gemacode.govp-partner-workbench`.
