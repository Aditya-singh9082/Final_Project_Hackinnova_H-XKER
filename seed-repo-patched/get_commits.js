const https = require('https');

function fetchAdvisories(owner, repo, callback) {
  const options = {
    hostname: 'api.github.com',
    port: 443,
    path: `/repos/${owner}/${repo}/security-advisories`,
    method: 'GET',
    headers: { 'User-Agent': 'Node.js', 'Accept': 'application/vnd.github.v3+json' }
  };
  https.get(options, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => callback(JSON.parse(data)));
  });
}

fetchAdvisories('lodash', 'lodash', (data) => {
  const adv = data.find(a => a.cve_id === 'CVE-2020-8203');
  console.log('Lodash CVE-2020-8203:', adv ? adv.description.substring(0, 200) : 'Not found');
});

fetchAdvisories('markedjs', 'marked', (data) => {
  const adv = data.find(a => a.cve_id === 'CVE-2017-16114');
  console.log('Marked CVE-2017-16114:', adv ? adv.description.substring(0, 200) : 'Not found');
});
