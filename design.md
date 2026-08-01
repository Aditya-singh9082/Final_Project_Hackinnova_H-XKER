# Design — Automated Software Supply Chain Vulnerability Patching Engine

## 1. High-Level Architecture

```
┌─────────────┐   ┌───────────────┐   ┌──────────────────┐   ┌───────────────────┐
│  Scanner    │──▶│ Reachability  │──▶│ Patch Generator   │──▶│ Exploit Verifier   │
│ (OSV + lock)│   │ Filter        │   │ (LLM-backed)      │   │ (PoC before/after) │
└─────────────┘   └───────────────┘   └──────────────────┘   └───────────────────┘
                                                                        │
                                                                        ▼
┌───────────────────┐   ┌────────────────┐   ┌───────────────────┐
│ Regression Runner  │──▶│ Self-Correction│──▶│ PR Composer +     │
│ (test suite)       │   │ Loop (retry)   │   │ Report Generator  │
└───────────────────┘   └────────────────┘   └───────────────────┘
```

Orchestration: a single Python (or Node) script/CLI drives the pipeline stage by stage, persisting intermediate state to a local JSON "run report" so each stage is independently inspectable and the final PR/report can pull from it.

## 2. Components

### 2.1 Scanner
- **Input:** project lockfile (`package-lock.json` or `requirements.txt` + hashes).
- **Process:** parse lockfile → list of {package, version}. Query OSV API (`https://api.osv.dev/v1/query`) per package/version, batched.
- **Output:** `advisories.json` — [{package, version, cve_id, severity, fixed_version, affected_range, source: "OSV"}]
- **Depth handling:** resolve direct dependencies fully; for transitive, walk one level via the lockfile's dependency graph (already present in `package-lock.json`/`poetry.lock`) — do not recurse further.

### 2.2 Reachability Filter
- **Input:** `advisories.json` + project source tree.
- **Process (lightweight, not full DeepCode-style analysis):**
  - Build a simple import/call graph: for JS, parse `require`/`import` statements + a shallow AST walk to see if the specific vulnerable function/symbol (named in the advisory, when available) is referenced anywhere in the app's own source files (directly or via one hop through a direct dependency's public API).
  - For Python, use the `ast` module to build a similar shallow reference graph.
  - If the advisory doesn't name a specific function (common), fall back to: "is the vulnerable package imported and actually invoked (not just installed)?" as a coarser reachability signal.
- **Output:** `reachability.json` — [{cve_id, verdict: REACHABLE|NOT_REACHABLE, evidence: "called via X.js:42 -> lib.parse()"}]
- **Gate:** only REACHABLE items proceed by default; NOT_REACHABLE items are logged and shown in the report but skipped from patch generation (configurable override flag for demo purposes).

### 2.3 Patch Generator (LLM-backed)
- **Input:** REACHABLE advisory + the actual vulnerable dependency source (fetched from npm/PyPI registry or GitHub) + the fixed version's diff (from GitHub commit referenced in the OSV advisory, when available).
- **Process:**
  - If a clean upstream fix commit exists and applies cleanly to the installed version → prefer a minimal **backport** of that diff.
  - If no direct backport is possible (version drift too large) → prompt an LLM (Claude) with: the vulnerable code snippet, the advisory description, and the upstream fix as reference, asking for a minimal patch that fixes the vulnerability without altering unrelated behavior.
  - Multiple CVEs on the same package/version → collect all patches, then run a second LLM pass ("unify these N patches into a single non-conflicting diff, preserving all fixes") before proceeding.
- **Output:** `patch_<package>.diff` + `patch_manifest.json` (which CVEs it addresses).

### 2.4 Exploit Verifier (before/after proof)
- **Input:** patch + CVE ID.
- **Process:**
  - Fetch or synthesize a minimal PoC script for the CVE (from the OSV advisory references, GHSA, or a curated local PoC pack for the demo's seeded CVEs — for a hackathon, pre-package 2-3 real PoCs for the seed repo's known CVEs rather than trying to fetch/synthesize arbitrary ones live).
  - Run PoC against unpatched dependency → expect exploit success (captured as evidence).
  - Apply patch, run PoC again → expect exploit failure (captured as evidence).
