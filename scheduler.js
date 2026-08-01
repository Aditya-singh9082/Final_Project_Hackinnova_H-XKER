const { spawn } = require('child_process');
const path = require('path');

const schedules = {};

function runPipeline(targetDir, stateFile) {
    console.log(`[Scheduler] Triggering background run for ${targetDir}`);
    const pipelineDir = path.join(__dirname, 'juice-shop-pipeline');
    const env = Object.assign({}, process.env, {
        TARGET_DIR: targetDir,
        RUN_STATE_PATH: stateFile,
        LOG_PATH: path.join(path.dirname(stateFile), 'pipeline.log')
    });

    const steps = [
        'scanner.js', 'reachability.js', 'patch-generator.js',
        'exploit-verifier.js', 'compat-checker.js', 'regression-runner.js', 'pr-composer.js'
    ];

    let currentStep = 0;

    const runNext = () => {
        if (currentStep >= steps.length) {
            console.log(`[Scheduler] Pipeline complete for ${targetDir}`);
            return;
        }

        const step = steps[currentStep];
        const child = spawn('node', [step], { cwd: pipelineDir, env });

        child.on('close', (code) => {
            if (code === 0) {
                currentStep++;
                runNext();
            } else {
                console.error(`[Scheduler] Pipeline failed at ${step} with code ${code}`);
            }
        });
        
        child.on('error', (err) => {
             console.error(`[Scheduler] Pipeline error at ${step}: ${err.message}`);
        });
    };

    runNext();
}

function startSchedule(targetDir, stateFile, intervalMs = 300000) {
    if (schedules[targetDir]) {
        clearInterval(schedules[targetDir].timer);
    }
    
    const timer = setInterval(() => {
        schedules[targetDir].lastRun = Date.now();
        runPipeline(targetDir, stateFile);
    }, intervalMs);

    schedules[targetDir] = {
        timer,
        intervalMs,
        startedAt: Date.now(),
        lastRun: null,
        stateFile
    };
    
    console.log(`[Scheduler] Started monitoring ${targetDir} every ${intervalMs}ms`);
}

function stopSchedule(targetDir) {
    if (schedules[targetDir]) {
        clearInterval(schedules[targetDir].timer);
        delete schedules[targetDir];
        console.log(`[Scheduler] Stopped monitoring ${targetDir}`);
        return true;
    }
    return false;
}

function getStatus() {
    const status = {};
    const now = Date.now();
    for (const targetDir in schedules) {
        const sched = schedules[targetDir];
        const nextRunTimestamp = (sched.lastRun || sched.startedAt) + sched.intervalMs;
        const msRemaining = Math.max(0, nextRunTimestamp - now);
        status[targetDir] = {
            intervalMs: sched.intervalMs,
            msRemaining: msRemaining,
            stateFile: sched.stateFile
        };
    }
    return status;
}

module.exports = { startSchedule, stopSchedule, getStatus };
