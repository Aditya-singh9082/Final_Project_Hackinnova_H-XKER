const fs = require('fs');

const modifications = [
    {
        file: './seed-repo-vulnerable/scanner.js',
        find: "fs.writeFileSync('run_state.json', JSON.stringify(runState, null, 2));",
        replace: `runState.timestamps = runState.timestamps || {};
    runState.timestamps.started_at = new Date().toISOString();
    runState.timestamps.scan_completed_at = new Date().toISOString();
    fs.writeFileSync('../run_state.json', JSON.stringify(runState, null, 2));`,
        statePath: "fs.existsSync('run_state.json')",
        statePathRep: "fs.existsSync('../run_state.json')",
        stateRead: "fs.readFileSync('run_state.json'",
        stateReadRep: "fs.readFileSync('../run_state.json'"
    },
    {
        file: './seed-repo-vulnerable/reachability.js',
        find: "fs.writeFileSync('run_state.json', JSON.stringify(runState, null, 2));",
        replace: `runState.timestamps = runState.timestamps || {};
runState.timestamps.reachability_completed_at = new Date().toISOString();
fs.writeFileSync('../run_state.json', JSON.stringify(runState, null, 2));`,
        statePath: "fs.existsSync('run_state.json')",
        statePathRep: "fs.existsSync('../run_state.json')",
        stateRead: "fs.readFileSync('run_state.json'",
        stateReadRep: "fs.readFileSync('../run_state.json'"
    },
    {
        file: './seed-repo-vulnerable/patch-generator.js',
        find: "fs.writeFileSync('run_state.json', JSON.stringify(runState, null, 2));",
        replace: `runState.timestamps = runState.timestamps || {};
runState.timestamps.patch_generated_at = new Date().toISOString();
fs.writeFileSync('../run_state.json', JSON.stringify(runState, null, 2));`,
        statePath: "fs.existsSync('run_state.json')",
        statePathRep: "fs.existsSync('../run_state.json')",
        stateRead: "fs.readFileSync('run_state.json'",
        stateReadRep: "fs.readFileSync('../run_state.json'"
    }
];

for (const mod of modifications) {
    if (fs.existsSync(mod.file)) {
        let content = fs.readFileSync(mod.file, 'utf8');
        
        if (mod.statePath) content = content.replace(mod.statePath, mod.statePathRep);
        if (mod.stateRead) content = content.replace(mod.stateRead, mod.stateReadRep);
        
        content = content.replace(mod.find, mod.replace);
        fs.writeFileSync(mod.file, content);
        console.log(`Updated ${mod.file}`);
    } else {
        console.error(`Missing ${mod.file}`);
    }
}
