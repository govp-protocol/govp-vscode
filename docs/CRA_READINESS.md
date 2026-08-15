# EU Cyber Resilience Act readiness record

Assessment date: 15 August 2026  
Owner: Brilyetz, S.L.  
Status: operational preparation complete; legal product classification and conformity decision pending

## Product record

- Product: GOVP Automatic Workbench for Visual Studio Code
- Release line: 0.4.x
- Distribution: source repository, VSIX and intended Visual Studio Marketplace listing
- Licence: Apache-2.0; marks governed separately
- Local mode: free, accountless and offline-capable
- Optional dependencies: user-configured MCP, OAuth provider and publisher workflow
- Security contact and process: `SECURITY.md`
- Support period: `SUPPORT.md`
- Component inventory: generated `SBOM.cdx.json`
- Threat model: `docs/THREAT_MODEL.md`

## Scope decision still requiring counsel

Counsel must record whether the extension is supplied in the course of a commercial activity and whether Brilyetz is a manufacturer, open-source software steward, or another economic operator for each distribution model. The decision must consider any link between the free extension and monetised GOVP, partner or hosted services. Open-source licensing alone is not treated as an automatic exemption.

No CE marking or declaration of conformity will be issued until that classification, the applicable product class and conformity-assessment route are documented.

## Controls already implemented

- Secure-by-default local mode with empty remote settings.
- No embedded credentials or domain private keys.
- Pinned production dependency and generated SBOM.
- Security-supported release line and private reporting channel.
- Digest binding, strict parsing, bounded inputs and fail-closed provider selection.
- Human approval before bundle application.
- Isolated, non-overwriting, rollback-capable writes with symlink and executable-path rejection.
- No generic certification claim; L0, L1 and L2 remain separate.
- CI gate for tests, dependency audit, package inventory and secret-sensitive package checks.

## Required pre-publication decisions

- [ ] Counsel signs the commercial-activity and economic-operator classification.
- [ ] Product class and conformity-assessment route are recorded if in scope.
- [ ] Intended purpose and foreseeable misuse are approved.
- [ ] Support period and security contact are operationally staffed.
- [ ] Incident owner and backup are named internally.
- [ ] The ENISA/CSIRT reporting procedure is tested before 11 September 2026 if Article 14 applies.
- [ ] Technical documentation retention and version archive are assigned.
- [ ] Marketplace publisher identity is held by the company and protected by MFA.

## Vulnerability and incident workflow

1. Preserve the report and acknowledge it through the private channel.
2. Determine affected versions, exploitability, severity and whether active exploitation or a severe incident is suspected.
3. Escalate immediately to the incident owner and legal assessor.
4. Apply the statutory reporting clock determined by counsel; do not wait for a complete fix before an initial report when reporting is required.
5. Produce mitigation, patched VSIX, advisory, SBOM delta and release evidence.
6. Notify users and authorities as required, then complete root-cause and corrective-action records.

## Evidence retained per release

Source commit, lockfile, CI logs, test results, dependency audit, SBOM, unpacked VSIX inventory, SHA-256 digest, Marketplace metadata, legal-document versions, supported-platform result and security-review decision must be archived together.

This file is an engineering readiness record, not a legal opinion or declaration of conformity.
