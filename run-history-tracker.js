const fs = require('fs');
const path = require('path');

function appendHistory(entry) {
    const historyPath = path.join(__dirname, 'run_history.json');
    let history = [];
    if (fs.existsSync(historyPath)) {
        try {
            history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        } catch (e) {
            history = [];
        }
    }
    
    const newEntry = {
        run_id: entry.run_id || `run-${Date.now()}`,
        repo: entry.repo || 'unknown',
        package: entry.package || 'unknown',
        cve_ids: entry.cve_ids || [],
        method_used: entry.method_used || 'none',
        major_version_jump: entry.major_version_jump || false,
        exploit_verified: entry.exploit_verified || 'unverified',
        compat_verdict: entry.compat_verdict || 'unknown',
        regression_result: entry.regression_result || 'not_run',
        final_outcome: entry.final_outcome || 'unknown',
        timestamp: new Date().toISOString()
    };

    history.push(newEntry);
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

module.exports = { appendHistory };
