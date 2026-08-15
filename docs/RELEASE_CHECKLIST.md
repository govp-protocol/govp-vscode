# Public release checklist — 0.4.0

## Ownership and legal

- [x] Brilyetz, S.L. identified in NOTICE, privacy notice and terms
- [x] Apache-2.0 and third-party notices included
- [x] Trademark use separated from the software licence
- [x] Privacy, terms and support drafts available in English, Spanish and German
- [x] Corporate authority and contributor rights confirmed by an authorized representative
- [ ] Legal review approves final privacy/terms text and CRA classification

## Product and security

- [x] Remote endpoints empty by default
- [x] No extension telemetry
- [x] Command text excluded from output logging
- [x] Production dependency pinned
- [x] Threat model and data-flow inventory documented
- [x] SBOM generated during the release gate
- [x] Private vulnerability path and supported release line documented
- [x] Clean-profile VSIX installation validated on VS Code 1.132.0, macOS arm64
- [ ] Interactive UI workflow and screenshots approved in English, Spanish and German
- [ ] Clean-profile installation and workflow validated on Windows and Linux
- [ ] Incident owner and backup named in the private operations record

## Marketplace

- [x] Public repository and issue URL resolve
- [x] Publisher and extension identifiers fixed in the package audit
- [x] 512×512 PNG icon available
- [x] English default plus Spanish and German manifest localizations
- [x] English default plus Spanish and German runtime bundles validated (147 messages)
- [x] Publishing workflow no longer pins an obsolete package version
- [ ] `gemacode` publisher ownership and company administrators confirmed
- [x] Public lookup confirms `gemacode.govp-partner-workbench` is not already published
- [x] Entra workload identity service connection configured with pipeline-specific access and a protected environment
- [ ] Marketplace listing screenshots and descriptions approved
- [ ] 0.4.0 VSIX uploaded only after all blocking boxes above are checked

Unchecked items are intentional external or human gates. They must not be silently treated as complete by CI.
