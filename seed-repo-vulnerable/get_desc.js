const https = require('https');

const cves = ['CVE-2020-28500', 'CVE-2021-23337', 'CVE-2025-13465', 'CVE-2020-8203', 'CVE-2022-21681', 'CVE-2017-1000427', 'CVE-2018-25110', 'CVE-2022-21680', 'CVE-2016-10531', 'CVE-2017-16114'];

cves.forEach(cve => {
  https.get(`https://api.osv.dev/v1/vulns/${cve}`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const vuln = JSON.parse(data);
      if (vuln.details) {
        console.log(`\n--- ${cve} ---`);
        console.log(vuln.details.substring(0, 300) + '...');
      }
    });
  });
});
