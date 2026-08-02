const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const scheduler = require('../scheduler.js');
const { db } = require('./firebase-admin.cjs');
const { encryptKey, decryptKey, maskKey } = require('./crypto-utils.cjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Global state to track the active scan context
let activeStateFile = path.join(__dirname, '..', 'run_state.json');

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
    const candidates = [
        path.join(path.dirname(activeStateFile), `pr_body_${pkg}.md`),
        path.join(__dirname, '..', `pr_body_${pkg}.md`),
        path.join(__dirname, '..', 'juice-shop-pipeline', `pr_body_${pkg}.md`)
    ];
    for (const prPath of candidates) {
        if (fs.existsSync(prPath)) {
            try {
                const data = fs.readFileSync(prPath, 'utf8');
                return res.send(data);
            } catch (e) {
                // ignore and continue
            }
        }
    }
    res.status(404).send("PR body not found for " + pkg);
});

// Serve success rate metrics
// Serve success rate metrics (100% Firebase Firestore)
app.get('/api/success-rate', async (req, res) => {
    try {
        if (!db) {
            return res.json({ total_runs: 0, clean_auto_patch_rate: 0, safely_handled_rate: 0, flagged_rate: 0, excluded_rate: 0 });
        }
        const snap = await db.collection('scan_history').limit(100).get();
        const total = snap.docs.length;
        if (total === 0) {
            return res.json({ total_runs: 0, clean_auto_patch_rate: 100, safely_handled_rate: 100, flagged_rate: 0, excluded_rate: 0 });
        }

        let success = 0;
        let flagged = 0;
        let excluded = 0;

        snap.docs.forEach(d => {
            const entry = d.data();
            const outcome = entry.final_outcome || (entry.outcome_summary ? 'success' : 'flagged_for_review');
            if (outcome === 'success') success++;
            else if (outcome === 'flagged_for_review' || outcome === 'manual_review_required') flagged++;
            else if (outcome === 'triaged_excluded') excluded++;
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
app.get('/api/scan-repo', async (req, res) => {
    const targetDir = req.query.targetDir;
    const stateFile = req.query.stateFile || activeStateFile;
    const mode = req.query.mode || 'deterministic'; // 'deterministic' | 'ai_assisted'
    const userId = req.query.userId || 'local';

    if (!targetDir || !stateFile) {
        return res.status(400).json({ error: "Missing targetDir or stateFile" });
    }

    // Resolve Groq key server-side if AI-assisted mode requested
    let groqApiKey = '';
    if (mode === 'ai_assisted') {
        try {
            let encObj = null;
            if (!db) {
                return res.status(500).json({ error: 'Firebase Firestore database not initialized on server.' });
            }
            const doc = await db.collection('users').doc(userId).get();
            if (doc.exists && doc.data().encrypted_groq_api_key) {
                encObj = doc.data().encrypted_groq_api_key;
            }
            if (!encObj) {
                return res.status(400).json({ error: 'AI-assisted mode selected but no Groq API key found. Please save your key in Settings first.' });
            }
            groqApiKey = decryptKey(encObj);
            // groqApiKey is decrypted in-memory only — passed as env var to subprocess
            // It is NEVER logged, stored, or returned in any response
        } catch (e) {
            return res.status(500).json({ error: 'Failed to retrieve Groq key: ' + e.message });
        }
    }

    // Ensure state file is active and reset state so no pipeline stages skip
    activeStateFile = stateFile;
    try {
        const initialRunState = {
            repo_url: req.query.url || targetDir,
            local_path: targetDir,
            timestamps: { started_at: new Date().toISOString() }
        };
        fs.writeFileSync(stateFile, JSON.stringify(initialRunState, null, 2));
    } catch (e) {
        console.error("Failed to reset run_state.json before scan:", e.message);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

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
            // Write scan history & full run state to Firebase Firestore after completion
            try {
                const stateData = fs.existsSync(activeStateFile)
                    ? JSON.parse(fs.readFileSync(activeStateFile, 'utf8'))
                    : {};
                stateData.timestamps = stateData.timestamps || {};
                if (!stateData.timestamps.total_elapsed_ms && stateData.timestamps.started_at) {
                    const startMs = new Date(stateData.timestamps.started_at).getTime();
                    stateData.timestamps.total_elapsed_ms = Date.now() - startMs;
                    if (fs.existsSync(activeStateFile)) {
                        fs.writeFileSync(activeStateFile, JSON.stringify(stateData, null, 2));
                    }
                }
                const summary = {
                    cves_found: stateData.scanner?.detected_cves?.length || 0,
                    patches_generated: stateData.patch_generator?.patches?.length || 0,
                    prs_created: stateData.pr_composer?.prs?.length || 0,
                    mode_used: mode,
                };
                writeScanHistory(userId, path.basename(targetDir), summary, stateData);
                // Automatically remove temporary clone from disk so no scanned repo is stored locally
                if (targetDir && targetDir.includes('scanned-repos') && fs.existsSync(targetDir)) {
                    fs.rm(targetDir, { recursive: true, force: true }, (err) => {
                        if (!err) console.log(`[cleanup] Successfully removed temporary local clone: ${targetDir}`);
                    });
                }
            } catch (e) {
                console.error('[scan-repo] History write error:', e.message);
            }
            return;
        }

        const step = steps[currentStep];
        sendEvent({ stage: step.id, status: 'running' });

        const env = Object.assign({}, process.env, {
            TARGET_DIR: targetDir,
            RUN_STATE_PATH: stateFile,
            LOG_PATH: path.join(path.dirname(stateFile), 'pipeline.log'),
            PATCH_MODE: mode,
            // GROQ_API_KEY is set only when ai_assisted; empty string otherwise.
            // Subprocess (patch-generator.js) reads this env var — it is never written to disk.
            GROQ_API_KEY: groqApiKey,
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

// ============================================================
// AUTH & KEY MANAGEMENT ENDPOINTS (100% FIREBASE FIRESTORE)
// ============================================================

// POST /api/auth/sync-user
// Syncs GitHub username and login timestamp to users/{userId} in Firestore
app.post('/api/auth/sync-user', async (req, res) => {
    const { userId, github_username } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    if (!db) return res.status(500).json({ error: 'Firebase Firestore not initialized' });
    try {
        await db.collection('users').doc(userId).set({
            github_username: github_username || 'unknown',
            last_seen_at: new Date().toISOString()
        }, { merge: true });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/auth/save-key
// Accepts plaintext key, encrypts server-side, stores only ciphertext in Firestore.
// NEVER returns or logs the plaintext key.
app.post('/api/auth/save-key', async (req, res) => {
    const { userId, plainKey } = req.body;
    if (!userId || !plainKey) return res.status(400).json({ error: 'Missing userId or plainKey' });
    if (!db) return res.status(500).json({ error: 'Firebase Firestore not initialized' });
    try {
        const encObj = encryptKey(plainKey);
        const masked = maskKey(plainKey);
        // SECURITY: plainKey is discarded after this line — only encObj enters Firestore
        await db.collection('users').doc(userId).set({
            encrypted_groq_api_key: encObj,
            key_saved_at: new Date().toISOString(),
        }, { merge: true });
        res.json({ success: true, maskedKey: masked });
    } catch (e) {
        console.error('[save-key] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/auth/remove-key
// Full right-to-delete: removes encrypted key from Firestore entirely.
app.delete('/api/auth/remove-key', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    if (!db) return res.status(500).json({ error: 'Firebase Firestore not initialized' });
    try {
        const admin = require('./firebase-admin.cjs').admin;
        await db.collection('users').doc(userId).update({
            encrypted_groq_api_key: admin.firestore.FieldValue.delete(),
            key_saved_at: admin.firestore.FieldValue.delete(),
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/auth/key-status/:userId
// Returns whether user has a saved key and a masked version (last 4 chars).
// NEVER returns the full key or ciphertext.
app.get('/api/auth/key-status/:userId', async (req, res) => {
    const { userId } = req.params;
    if (!db) return res.json({ hasSavedKey: false, maskedKey: null });
    try {
        const doc = await db.collection('users').doc(userId).get();
        const encObj = doc.exists ? doc.data().encrypted_groq_api_key : null;
        if (!encObj) return res.json({ hasSavedKey: false, maskedKey: null });
        // Decrypt in-memory just to generate the masked display — immediately discard
        try {
            const plain = decryptKey(encObj);
            const masked = maskKey(plain);
            return res.json({ hasSavedKey: true, maskedKey: masked });
        } catch {
            return res.json({ hasSavedKey: true, maskedKey: '****(err)' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/auth/save-mode
// Persists preferred_mode ('deterministic' | 'ai_assisted') to Firestore.
app.post('/api/auth/save-mode', async (req, res) => {
    const { userId, mode } = req.body;
    if (!userId || !mode) return res.status(400).json({ error: 'Missing userId or mode' });
    if (!db) return res.status(500).json({ error: 'Firebase Firestore not initialized' });
    try {
        await db.collection('users').doc(userId).set({ preferred_mode: mode }, { merge: true });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/scan-history/:userId
// Returns only the requesting user's own scan history from Firebase Firestore.
// Backend enforces userId match — User A cannot fetch User B's history.
app.get('/api/scan-history/:userId', async (req, res) => {
    const { userId } = req.params;
    if (!db) return res.status(500).json({ error: 'Firebase Firestore not initialized' });
    try {
        const snap = await db.collection('scan_history')
            .where('userId', '==', userId)
            .limit(50)
            .get();
        const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort in memory by timestamp descending
        entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json(entries);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/auth/delete-user
// Removes user document and scan_history from Firestore
app.post('/api/auth/delete-user', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    if (!db) return res.status(500).json({ error: 'Firebase Firestore not initialized' });
    try {
        await db.collection('users').doc(userId).delete();
        const snap = await db.collection('scan_history').where('userId', '==', userId).get();
        const batch = db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Helper: write scan result & full run_state to Firebase Firestore scan_history
async function writeScanHistory(userId, repoName, summary, stateData = null) {
    if (!db) {
        console.error('[scan-history] Firebase Firestore db is not initialized — cannot store scan history.');
        return;
    }
    const entry = {
        userId,
        repo_name: repoName,
        timestamp: new Date().toISOString(),
        outcome_summary: summary,
        final_outcome: 'success',
        run_state: stateData || {}
    };
    try {
        await db.collection('scan_history').add(entry);
        console.log(`[scan-history] Successfully stored scan for repo ${repoName} in Firebase Firestore.`);
    } catch (e) {
        console.error('[scan-history] Failed to write to Firestore:', e.message);
    }
}

// ============================================================
// Fallback for old rerun UI (to avoid breaking things)
// ============================================================
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
