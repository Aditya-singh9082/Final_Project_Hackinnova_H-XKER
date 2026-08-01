const fs = require('fs');
const oldAdvisories = JSON.parse(fs.readFileSync('juice-shop-pipeline/advisories.json', 'utf8')); // The old 51 CVEs from the pipeline folder
const newAdvisories = JSON.parse(fs.readFileSync('juice-shop-test/advisories.json', 'utf8')); // The new 73 CVEs

const oldIds = new Set(oldAdvisories.map(a => a.package + '@' + a.cve_id));
const added = newAdvisories.filter(a => !oldIds.has(a.package + '@' + a.cve_id));

console.log("New CVEs found: " + added.length);
added.forEach(a => {
    console.log(`${a.package}@${a.version} | ${a.cve_id} | Depth: ${a.depth} | Path: ${a.dependency_path}`);
});