- **Output:** `exploit_proof.json` — {cve_id, before: "exploit succeeded", after: "exploit blocked", logs: [...]}

### 2.5 API Compatibility Checker
- **Input:** pre-patch and post-patch source of the dependency.
- **Process:** extract exported symbols (function names + arg counts/types where available) via AST parsing (e.g., `ts-morph`/Babel AST for JS, `ast` module for Python). Diff the two symbol sets.
- **Output:** `compat_report.json` — {removed: [...], changed_signature: [...], added: [...], verdict: PASS|WARN}

### 2.6 Regression Runner
- **Input:** project's own test suite (npm test / pytest).
- **Process:** run tests with the unpatched tree (baseline pass/fail state captured first, in case the demo repo has pre-existing failures), then run with the patched tree.
- **Output:** `regression_report.json` — {baseline_pass, patched_pass, new_failures: [...]}

### 2.7 Self-Correction Loop
- **Trigger:** `regression_report.json` shows `new_failures`.
- **Process:** feed the failing test output + the patch diff back to the LLM: "this patch broke these tests, here's the failure output, produce a revised patch." Re-run verifier + regression. Max 2 retries, then stop and report failure clearly.

### 2.8 PR Composer + Report Generator
- **Input:** all prior stage outputs + timestamps collected throughout.
- **Process:** render a single Markdown PR body combining: CVE(s) fixed, reachability evidence, before/after exploit proof, compatibility verdict, regression result, and a time-to-patch table (detected_at, patch_generated_at, verified_at, pr_opened_at, total_elapsed).
- **Output:** opens a PR via GitHub API (or, if no repo write access in the hackathon environment, generates the PR body + diff locally and displays it in the demo UI as "ready to open").

## 3. Data Flow / State
All stages read/write to a single `run_state.json` so the pipeline is resumable and inspectable stage-by-stage — useful both for debugging during the hackathon and for the live demo (you can show the JSON growing at each stage).

## 4. Tech Stack (suggested)
- **Orchestration:** Python script (or Node if targeting npm ecosystem primarily) — plain functions/CLI, no need for a workflow framework given the time budget.
- **Vulnerability data:** OSV API (free, no key needed).
- **LLM:** Claude API for patch synthesis, patch unification, and self-correction reasoning.
- **AST/parsing:** `ast` (Python) or Babel/`ts-morph` (JS) for reachability + compatibility checks.
- **Sandbox execution:** run untrusted install/test steps in a disposable container or subprocess with a timeout — do not run patch/PoC code on the host machine unsandboxed.
- **PR creation:** GitHub REST API (`octokit` or `PyGithub`) against a demo repo you control.
- **Demo UI (optional, if time allows):** a simple HTML/React dashboard rendering `run_state.json` live — pipeline stages as a progress timeline, ending with the time-to-patch counter (this is a strong visual for judges).

## 5. Key Design Decisions & Rationale
- **Single ecosystem (npm or Python), not multi-language:** keeps AST tooling, registry APIs, and test runners consistent — avoids doubling the surface area in 24 hours.
- **Pre-packaged PoCs for the seed repo's CVEs, not live PoC synthesis:** live exploit synthesis for arbitrary CVEs is a research problem; curating 2-3 real PoCs for known, chosen CVEs keeps the "exploit verified" claim honest and demoable.
- **Reachability as a hard gate, not just a label:** this is what makes the "backlog" pain point tangible in the demo (e.g., "5 CVEs found, 2 reachable, 3 correctly ignored").
- **No auto-merge:** keeps the tool positioned as a trustworthy assistant, not a risky autonomous agent — an intentional scope and trust decision, and an easy question to have a good answer for if a judge asks about safety.

## 6. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| LLM-generated patch doesn't apply cleanly | Prefer backporting a real upstream diff first; only fall back to LLM synthesis when needed |
| Reachability analysis is too simplistic to be convincing | Keep the seed repo's examples clean/obvious (one clearly unreachable dep, e.g., a dev-only tool; one clearly reachable one, e.g., a parsing lib actually called in a request handler) |
| Live demo fails on stage N | Cache successful run outputs beforehand; be ready to show a recorded run alongside the live attempt |
| PR API access unavailable in venue network | Fall back to rendering the PR body + diff locally in the dashboard, framed as "PR ready to open" |
