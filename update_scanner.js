const fs = require('fs');

const bfsLogic = `    const packagesToScan = new Map();
    let depth_limit_reached = false;
    const MAX_DEPTH = 3;
    const MAX_PACKAGES = 2000;

    function resolvePackagePath(packages, currentPath, depName) {
        let searchPath = currentPath;
        while (searchPath !== undefined) {
            const checkPath = searchPath === "" ? \`node_modules/\${depName}\` : \`\${searchPath}/node_modules/\${depName}\`;
            if (packages[checkPath]) return checkPath;
            if (searchPath === "") break;
            const lastIndex = searchPath.lastIndexOf('/node_modules/');
            if (lastIndex >= 0) searchPath = searchPath.substring(0, lastIndex);
            else searchPath = "";
        }
        return null;
    }

    if (fs.existsSync('package-lock.json')) {
        logPipeline("Reading from package-lock.json with BFS traversal (depth=" + MAX_DEPTH + ")");
        const lockfileData = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
        if (lockfileData.packages) {
            const rootPkg = lockfileData.packages[""];
            const queue = [];
            
            if (rootPkg && rootPkg.dependencies) {
                for (const depName of Object.keys(rootPkg.dependencies)) {
                    queue.push({ name: depName, currentPath: "", depth: 1, pathString: depName });
                }
            }

            let processedCount = 0;
            while (queue.length > 0) {
                if (processedCount >= MAX_PACKAGES) {
                    depth_limit_reached = true;
                    logPipeline(\`WARNING: Depth limit / MAX_PACKAGES (\${MAX_PACKAGES}) reached. Stopping traversal.\`);
                    break;
                }
                const { name, currentPath, depth, pathString } = queue.shift();
                
                const resolvedPath = resolvePackagePath(lockfileData.packages, currentPath, name);
                if (!resolvedPath) continue;
                const pkgData = lockfileData.packages[resolvedPath];
                if (pkgData.dev) continue;
                
                const version = pkgData.version;
                if (!version) continue;

                const mapKey = \`\${name}@\${version}\`;
                if (!packagesToScan.has(mapKey)) {
                    packagesToScan.set(mapKey, { name, version, depth, dependency_path: pathString });
                    processedCount++;
                    
                    if (depth < MAX_DEPTH && pkgData.dependencies) {
                        for (const subDepName of Object.keys(pkgData.dependencies)) {
                            queue.push({
                                name: subDepName,
                                currentPath: resolvedPath,
                                depth: depth + 1,
                                pathString: \`\${pathString} -> \${subDepName}\`
                            });
                        }
                    }
                }
            }
        } else if (lockfileData.dependencies) {
            for (const [name, dep] of Object.entries(lockfileData.dependencies)) {
                packagesToScan.set(\`\${name}@\${dep.version}\`, { name, version: dep.version, depth: 1, dependency_path: name });
            }
        }
    } else {
        logPipeline("No package-lock.json found. Reading from node_modules directly...");
        const nodeModulesPath = 'node_modules';
        if (fs.existsSync(nodeModulesPath)) {
            const entries = fs.readdirSync(nodeModulesPath, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
                if (entry.name.startsWith('@')) {
                    const scopedEntries = fs.readdirSync(nodeModulesPath + '/' + entry.name, { withFileTypes: true });
                    for (const se of scopedEntries) {
                        if (!se.isDirectory()) continue;
                        try {
                            const p = JSON.parse(fs.readFileSync(nodeModulesPath + '/' + entry.name + '/' + se.name + '/package.json', 'utf8'));
                            const n = \`\${entry.name}/\${se.name}\`;
                            packagesToScan.set(\`\${n}@\${p.version}\`, { name: n, version: p.version, depth: 1, dependency_path: n });
                        } catch(e) {}
                    }
                } else {
                    try {
                        const p = JSON.parse(fs.readFileSync(nodeModulesPath + '/' + entry.name + '/package.json', 'utf8'));
                        packagesToScan.set(\`\${entry.name}@\${p.version}\`, { name: entry.name, version: p.version, depth: 1, dependency_path: entry.name });
                    } catch(e) {}
                }
            }
        }
    }`;

function updateScanner(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace the strategy block
    const oldStrategyRegex = /const packagesToScan = new Map\(\);\s*\/\/\s*Strategy 1:[\s\S]*?\}\s*\}/m;
    content = content.replace(oldStrategyRegex, bfsLogic);

    // Update batch iteration
    content = content.replace('const packagesList = Array.from(packagesToScan.entries());', 'const packagesList = Array.from(packagesToScan.values());');
    content = content.replace('await Promise.all(batch.map(async ([name, version]) => {', 'await Promise.all(batch.map(async ({ name, version, depth, dependency_path }) => {');

    // Update cve creation
    content = content.replace(
        "uniqueCves.set(key, { package: name, version, cve_id, severity, fixed_version: fixed_version || 'unknown', affected_range: 'unknown', source: 'OSV' });",
        "uniqueCves.set(key, { package: name, version, cve_id, severity, fixed_version: fixed_version || 'unknown', affected_range: 'unknown', source: 'OSV', depth, dependency_path });"
    );
    
    // Inject depth_limit_reached to runState
    content = content.replace(
        "runState.scanner = { detected_cves, failed_packages, stage_failed: false, error: \"\" };",
        "runState.scanner = { detected_cves, failed_packages, stage_failed: false, error: \"\", depth_limit_reached };"
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Updated " + filePath);
}

updateScanner('scanner.js');
updateScanner('juice-shop-pipeline/scanner.js');
