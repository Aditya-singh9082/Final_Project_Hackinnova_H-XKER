const { execSync } = require('child_process');
const fs = require('fs');

function runTest(targetDir) {
    console.log(`Running tests in ${targetDir}...`);
    try {
        const out = execSync('npm test', { cwd: targetDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        return {
            pass: true,
            output: out,
            error: null
        };
    } catch (e) {
        return {
            pass: false,
            output: e.stdout + '\\n' + e.stderr,
            error: e.message
        };
    }
}

console.log('Running Regression Runner (Phase 6)...\\n');

const baselineResult = runTest('./seed-repo-vulnerable');
console.log('--- Baseline Run (Vulnerable) Output ---');
console.log(baselineResult.output.trim());
console.log('----------------------------------------\\n');

const patchedResult = runTest('./seed-repo-patched');
console.log('--- Patched Run Output ---');
console.log(patchedResult.output.trim());
console.log('----------------------------------------\\n');

let new_failures = [];

if (baselineResult.pass && !patchedResult.pass) {
    // This is a regression. Extract the failure from output.
    // For simplicity, just putting a summary or the first few lines of error.
    const errLines = patchedResult.output.split('\\n').filter(line => line.toLowerCase().includes('assert') || line.toLowerCase().includes('error'));
    new_failures.push(errLines.length > 0 ? errLines[0].trim() : "Unknown assertion failed");
}

const regressionReport = {
    baseline_pass: baselineResult.pass,
    patched_pass: patchedResult.pass,
    new_failures: new_failures
};

console.log('--- Regression Comparison ---');
console.log(`Baseline Pass: ${regressionReport.baseline_pass}`);
console.log(`Patched Pass:  ${regressionReport.patched_pass}`);
console.log(`New Failures:  ${JSON.stringify(regressionReport.new_failures)}`);
if (regressionReport.baseline_pass && regressionReport.patched_pass) {
    console.log('Verdict: Clean (No Regression introduced).');
} else if (regressionReport.baseline_pass && !regressionReport.patched_pass) {
    console.log('Verdict: REGRESSION DETECTED! The patch broke existing functionality.');
} else {
    console.log('Verdict: Baseline failed. Pre-existing issues in test suite.');
}

// Write regression_report.json
fs.writeFileSync('regression_report.json', JSON.stringify(regressionReport, null, 2));

// Update run_state.json
let runState = {};
if (fs.existsSync('run_state.json')) {
    runState = JSON.parse(fs.readFileSync('run_state.json', 'utf8'));
}
runState.regression = regressionReport;
runState.timestamps = runState.timestamps || {};
runState.timestamps.regression_completed_at = new Date().toISOString();
fs.writeFileSync('run_state.json', JSON.stringify(runState, null, 2));

console.log('\\nregression_report.json written successfully.');
console.log('run_state.json updated successfully.');
