const fs = require('fs');
const path = require('path');

const RUN_STATE_PATH = (process.env.RUN_STATE_PATH || '../juice-shop-run_state.json');
const LOG_PATH = (process.env.LOG_PATH || '../juice-shop-pipeline.log');

function logPipeline(msg) {
    const logLine = `[${new Date().toISOString()}] reachability: ${msg}\n`;
    fs.appendFileSync(LOG_PATH, logLine);
    console.log(`reachability: ${msg}`);
}

// Minimal JS-only AST parser using regex-based approach for speed on large codebases
// (acorn would require install in juice-shop; we use regex detection here)
function detectPackageUsage(fileContent, pkgName) {
    // Direct require: const x = require('pkgName') or require("pkgName")
    const directReq = new RegExp(`require\\s*\\(\\s*['"]${escapeRegex(pkgName)}['"]\\s*\\)`, 'm');
    // Aliased/member: require('pkg').something
    const aliasedReq = new RegExp(`require\\s*\\(\\s*['"]${escapeRegex(pkgName)}['"]\\s*\\)\\s*\\.`, 'm');
    // ESM import: import ... from 'pkg' or import 'pkg'
    const esmImport = new RegExp(`import\\s+.*from\\s+['"]${escapeRegex(pkgName)}['"]`, 'm');
    const esmBare = new RegExp(`import\\s+['"]${escapeRegex(pkgName)}['"]`, 'm');

    if (aliasedReq.test(fileContent)) return 'aliased';
    if (directReq.test(fileContent)) return 'direct';
    if (esmImport.test(fileContent) || esmBare.test(fileContent)) return 'esm';
    return null;
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
}


function classifyContext(filePath, pkgScripts, mainEntry) {
    const name = path.basename(filePath);
    const dirParts = path.dirname(filePath).split(path.sep);
    
    if (filePath === mainEntry || dirParts.some(p => ['src', 'routes', 'lib', 'app'].includes(p))) {
        return 'runtime';
    }
    if (['build.js', 'webpack.config.js', 'gulpfile.js'].includes(name) || dirParts.some(p => ['build', 'scripts', 'tools'].includes(p))) {
        return 'build_time';
    }
    if (pkgScripts) {
        for (const script of Object.values(pkgScripts)) {
            if (typeof script === 'string' && script.includes(name)) return 'build_time';
        }
    }
    return 'runtime';
}

