# Requirements — Automated Software Supply Chain Vulnerability Patching Engine

## 1. Problem Statement
Modern applications depend heavily on open-source packages. When a CVE is discovered deep in a dependency tree, fixing it today requires manual triage, refactoring, and redeployment. Traditional tools (Dependabot, Renovate, basic SCA scanners) only issue warnings, creating a backlog of alerts that developers can't keep up with, while attackers weaponize new CVEs within hours.

## 2. Goals
- Automatically detect known vulnerabilities in a project's dependency tree.
- Filter out noise: only act on vulnerabilities that are actually exploitable in this codebase (reachable).
- Automatically generate a patch/backport for each real vulnerability.
- Prove the patch actually closes the vulnerability (not just "version bumped").
- Prove the patch does not break the public API / existing behavior.
- Open a verified, human-reviewable pull request with a full evidence report.
- Do all of the above fast enough to matter (minutes, not days).

## 3. Non-Goals (explicitly out of scope for this build)
- Supporting every language ecosystem (v1 targets ONE ecosystem only — npm or pip).
- Full nested/transitive dependency resolution to unlimited depth (v1 = direct + 1 level transitive).
- Production-grade static analysis / full type-checking for API compatibility (v1 = signature-level AST diff).
- Malicious package / typosquat / behavioral anomaly detection (roadmap item, not built).
- Auto-merge of PRs (a human must approve — this is a review-assist tool, not an autonomous merger).

## 4. User Stories & Acceptance Criteria

### US-1: Vulnerability Detection
As a developer, I want the system to scan my project's lockfile and tell me which dependencies have known CVEs.
- **Given** a project with a lockfile (package-lock.json / requirements.txt + hashes)
- **When** a scan is triggered
- **Then** the system returns a list of {package, version, CVE ID, severity, advisory source} using the OSV database.

### US-2: Reachability Filtering
As a developer, I want to know which of those CVEs are actually exploitable in my code, not just theoretically present.
- **Given** the list of flagged CVEs and the project's source code
- **When** reachability analysis runs
- **Then** each CVE is labeled REACHABLE or NOT REACHABLE, based on whether the vulnerable function is present in the call graph reachable from the app's entry points.
- **Then** only REACHABLE CVEs proceed to patch generation by default (NOT REACHABLE ones are listed but skipped).

### US-3: Patch Generation
As a developer, I want an automatically generated fix for each reachable CVE, not just "please update manually."
- **Given** a REACHABLE CVE with a known fixed version/commit
- **When** patch generation runs
- **Then** the system produces a minimal diff (version bump and/or backported code change) targeting only the vulnerable code.

### US-4: Exploit Verification (before/after proof)
As a reviewer, I want proof the patch actually fixes the vulnerability, not just a version number change.
- **Given** a generated patch and a proof-of-concept (PoC) exploit for the CVE
- **When** the PoC is run against the unpatched code
- **Then** it should demonstrate the vulnerability (fail-safe/exploit succeeds).
- **When** the PoC is run against the patched code
- **Then** it should show the exploit no longer succeeds.
- **Then** both results are captured and attached to the PR as evidence.

### US-5: API Compatibility Check
As a maintainer, I want assurance the patch doesn't silently break my code's public interface.
- **Given** the pre-patch and post-patch source of the dependency
- **When** the compatibility checker runs
- **Then** it extracts exported function/class signatures before and after
- **Then** it flags any removed, renamed, or signature-changed public symbol as a compatibility warning.

### US-6: Regression Testing
As a developer, I want confidence the patch doesn't break my own application.
- **Given** the project's existing test suite
- **When** tests are run against the patched dependency tree
- **Then** the system reports pass/fail and blocks PR creation (or flags it clearly) on failure.

### US-7: Self-Correction Loop
As a developer, I want the system to try to fix its own mistakes before giving up.
- **Given** a failed regression run after a patch attempt
- **When** the agent reviews the failure
- **Then** it attempts a refined patch, up to a fixed retry limit (e.g., 2 retries)
- **Then** it clearly reports if it could not resolve the issue automatically.

### US-8: Automated Pull Request
As a developer, I want a single, clear PR per fix (or per package version) with all evidence attached.
- **Given** a verified patch that passed regression tests
- **When** the PR is created
- **Then** it includes: CVE ID(s) addressed, reachability verdict, before/after exploit proof, API compatibility result, regression test result, and time-to-patch metric.
- **Given** multiple CVEs on the same package version
- **Then** they are merged into a single unified patch, not multiple conflicting PRs.

### US-9: Time-to-Patch Metric
As a judge/reviewer, I want to see how fast the pipeline responds relative to attacker timelines.
- **Given** a CVE with a known publish timestamp
- **When** the pipeline completes
- **Then** the system displays: detection time, patch generation time, verification time, PR-opened time, and total elapsed time.

## 5. Evaluation Metric Alignment
| Evaluation Metric (from problem statement) | Requirement(s) that satisfy it |
|---|---|
| Build success rate | US-3, US-6 |
| Zero regression errors | US-6, US-7 |
| Speed of generation post-CVE identification | US-9 |
| Depth of nested dependency resolution | US-1, US-2 (documented limit: direct + 1 transitive level) |

## 6. Non-Functional Requirements
- **Reliability:** pipeline must run end-to-end without manual intervention on the demo repo.
- **Transparency:** every automated decision (reachable/not, patch chosen, test result) must be shown, not hidden.
- **Safety:** no PR is auto-merged; a human approval step is always required.
- **Reproducibility:** the demo must be runnable multiple times with consistent results (deterministic seed repo).
- **Time budget:** entire pipeline run should complete in under 5 minutes for the demo repo, to keep the live demo tight.

## 7. Demo Scope (Concrete)
- **Ecosystem:** npm (or Python — pick one and commit).
- **Seed repo:** a small sample app maintained by the team with 5 deliberately vulnerable dependencies (2 reachable, 3 not reachable) sourced from real OSV advisories.
- **Out of scope for demo:** real-time monitoring/daemon mode — a single triggered run is sufficient.
