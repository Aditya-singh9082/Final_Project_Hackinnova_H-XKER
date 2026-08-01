const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const scheduler = require('../scheduler.js');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Global state to track the active scan context
let activeStateFile = path.join(__dirname, '..', 'juice-shop-run_state.json');

// New endpoint: clone repository
app.post('/api/clone', (req, res) => {
    const { url, autoInstall } = req.body;
    if (!url) return res.status(400).json({ error: "Missing url" });

    const args = ['clone-manager.js', url];
    if (autoInstall) args.push('--auto-install');

    const cwd = path.join(__dirname, '..');
    const child = spawn('node', args, { cwd });

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (data) => stdoutData += data.toString());
    child.stderr.on('data', (data) => stderrData += data.toString());

    child.on('close', (code) => {
        if (code !== 0) {
            console.error("Clone failed:", stderrData);
            return res.status(500).json({ error: "Clone failed", logs: stderrData });
        }
        
        try {
            // Find the JSON output line
            const jsonLines = stdoutData.split('\n').filter(line => line.trim().startsWith('{'));
            const lastJsonLine = jsonLines[jsonLines.length - 1];
            const result = JSON.parse(lastJsonLine);
            
            // Set the new active state file for the dashboard
            if (result.stateFile) {
                activeStateFile = result.stateFile;
            }
            
            res.json(result);
        } catch (e) {
            console.error("Failed to parse clone-manager output:", stdoutData);
            res.status(500).json({ error: "Invalid output from clone-manager", logs: stdoutData });
        }
    });
});

// Serve the shared state
app.get('/api/state', (req, res) => {
    try {
        if (fs.existsSync(activeStateFile)) {
            const data = fs.readFileSync(activeStateFile, 'utf8');
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
        let reachData = { reachability: { cves: [] } };
        
        if (fs.existsSync(activeStateFile)) {
            const state = JSON.parse(fs.readFileSync(activeStateFile, 'utf8'));
            if (state.reachability) reachData = state;
        }

        const summary = {};
        
        // Count from reachability data directly if available
        if (reachData.reachability && reachData.reachability.cves) {
            reachData.reachability.cves.forEach(cve => {
                if (!summary[cve.package]) summary[cve.package] = { name: cve.package, total: 0, reachable: 0, reachable_runtime: 0, reachable_build_time: 0 };
                summary[cve.package].total++;
                if (cve.verdict === 'REACHABLE') {
                    summary[cve.package].reachable++;
                    if (cve.context === 'build_time') {
                        summary[cve.package].reachable_build_time++;
                    } else {
                        summary[cve.package].reachable_runtime++;
                    }
                }
            });
        }
        
        res.json(Object.values(summary));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Serve PR bodies
app.get('/api/pr/:package', (req, res) => {
    const pkg = req.params.package;
    // PR bodies are saved in the same directory as the active state file
    const dir = path.dirname(activeStateFile);
    const prPath = path.join(dir, `pr_body_${pkg}.md`);
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

// Serve success rate metrics
app.get('/api/success-rate', (req, res) => {
    const historyPath = path.join(__dirname, '..', 'run_history.json');
    try {
        if (!fs.existsSync(historyPath)) {
            return res.json({ total_runs: 0, clean_auto_patch_rate: 0, safely_handled_rate: 0, flagged_rate: 0, excluded_rate: 0 });
        }
        const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        const total = history.length;
        if (total === 0) {
            return res.json({ total_runs: 0, clean_auto_patch_rate: 0, safely_handled_rate: 0, flagged_rate: 0, excluded_rate: 0 });
        }

        let success = 0;
        let flagged = 0;
        let excluded = 0;

        history.forEach(entry => {
            if (entry.final_outcome === 'success') success++;
            else if (entry.final_outcome === 'flagged_for_review' || entry.final_outcome === 'manual_review_required') flagged++;
            else if (entry.final_outcome === 'triaged_excluded') excluded++;
        });

        res.json({
            total_runs: total,
            clean_auto_patch_rate: Math.round((success / total) * 100),
            flagged_rate: Math.round((flagged / total) * 100),
            excluded_rate: Math.round((excluded / total) * 100),
            safely_handled_rate: Math.round(((success + flagged + excluded) / total) * 100)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Re-run pipeline endpoint (SSE) dynamically
app.get('/api/scan-repo', (req, res) => {
    const targetDir = req.query.targetDir;
    const stateFile = req.query.stateFile || activeStateFile;

    if (!targetDir || !stateFile) {
        return res.status(400).json({ error: "Missing targetDir or stateFile" });
    }

    // Ensure state file is active
    activeStateFile = stateFile;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // The scripts run in juice-shop-pipeline/ but operate on targetDir
    const pipelineDir = path.join(__dirname, '..', 'juice-shop-pipeline');
    
    const steps = [
        { id: 'scan', script: 'scanner.js' },
        { id: 'reach', script: 'reachability.js' },
        { id: 'patch', script: 'patch-generator.js' },
        { id: 'verify', script: 'exploit-verifier.js' },
        { id: 'compat', script: 'compat-checker.js' },
        { id: 'regress', script: 'regression-runner.js' },
        { id: 'pr', script: 'pr-composer.js' }
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

        const env = Object.assign({}, process.env, {
            TARGET_DIR: targetDir,
            RUN_STATE_PATH: stateFile,
            LOG_PATH: path.join(path.dirname(stateFile), 'pipeline.log')
        });

        const child = spawn('node', [step.script], { cwd: pipelineDir, env });

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

// Fallback for old rerun UI (to avoid breaking things)
app.get('/api/rerun', (req, res) => {
    req.query.targetDir = path.join(__dirname, '..', 'juice-shop-test');
    req.query.stateFile = path.join(__dirname, '..', 'juice-shop-run_state.json');
    
    // In a real scenario we could route this to the old logic or the new logic.
    res.status(400).json({ error: "Use /api/scan-repo instead." });
});

// --- Scheduler Endpoints ---
app.post('/api/schedule/start', (req, res) => {
    const { targetDir, stateFile, intervalMs } = req.body;
    if (!targetDir || !stateFile) return res.status(400).json({ error: "Missing targetDir or stateFile" });
    scheduler.startSchedule(targetDir, stateFile, intervalMs || 300000);
    res.json({ success: true, message: "Monitoring started" });
});

app.post('/api/schedule/stop', (req, res) => {
    const { targetDir } = req.body;
    if (!targetDir) return res.status(400).json({ error: "Missing targetDir" });
    const stopped = scheduler.stopSchedule(targetDir);
    res.json({ success: stopped });
});

app.get('/api/schedule/status', (req, res) => {
    res.json(scheduler.getStatus());
});

app.listen(PORT, () => {
    console.log(`Backend API running at http://localhost:${PORT}`);
});
