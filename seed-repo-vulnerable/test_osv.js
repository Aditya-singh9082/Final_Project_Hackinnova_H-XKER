const https = require('https');

const packages = [
  { name: 'lodash', version: '4.17.15' },
  { name: 'marked', version: '0.3.5' },
  { name: 'axios', version: '0.21.0' },
  { name: 'minimist', version: '1.2.0' },
  { name: 'moment', version: '2.24.0' }
];

packages.forEach(pkg => {
  const postData = JSON.stringify({
    package: { name: pkg.name, ecosystem: 'npm' },
    version: pkg.version
  });

  const options = {
    hostname: 'api.osv.dev',
    port: 443,
    path: '/v1/query',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      const result = JSON.parse(data);
      if (result.vulns && result.vulns.length > 0) {
        console.log(`Success: Found ${result.vulns.length} vulnerabilities for ${pkg.name}@${pkg.version} via OSV API.`);
      } else {
        console.log(`Failed/Clear: No vulnerabilities found for ${pkg.name}@${pkg.version}.`);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request for ${pkg.name}: ${e.message}`);
  });

  req.write(postData);
  req.end();
});
