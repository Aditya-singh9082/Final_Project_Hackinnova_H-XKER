const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RUN_STATE_PATH = '../juice-shop-run_state.json';
const LOG_PATH = '../juice-shop-pipeline.log';

function logPipeline(msg) {
    const logLine = `[${new Date().toISOString()}] compat-checker: ${msg}\n`;
    fs.appendFileSync(LOG_PATH, logLine);
    console.log(`compat-checker: ${msg}`);
}

function getExportedKeys(pkgDir, pkgName) {
    const pkgJsonPath = path.join(pkgDir, 'node_modules', pkgName, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) return { keys: [], type: 'not_found' };
    try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        const mainFile = path.join(pkgDir, 'node_modules', pkgName, pkgJson.main || 'index.js');
        if (!fs.existsSync(mainFile)) return { keys: [], type: 'main_not_found' };
        // Load the module and check exported keys
        const mod = require(mainFile);
        if (typeof mod === 'function') {
            const keys = ['(default function)', ...Object.keys(mod).filter(k => typeof mod[k] === 'function')];
            return { keys, type: 'function' };
        } else if (typeof mod === 'object' && mod !== null) {
            const keys = Object.keys(mod).filter(k => typeof mod[k] === 'function' || typeof mod[k] === 'object');
            return { keys, type: 'object' };
        }
        return { keys: [], type: 'empty' };
    } catch(e) {
        return { keys: [], type: 'error:' + e.message.split('\n')[0] };
    }
}

function compareExports(pkgName, oldInfo, newInfo) {
    const removed = oldInfo.keys.filter(k => !newInfo.keys.includes(k));
    const added   = newInfo.keys.filter(k => !oldInfo.keys.includes(k));
    const unchanged = oldInfo.keys.filter(k => newInfo.keys.includes(k));
    let verdict = (removed.length === 0) ? 'PASS' : 'WARN';
    return { package: pkgName, removed, added, changed_signature: [], unchanged_count: unchanged.length, verdict };
}

function run() {
    logPipeline("started");
    let runState = fs.existsSync(RUN_STATE_PATH) ? JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8')) : {};
    if (runState.compat_checker && runState.compat_checker.stage_failed === false && runState.compat_checker.reports) {
        logPipeline("stage already completed. Skipping."); return;
    }
    if (!runState.patch_generator || !runState.patch_generator.patches) {
        logPipeline("No patches found."); return;
    }

    const reports = [];
    const TEMP_DIR = path.join(__dirname, '.compat_tmp');

    for (const patch of runState.patch_generator.patches) {
        if (patch.package !== 'sanitize-html') {
            logPipeline(`Skipping compat check for ${patch.package} (excluded from this scope)`);
            continue;
        }
        logPipeline(`Checking compat for ${patch.package}: ${patch.from_version} -> ${patch.to_version}...`);

        // Install old version in temp dir
        if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
        const tempPkgJson = path.join(TEMP_DIR, 'package.json');
        if (!fs.existsSync(tempPkgJson)) {
            fs.writeFileSync(tempPkgJson, JSON.stringify({ name:'compat-temp', version:'1.0.0', dependencies:{} }));
        }

        try {
            logPipeline(`Installing ${patch.package}@${patch.from_version} in temp dir...`);
            execSync(`npm install ${patch.package}@${patch.from_version} --no-save --legacy-peer-deps`, {
                cwd: TEMP_DIR, stdio: 'ignore', timeout: 60000
            });
        } catch(e) {
            logPipeline(`Temp install failed: ${e.message.split('\n')[0]}`);
            reports.push({ package: patch.package, removed: [], changed_signature: [], added: [],
                verdict: 'WARN (could not install old version for comparison)', note: e.message.split('\n')[0] });
            continue;
        }

        const oldInfo = getExportedKeys(TEMP_DIR, patch.package);
        const newInfo = getExportedKeys(__dirname, patch.package);
        logPipeline(`Old (${patch.from_version}): ${oldInfo.type} — keys: ${oldInfo.keys.join(', ') || 'none'}`);
        logPipeline(`New (${patch.to_version}): ${newInfo.type} — keys: ${newInfo.keys.join(', ') || 'none'}`);

        const report = compareExports(patch.package, oldInfo, newInfo);
        if (patch.major_version_jump && report.verdict === 'PASS') {
            report.verdict = 'WARN (major version jump — exported function surface unchanged but internal API/options schema may differ — manual review recommended)';
        }
        report.old_version = patch.from_version;
        report.new_version = patch.to_version;
        reports.push(report);
    }

    // Cleanup temp
    try { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); } catch(e) {}

    runState = fs.existsSync(RUN_STATE_PATH) ? JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8')) : {};
    runState.compat_checker = { reports, stage_failed: false, error: "" };
    runState.timestamps = runState.timestamps || {};
    runState.timestamps.compat_completed_at = new Date().toISOString();
    fs.writeFileSync(RUN_STATE_PATH, JSON.stringify(runState, null, 2));
    logPipeline(`complete. Checked ${reports.length} packages.`);
}

try { run(); } catch(err) {
    logPipeline(`stage failed: ${err.message}`);
    let rs = fs.existsSync(RUN_STATE_PATH) ? JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8')) : {};
    rs.compat_checker = { stage_failed: true, error: err.message };
    fs.writeFileSync(RUN_STATE_PATH, JSON.stringify(rs, null, 2));
    process.exit(0);
}
