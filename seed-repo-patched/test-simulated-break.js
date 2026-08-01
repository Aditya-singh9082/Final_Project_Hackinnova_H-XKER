const assert = require('assert');
const { processData } = require('./index.js');
const lodashPkg = require('lodash/package.json');

console.log("Running simulated regression test...");

try {
    const result = processData({ markdown: '# Hello World' });

    // Verify marked output
    assert.ok(result.html.includes('<h1 id="hello-world">Hello World</h1>'), "HTML parsing failed or unexpected output");

    // Simulated Regression Assertion:
    // This specifically expects the exact vulnerable behavior/version.
    // In a real scenario, this would be an API shape change. Here we just assert the version.
    assert.strictEqual(lodashPkg.version, '4.17.15', "SIMULATED REGRESSION: API behavior changed in patch");

    console.log("Simulated tests passed successfully.");
    process.exit(0);
} catch (e) {
    console.error("Test failed!", e);
    process.exit(1);
}
