const fs = require('fs');
const https = require('https');
const path = require('path');

const RUN_STATE_PATH = (process.env.RUN_STATE_PATH || '../juice-shop-run_state.json');
const LOG_PATH = (process.env.LOG_PATH || '../juice-shop-pipeline.log');

function logPipeline(msg) {
    const logLine = `[${new Date().toISOString()}] scanner: ${msg}\n`;
    fs.appendFileSync(LOG_PATH, logLine);
    console.log(`scanner: ${msg}`);
}

async function run() {
    const startTime = Date.now();
    logPipeline("started");

    let runState = {};
    if (fs.existsSync(RUN_STATE_PATH)) {
        runState = JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8'));
        if (runState.scanner && runState.scanner.stage_failed === false && runState.scanner.detected_cves) {
            logPipeline("stage already completed. Skipping.");
            return;
        }
    }

    const packagesToScan = new Map();

    // Strategy 1: Read from package-lock.json if present
    if (fs.existsSync('package-lock.json')) {
        logPipeline("Reading from package-lock.json");
        const lockfileData = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
        if (lockfileData.packages) {
            for (const [pkgPath, pkgData] of Object.entries(lockfileData.packages)) {
                if (pkgPath === '' || !pkgData.version || pkgData.dev) continue;
                const name = pkgPath.replace(/^.*node_modules\//, '');
                if (!name.includes('/') || name.startsWith('@')) {
                    packagesToScan.set(name, pkgData.version);
                }
            }
        } else if (lockfileData.dependencies) {
            for (const [name, dep] of Object.entries(lockfileData.dependencies)) {
                packagesToScan.set(name, dep.version);
            }
        }
    } else {
        // Strategy 2: Read directly from node_modules (when package-lock=false in .npmrc)
        logPipeline("No package-lock.json found (package-lock=false). Reading from node_modules directly...");
        const nodeModulesPath = 'node_modules';
        if (!fs.existsSync(nodeModulesPath)) {
            logPipeline("ERROR: node_modules not found. Run npm install first.");
            return;
        }
        const entries = fs.readdirSync(nodeModulesPath, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            if (entry.name.startsWith('.')) continue;
            
            if (entry.name.startsWith('@')) {
                // Scoped package — check sub-entries
                const scopedPath = path.join(nodeModulesPath, entry.name);
                const scopedEntries = fs.readdirSync(scopedPath, { withFileTypes: true });
                for (const se of scopedEntries) {
                    if (!se.isDirectory()) continue;
                    const pkgJsonPath = path.join(scopedPath, se.name, 'package.json');
                    if (fs.existsSync(pkgJsonPath)) {
                        try {
                            const p = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
                            packagesToScan.set(`${entry.name}/${se.name}`, p.version);
                        } catch(e) {}
                    }
                }
            } else {
                const pkgJsonPath = path.join(nodeModulesPath, entry.name, 'package.json');
                if (fs.existsSync(pkgJsonPath)) {
                    try {
                        const p = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
                        packagesToScan.set(entry.name, p.version);
                    } catch(e) {}
                }
            }
        }
    }

    const packagesList = Array.from(packagesToScan.entries());
    logPipeline(`Scanning ${packagesList.length} unique packages against OSV API...`);

    if (packagesList.length === 0) {
        logPipeline("No packages found.");
        return;
    }

    const uniqueCves = new Map();
    const failed_packages = [];

    async function fetchOsv(name, version) {
        const postData = JSON.stringify({ package: { name, ecosystem: 'npm' }, version });
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const result = await new Promise((resolve, reject) => {
                    const options = {
                        hostname: 'api.osv.dev', port: 443, path: '/v1/query', method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
                        timeout: 10000
                    };
                    const req = https.request(options, (res) => {
                        if (res.statusCode === 429 || res.statusCode >= 500) {
                            reject(new Error(`HTTP ${res.statusCode}`)); return;
                        }
                        let data = '';
                        res.on('data', c => data += c);
                        res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
                    });
                    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
                    req.on('error', reject);
                    req.write(postData);
                    req.end();
                });
                return result;
            } catch (err) {
                if (attempt === 3) throw err;
                await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 300));
            }
        }
    }

    const BATCH_SIZE = 10;
    for (let i = 0; i < packagesList.length; i += BATCH_SIZE) {
        const batch = packagesList.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i/BATCH_SIZE)+1;
        const totalBatches = Math.ceil(packagesList.length/BATCH_SIZE);
        if (batchNum % 5 === 1 || batchNum === totalBatches) {
            logPipeline(`Batch ${batchNum}/${totalBatches} (${i+1}-${Math.min(i+BATCH_SIZE, packagesList.length)} of ${packagesList.length})`);
        }
        await Promise.all(batch.map(async ([name, version]) => {
            try {
                const result = await fetchOsv(name, version);
                if (result.vulns && result.vulns.length > 0) {
                    for (const vuln of result.vulns) {
                        const cve = vuln.aliases ? vuln.aliases.find(a => a.startsWith('CVE-')) : null;
                        const cve_id = cve || vuln.id;
                        let severity = "UNKNOWN";
                        if (vuln.severity && vuln.severity.length > 0) severity = vuln.severity[0].score;
                        else if (vuln.database_specific && vuln.database_specific.severity) severity = vuln.database_specific.severity;
                        let fixed_version = null;
                        if (vuln.affected && vuln.affected.length > 0) {
                            const aff = vuln.affected[0];
                            if (aff.ranges && aff.ranges.length > 0) {
                                for (const ev of aff.ranges[0].events) { if (ev.fixed) fixed_version = ev.fixed; }
                            }
                        }
                        const key = `${name}-${cve_id}`;
                        if (!uniqueCves.has(key)) {
                            uniqueCves.set(key, { package: name, version, cve_id, severity, fixed_version: fixed_version || 'unknown', affected_range: 'unknown', source: 'OSV' });
                        }
                    }
                }
            } catch(e) {
                console.error(`  [FAIL] ${name}@${version}: ${e.message}`);
                failed_packages.push(name);
            }
        }));
    }

    const detected_cves = Array.from(uniqueCves.values());
    const elapsedSec = ((Date.now() - startTime)/1000).toFixed(1);

    runState = fs.existsSync(RUN_STATE_PATH) ? JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8')) : {};
    runState.scanner = { detected_cves, failed_packages, stage_failed: false, error: "" };
    runState.timestamps = runState.timestamps || {};
    runState.timestamps.started_at = new Date(startTime).toISOString();
    runState.timestamps.scan_completed_at = new Date().toISOString();
    fs.writeFileSync(RUN_STATE_PATH, JSON.stringify(runState, null, 2));
    fs.writeFileSync('advisories.json', JSON.stringify(detected_cves, null, 2));

    logPipeline(`DONE in ${elapsedSec}s: ${packagesList.length} packages checked, ${detected_cves.length} CVEs found, ${failed_packages.length} scan failures`);
}

run().catch(err => {
    logPipeline(`stage failed: ${err.message}`);
    let runState = fs.existsSync(RUN_STATE_PATH) ? JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8')) : {};
    runState.scanner = { stage_failed: true, error: err.message };
    fs.writeFileSync(RUN_STATE_PATH, JSON.stringify(runState, null, 2));
    process.exit(0);
});

