const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');
const https = require('https');

const MAX_REPO_SIZE_KB = 500000; // 500 MB
const CLONE_TIMEOUT_MS = 120000; // 2 minutes

function log(msg) {
    console.error(`[CloneManager] ${msg}`);
}

async function getRepoSize(owner, repo) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${owner}/${repo}`,
            method: 'GET',
            headers: { 'User-Agent': 'SecurityEngine-CloneManager' }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const info = JSON.parse(data);
                        resolve(info.size); // size in KB
                    } catch (e) {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });
        });
        req.on('error', () => resolve(null));
        req.end();
    });
}

async function main() {
    const args = process.argv.slice(2);
    const autoInstallIndex = args.indexOf('--auto-install');
    const autoInstall = autoInstallIndex !== -1;
    if (autoInstall) {
        args.splice(autoInstallIndex, 1);
    }
    const repoUrl = args[0];

    if (!repoUrl) {
        log("Error: Missing repository URL.");
        process.exit(1);
    }

    const githubRegex = /^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(\.git)?$/;
    const match = repoUrl.match(githubRegex);

    if (!match) {
        log("Error: Invalid URL. Only GitHub URLs (https://github.com/owner/repo) are supported.");
        process.exit(1);
    }

    const owner = match[1];
    let repoName = match[2];
    if (repoName.endsWith('.git')) repoName = repoName.slice(0, -4);

    log(`Valid GitHub URL detected. Owner: ${owner}, Repo: ${repoName}`);

    // Check size
    const sizeKb = await getRepoSize(owner, repoName);
    if (sizeKb !== null) {
        if (sizeKb > MAX_REPO_SIZE_KB) {
            log(`Error: Repository size (${Math.round(sizeKb / 1024)}MB) exceeds limit of ${MAX_REPO_SIZE_KB / 1024}MB.`);
            process.exit(1);
        }
        log(`Repository size check passed: ${Math.round(sizeKb / 1024)}MB.`);
    } else {
        log("Warning: Could not verify repository size via API. Proceeding with caution.");
    }

    const timestamp = Date.now();
    const sandboxBase = path.join(__dirname, 'scanned-repos');
    if (!fs.existsSync(sandboxBase)) fs.mkdirSync(sandboxBase);

    const targetDir = path.join(sandboxBase, `${repoName}-${timestamp}`);
    
    log(`Cloning into ${targetDir}... (Timeout: ${CLONE_TIMEOUT_MS/1000}s)`);
    const startTime = Date.now();
    
    const cloneResult = spawnSync('git', ['clone', '--depth=1', repoUrl, targetDir], {
        timeout: CLONE_TIMEOUT_MS,
        encoding: 'utf8'
    });

    if (cloneResult.error || cloneResult.status !== 0) {
        log("Error during git clone: " + (cloneResult.error ? cloneResult.error.message : cloneResult.stderr));
        process.exit(1);
    }
    
    const cloneDuration = Date.now() - startTime;
    log(`Clone completed in ${cloneDuration}ms.`);

    if (autoInstall) {
        log("Auto-install requested. Running npm install...");
        try {
            execSync('npm install --legacy-peer-deps', { cwd: targetDir, stdio: 'ignore', timeout: 300000 });
            log("npm install completed.");
        } catch (e) {
            log("npm install failed or timed out: " + e.message);
        }
    } else {
        log("Clone complete. npm install not run \u2014 will only proceed with explicit confirmation (--auto-install).");
    }

    const stateFile = path.join(targetDir, 'run_state.json');
    const initialState = {
        repo_url: repoUrl,
        cloned_at: new Date().toISOString(),
        local_path: targetDir,
        clone_duration_ms: cloneDuration,
        timestamps: {}
    };
    fs.writeFileSync(stateFile, JSON.stringify(initialState, null, 2));

    log("Initialization complete.");
    
    // Output JSON for the backend caller
    console.log(JSON.stringify({
        success: true,
        targetDir: targetDir,
        stateFile: stateFile
    }));
}

main().catch(err => {
    log("Unhandled error: " + err.message);
    process.exit(1);
});
