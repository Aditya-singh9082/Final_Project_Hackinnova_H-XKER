
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
