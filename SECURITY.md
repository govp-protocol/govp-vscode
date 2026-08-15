# Security policy

## Supported releases

| Release line | Status |
| --- | --- |
| 0.4.x | Supported release candidate |
| 0.3.x | Internal predecessor; security fixes only until 0.4.0 is published |
| Earlier | Unsupported |

Security support for the public 0.4.x line is planned for at least 12 months after its first Marketplace publication. Any change to that period will be announced in advance in `SUPPORT.md`.

## Private reporting

Report a vulnerability through the private **Security** tab of `govp-protocol/govp-vscode`. Do not open a public issue containing secrets, private keys, tokens, personal data or a working exploit. If GitHub private reporting is unavailable, contact research@gemacode.org with the subject `PRIVATE SECURITY REPORT` and request an encrypted reporting channel before sending sensitive material.

Include the extension and VS Code versions, operating system, minimal reproduction steps, expected impact and the SHA-256 digest of the affected VSIX or artifact. Never include a private signing key or OAuth token.

## Response process

The maintainers will acknowledge a report, triage impact, preserve relevant evidence, coordinate a fix and agree on disclosure timing with the reporter. Actively exploited vulnerabilities and severe incidents are escalated immediately to the incident owner for assessment under applicable notification duties, including the EU Cyber Resilience Act where it applies.

Security advisories, fixed versions and mitigations will be published through GitHub Security Advisories and release notes when disclosure is safe. Acknowledgement does not mean the report is confirmed or that a statutory deadline applies.

## Security properties and limits

The domain private key never enters the extension. The local Ed25519 private key resides in VS Code `SecretStorage`. Remote settings are empty by default. Bundle application is explicit, digest-bound, isolated, non-overwriting and fails closed on ambiguous paths or symlinks. See `docs/THREAT_MODEL.md`.

A compromised host, VS Code installation, extension host or configured remote provider remains outside the security boundary and can undermine these controls.
