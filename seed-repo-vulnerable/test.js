const assert = require('assert');
const { processData } = require('./index.js');

console.log("Running minimal test suite for index.js...");

try {
    const result = processData({ markdown: '# Hello World' });

    // Verify marked output
    assert.ok(result.html.includes('<h1 id="hello-world">Hello World</h1>'), "HTML parsing failed or unexpected output");

    // Verify lodash zipObjectDeep output
    assert.deepStrictEqual(result.config, { a: { b: [{ c: 1 }, { d: 2 }] } }, "Config object shape is incorrect");

    console.log("All tests passed successfully.");
    process.exit(0);
} catch (e) {
    console.error("Test failed!", e);
    process.exit(1);
}
