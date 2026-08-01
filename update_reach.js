const fs = require('fs');
const path = require('path');

const contextLogic = `
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

function run() {`;

function updateReachability(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Insert classifyContext before run()
    content = content.replace('function run() {', contextLogic);

    // Read package.json info inside run()
    const pkgLogic = `
    const startTime = Date.now();
    logPipeline("started");

    let pkgJson = {};
    if (fs.existsSync('package.json')) {
        try { pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf8')); } catch(e) {}
    }
    const mainEntry = pkgJson.main ? path.normalize(pkgJson.main) : null;
    const pkgScripts = pkgJson.scripts || null;
`;
    content = content.replace("    const startTime = Date.now();\r\n    logPipeline(\"started\");", pkgLogic)
                     .replace("    const startTime = Date.now();\n    logPipeline(\"started\");", pkgLogic);

    // Replace the vulnerability loop
    const oldLoopRegex = /for\s*\(const\s+vuln\s+of\s+advisories\)\s*\{[\s\S]*?reachabilityCves\.push\(\{ cve_id: vuln\.cve_id, package: vuln\.package, verdict, evidence \}\);\s*\}/m;
    const newLoop = `for (const vuln of advisories) {
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
                evidence = \`Aliased/chained import detected in: \${entry.usedFiles.slice(0,2).join(', ')}\${entry.usedFiles.length > 2 ? '...' : ''}\`;
                uncertainCount++;
            } else {
                verdict = 'REACHABLE';
                evidence = \`Imported in \${entry.usedFiles.length} file(s): \${entry.usedFiles.slice(0,2).join(', ')}\${entry.usedFiles.length > 2 ? '...' : ''}\`;
                reachableCount++;
            }
        }

        reachabilityCves.push({ cve_id: vuln.cve_id, package: vuln.package, verdict, context, evidence });
    }`;

    content = content.replace(oldLoopRegex, newLoop);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Updated " + filePath);
}

updateReachability('reachability.js');
updateReachability('juice-shop-pipeline/reachability.js');
