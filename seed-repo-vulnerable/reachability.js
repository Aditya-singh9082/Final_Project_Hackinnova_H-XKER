const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const walk = require('acorn-walk');

function logPipeline(msg) {
    const logLine = `[${new Date().toISOString()}] reachability: ${msg}\n`;
    fs.appendFileSync('../pipeline.log', logLine);
    console.log(`reachability: ${msg}`);
}

function run() {
    logPipeline("started");
    
    let runState = {};
    if (fs.existsSync('../run_state.json')) {
        runState = JSON.parse(fs.readFileSync('../run_state.json', 'utf8'));
        if (runState.reachability && runState.reachability.stage_failed === false && runState.reachability.cves) {
            logPipeline("stage already completed successfully. Skipping.");
            return;
        }
    }
    
    const advisories = JSON.parse(fs.readFileSync('advisories.json', 'utf8'));

    const excludeDirs = ['node_modules', 'test', 'dist', 'build', '.git'];
    const jsFiles = [];

    function findJsFiles(dir) {
        if (excludeDirs.includes(path.basename(dir))) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!excludeDirs.includes(entry.name)) {
                    findJsFiles(fullPath);
                }
            } else if (entry.name.endsWith('.js')) {
                jsFiles.push(fullPath);
            }
        }
    }
    findJsFiles('.');

    const imports = {}; // varName -> { pkgName, isDynamic }
    const usages = {};  // varName -> array of usage locations
    
    let crawlIncomplete = false;
    const startTime = Date.now();

    for (const file of jsFiles) {
        if (Date.now() - startTime > 30000) {
            crawlIncomplete = true;
            logPipeline("Crawl timeout exceeded 30s. Results incomplete.");
            break;
        }
        
        try {
            const code = fs.readFileSync(file, 'utf8');
            const ast = acorn.parse(code, { ecmaVersion: 2020, allowHashBang: true, sourceType: 'module' });
            
            // Pass 1: Find requires and imports
            walk.simple(ast, {
                VariableDeclarator(node) {
                    if (node.init && node.init.type === 'CallExpression' && 
                        node.init.callee.name === 'require' && 
                        node.init.arguments.length > 0) {
                        const pkgName = node.init.arguments[0].value;
                        const varName = node.id && node.id.name;
                        if (varName) {
                            imports[varName] = { pkgName, isDynamic: false };
                            if (!usages[varName]) usages[varName] = [];
                        } else if (node.id && node.id.type === 'ObjectPattern') {
                            imports['__destructured_' + pkgName] = { pkgName, isDynamic: true };
                        }
                    }
                    if (node.init && node.init.type === 'MemberExpression' &&
                        node.init.object.type === 'CallExpression' &&
                        node.init.object.callee.name === 'require' &&
                        node.init.object.arguments.length > 0) {
                        const pkgName = node.init.object.arguments[0].value;
                        const varName = node.id && node.id.name;
                        if (varName) {
                            imports[varName] = { pkgName, isDynamic: true };
                            if (!usages[varName]) usages[varName] = [];
                        }
                    }
                },
                ImportDeclaration(node) {
                    if (node.source && node.source.value) {
                        const pkgName = node.source.value;
                        for (const spec of node.specifiers) {
                            if (spec.local && spec.local.name) {
                                imports[spec.local.name] = { pkgName, isDynamic: false };
                                if (!usages[spec.local.name]) usages[spec.local.name] = [];
                            }
                        }
                    }
                }
            });
            
            // Pass 2: Find usages
            walk.simple(ast, {
                MemberExpression(node) {
                    if (node.object.type === 'Identifier' && usages[node.object.name] !== undefined) {
                        usages[node.object.name].push(`property access in ${file}`);
                    }
                },
                CallExpression(node) {
                    if (node.callee.type === 'Identifier' && usages[node.callee.name] !== undefined) {
                        usages[node.callee.name].push(`function call in ${file}`);
                    }
                }
            });
        } catch (e) {
            // Ignore parse errors on individual files
        }
    }

    const reachabilityCves = [];
    let reachableCount = 0;
    let uncertainCount = 0;

    for (const vuln of advisories) {
        let verdict = "NOT_REACHABLE";
        let evidence = "Package is not imported in scanned source files.";

        let importedAs = null;
        let isDynamic = false;
        
        for (const [varName, info] of Object.entries(imports)) {
            if (info.pkgName === vuln.package) {
                importedAs = varName;
                isDynamic = info.isDynamic;
                break;
            }
        }

        if (importedAs) {
            if (isDynamic) {
                verdict = "reachability_uncertain";
                evidence = `Dynamically/aliased/destructured import detected, reachability uncertain.`;
                uncertainCount++;
            } else if (usages[importedAs] && usages[importedAs].length > 0) {
                verdict = "REACHABLE";
                evidence = `Imported as ${importedAs} and used (${usages[importedAs].slice(0,2).join(', ')}...)`;
                reachableCount++;
            } else {
                evidence = `Package imported as '${importedAs}' but never invoked.`;
            }
        }

        reachabilityCves.push({
            cve_id: vuln.cve_id,
            package: vuln.package,
            verdict: verdict,
            evidence: evidence
        });
    }

    const reachabilityData = { cves: reachabilityCves, crawl_incomplete: crawlIncomplete, stage_failed: false, error: "" };
    fs.writeFileSync('reachability.json', JSON.stringify(reachabilityData, null, 2));

    runState = {};
    if (fs.existsSync('../run_state.json')) {
        runState = JSON.parse(fs.readFileSync('../run_state.json', 'utf8'));
    }
    runState.reachability = reachabilityData;
    runState.timestamps = runState.timestamps || {};
    runState.timestamps.reachability_completed_at = new Date().toISOString();
    fs.writeFileSync('../run_state.json', JSON.stringify(runState, null, 2));

    logPipeline(`complete. ${reachabilityCves.length} CVEs: ${reachableCount} REACHABLE, ${uncertainCount} UNCERTAIN.`);
}

try {
    run();
} catch (err) {
    logPipeline(`stage failed: ${err.message}`);
    let runState = {};
    if (fs.existsSync('../run_state.json')) {
        runState = JSON.parse(fs.readFileSync('../run_state.json', 'utf8'));
    }
    runState.reachability = runState.reachability || {};
    runState.reachability.stage_failed = true;
    runState.reachability.error = err.message;
    fs.writeFileSync('../run_state.json', JSON.stringify(runState, null, 2));
    process.exit(0);
}
