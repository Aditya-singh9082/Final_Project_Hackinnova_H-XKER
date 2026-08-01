const _ = require('lodash');
const marked = require('marked');
const axios = require('axios'); // Imported but not used

function processData(userInput) {
    // Reachable 1: lodash prototype pollution via zipObjectDeep
    const config = _.zipObjectDeep(['a.b[0].c', 'a.b[1].d'], [1, 2]);
    
    // Reachable 2: marked ReDoS via user input rendering
    const html = marked(userInput.markdown || '');
    
    return { config, html };
}

module.exports = { processData };
