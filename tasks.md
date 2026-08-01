# Tasks — Automated Software Supply Chain Vulnerability Patching Engine

Format: checklist, grouped by pipeline stage, with a suggested 24-hour timeline. Each task should be small enough to complete and verify independently. Check items off as completed.

## Phase 0 — Setup (Hour 0–1)
- [ ] Choose ecosystem: npm or Python (commit to one, do not hedge).
- [ ] Create the seed demo repo: a small sample app with 5 dependencies, deliberately chosen so 2 have real, known, reachable CVEs and 3 have CVEs that exist but are not reachable (e.g., installed but unused, or only used in a dev/build script).
- [ ] Confirm OSV API access works against the seed repo's lockfile.
- [ ] Set up Claude API access for patch generation.
- [ ] Set up GitHub repo + token with PR-creation permissions for the demo repo (fallback: local PR body rendering if unavailable).
- [ ] Decide on `run_state.json` schema (fields for each stage's output) — write this down once, don't redesign mid-build.

## Phase 1 — Scanner (Hour 1–3)
- [ ] Parse the seed repo's lockfile into {package, version} list.
- [ ] Query OSV API per package/version; store results in `advisories.json`.
- [ ] Handle direct dependencies fully; resolve one level of transitive dependencies from the lockfile graph.
- [ ] Verify: scanner correctly reports all 5 seeded CVEs with correct severity and fixed-version info.

## Phase 2 — Reachability Filter (Hour 3–6)
- [ ] Build shallow import/call graph for the seed repo (JS: parse `require`/`import`; Python: use `ast`).
- [ ] For each advisory, check whether the vulnerable package/function is actually referenced in app code.
- [ ] Fallback rule: if advisory has no named function, reachability = "package is imported AND invoked somewhere" vs "installed but never imported."
- [ ] Output `reachability.json` with verdict + evidence string per CVE.
- [ ] Verify: exactly 2 of 5 seeded CVEs come back REACHABLE, matching how the seed repo was designed.

## Phase 3 — Patch Generator (Hour 6–10)
- [ ] For each REACHABLE CVE, fetch the upstream fix commit (from OSV advisory reference) if available.
- [ ] Attempt a direct backport/apply of that diff to the installed version.
- [ ] If backport fails cleanly, fall back to LLM-based patch synthesis: prompt Claude with vulnerable code + advisory description + upstream fix as reference, ask for a minimal targeted patch.
- [ ] If a package has multiple reachable CVEs, run a unification pass merging patches into one diff.
- [ ] Verify: patch diff applies cleanly to a fresh checkout of the seed repo's dependency tree.

## Phase 4 — Exploit Verifier (Hour 10–13)
- [ ] Curate real PoC scripts for the seed repo's 2 reachable CVEs ahead of time (do this research now, not live).
- [ ] Run each PoC against the unpatched dependency — confirm exploit succeeds; capture output.
- [ ] Apply the patch, run the PoC again — confirm exploit now fails; capture output.
- [ ] Output `exploit_proof.json` with before/after evidence.
- [ ] Verify: both PoCs show a clean before(succeeds)/after(blocked) transition — this is a core demo moment, test it thoroughly.

## Phase 5 — API Compatibility Checker (Hour 13–15)
- [ ] Extract exported symbols (function/class names + arg signatures) from pre-patch dependency source.
- [ ] Extract the same from post-patch source.
- [ ] Diff the two sets; flag removed/renamed/changed-signature symbols.
- [ ] Output `compat_report.json` with PASS/WARN verdict.
- [ ] Verify: for the seed repo's patches, verdict is PASS (design the seed CVEs so the real fix doesn't change public API, to keep the demo clean).

## Phase 6 — Regression Runner (Hour 15–17)
- [ ] Run the seed repo's existing test suite against the unpatched tree (baseline).
- [ ] Run the same suite against the patched tree.
- [ ] Output `regression_report.json` comparing baseline vs patched pass/fail.
- [ ] Verify: patched tree passes all baseline-passing tests.

## Phase 7 — Self-Correction Loop (Hour 17–19)
- [ ] Implement retry logic: if `regression_report.json` shows new failures, send failure output + patch back to Claude for a revised patch.
- [ ] Cap retries at 2; on final failure, produce a clear "could not auto-resolve" report instead of silently failing.
- [ ] Verify: intentionally break one patch to test the retry path fires and either fixes it or reports failure cleanly (don't skip testing the failure path).

## Phase 8 — PR Composer + Report (Hour 19–21)
- [ ] Render a single Markdown PR body per package version: CVEs addressed, reachability evidence, exploit proof (before/after), compatibility verdict, regression result, time-to-patch table.
- [ ] Open the PR via GitHub API against the demo repo (or render locally if API access is blocked on venue network).
- [ ] Verify: PR body reads clearly to someone with no context — this is what judges will actually read.

## Phase 9 — Dashboard / Demo UI (Hour 21–23, optional if time allows)
- [ ] Build a simple HTML/React view that reads `run_state.json` and renders the pipeline as a live timeline (scan → reachability → patch → verify → regress → PR).
- [ ] Add the time-to-patch counter as a prominent visual element.
- [ ] Verify: dashboard updates correctly on a full pipeline run, end to end.

## Phase 10 — Demo Rehearsal & Buffer (Hour 23–24)
- [ ] Do at least 2 full dry runs of the live demo, timed.
- [ ] Pre-cache one successful full run's outputs as a fallback if live run fails on stage.
- [ ] Prepare the 60-second narrative: problem → reachability filter cuts noise → patch generated → exploit proof shown → PR opened, with time-to-patch number front and center.
- [ ] Confirm fallback path (local PR rendering) works in case GitHub API is unreachable on venue wifi.

## Explicitly Deferred (do not attempt in 24h)
- [ ] Multi-ecosystem support.
- [ ] Full unlimited-depth transitive dependency resolution.
- [ ] Live/arbitrary PoC synthesis for CVEs not pre-selected.
- [ ] Malicious package / typosquat / behavioral anomaly detection.
- [ ] Auto-merge of PRs.
