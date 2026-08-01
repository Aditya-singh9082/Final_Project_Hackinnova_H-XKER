const fs = require('fs');
const { execSync } = require('child_process');

const RUN_STATE_PATH = '../juice-shop-run_state.json';
const LOG_PATH = '../juice-shop-pipeline.log';

function logPipeline(msg) {
    const logLine = `[${new Date().toISOString()}] patch-generator: ${msg}\n`;
    fs.appendFileSync(LOG_PATH, logLine);
    console.log(`patch-generator: ${msg}`);
}

function cmpVer(a, b) {
    const pa = a.replace(/[^0-9.]/g, '').split('.').map(Number);
    const pb = b.replace(/[^0-9.]/g, '').split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const na = pa[i] || 0, nb = pb[i] || 0;
        if (na > nb) return 1;
        if (na < nb) return -1;
    }
    return 0;
}
function getMajor(v) { return Number(v.replace(/[^0-9.]/g, '').split('.')[0] || 0); }

function run() {
    logPipeline("started");
    let runState = fs.existsSync(RUN_STATE_PATH) ? JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8')) : {};
    if (runState.patch_generator && runState.patch_generator.stage_failed === false && runState.patch_generator.patches) {
        logPipeline("stage already completed. Skipping.");
        return;
    }

    const advisories = JSON.parse(fs.readFileSync('advisories.json', 'utf8'));
    const targets = JSON.parse(fs.readFileSync('targets.json', 'utf8'));
    let packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    // Group targets by package
    const pkgs = {};
    for (const t of targets) {
        if (!pkgs[t.package]) pkgs[t.package] = [];
        const adv = advisories.find(a => a.package === t.package && a.cve_id === t.cve_id);
        if (adv && adv.fixed_version && adv.fixed_version !== 'unknown') {
            pkgs[t.package].push({ cve_id: t.cve_id, fixed_version: adv.fixed_version });
        }
    }

    const patchManifest = { patches: [] };

    for (const [pkgName, cves] of Object.entries(pkgs)) {
        logPipeline(`Processing ${pkgName} for ${cves.length} CVEs...`);
        const fromVersion = packageJson.dependencies[pkgName];
        if (!fromVersion) { logPipeline(`${pkgName} not found in package.json`); continue; }
        const cleanFrom = fromVersion.replace(/[^0-9.]/g, '');
        const currentMajor = getMajor(cleanFrom);

        let availableVersions = [];
        try {
            const out = execSync(`npm view ${pkgName} versions --json`, { encoding: 'utf8' });
            availableVersions = JSON.parse(out);
        } catch(e) { logPipeline(`Failed to fetch versions for ${pkgName}: ${e.message}`); continue; }
        availableVersions.sort(cmpVer);

        // Find min version satisfying ALL CVEs within same major
        let chosenVersion = null;
        let major_version_jump = false;
        let resolved_cves = [], unresolved_cves = [];

        const sameMajorCandidate = availableVersions.find(v =>
            getMajor(v) === currentMajor && cves.every(c => cmpVer(v, c.fixed_version) >= 0)
        );

        if (sameMajorCandidate) {
            chosenVersion = sameMajorCandidate;
            resolved_cves = cves.map(c => c.cve_id);
        } else {
            // Try any major — pick min version satisfying most CVEs
            let best = null, bestCount = -1;
            for (const v of availableVersions) {
                let count = cves.filter(c => cmpVer(v, c.fixed_version) >= 0).length;
                if (count > bestCount || (count === bestCount && best && cmpVer(v, best) < 0)) {
                    bestCount = count; best = v;
                }
            }
            chosenVersion = best;
            major_version_jump = chosenVersion && getMajor(chosenVersion) !== currentMajor;
            for (const c of cves) {
                if (chosenVersion && cmpVer(chosenVersion, c.fixed_version) >= 0) resolved_cves.push(c.cve_id);
                else unresolved_cves.push(c.cve_id);
            }
        }

        if (!chosenVersion) { logPipeline(`No suitable version found for ${pkgName}`); continue; }
        logPipeline(`Targeting ${pkgName}: ${fromVersion} -> ${chosenVersion} (major_jump=${major_version_jump})`);

        packageJson.dependencies[pkgName] = chosenVersion;
        fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

        let status = 'failed';
        try {
            execSync('npm install --legacy-peer-deps', { stdio: 'ignore' });
            logPipeline(`npm install succeeded for ${pkgName}.`);
            status = 'success';
            fs.writeFileSync(`patch_${pkgName.replace('/','_')}.diff`,
                `VERSION BUMP\n${pkgName}: ${fromVersion} -> ${chosenVersion}\nResolved: ${resolved_cves.join(', ')}`);
        } catch(e) {
            logPipeline(`npm install failed for ${pkgName}: ${e.message}`);
        }

        patchManifest.patches.push({
            package: pkgName, cve_ids: resolved_cves, unresolved_cves,
            method_used: status === 'success' ? 'version_bump' : 'failed',
            from_version: fromVersion, to_version: chosenVersion,
            major_version_jump: !!major_version_jump, status
        });
    }

    fs.writeFileSync('patch_manifest.json', JSON.stringify(patchManifest.patches, null, 2));
    runState = fs.existsSync(RUN_STATE_PATH) ? JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8')) : {};
    runState.patch_generator = { patches: patchManifest.patches, stage_failed: false, error: "" };
    runState.timestamps = runState.timestamps || {};
    runState.timestamps.patch_generated_at = new Date().toISOString();
    fs.writeFileSync(RUN_STATE_PATH, JSON.stringify(runState, null, 2));
    logPipeline(`complete. Generated ${patchManifest.patches.length} patches.`);
}

try { run(); } catch(err) {
    logPipeline(`stage failed: ${err.message}`);
    let rs = fs.existsSync(RUN_STATE_PATH) ? JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8')) : {};
    rs.patch_generator = { stage_failed: true, error: err.message };
    fs.writeFileSync(RUN_STATE_PATH, JSON.stringify(rs, null, 2));
    process.exit(0);
}
