# Privacy notice — GOVP Automatic Workbench

Effective date: 15 August 2026  
Status: approved for 0.4.0 Marketplace publication by an authorized Brilyetz administrator on 15 August 2026
Translations: [Español](PRIVACY.es.md) · [Deutsch](PRIVACY.de.md)

## Controller and contact

BRILYETZ SOCIEDAD LIMITADA (Brilyetz, S.L.), trading as Gemacode, NIF B22551485, C/ Autonomía 13, Principal Izquierda, 48012 Bilbao, Bizkaia, Spain, is responsible for any personal data it receives through its own support or optional hosted services. Contact: research@gemacode.org.

The local extension can be used without an account or a Gemacode service. Brilyetz does not receive data merely because the extension is installed or used locally.

## Local processing

When enabled, the extension processes information inside VS Code to create and verify evidence. This can include:

- workspace name and URI-derived identifiers;
- task names, task source, terminal name and command line reported by VS Code;
- execution time, exit status and command-confidence metadata;
- receipt identifiers, hashes, signatures and public signing keys;
- the configured project domain and publication-queue metadata; and
- files selected by the user for local verification.

Command lines and workspace content can contain personal data or secrets. Users must avoid placing credentials or unnecessary personal data in commands intended for evidence. The extension does not copy command text into its output log.

Receipts, policy and publication-queue entries are stored under `.govp/` in the workspace. The local Ed25519 private key is stored through VS Code `SecretStorage`, not in the workspace. The extension does not add telemetry or advertising identifiers.

## Network and third parties

All remote settings are empty by default. The local workflow does not require network access.

If the user configures an MCP endpoint, VS Code connects to that endpoint and may perform OAuth discovery and authorization. The extension invokes only tools bound to the configured provider namespace. VS Code, the MCP operator, the identity provider and the network operator may then process connection, account and request data under their own notices. The extension does not read or persist the OAuth token.

If the user opens a configured partner URL, it is opened externally and the destination operator receives ordinary web-request data. Publication-queue entries are not transmitted by this extension; a separately operated publisher may consume them under its own configuration and privacy notice.

Microsoft processes Marketplace installation and diagnostic data independently under Microsoft's terms and privacy documentation.

## Purposes and legal bases

Brilyetz processes support communications to answer requests and protect the service, based on performance of the requested service and legitimate interests in support and security. Optional hosted services must identify their purposes, legal bases, recipients, transfers and retention separately at the point of use. Consent will be requested only where consent is the applicable legal basis.

## Retention and deletion

Local workspace files remain until the user deletes them. The extension does not set a remote retention period for data it never receives. VS Code controls `SecretStorage`; users can remove the local identity with the extension's forget-identity command after first archiving or deleting local receipts and queue entries. A boolean disable marker remains in local VS Code workspace state to prevent silent key recreation; **Prepare this project** clears it. Support records are retained only for the period needed to resolve the request, meet legal obligations and defend claims.

## Rights and complaints

Where Brilyetz is the controller, individuals may request access, rectification, erasure, restriction, portability or objection, as applicable, through research@gemacode.org. They may also complain to the Spanish Data Protection Agency or their competent supervisory authority.

## Changes

Material changes will be recorded in the repository and release notes. A change that introduces remote collection or telemetry requires a new data-flow review and an updated notice before release.
