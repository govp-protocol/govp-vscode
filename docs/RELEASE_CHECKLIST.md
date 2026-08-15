# Public release checklist — 0.4.0

## Ownership and legal

- [x] Brilyetz, S.L. identified in NOTICE, privacy notice and terms
- [x] Apache-2.0 and third-party notices included
- [x] Trademark use separated from the software licence
- [x] Privacy, terms and support drafts available in English, Spanish and German
- [x] Corporate authority and contributor rights confirmed by an authorized representative
- [x] Authorized Brilyetz administrator approves the final privacy/terms text and conservative interim CRA treatment for 0.4.0

## Product and security

- [x] Remote endpoints empty by default
- [x] No extension telemetry
- [x] Command text excluded from output logging
- [x] Production dependency pinned
- [x] Threat model and data-flow inventory documented
- [x] SBOM generated during the release gate
- [x] Private vulnerability path and supported release line documented
- [x] Clean-profile VSIX installation validated on VS Code 1.132.0, macOS arm64
- [x] Spanish interactive UI capture reviewed; authorized administrator accepts publication without waiting for English and German captures
- [x] Cross-platform CI passes on Windows and Linux; authorized administrator accepts the residual risk of deferring native interactive clean-profile validation
- [x] Incident owner Eneko Serna and backup Beatriz Pardiñas named in the private operations record

## Marketplace

- [x] Public repository and issue URL resolve
- [x] Publisher and extension identifiers fixed in the package audit
- [x] 512×512 PNG icon available
- [x] English default plus Spanish and German manifest localizations
- [x] English default plus Spanish and German runtime bundles validated (147 messages)
- [x] Publishing workflow no longer pins an obsolete package version
- [x] `gemacode` ownership and `eneko@brilyetz.com` company administrator confirmed; lack of a distinct backup owner accepted as a governance follow-up
- [x] Public lookup confirms `gemacode.govp-partner-workbench` is not already published
- [x] Entra workload identity service connection configured with pipeline-specific access and a protected environment
- [x] Marketplace descriptions and available Spanish screenshot approved; English and German captures explicitly deferred
- [x] 0.4.0 VSIX published by protected Azure Pipelines run 53 after all blocking decisions above were closed

Checked waiver items record an explicit authorized risk acceptance, not completion of the deferred interactive tests or media. Unchecked items must not be silently treated as complete by CI.
