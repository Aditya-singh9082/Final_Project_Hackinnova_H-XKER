# Automated Security Patch Engine

A deterministic, autonomous vulnerability remediation pipeline designed to aggressively reduce alert fatigue in software supply chains. Instead of just flagging vulnerabilities, this engine dynamically proves reachability, automatically patches the dependency, verifies the fix by running an active exploit, ensures API compatibility, runs regression tests, and drafts a complete Pull Request—all within seconds.

## ?? What We Are Doing
Modern development suffers from massive "Alert Fatigue" (e.g., 39 vulnerabilities flagged, but only 2 actually affect the running application). 

This engine solves that by taking a proactive, agentic approach to vulnerability management. It parses dependency trees against OSV (Open Source Vulnerability) databases, filters out unreachable noise via AST analysis, attempts automatic remediation (via version bumping or backporting), and then **actively attacks its own codebase** with live exploits to prove the patch works before opening a PR.

## ? Core Features
- **Deep Transitive Scanner (BFS)**: Uses a custom Breadth-First Search traversal algorithm directly on `package-lock.json` up to 3 levels deep to efficiently unearth buried vulnerabilities hidden by npm flattening, while actively ignoring non-production devDependencies.
- **Context-Aware Reachability Analysis**: Maps vulnerable functions directly against the application's Abstract Syntax Tree (AST). It goes beyond binary checks by specifically categorizing findings as **RUNTIME** risk or **BUILD_TIME** risk.
- **Auto-Patch Generation**: Deterministically selects the smallest, safest version bump to resolve a CVE, avoiding massive breaking changes.
- **Exploit Verification**: Runs real Proof of Concept (PoC) exploits against both the vulnerable and patched copies to definitively prove the vulnerability is mitigated (e.g., Prototype Pollution, ReDoS).
- **API Compatibility Check**: Compares AST signatures of patched dependencies to guarantee the fix hasn't altered the function signatures your app relies on.
- **Regression Testing**: Runs the application's test suite against the patched dependency tree to guarantee no breaking changes.
- **PR Composition**: Generates a complete, GitHub-ready Pull Request containing verifiable before/after exploit logs and precise time-to-patch metrics.
- **Automated Clone Manager**: Easily onboard remote repos! Provides a secure, sandboxed environment to dynamically clone, timeout, and configure external GitHub repositories on the fly.
- **Scheduled Monitoring Daemon**: An intelligent, recurring polling daemon that actively monitors lockfiles for new vulnerabilities, automatically triggering the remediation pipeline in the background.

## ?? Premium Dashboard Experience
The engine includes a beautifully designed, fully responsive React + Vite Dashboard leveraging a **glassmorphic** Deep Void and Cyber Violet aesthetic. 
- Fully wired to real API endpoints (no mock data).
- Real-time Pipeline Execution Timeline.
- Interactive Package Tabs (View ReDoS exploit timings, signature changes, and regression tests per package).
- Defense-in-Depth Educational Insights.

## ??? Pipeline Architecture

The pipeline executes completely deterministically without reliance on non-deterministic LLMs for the patching logic. The sequence runs as follows:

1. **`clone-manager.js`** *(optional)*: Securely clones external repositories and isolates them in a sandboxed `scanned-repos/` directory.
2. **`scanner.js`**: Parses the lockfile graph (up to 3 levels deep) and queries the OSV database for CVEs.
3. **`reachability.js`**: Analyzes the AST to map imports and context (`RUNTIME` vs `BUILD_TIME`), drastically reducing CVE noise.
4. **`patch-generator.js`**: Determines the optimal patch strategy (version bump or git diff backport) and applies it.
5. **`exploit-verifier.js`**: Executes malicious PoCs against both the vulnerable and patched codebases, capturing the exact mitigation proof.
6. **`compat-checker.js`**: Analyzes the AST of the dependency package before and after the patch to ensure exported signatures match.
7. **`regression-runner.js`**: Runs the existing test suite (`npm test`) on the newly patched codebase.
8. **`pr-composer.js`**: Aggregates all data and creates a comprehensive Markdown Pull Request body.
9. **`run-history-tracker.js`**: Appends the final outcome to an immutable audit ledger (`run_history.json`).

## ?? How to Run

### Prerequisites
- Node.js (v18+)
- npm

### 1. Running the Interactive Dashboard (Recommended)
The easiest way to experience the engine is via the Live Dashboard, which visually orchestrates the entire backend pipeline.

1. Open a terminal and navigate to the `dashboard` directory:
   ```bash
   cd dashboard
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Express API Orchestrator:
   ```bash
   node server.cjs
   ```
4. In a separate terminal, start the React frontend:
   ```bash
   npm run dev
   ```
5. Open your browser to `http://localhost:5173`. 
6. Use the **Scan Remote Repository** feature to test any URL, or just click **Re-run Pipeline** to see it analyze the default local seed repository in real-time.

### 2. Running Manually (CLI)
You can run the backend scripts manually to inspect the low-level outputs:

```bash
# 1. Reset the vulnerable repo
cd seed-repo-vulnerable
npm install

# 2. Run Scan & Reachability
node ../juice-shop-pipeline/scanner.js
node ../juice-shop-pipeline/reachability.js

# 3. Pass advisories to patched repo
cp advisories.json ../seed-repo-patched/advisories.json

# 4. Generate Patches
cd ../seed-repo-patched
npm install
node ../juice-shop-pipeline/patch-generator.js

# 5. Run Verification & Composer from Root
cd ..
node juice-shop-pipeline/exploit-verifier.js
node juice-shop-pipeline/compat-checker.js
node juice-shop-pipeline/regression-runner.js
node juice-shop-pipeline/pr-composer.js
```

All pipeline artifacts will be centrally stored and updated in `run_state.json` at the root of the project.
