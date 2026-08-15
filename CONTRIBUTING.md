# Contributing

Contributions are welcome through `govp-protocol/govp-vscode`. By submitting a contribution, you represent that you have the right to provide it and agree that it is licensed under Apache License 2.0. Contributions made for an employer must be authorized by that employer.

## Development gate

1. Use the Node.js version declared by CI.
2. Run `npm ci`.
3. Run `npm run check`.
4. Describe security, privacy, compatibility and localization effects in the pull request.
5. Do not commit secrets, user data, generated receipts, VSIX files or unreviewed executable bundle paths.

Changes that add telemetry, a default remote endpoint, new data recipients, production mutation, credential handling, executable paths or weaker digest validation require an explicit security and privacy review. User-facing manifest strings must be supplied in English, Spanish and German.

Use private vulnerability reporting rather than a pull request for exploitable security flaws.
