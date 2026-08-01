const { execSync } = require('child_process');
const fs = require('fs');

function logPipeline(msg) {
    const logLine = `[${new Date().toISOString()}] regression-runner: ${msg}\n`;
    fs.appendFileSync('pipeline.log', logLine);
    console.log(`regression-runner: ${msg}`);
}

function runTest(targetDir) {
    logPipeline(`Running tests in ${targetDir}...`);
    try {
        const out = execSync('npm test', { cwd: targetDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000 });
        return {
            pass: true,
            output: out,
            error: null
        };
    } catch (e) {
        let msg = (e.stdout || '') + '\n' + (e.stderr || '');
        if (e.message.includes('ETIMEDOUT') || e.code === 'ETIMEDOUT') {
            msg = 'Test suite timed out after 60s.\n' + msg;
        }
        return {
            pass: false,
            output: msg,
            error: e.message
        };
    }
}

function extractFailures(output) {
    const failures = [];
    const lines = output.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.match(/^\d+\)\s+(.*)/)) {
            failures.push(line.match(/^\d+\)\s+(.*)/)[1]);
        } else if (line.startsWith('FAIL') && line.includes(' ')) {
            failures.push(line);
        } else if (line.startsWith('?')) {
            failures.push(line.replace('?', '').trim());
        } else if (line.toLowerCase().includes('assert') && line.toLowerCase().includes('failed')) {
            failures.push(line);
        }
    }
    
    if (failures.length === 0) {
        const errLines = lines.filter(line => line.toLowerCase().includes('assert') || line.toLowerCase().includes('error'));
        if (errLines.length > 0) failures.push(errLines[0].trim());
    }
    
    return [...new Set(failures)];
}

function run() {
    logPipeline("started");
    let runState = {};
    if (fs.existsSync('run_state.json')) {
        runState = JSON.parse(fs.readFileSync('run_state.json', 'utf8'));
        if (runState.regression && runState.regression.stage_failed === false && runState.regression.baseline_pass !== undefined) {
            logPipeline("stage already completed successfully. Skipping.");
            return;
        }
    }

    const baselineResult = runTest('./seed-repo-vulnerable');
    const patchedResult = runTest('./seed-repo-patched');

    let new_failures = [];

    if (baselineResult.pass && !patchedResult.pass) {
        new_failures = extractFailures(patchedResult.output);
        if (new_failures.length === 0) new_failures.push("Unknown failure (tests exited with error code or timed out)");
    } else if (!baselineResult.pass && !patchedResult.pass) {
        const baseFails = extractFailures(baselineResult.output);
        const patchFails = extractFailures(patchedResult.output);
        
        for (const pf of patchFails) {
            if (!baseFails.includes(pf)) {
                new_failures.push(pf);
            }
        }
        if (new_failures.length > 0) {
            logPipeline("Baseline failed, but patch introduced ADDITIONAL failures.");
        }
    }

    const regressionReport = {
        baseline_pass: baselineResult.pass,
        patched_pass: patchedResult.pass,
        new_failures: new_failures,
        stage_failed: false,
        error: ""
    };

    fs.writeFileSync('regression_report.json', JSON.stringify(regressionReport, null, 2));

    runState = {};
    if (fs.existsSync('run_state.json')) {
        runState = JSON.parse(fs.readFileSync('run_state.json', 'utf8'));
    }
    runState.regression = regressionReport;
    runState.timestamps = runState.timestamps || {};
    runState.timestamps.regression_completed_at = new Date().toISOString();
    fs.writeFileSync('run_state.json', JSON.stringify(runState, null, 2));

    logPipeline(`complete. Baseline pass: ${regressionReport.baseline_pass}, Patched pass: ${regressionReport.patched_pass}, New failures: ${regressionReport.new_failures.length}`);
}

try {
    run();
} catch (err) {
    logPipeline(`stage failed: ${err.message}`);
    let runState = {};
    if (fs.existsSync('run_state.json')) {
        runState = JSON.parse(fs.readFileSync('run_state.json', 'utf8'));
    }
    runState.regression = runState.regression || {};
    runState.regression.stage_failed = true;
    runState.regression.error = err.message;
    fs.writeFileSync('run_state.json', JSON.stringify(runState, null, 2));
    process.exit(0);
}
