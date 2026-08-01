const { execSync } = require('child_process');
const fs = require('fs');

const RUN_STATE_PATH = (process.env.RUN_STATE_PATH || '../juice-shop-run_state.json');
const LOG_PATH = (process.env.LOG_PATH || '../juice-shop-pipeline.log');
const TEST_SCRIPT = 'test:server';
const TEST_TIMEOUT_MS = 120000;

function logPipeline(msg) {
    const logLine = `[${new Date().toISOString()}] regression-runner: ${msg}\n`;
    fs.appendFileSync(LOG_PATH, logLine);
    console.log(`regression-runner: ${msg}`);
}

function runTest(cwd, script) {
    try {
        const out = execSync(`npm run ${script}`, {
            cwd, encoding: 'utf8', stdio: ['pipe','pipe','pipe'], timeout: TEST_TIMEOUT_MS
        });
        return { pass: true, output: out, error: null };
    } catch(e) {
        let msg = (e.stdout || '') + '\n' + (e.stderr || '');
        if (e.code === 'ETIMEDOUT') msg = `Test suite timed out after ${TEST_TIMEOUT_MS/1000}s.\n` + msg;
        return { pass: false, output: msg, error: e.message };
    }
}

function extractFailures(output) {
    const failures = [];
    const lines = output.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        // Node test runner format: "not ok N - test name"
        if (/^not ok \d+/.test(trimmed)) failures.push(trimmed.replace(/^not ok \d+ - /, ''));
        // Also capture FAIL lines
        else if (trimmed.startsWith('FAIL ')) failures.push(trimmed);
        else if (trimmed.match(/^\d+ failing/)) failures.push(trimmed);
    }
    if (failures.length === 0) {
        const errLines = lines.filter(l => l.includes('Error:') || l.includes('AssertionError:'));
        if (errLines.length > 0) failures.push(...errLines.slice(0, 5).map(l => l.trim()));
    }
    return [...new Set(failures)];
}

function run() {
    logPipeline("started");
    logPipeline(`NOTE: Using '${TEST_SCRIPT}' (server unit tests only). Full 'npm test' excluded — it requires Cypress/e2e browser suite which exceeds timeout and is unrelated to patched backend packages. Deliberate scope decision.`);

    let runState = fs.existsSync(RUN_STATE_PATH) ? JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8')) : {};
    if (runState.regression && runState.regression.stage_failed === false && runState.regression.patched_pass !== undefined) {
        logPipeline("stage already completed. Skipping."); return;
    }

    // NOTE: We cannot run a pre-patch baseline since Juice Shop is patched in place.
    // baseline_pass is reported as null with explanation.
    logPipeline("NOTE: Pre-patch baseline unavailable (in-place patching, no snapshot preserved). Running post-patch test only.");
    logPipeline(`Running npm run ${TEST_SCRIPT}...`);

    const patchedResult = runTest((process.env.TARGET_DIR || __dirname), TEST_SCRIPT);
    logPipeline(`Test result: ${patchedResult.pass ? 'PASS' : 'FAIL'}`);

    const new_failures = patchedResult.pass ? [] : extractFailures(patchedResult.output);

    const regressionReport = {
        baseline_pass: null,
        baseline_note: "Not available — Juice Shop patched in-place, no pre-patch snapshot. Post-patch test result used as quality gate.",
        patched_pass: patchedResult.pass,
        test_script_used: TEST_SCRIPT,
        scope_note: "Server unit tests only (test/server/**/*.unit.test.ts). Cypress e2e excluded deliberately — unrelated to patched packages, exceeds timeout.",
        new_failures: new_failures.slice(0, 20), // cap at 20 for readability
        stage_failed: false, error: ""
    };

    fs.writeFileSync('regression_report.json', JSON.stringify(regressionReport, null, 2));
    runState = fs.existsSync(RUN_STATE_PATH) ? JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8')) : {};
    runState.regression = regressionReport;
    runState.timestamps = runState.timestamps || {};
    runState.timestamps.regression_completed_at = new Date().toISOString();
    fs.writeFileSync(RUN_STATE_PATH, JSON.stringify(runState, null, 2));
    logPipeline(`complete. patched_pass=${patchedResult.pass}, failures=${new_failures.length}`);
}

try { run(); } catch(err) {
    logPipeline(`stage failed: ${err.message}`);
    let rs = fs.existsSync(RUN_STATE_PATH) ? JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8')) : {};
    rs.regression = { stage_failed: true, error: err.message };
    fs.writeFileSync(RUN_STATE_PATH, JSON.stringify(rs, null, 2));
    process.exit(0);
}

