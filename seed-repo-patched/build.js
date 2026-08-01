const minimist = require('minimist');

const args = minimist(process.argv.slice(2));
console.log('Building with args:', args);
// Used in build script, but not reachable from the main app entry point