function run() {

    const startTime = Date.now();
    logPipeline("started");

    let pkgJson = {};
    if (fs.existsSync('package.json')) {
        try { pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf8')); } catch(e) {}
    }
    const mainEntry = pkgJson.main ? path.normalize(pkgJson.main) : null;
    const pkgScripts = pkgJson.scripts || null;


    let runState = {};
    if (fs.existsSync(RUN_STATE_PATH)) {
        runState = JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8'));
        if (runState.reachability && runState.reachability.stage_failed === false && runState.reachability.cves) {
            logPipeline("stage already completed. Skipping.");
            return;
        }
    }

    if (!fs.existsSync('advisories.json')) {
        logPipeline("advisories.json not found. Run scanner first.");
        return;
    }

    const advisories = JSON.parse(fs.readFileSync('advisories.json', 'utf8'));
    const uniquePackages = [...new Set(advisories.map(a => a.package))];
    logPipeline(`Checking reachability for ${uniquePackages.length} unique vulnerable packages across ${advisories.length} CVEs`);

    // Find all JS/TS source files (exclude node_modules, dist, build, test, .git, frontend/dist)
    const excludeDirs = new Set(['node_modules', 'dist', 'build', 'test', 'tests', '.git', 'coverage', 'public']);
    const sourceFiles = [];
    const CRAWL_TIMEOUT_MS = 30000;
    let crawlIncomplete = false;

    function findFiles(dir) {
        if (Date.now() - startTime > CRAWL_TIMEOUT_MS) {
            crawlIncomplete = true;
            return;
        }
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch(e) { return; }
        for (const entry of entries) {
            if (crawlIncomplete) return;
            if (entry.isDirectory()) {
                if (!excludeDirs.has(entry.name) && !entry.name.startsWith('.')) {
                    findFiles(path.join(dir, entry.name));
                }
            } else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
                sourceFiles.push(path.join(dir, entry.name));
            }
        }
    }

    findFiles('.');

    if (crawlIncomplete) {
        logPipeline(`Crawl timeout hit after 30s. Scanned ${sourceFiles.length} files so far.`);
    } else {
        logPipeline(`Found ${sourceFiles.length} source files to scan.`);
    }

    // Build usage map: pkgName -> { usedFiles: [], isAliased: bool }
    const usageMap = new Map();
    for (const pkg of uniquePackages) usageMap.set(pkg, { usedFiles: [], isAliased: false });

    for (const filePath of sourceFiles) {
        if (Date.now() - startTime > CRAWL_TIMEOUT_MS + 30000) {
            crawlIncomplete = true;
            break;
        }
        let content;
        try { content = fs.readFileSync(filePath, 'utf8'); } catch(e) { continue; }
        for (const pkg of uniquePackages) {
            const usage = detectPackageUsage(content, pkg);
            if (usage) {
                const entry = usageMap.get(pkg);
                entry.usedFiles.push(path.relative('.', filePath));
                if (usage === 'aliased') entry.isAliased = true;
            }
        }
    }

    const reachabilityCves = [];
    let reachableCount = 0, uncertainCount = 0, notReachableCount = 0;

    for (const vuln of advisories) {
        const entry = usageMap.get(vuln.package);
        let verdict, evidence, context = 'n/a';

        if (!entry || entry.usedFiles.length === 0) {
            verdict = 'NOT_REACHABLE';
            evidence = 'Package not found imported in any scanned source file.';
            notReachableCount++;
        } else {
            let hasRuntime = false;
            let hasBuild = false;
            for (const file of entry.usedFiles) {
                const ctx = classifyContext(file, pkgScripts, mainEntry);
                if (ctx === 'runtime') hasRuntime = true;
                if (ctx === 'build_time') hasBuild = true;
            }
            context = hasRuntime ? 'runtime' : (hasBuild ? 'build_time' : 'runtime');

            if (entry.isAliased) {
                verdict = 'reachability_uncertain';
                evidence = `Aliased/chained import detected in: ${entry.usedFiles.slice(0,2).join(', ')}${entry.usedFiles.length > 2 ? '...' : ''}`;
                uncertainCount++;
            } else {
                verdict = 'REACHABLE';
                evidence = `Imported in ${entry.usedFiles.length} file(s): ${entry.usedFiles.slice(0,2).join(', ')}${entry.usedFiles.length > 2 ? '...' : ''}`;
                reachableCount++;
            }
        }

        reachabilityCves.push({ cve_id: vuln.cve_id, package: vuln.package, verdict, context, evidence });
    }

    const reachabilityData = { cves: reachabilityCves, crawl_incomplete: crawlIncomplete, stage_failed: false, error: "" };
    fs.writeFileSync('reachability.json', JSON.stringify(reachabilityData, null, 2));

    runState = {};
    if (fs.existsSync(RUN_STATE_PATH)) runState = JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8'));
    runState.reachability = reachabilityData;
    runState.timestamps = runState.timestamps || {};
    runState.timestamps.reachability_completed_at = new Date().toISOString();
    fs.writeFileSync(RUN_STATE_PATH, JSON.stringify(runState, null, 2));

    const elapsedSec = ((Date.now() - startTime)/1000).toFixed(1);
    logPipeline(`DONE in ${elapsedSec}s: ${advisories.length} CVEs evaluated � REACHABLE: ${reachableCount}, UNCERTAIN: ${uncertainCount}, NOT_REACHABLE: ${notReachableCount}${crawlIncomplete ? ' [CRAWL INCOMPLETE]' : ''}`);
}

try {
    run();
} catch(err) {
    logPipeline(`stage failed: ${err.message}`);
    let runState = {};
    if (fs.existsSync(RUN_STATE_PATH)) runState = JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8'));
    runState.reachability = { stage_failed: true, error: err.message };
    fs.writeFileSync(RUN_STATE_PATH, JSON.stringify(runState, null, 2));
    process.exit(0);
}

