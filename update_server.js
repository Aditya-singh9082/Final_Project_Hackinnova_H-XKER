const fs = require('fs');
let content = fs.readFileSync('dashboard/server.cjs', 'utf8');

if (!content.includes('const scheduler = require')) {
    content = content.replace("const { spawn } = require('child_process');", "const { spawn } = require('child_process');\nconst scheduler = require('../scheduler.js');");
    
    const endpoints = 

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

app.listen;

    content = content.replace('app.listen', endpoints);
    fs.writeFileSync('dashboard/server.cjs', content, 'utf8');
    console.log("Updated server.cjs");
} else {
    console.log("Already updated");
}
