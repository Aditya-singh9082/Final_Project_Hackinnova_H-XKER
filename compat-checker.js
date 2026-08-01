const fs = require('fs');
const path = require('path');
const acorn = require('./seed-repo-patched/node_modules/acorn');
const walk = require('./seed-repo-patched/node_modules/acorn-walk');

function logPipeline(msg) {
    const logLine = `[${new Date().toISOString()}] compat-checker: ${msg}\n`;
    fs.appendFileSync('pipeline.log', logLine);
    console.log(`compat-checker: ${msg}`);
}

function extractExports(filePath) {
    if (!fs.existsSync(filePath)) return {};
    try {
        const code = fs.readFileSync(filePath, 'utf8');
        const ast = acorn.parse(code, { ecmaVersion: 2020, locations: false, sourceType: 'module' });
        
        const functions = {};
        
        walk.simple(ast, {
            FunctionDeclaration(node) {
                if (node.id) {
                    const args = node.params.map(p => p.type === 'Identifier' ? p.name : (p.type === 'AssignmentPattern' && p.left.type === 'Identifier' ? p.left.name : 'arg'));
                    functions[node.id.name] = args;
                }
            },
            FunctionExpression(node) {
                if (node.id) {
                    const args = node.params.map(p => p.type === 'Identifier' ? p.name : 'arg');
                    functions[node.id.name] = args;
                }
            }
        });

        const exports = {};

        walk.simple(ast, {
            AssignmentExpression(node) {
                if (node.left.type === 'MemberExpression') {
                    let objName = '';
                    if (node.left.object.type === 'Identifier') objName = node.left.object.name;
                    
                    if (objName === 'module' && node.left.property.name === 'exports') {
                        if (node.right.type === 'Identifier' && functions[node.right.name]) {
                            exports['default'] = functions[node.right.name];
                        } else if (node.right.type === 'FunctionExpression' || node.right.type === 'ArrowFunctionExpression') {
                            const args = node.right.params.map(p => p.type === 'Identifier' ? p.name : 'arg');
                            exports['default'] = args;
                        }
                    } else if (objName === 'exports' || (node.left.object.type === 'MemberExpression' && node.left.object.property.name === 'exports')) {
                        const propName = node.left.property.name || (node.left.property.value);
                        if (propName) {
                            if (node.right.type === 'Identifier' && functions[node.right.name]) {
                                exports[propName] = functions[node.right.name];
                            } else if (node.right.type === 'FunctionExpression' || node.right.type === 'ArrowFunctionExpression') {
                                const args = node.right.params.map(p => p.type === 'Identifier' ? p.name : 'arg');
                                exports[propName] = args;
                            }
                        }
                    }
                }
            },
            ExportNamedDeclaration(node) {
                if (node.declaration && node.declaration.type === 'FunctionDeclaration') {
                    if (node.declaration.id) {
                        exports[node.declaration.id.name] = functions[node.declaration.id.name];
                    }
                }
            }
        });
        
        return exports;
    } catch (e) {
        return {};
    }
}

function compareSymbols(pkgName, oldExports, newExports) {
    const removed = [];
    const changed_signature = [];
    const added = [];
    
    if (Object.keys(oldExports).length === 0 && Object.keys(newExports).length === 0) {
        return {
            package: pkgName,
            removed,
            changed_signature,
            added,
            verdict: "PASS (No exports detected)"
        };
    }

    for (const key in oldExports) {
        if (!newExports[key]) {
            removed.push(key);
        } else {
            const oldArgs = oldExports[key].join(',');
            const newArgs = newExports[key].join(',');
            if (oldArgs !== newArgs) {
                changed_signature.push(key);
            }
        }
    }
    
    for (const key in newExports) {
        if (!oldExports[key]) {
            added.push(key);
        }
    }
    
    let verdict = (removed.length === 0 && changed_signature.length === 0) ? "PASS" : "WARN";
    
    return {
        package: pkgName,
        removed,
        changed_signature,
        added,
        verdict
    };
}

function run() {
    logPipeline("started");
    
    let runState = {};
    if (fs.existsSync('run_state.json')) {
        runState = JSON.parse(fs.readFileSync('run_state.json', 'utf8'));
        if (runState.compat_checker && runState.compat_checker.stage_failed === false && runState.compat_checker.reports) {
            logPipeline("stage already completed successfully. Skipping.");
            return;
        }
    }

    if (!runState.patch_generator || !runState.patch_generator.patches) {
        logPipeline("No patches found to check compatibility.");
        return;
    }

    const reports = [];

    for (const patch of runState.patch_generator.patches) {
        const pkg = patch.package;
        logPipeline(`Checking compatibility for ${pkg}...`);
        
        let mainFile = 'index.js';
        const pkgJsonPathVuln = path.join('seed-repo-vulnerable', 'node_modules', pkg, 'package.json');
        if (fs.existsSync(pkgJsonPathVuln)) {
            const p = JSON.parse(fs.readFileSync(pkgJsonPathVuln, 'utf8'));
            if (p.main) mainFile = p.main;
        }
        
        let oldFile = path.join('seed-repo-vulnerable', 'node_modules', pkg, mainFile);
        if (!fs.existsSync(oldFile) && fs.existsSync(oldFile + '.js')) oldFile += '.js';
        
        let newFile = path.join('seed-repo-patched', 'node_modules', pkg, mainFile);
        if (!fs.existsSync(newFile) && fs.existsSync(newFile + '.js')) newFile += '.js';
        
        const oldExports = extractExports(oldFile);
        const newExports = extractExports(newFile);
        
        const report = compareSymbols(pkg, oldExports, newExports);
        reports.push(report);
    }

    runState = {};
    if (fs.existsSync('run_state.json')) {
        runState = JSON.parse(fs.readFileSync('run_state.json', 'utf8'));
    }
    runState.compat_checker = { reports: reports, stage_failed: false, error: "" };
    runState.timestamps = runState.timestamps || {};
    runState.timestamps.compat_completed_at = new Date().toISOString();
    fs.writeFileSync('run_state.json', JSON.stringify(runState, null, 2));

    logPipeline(`complete. Checked ${reports.length} packages.`);
}

try {
    run();
} catch (err) {
    logPipeline(`stage failed: ${err.message}`);
    let runState = {};
    if (fs.existsSync('run_state.json')) {
        runState = JSON.parse(fs.readFileSync('run_state.json', 'utf8'));
    }
    runState.compat_checker = runState.compat_checker || {};
    runState.compat_checker.stage_failed = true;
    runState.compat_checker.error = err.message;
    fs.writeFileSync('run_state.json', JSON.stringify(runState, null, 2));
    process.exit(0);
}
