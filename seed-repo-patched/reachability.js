const fs = require('fs');
const acorn = require('acorn');
const walk = require('acorn-walk');

const advisories = JSON.parse(fs.readFileSync('advisories.json', 'utf8'));

// Shallow AST parsing of index.js
const code = fs.readFileSync('index.js', 'utf8');
const ast = acorn.parse(code, { ecmaVersion: 2020 });

const imports = {}; // package_name -> variable_name
const usages = {};  // variable_name -> array of usage locations

// Pass 1: Find requires
walk.simple(ast, {
    VariableDeclarator(node) {
        if (node.init && node.init.type === 'CallExpression' && 
            node.init.callee.name === 'require' && 
            node.init.arguments.length > 0) {
            const pkgName = node.init.arguments[0].value;
            const varName = node.id.name;
            imports[pkgName] = varName;
            usages[varName] = [];
        }
    }
});

// Pass 2: Find usages (MemberExpressions and CallExpressions involving the variable)
walk.simple(ast, {
    MemberExpression(node) {
        if (node.object.type === 'Identifier' && usages[node.object.name] !== undefined) {
            usages[node.object.name].push(`property access: ${node.property.name}`);
        }
    },
    CallExpression(node) {
        if (node.callee.type === 'Identifier' && usages[node.callee.name] !== undefined) {
            usages[node.callee.name].push(`function call`);
        }
    }
});

const reachabilityCves = [];
let reachableCount = 0;

for (const vuln of advisories) {
    let verdict = "NOT_REACHABLE";
    let evidence = "Package is not imported in main entry point.";

    const varName = imports[vuln.package];
    if (varName !== undefined) {
        // It's imported
        if (usages[varName] && usages[varName].length > 0) {
            verdict = "REACHABLE";
            evidence = `Called via index.js -> ${varName} (${usages[varName].join(', ')})`;
            reachableCount++;
        } else {
            evidence = `Package imported as '${varName}' but never invoked.`;
        }
    }

    reachabilityCves.push({
        cve_id: vuln.cve_id,
        package: vuln.package,
        verdict: verdict,
        evidence: evidence
    });
}

const reachabilityData = { cves: reachabilityCves };
fs.writeFileSync('reachability.json', JSON.stringify(reachabilityData, null, 2));

let runState = {};
if (fs.existsSync('../run_state.json')) {
    runState = JSON.parse(fs.readFileSync('../run_state.json', 'utf8'));
}
runState.reachability = reachabilityData;
runState.timestamps = runState.timestamps || {};
runState.timestamps.reachability_completed_at = new Date().toISOString();
fs.writeFileSync('../run_state.json', JSON.stringify(runState, null, 2));

console.log(`Reachability scan complete.`);
console.log(`Evaluated ${advisories.length} CVEs.`);
const reachableCves = reachabilityCves.filter(c => c.verdict === 'REACHABLE');
console.log(`Found ${reachableCves.length} REACHABLE CVEs.`);

// Print summary by package
const uniquePackages = [...new Set(advisories.map(a => a.package))];
uniquePackages.forEach(pkg => {
    const pkgCves = reachabilityCves.filter(c => c.package === pkg);
    const reachableForPkg = pkgCves.filter(c => c.verdict === 'REACHABLE').length;
    console.log(`- ${pkg}: ${pkgCves.length} CVEs (${reachableForPkg} REACHABLE)`);
});
