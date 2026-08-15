# Vulnerability and incident response runbook

This runbook is operational preparation. Statutory reporting applies only after the legal scope and economic-operator role are confirmed.

## Intake and evidence

1. Receive reports through GitHub private vulnerability reporting or the security contact in `SECURITY.md`.
2. Create a restricted incident record with receipt time, reporter, affected versions, supplied digest and handling owner.
3. Remove secrets and personal data that are unnecessary for assessment; preserve originals under restricted access where evidence requires it.
4. Reproduce only in an isolated environment. Never run an untrusted proof of concept on production or a developer workstation.

## Triage

Determine whether the issue affects confidentiality, integrity, availability, authenticity, provider binding, signing keys, bundle isolation or update distribution. Record affected releases, attack prerequisites, exploitation evidence, user impact, mitigations and whether a third-party component or service is involved.

Immediately escalate suspected active exploitation, malicious code execution, signing-key compromise, Marketplace account compromise or a severe incident affecting sensitive or important data/functions.

## Conditional CRA clock

If counsel confirms that Article 14 of Regulation (EU) 2024/2847 applies to Brilyetz for this product:

- an actively exploited vulnerability or severe incident requires early warning without undue delay and no later than 24 hours after awareness;
- the follow-up vulnerability or incident notification is due without undue delay and no later than 72 hours after awareness;
- the vulnerability final report is due no later than 14 days after a corrective or mitigating measure becomes available; and
- the severe-incident final report is due within one month after the 72-hour incident notification.

The incident owner must use the ENISA single reporting platform and the designated coordinating CSIRT when operationally applicable. The current official source is [Article 14 and Article 71 of Regulation (EU) 2024/2847](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R2847). Article 14 applies from 11 September 2026, including to in-scope products placed on the market before full application of the Regulation.

## Remediation and release

Create the smallest safe fix; add a regression test; update the threat model, SBOM and affected-version matrix; build the VSIX through the immutable release gate; and document workarounds. Rotate publisher, signing or provider credentials when compromise is suspected. Coordinate disclosure with upstream maintainers without delaying a legally required notification.

## Closure

Archive the timeline, decisions, reports, notifications, affected hashes, fixed commit and VSIX, user communication and root-cause analysis. Track corrective actions to completion and update this runbook after exercises or real incidents.
