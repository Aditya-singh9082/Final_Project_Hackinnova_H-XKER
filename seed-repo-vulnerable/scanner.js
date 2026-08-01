const fs = require('fs');
const https = require('https');

function logPipeline(msg) {
    const logLine = `[${new Date().toISOString()}] scanner: ${msg}\n`;
    fs.appendFileSync('../pipeline.log', logLine);
    console.log(`scanner: ${msg}`);
}

async function run() {
    logPipeline("started");
    
    let runState = {};
    if (fs.existsSync('../run_state.json')) {
        runState = JSON.parse(fs.readFileSync('../run_state.json', 'utf8'));
        if (runState.scanner && runState.scanner.stage_failed === false && runState.scanner.detected_cves) {
            logPipeline("stage already completed successfully. Skipping.");
            return;
        }
    }
    
    const lockfileData = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
    const packagesToScan = new Map();
    function addPackage(name, version) {
        if (!packagesToScan.has(name)) {
            packagesToScan.set(name, version);
        }
    }

    const rootDeps = lockfileData.packages[""]?.dependencies || {};
    for (const depName of Object.keys(rootDeps)) {
        const pkgPath = `node_modules/${depName}`;
        const pkgData = lockfileData.packages[pkgPath];
        if (pkgData) {
            addPackage(depName, pkgData.version);
            const transDeps = pkgData.dependencies || {};
            for (const transName of Object.keys(transDeps)) {
                let transPkg = lockfileData.packages[`node_modules/${depName}/node_modules/${transName}`] 
                            || lockfileData.packages[`node_modules/${transName}`];
                if (transPkg) {
                    addPackage(transName, transPkg.version);
                }
            }
        }
    }

    const packagesList = Array.from(packagesToScan.entries());
    if (packagesList.length === 0) {
        logPipeline("No dependencies found to scan.");
        return;
    }

    const detected_cves = [];
    const failed_packages = [];
    const uniqueCves = new Map();

    async function fetchOsv(name, version) {
        const postData = JSON.stringify({
            package: { name: name, ecosystem: 'npm' },
            version: version
        });

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const result = await new Promise((resolve, reject) => {
                    const options = {
                        hostname: 'api.osv.dev',
                        port: 443,
                        path: '/v1/query',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(postData)
                        },
                        timeout: 5000
                    };
                    const req = https.request(options, (res) => {
                        if (res.statusCode === 429 || res.statusCode >= 500) {
                            reject(new Error(`HTTP ${res.statusCode}`));
                            return;
                        }
                        let data = '';
                        res.on('data', (chunk) => { data += chunk; });
                        res.on('end', () => resolve(JSON.parse(data)));
                    });
                    req.on('timeout', () => {
                        req.destroy();
                        reject(new Error('timeout'));
                    });
                    req.on('error', (e) => reject(e));
                    req.write(postData);
                    req.end();
                });
                return result;
            } catch (err) {
                if (attempt === 3) throw err;
                await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 100));
            }
        }
    }

    const BATCH_SIZE = 10;
    for (let i = 0; i < packagesList.length; i += BATCH_SIZE) {
        const batch = packagesList.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async ([name, version]) => {
            try {
                const result = await fetchOsv(name, version);
                if (result.vulns && result.vulns.length > 0) {
                    for (const vuln of result.vulns) {
                        const cve = vuln.aliases ? vuln.aliases.find(a => a.startsWith('CVE-')) : vuln.id;
                        const cve_id = cve || vuln.id;
                        
                        let severity = "UNKNOWN";
                        if (vuln.severity && vuln.severity.length > 0) {
                            severity = vuln.severity[0].score;
                        } else if (vuln.database_specific && vuln.database_specific.severity) {
                            severity = vuln.database_specific.severity;
                        }
                        
                        let fixed_version = null;
                        if (vuln.affected && vuln.affected.length > 0) {
                            const affected = vuln.affected[0];
                            if (affected.ranges && affected.ranges.length > 0) {
                                const range = affected.ranges[0];
                                for (const event of range.events) {
                                    if (event.fixed) {
                                        fixed_version = event.fixed;
                                    }
                                }
                            }
                        }
                        const key = `${name}-${cve_id}`;
                        if (!uniqueCves.has(key)) {
                            uniqueCves.set(key, {
                                package: name,
                                version: version,
                                cve_id: cve_id,
                                severity: severity,
                                fixed_version: fixed_version || 'unknown',
                                affected_range: 'unknown',
                                source: 'OSV'
                            });
                        }
                    }
                }
            } catch (e) {
                console.error(`Error querying ${name}: ${e.message}`);
                failed_packages.push(name);
            }
        }));
    }

    detected_cves.push(...uniqueCves.values());

    runState = {};
    if (fs.existsSync('../run_state.json')) {
        runState = JSON.parse(fs.readFileSync('../run_state.json', 'utf8'));
    }
    runState.scanner = { 
        detected_cves, 
        failed_packages, 
        stage_failed: false,
        error: ""
    };
    
    fs.writeFileSync('advisories.json', JSON.stringify(detected_cves, null, 2));
    runState.timestamps = runState.timestamps || {};
    runState.timestamps.started_at = new Date().toISOString();
    runState.timestamps.scan_completed_at = new Date().toISOString();
    fs.writeFileSync('../run_state.json', JSON.stringify(runState, null, 2));
    
    logPipeline(`${packagesList.length} packages checked, ${detected_cves.length} CVEs found, ${failed_packages.length} scan failures`);
}

run().catch(err => {
    logPipeline(`stage failed: ${err.message}`);
    let runState = {};
    if (fs.existsSync('../run_state.json')) {
        runState = JSON.parse(fs.readFileSync('../run_state.json', 'utf8'));
    }
    runState.scanner = runState.scanner || {};
    runState.scanner.stage_failed = true;
    runState.scanner.error = err.message;
    fs.writeFileSync('../run_state.json', JSON.stringify(runState, null, 2));
    process.exit(0);
});
