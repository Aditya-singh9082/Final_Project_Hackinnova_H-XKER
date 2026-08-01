# Automated Security Patch Engine

A deterministic, autonomous vulnerability remediation pipeline designed to aggressively reduce alert fatigue in software supply chains. Instead of just flagging vulnerabilities, this engine dynamically proves reachability, automatically patches the dependency, verifies the fix by running an active exploit, ensures API compatibility, runs regression tests, and drafts a complete Pull Request—all within seconds.

## 🚀 What We Are Doing
Modern development suffers from massive "Alert Fatigue" (e.g., 39 vulnerabilities flagged, but only 2 actually affect the running application). 

This engine solves that by taking a proactive, agentic approach to vulnerability management. It parses dependency trees against OSV (Open Source Vulnerability) databases, filters out unreachable noise via AST analysis, attempts automatic remediation (via version bumping or AI-assisted backporting), and then **actively attacks its own codebase** with live exploits to prove the patch works before opening a PR.

## 🌟 Core Features & Cloud-Native Enhancements
- **100% Firebase Firestore Cloud Architecture**: Completely migrated from local disk storage (`run_history.json`, `.local_keys_*.json`) to **Firebase Firestore** (`users/{userId}` and `scan_history` collections). All user profiles, scan histories, Engine Efficacy metrics, and full JSON scan reports are securely stored in the cloud.
- **GitHub OAuth Authentication & Profile Sync (`AuthGate.jsx`)**: Seamless GitHub popup authentication with automatic Firestore profile sync (`/api/auth/sync-user`).
- **AES-256-GCM Encrypted API Key Management (`SettingsPanel.jsx` & `crypto-utils.cjs`)**: Users can securely store their Groq API key in Firestore encrypted with **AES-256-GCM** to enable **AI-Assisted Patch Generation** without ever saving plaintext keys to disk.
- **Deep Transitive Scanner (BFS)**: Uses a custom Breadth-First Search traversal algorithm directly on `package-lock.json` up to 3 levels deep to efficiently unearth buried vulnerabilities hidden by npm flattening, while actively ignoring non-production devDependencies.
- **Context-Aware Reachability Analysis**: Maps vulnerable functions directly against the application's Abstract Syntax Tree (AST). Categorizes findings as **RUNTIME** risk or **BUILD_TIME** risk.
- **Auto-Patch Generation (Deterministic & AI-Assisted)**: Deterministically selects the smallest, safest version bump to resolve a CVE, or leverages AI-assisted patch generation when configured.
- **Exploit Verification**: Runs real Proof of Concept (PoC) exploits against both vulnerable and patched copies to definitively prove mitigation (e.g., Prototype Pollution, ReDoS).
- **API Compatibility Check**: Compares AST signatures of patched dependencies to guarantee the fix hasn't altered the function signatures your app relies on.
- **Intelligent Regression Testing**: Runs the application's test suite (`npm test`) on the newly patched codebase. Automatically detects static HTML/CSS/JS or non-Node repositories without a `package.json` to prevent ENOENT crashes.
- **PR Composition & GitHub Publishing**: Generates a complete Markdown Pull Request body and allows 1-click PR publishing directly to GitHub via the dashboard (`PRPreview.jsx`).
- **GitHub Repository Picker & Multi-Protocol Clone Manager**: Select repositories directly from GitHub via `GitHubRepoPickerModal.jsx` or clone any public/private repository URL on the fly.
- **Live Cloud Scan History Panel (`ScanHistoryPanel.jsx`)**: View past repository scan outcomes, CVE summaries, and full JSON `run_state` reports from Firestore.

## 🎨 Premium Dashboard Experience
The engine includes a beautifully designed, fully responsive React + Vite Dashboard leveraging a **glassmorphic** Deep Void and Cyber Violet aesthetic.
- Fully wired to live backend API endpoints and Firebase Firestore (no mock data).
- Real-time Pipeline Execution Timeline with dynamic step animations.
- End-to-End **Total Time to Patch** live timer (`total_elapsed_ms`).
- Live **Engine Efficacy Metrics** (100% Clean Auto-Patch Rate & Safely-Handled Rate calculated from Firestore data).
- Interactive Package Tabs (View ReDoS exploit timings, signature changes, and regression tests per package).

## 🏗️ Pipeline Architecture

The pipeline executes deterministically with optional AI-assisted patch fallback. The sequence runs as follows:

1. **`clone-manager.js`** *(optional)*: Securely clones external repositories and isolates them in a sandboxed `scanned-repos/` directory.
2. **`scanner.js`**: Parses the lockfile graph (up to 3 levels deep) and queries the OSV database for CVEs.
3. **`reachability.js`**: Analyzes the AST to map imports and context (`RUNTIME` vs `BUILD_TIME`), drastically reducing CVE noise.
4. **`patch-generator.js`**: Determines the optimal patch strategy (version bump or AI-assisted backport) and applies it.
5. **`exploit-verifier.js`**: Executes malicious PoCs against both the vulnerable and patched codebases, capturing the exact mitigation proof.
6. **`compat-checker.js`**: Analyzes the AST of the dependency package before and after the patch to ensure exported signatures match.
7. **`regression-runner.js`**: Runs the existing test suite (`npm test`) on the newly patched codebase (automatically handling static/non-Node repos).
8. **`pr-composer.js`**: Aggregates all data and creates a comprehensive Markdown Pull Request body with exact `total_elapsed_ms` timestamps.
9. **Firebase Firestore Storage**: Writes the completed `run_state.json` and summary report directly to `scan_history/{scanId}` in Firestore.

## 🛠️ How to Run

### Prerequisites
- Node.js (v18+)
- npm
- A Firebase project with **Authentication (GitHub Provider)** and **Firestore Database** enabled.

### 1. Running the Interactive Dashboard (Recommended)

1. Open a terminal and navigate to the `dashboard` directory:
   ```bash
   cd dashboard
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `dashboard/.env`:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
4. Start the Express API Orchestrator:
   ```bash
   node server.cjs
   ```
5. In a separate terminal, start the React frontend:
   ```bash
   npm run dev
   ```
6. Open your browser to `http://localhost:5173`. 
7. Sign in with GitHub, configure your encrypted AI key (optional), and scan any GitHub repository!

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

All pipeline artifacts are centrally updated in `run_state.json` and saved directly to your cloud Firestore database.
