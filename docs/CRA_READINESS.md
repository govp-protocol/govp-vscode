# EU Cyber Resilience Act readiness record

Assessment date: 15 August 2026  
Owner: Brilyetz, S.L.  
Status: 0.4.0 interim release decision approved; independent counsel review retained as a follow-up before full CRA application

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

## Interim scope decision for 0.4.0

On 15 August 2026 an authorized Brilyetz administrator approved a conservative interim treatment for the Marketplace release: Brilyetz will operate as the manufacturer of the extension and will not rely on the non-commercial free and open-source exclusion. This accounts for distribution under the Gemacode name and the possible relationship with optional GOVP, partner or hosted services.

On the current intended purpose and feature inventory, 0.4.0 is provisionally treated as a default product with digital elements rather than an important or critical product. Independent counsel must reassess the economic-operator role, product class and conformity route before the CRA's main obligations apply, and earlier if monetisation, remote processing, security-sensitive functionality or the distribution model changes materially.

No CE marking or declaration of conformity is made for this release. The Article 14 reporting preparation remains scheduled before 11 September 2026.

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

- [x] Authorized administrator approves conservative manufacturer treatment for the 0.4.0 interim release; independent counsel follow-up retained.
- [x] Provisional default-product class recorded for 0.4.0; reassessment trigger documented.
- [x] Intended purpose and foreseeable misuse approved.
- [x] Support period and security contact operationally assigned to Eneko Serna with Beatriz Pardiñas as backup.
- [x] Incident owner and backup named internally.
- [ ] The ENISA/CSIRT reporting procedure is tested before 11 September 2026 if Article 14 applies.
- [x] Technical documentation retention and version archive assigned to the incident owner, with the backup able to assume custody.
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
