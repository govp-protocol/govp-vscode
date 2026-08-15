# Release evidence — GOVP Automatic Workbench 0.4.0

Generated: 15 August 2026
Artifact: `output/govp-partner-workbench-0.4.0.vsix`
VSIX SHA-256: `e8cf20338a7285bd62c9c2a3c77e202e085b9170da34f0ff82488efa075dcc80`
VSIX size: 112323 bytes
Payload entries: 43
Payload-manifest SHA-256: `f3bef96ac85f219c69303943441e889f7481a710a676a607f5bf985105771edd`

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
- Final privacy, terms, trademark and conservative interim CRA treatment: approved by an authorized Brilyetz administrator
- Incident owner: Eneko Serna; backup: Beatriz Pardiñas
- Spanish UI capture reviewed; English/German media and native Windows/Linux interactive validation explicitly accepted as deferred residual risk
- Entra workload identity: pipeline-scoped, protected by the `vscode-marketplace` approval environment and registered as a Marketplace contributor
- Marketplace ownership and company administrator account `eneko@brilyetz.com`: confirmed
- Public Marketplace lookup: `gemacode.govp-partner-workbench` was not published at audit time

## Non-blocking follow-up

- Add a distinct second human Marketplace owner; the supplied backup account is the existing owner account
- Capture English and German listing media and perform native interactive clean-profile validation on Windows and Linux
- Complete the CRA Article 14 reporting exercise before 11 September 2026 and obtain independent counsel review before full CRA application
- Microsoft verified-publisher domain review (submitted; not a package-integrity gate)

This evidence does not constitute legal advice, regulatory conformity, Marketplace approval or a declaration of conformity.
