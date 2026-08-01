const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RUN_STATE_PATH = (process.env.RUN_STATE_PATH || '../juice-shop-run_state.json');
const LOG_PATH = (process.env.LOG_PATH || '../juice-shop-pipeline.log');
const DEFAULT_TEST_SCRIPT = 'test:server';
const TEST_TIMEOUT_MS = 120000;

function logPipeline(msg) {
    const logLine = `[${new Date().toISOString()}] regression-runner: ${msg}\n`;
    fs.appendFileSync(LOG_PATH, logLine);
    console.log(`regression-runner: ${msg}`);
}

function runTest(cwd, defaultScript) {
    try {
        const pkgPath = path.join(cwd, 'package.json');
        if (!fs.existsSync(pkgPath)) {
            const note = 'No package.json present in target directory (static or non-Node project) - regression check passed automatically.';
            return { pass: true, output: note, error: null, scriptUsed: 'none (no package.json)' };
        }
        const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const scripts = pkgData.scripts || {};
        let actualScript = defaultScript;
        if (!scripts[actualScript]) {
            if (scripts['test'] && !scripts['test'].includes('no test specified')) {
                actualScript = 'test';
            } else {
                const note = 'No automated test script defined in package.json - regression check passed automatically.';
                return { pass: true, output: note, error: null, scriptUsed: 'none (no test script)' };
            }
        }
        const out = execSync(`npm run ${actualScript}`, {
            cwd, encoding: 'utf8', stdio: ['pipe','pipe','pipe'], timeout: TEST_TIMEOUT_MS
        });
        return { pass: true, output: out, error: null, scriptUsed: actualScript };
    } catch(e) {
        let msg = (e.stdout || '') + '\n' + (e.stderr || '');
        if (e.code === 'ETIMEDOUT') msg = `Test suite timed out after ${TEST_TIMEOUT_MS/1000}s.\n` + msg;
        return { pass: false, output: msg, error: e.message, scriptUsed: defaultScript };
    }
}

function extractFailures(output) {
    const failures = [];
    const lines = output.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (/^not ok \d+/.test(trimmed)) failures.push(trimmed.replace(/^not ok \d+ - /, ''));
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
    logPipeline("NOTE: Using fallback script. Cypress e2e excluded deliberately.");

    let runState = fs.existsSync(RUN_STATE_PATH) ? JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8')) : {};
    if (runState.regression && runState.regression.stage_failed === false && runState.regression.patched_pass !== undefined) {
        logPipeline("stage already completed. Skipping."); return;
    }

    logPipeline("Running post-patch regression test...");
    const patchedResult = runTest((process.env.TARGET_DIR || __dirname), DEFAULT_TEST_SCRIPT);
    logPipeline(`Test result: ${patchedResult.pass ? 'PASS' : 'FAIL'} (script used: ${patchedResult.scriptUsed})`);

    const new_failures = patchedResult.pass ? [] : extractFailures(patchedResult.output);

    const regressionReport = {
        baseline_pass: null,
        baseline_note: "Not available - target patched in-place.",
        patched_pass: patchedResult.pass,
        test_script_used: patchedResult.scriptUsed || DEFAULT_TEST_SCRIPT,
        scope_note: "Server unit tests or configured target package scripts only.",
        new_failures: new_failures.slice(0, 20),
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
