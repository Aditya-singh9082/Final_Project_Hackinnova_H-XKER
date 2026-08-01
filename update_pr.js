const fs = require('fs');

function updatePrComposer(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    const searchStr = `        const reachInfo = (runState.reachability && runState.reachability.cves || []).find(c => patch.cve_ids.includes(c.cve_id));`;
    const replaceStr = `        const reachInfo = (runState.reachability && runState.reachability.cves || []).find(c => patch.cve_ids.includes(c.cve_id));
        const context = reachInfo ? reachInfo.context : 'n/a';
        let contextNote = '';
        if (context === 'build_time') {
            contextNote = '\\n\\n### \u26A0\uFE0F Build-Time Vulnerability\\nNote: this vulnerability is only reachable in a build-time script, not the running application \u2014 lower production risk, but still recommended to patch since build environments can be a supply-chain attack vector too.';
        }`;

    content = content.replace(searchStr, replaceStr);

    const prBodySearch = `const prBody = \`## \uD83D\uDD12 Security Patch: \${pkg}`;
    const prBodyReplace = `const prBody = \`## \uD83D\uDD12 Security Patch: \${pkg}\${contextNote}`;

    content = content.replace(prBodySearch, prBodyReplace);

    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Updated " + filePath);
}

updatePrComposer('pr-composer.js');
updatePrComposer('juice-shop-pipeline/pr-composer.js');
