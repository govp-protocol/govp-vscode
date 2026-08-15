# Release and Marketplace process

## Immutable release gate

1. Update version, changelog, supported releases and embedded protocol version together.
2. Run `npm ci` and `npm run check` from a clean checkout.
3. Run `npm run package` twice from clean generated directories and compare unpacked payload inventories and file hashes. ZIP container bytes may differ because of timestamps; payloads must not.
4. Inspect `vsce ls --tree` and unpack the VSIX. Only manifest-listed runtime and policy files may be present.
5. Scan source, generated bundle and workflow for secrets and forbidden default endpoints.
6. Verify `SBOM.cdx.json`, third-party notices and production dependency versions.
7. Install the VSIX into a clean compatible VS Code profile and test trusted/untrusted workspaces, local initialization, capture, verification, disabled observation and optional MCP configuration.
8. Obtain release-owner, security and legal gates recorded in `docs/RELEASE_CHECKLIST.md`.

## Publisher controls

- Publisher ID: `gemacode`; legal owner: Brilyetz, S.L.
- Use a company-controlled Microsoft/Marketplace tenant with MFA and at least two accountable administrators.
- Use Microsoft Entra workload identity federation or managed identity for automated publishing; do not create a new long-lived global PAT.
- The publishing identity receives only the Marketplace publisher Contributor role.
- The pipeline accepts only an exact protected `vX.Y.Z` tag matching `package.json` and publishes the already audited VSIX.
- Marketplace removal is not a rollback strategy. Prefer unpublishing or a fixed update because deletion is irreversible.

## Listing contents

The public listing must link to the repository, issues, `PRIVACY.md`, `TERMS.md`, `SECURITY.md`, `SUPPORT.md`, licence and third-party notices. Claims must use the documented meanings of L0/L1/L2 and must not imply Microsoft endorsement, legal certification or production authorization.

English is the source listing language. Spanish and German descriptions must preserve the same claims and limitations.

## Post-publication

Verify Marketplace installation, version, publisher, links, icon, file inventory and SHA-256. Monitor security reports and dependency advisories. Archive the listing and release evidence. Start the six-month publisher-verification eligibility clock only after the first public release; the badge is not assumed or advertised in advance.
