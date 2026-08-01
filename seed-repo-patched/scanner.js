const fs = require('fs');
const https = require('https');

const lockfileData = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));

// Extract direct + 1-level transitive dependencies
const packagesToScan = new Map();

// Helper to add a package
function addPackage(name, version) {
    if (!packagesToScan.has(name)) {
        packagesToScan.set(name, version);
    }
}

// In lockfile v3 (npm 9+), root dependencies are in packages[""].dependencies
const rootDeps = lockfileData.packages[""]?.dependencies || {};

for (const depName of Object.keys(rootDeps)) {
    const pkgPath = `node_modules/${depName}`;
    const pkgData = lockfileData.packages[pkgPath];
    if (pkgData) {
        addPackage(depName, pkgData.version);
        
        // 1-level transitive
        const transDeps = pkgData.dependencies || {};
        for (const transName of Object.keys(transDeps)) {
            // It could be hoisted or nested
            let transPkg = lockfileData.packages[`node_modules/${depName}/node_modules/${transName}`] 
                        || lockfileData.packages[`node_modules/${transName}`];
            if (transPkg) {
                addPackage(transName, transPkg.version);
            }
        }
    }
}

// Alternatively, since it's a seed repo with only 5 dependencies, we can just grab all node_modules/ for this demo to ensure they are scanned.
// We will stick to the Map for uniqueness.

const detected_cves = [];
let pending = packagesToScan.size;

if (pending === 0) {
    console.log("No dependencies found to scan.");
    process.exit(0);
}

// Deduplicate by package + CVE ID
const uniqueCves = new Map();

packagesToScan.forEach((version, name) => {
    const postData = JSON.stringify({
        package: { name: name, ecosystem: 'npm' },
        version: version
    });

    const options = {
        hostname: 'api.osv.dev',
        port: 443,
        path: '/v1/query',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            const result = JSON.parse(data);
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
                    
                    // Extract fixed version (simplified)
                    let fixed_version = null;
                    let affected_range = null;
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
                            affected_range: 'unknown', // simplified for demo
                            source: 'OSV'
                        });
                    }
                }
            }
            
            pending--;
            if (pending === 0) {
                detected_cves.push(...uniqueCves.values());
                saveReport();
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Error querying ${name}: ${e.message}`);
        pending--;
        if (pending === 0) saveReport();
    });

    req.write(postData);
    req.end();
});

function saveReport() {
    let runState = {};
    if (fs.existsSync('../run_state.json')) {
        runState = JSON.parse(fs.readFileSync('../run_state.json', 'utf8'));
    }
    runState.scanner = { detected_cves };
    
    // Also save independent advisories.json
    fs.writeFileSync('advisories.json', JSON.stringify(detected_cves, null, 2));
    runState.timestamps = runState.timestamps || {};
    runState.timestamps.started_at = new Date().toISOString();
    runState.timestamps.scan_completed_at = new Date().toISOString();
    fs.writeFileSync('../run_state.json', JSON.stringify(runState, null, 2));
    
    console.log(`Scan complete. Found ${detected_cves.length} total vulnerabilities across all packages.`);
    
    // Print a brief summary of seeded packages to verify
    const seeded = ['lodash', 'marked', 'axios', 'minimist', 'moment'];
    seeded.forEach(pkg => {
        const vulns = detected_cves.filter(c => c.package === pkg);
        console.log(`- ${pkg}: ${vulns.length} CVEs`);
    });
}
