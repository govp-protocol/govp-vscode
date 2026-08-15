# Data-flow and privacy inventory — 0.4.0

This inventory is the release gate for changes involving data. It describes the extension itself, not independently operated services.

| Flow | Trigger | Data | Destination | Default | Control / deletion |
| --- | --- | --- | --- | --- | --- |
| Local identity | First project initialization | Ed25519 private/public key, key ID, creation time | VS Code `SecretStorage` | On initialization | Forget command; allowed only after local receipts and queue are cleared |
| Identity disable marker | Forget-identity command | Hash-derived workspace key and boolean | VS Code extension `workspaceState` | Off | Cleared by Prepare this project; prevents silent key recreation |
| Policy | Initialization | Project ID, required receipt classes, observation policy | `.govp/policy.json` | On initialization | User-editable and deletable |
| Automatic receipt | Completed VS Code task or shell execution after explicit project preparation | Command/task name, source, terminal, times, exit status, confidence, hashes, signature, public key | `.govp/receipts/` | Enabled only after initialization in trusted workspaces | Disable `govp.observeLocalExecution`; delete/archive files |
| Manual receipt | Explicit user command | User-entered description, time, hashes, signature, public key | `.govp/receipts/` | User initiated | Cancel before creation; delete/archive files |
| Publication queue | Receipt creation with a resolved domain | Receipt path/digest, domain, canonical, disposition, timestamps | `.govp/publication-queue/` | Local only | Delete/archive files; separate publisher governs transmission |
| File verification | Explicit user command | Selected file bytes up to enforced limit | Extension-host memory | User initiated | No extension retention |
| MCP discovery/auth | User configures endpoint and connects | Endpoint; connection/account metadata handled by VS Code | Configured MCP, identity provider, Microsoft/VS Code | Off | Clear settings and provider authorization |
| MCP tool invocation | Explicit or workflow action after configuration | Implementation IDs, tool arguments, mapping or bundle request | Configured provider namespace | Off | Provider policy applies; extension does not retain OAuth token |
| Partner website | Explicit open action | Normal browser request data | Configured HTTPS URL | Off | Browser/site controls apply |
| Output log | Operational events/errors | Status, provider-bound tool name, receipt ID/digest state; no command text by design | Local VS Code output channel | Local | Clear VS Code output/session |
| Telemetry | None | None | None | Absent | Adding telemetry blocks release pending review |

## Sensitive-data rules

- URLs reject credentials and non-HTTPS transport.
- The domain private key is never requested or stored.
- OAuth tokens remain under VS Code's authentication handling.
- Command text is evidence content and may be sensitive; it is bounded and not duplicated into the output log.
- Bundle paths are allowlisted by behavior and deny executable or control-plane locations.
- No remote endpoint, account or partner URL ships as a default.

## Change gate

Any new destination, data category, identifier, telemetry event, default endpoint, retention behavior or third-party SDK requires updates to this file, `PRIVACY.md`, the threat model and tests before release.
