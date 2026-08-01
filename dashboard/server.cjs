const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3001;

app.use(cors());

// Serve the shared state
app.get('/api/state', (req, res) => {
    const runStatePath = path.join(__dirname, '..', 'run_state.json');
    try {
        if (fs.existsSync(runStatePath)) {
            const data = fs.readFileSync(runStatePath, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.status(404).json({ error: "run_state.json not found" });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Serve reachability summary
app.get('/api/reachability-summary', (req, res) => {
    try {
        const advPath = path.join(__dirname, '..', 'seed-repo-patched', 'advisories.json');
        const reachPath = path.join(__dirname, '..', 'seed-repo-patched', 'reachability.json');
        
        let advData = { cves: [] };
        let reachData = { cves: [] };
        
        if (fs.existsSync(advPath)) advData = JSON.parse(fs.readFileSync(advPath, 'utf8'));
        if (fs.existsSync(reachPath)) reachData = JSON.parse(fs.readFileSync(reachPath, 'utf8'));

        const summary = {};
        
        advData.cves.forEach(cve => {
            if (!summary[cve.package]) summary[cve.package] = { name: cve.package, total: 0, reachable: 0 };
            summary[cve.package].total++;
        });
        
        reachData.cves.forEach(cve => {
            if (cve.verdict === 'REACHABLE' && summary[cve.package]) {
                summary[cve.package].reachable++;
            }
        });
        
        res.json(Object.values(summary));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Serve PR bodies
app.get('/api/pr/:package', (req, res) => {
    const pkg = req.params.package;
    const prPath = path.join(__dirname, '..', `pr_body_${pkg}.md`);
    try {
        if (fs.existsSync(prPath)) {
            const data = fs.readFileSync(prPath, 'utf8');
            res.send(data);
        } else {
            res.status(404).send("PR body not found for " + pkg);
        }
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Re-run pipeline endpoint (SSE)
app.get('/api/rerun', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const steps = [
        { id: 'scan', dir: 'seed-repo-vulnerable', script: 'scanner.js' },
        { id: 'reach', dir: 'seed-repo-vulnerable', script: 'reachability.js' },
        { id: 'copy', type: 'internal' }, // Special step to copy file
        { id: 'patch', dir: 'seed-repo-patched', script: 'patch-generator.js' },
        { id: 'verify', dir: '.', script: 'exploit-verifier.js' },
        { id: 'compat', dir: '.', script: 'compat-checker.js' },
        { id: 'regress', dir: '.', script: 'regression-runner.js' },
        { id: 'pr', dir: '.', script: 'pr-composer.js' }
    ];

    let currentStep = 0;

    const runNext = () => {
        if (currentStep >= steps.length) {
            sendEvent({ stage: 'done', status: 'complete' });
            res.end();
            return;
        }

        const step = steps[currentStep];
        sendEvent({ stage: step.id, status: 'running' });

        if (step.id === 'copy') {
            try {
                const src = path.join(__dirname, '..', 'seed-repo-vulnerable', 'advisories.json');
                const dest = path.join(__dirname, '..', 'seed-repo-patched', 'advisories.json');
                fs.copyFileSync(src, dest);
                sendEvent({ stage: step.id, status: 'complete' });
                currentStep++;
                runNext();
            } catch (err) {
                sendEvent({ stage: step.id, status: 'failed', error: err.message });
                res.end();
            }
            return;
        }

        const cwd = path.join(__dirname, '..', step.dir);
        const child = spawn('node', [step.script], { cwd });

        child.on('close', (code) => {
            if (code === 0) {
                sendEvent({ stage: step.id, status: 'complete' });
                currentStep++;
                runNext();
            } else {
                sendEvent({ stage: step.id, status: 'failed', code });
                res.end();
            }
        });
        
        child.on('error', (err) => {
             sendEvent({ stage: step.id, status: 'failed', error: err.message });
             res.end();
        });
    };

    runNext();
});

app.listen(PORT, () => {
    console.log(`Backend API running at http://localhost:${PORT}`);
});
