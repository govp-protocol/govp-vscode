# Release evidence — GOVP Automatic Workbench 0.4.0

Generated: 15 August 2026  
Artifact: `output/govp-partner-workbench-0.4.0.vsix`  
VSIX SHA-256: `e881730d682c90e90e922ca9bcb569e7fd91e583c79e53204aab7ff891f90e2e`
VSIX size: 111707 bytes
Payload entries: 43  
Payload-manifest SHA-256: `2bf1c3a1eb7fba2d35cd6c5d8f4eadabf4539325060d3fc0aa2ecfb80e6c2512`

## Verified gates

- TypeScript typecheck: pass
- Unit tests: 15/15 pass
- Runtime localization: 147 English-source messages with complete Spanish and German bundles
- Manifest localization: English source with Spanish and German bundles
- Repository secret scan: pass
- Production dependency audit: 0 known vulnerabilities at audit time
- CycloneDX runtime SBOM: 3 components
- Package identity and safety audit: pass
- VSIX clean-profile installation: pass on VS Code 1.132.0, macOS arm64
- Azure Pipelines validation: pass on Linux, Windows and macOS; immutable package job pass
- GitHub Actions validation: pass
- Consecutive builds: extracted payloads byte-identical; ZIP container hashes can differ because VSIX ZIP metadata contains build timestamps
- Brilyetz representative authority and contributor rights: confirmed
- Entra workload identity: pipeline-scoped, protected by the `vscode-marketplace` approval environment and registered as a Marketplace contributor
- Public Marketplace lookup: `gemacode.govp-partner-workbench` was not published at audit time

## Human or external gates still open

- Legal approval of privacy, terms, trademark and CRA classification records
- Marketplace publisher ownership and company administrator/backup confirmation
- Interactive UI and screenshot approval in English, Spanish and German
- Clean-profile workflow validation on Windows and Linux
- Incident owner and backup assignment in the private operations record
- Marketplace descriptions and screenshots approval
- Microsoft verified-publisher domain review (submitted; not a package-integrity gate)

This evidence does not constitute legal advice, regulatory conformity, Marketplace approval or a declaration of conformity.
