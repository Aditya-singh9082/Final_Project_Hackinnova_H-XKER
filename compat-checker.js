const fs = require('fs');
const acorn = require('./seed-repo-patched/node_modules/acorn');
const walk = require('./seed-repo-patched/node_modules/acorn-walk');

// Function to safely extract exported function signatures from a JS file
function extractExports(filePath, mainObjName) {
    const code = fs.readFileSync(filePath, 'utf8');
    const ast = acorn.parse(code, { ecmaVersion: 2020, locations: false });
    
    const functions = {};
    
    // First pass: collect all FunctionDeclarations
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

    // Second pass: find what is exported or attached to mainObjName
    walk.simple(ast, {
        AssignmentExpression(node) {
            if (node.left.type === 'MemberExpression') {
                let objName = '';
                if (node.left.object.type === 'Identifier') objName = node.left.object.name;
                
                if (objName === mainObjName || (objName === 'module' && node.left.property.name === 'exports')) {
                    const propName = node.left.property.name || (node.left.property.value);
                    if (propName) {
                        if (node.right.type === 'Identifier') {
                            if (functions[node.right.name]) {
                                exports[propName] = functions[node.right.name];
                            }
                        } else if (node.right.type === 'FunctionExpression' || node.right.type === 'ArrowFunctionExpression') {
                            const args = node.right.params.map(p => p.type === 'Identifier' ? p.name : 'arg');
                            exports[propName] = args;
                        }
                    }
                }
            }
        }
    });
    
    // Add the main object itself if it is a function
    if (functions[mainObjName]) {
        exports[mainObjName] = functions[mainObjName];
    }
    
    return exports;
}

function compareSymbols(pkgName, oldExports, newExports, usedFunction) {
    const removed = [];
    const changed_signature = [];
    const added = [];
    
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
    
    let usedStatus = "unchanged";
    if (removed.includes(usedFunction)) {
        usedStatus = "removed";
    } else if (changed_signature.includes(usedFunction)) {
        usedStatus = "changed";
    }
    
    const verdict = (usedStatus === "unchanged") ? "PASS" : "WARN";
    
    return {
        package: pkgName,
        removed,
        changed_signature,
        added,
        used_functions_status: {
            [usedFunction]: usedStatus
        },
        verdict
    };
}

console.log('Running API Compatibility Checker (Phase 5)...');

// Lodash
const lodashOld = extractExports('./seed-repo-vulnerable/node_modules/lodash/lodash.js', 'lodash');
const lodashNew = extractExports('./seed-repo-patched/node_modules/lodash/lodash.js', 'lodash');
const lodashReport = compareSymbols('lodash', lodashOld, lodashNew, 'zipObjectDeep');

console.log('\\n--- Lodash ---');
console.log(`Vulnerable exports for zipObjectDeep: ${lodashOld.zipObjectDeep ? lodashOld.zipObjectDeep.join(', ') : 'Not found'}`);
console.log(`Patched exports for zipObjectDeep: ${lodashNew.zipObjectDeep ? lodashNew.zipObjectDeep.join(', ') : 'Not found'}`);
console.log(`Verdict: ${lodashReport.verdict}`);

// Marked
const markedOld = extractExports('./seed-repo-vulnerable/node_modules/marked/lib/marked.js', 'marked');
const markedNew = extractExports('./seed-repo-patched/node_modules/marked/lib/marked.js', 'marked');
const markedReport = compareSymbols('marked', markedOld, markedNew, 'marked');

console.log('\\n--- Marked ---');
console.log(`Vulnerable exports for marked(): ${markedOld.marked ? markedOld.marked.join(', ') : 'Not found'}`);
console.log(`Patched exports for marked(): ${markedNew.marked ? markedNew.marked.join(', ') : 'Not found'}`);
console.log(`Verdict: ${markedReport.verdict}`);

// Save individual reports
fs.writeFileSync('compat_report_lodash.json', JSON.stringify(lodashReport, null, 2));
fs.writeFileSync('compat_report_marked.json', JSON.stringify(markedReport, null, 2));

// Update run_state.json
let runState = {};
if (fs.existsSync('run_state.json')) {
    runState = JSON.parse(fs.readFileSync('run_state.json', 'utf8'));
}
// Adjusted schema slightly to support an array of reports.
runState.compat_checker = {
    reports: [lodashReport, markedReport]
};
fs.writeFileSync('run_state.json', JSON.stringify(runState, null, 2));

console.log('\\ncompat_report files written. run_state.json updated.');
