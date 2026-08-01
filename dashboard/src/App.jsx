import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, Play, Search, AlertTriangle, Loader2 } from 'lucide-react';

import TimeToPatchCounter from './components/TimeToPatchCounter';
import PipelineTimeline from './components/PipelineTimeline';
import ExploitProofPanel from './components/ExploitProofPanel';
import PRPreview from './components/PRPreview';
import ReachabilityChart from './components/ReachabilityChart';
import ComparisonPanel from './components/ComparisonPanel';
import BackgroundFX from './components/BackgroundFX';

function App() {
  const [runState, setRunState] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Clone & Scan State
  const [repoUrl, setRepoUrl] = useState('');
  const [autoInstall, setAutoInstall] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneError, setCloneError] = useState(null);

  const [isLiveRunning, setIsLiveRunning] = useState(false);
  const [liveStage, setLiveStage] = useState(null);
  const [runError, setRunError] = useState(null);

  const [successStats, setSuccessStats] = useState(null);

  // Scheduled Monitoring State
  const [scheduleStatus, setScheduleStatus] = useState(null);

  const fetchState = useCallback(() => {
    fetch('http://localhost:3001/api/state')
      .then(res => res.json())
      .then(data => {
        setRunState(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch state", err);
        setLoading(false);
      });

    fetch('http://localhost:3001/api/success-rate')
      .then(res => res.json())
      .then(data => setSuccessStats(data))
      .catch(err => console.error("Failed to fetch success stats", err));
  }, []);

  // Poll schedule status every second
  useEffect(() => {
    const timer = setInterval(() => {
      fetch('http://localhost:3001/api/schedule/status')
        .then(res => res.json())
        .then(data => setScheduleStatus(data))
        .catch(err => console.error("Failed to fetch schedule status", err));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleScanRepo = async (e) => {
    e.preventDefault();
    if (!repoUrl) return;

    setIsCloning(true);
    setCloneError(null);
    setRunError(null);

    try {
      const res = await fetch('http://localhost:3001/api/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl, autoInstall })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setCloneError(data.error || 'Failed to clone repository');
        setIsCloning(false);
        return;
      }

      setIsCloning(false);
      startPipeline(data.targetDir, data.stateFile);

    } catch (err) {
      setCloneError(err.message);
      setIsCloning(false);
    }
  };

  const startPipeline = (targetDir, stateFile) => {
    if (isLiveRunning) return;
    setIsLiveRunning(true);
    setLiveStage(null);
    setRunError(null);

    let url = 'http://localhost:3001/api/scan-repo';
    if (targetDir && stateFile) {
        url += `?targetDir=${encodeURIComponent(targetDir)}&stateFile=${encodeURIComponent(stateFile)}`;
    } else {
        // Fallback for seed repo if no specific target
        url = 'http://localhost:3001/api/rerun';
    }

    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.stage === 'done') {
        eventSource.close();
        setIsLiveRunning(false);
        setLiveStage(null);
        fetchState(); // Refetch all fresh data!
      } else if (data.status === 'failed') {
        eventSource.close();
        setIsLiveRunning(false);
        setLiveStage(null);
        setRunError(`Pipeline failed at stage: ${data.stage}. Error: ${data.error || 'Exit code ' + data.code}`);
      } else if (data.status === 'running') {
        setLiveStage(data.stage);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource failed:", err);
      eventSource.close();
      setIsLiveRunning(false);
      setLiveStage(null);
      setRunError("Lost connection to execution server.");
    };
  };

  const handleRerun = () => {
    startPipeline();
  };

  const toggleSchedule = async (targetDir, stateFile, isCurrentlyActive) => {
    if (!targetDir || !stateFile) {
        alert("Please load a state file or scan a repo first.");
        return;
    }
    const endpoint = isCurrentlyActive ? '/api/schedule/stop' : '/api/schedule/start';
    try {
        await fetch(`http://localhost:3001${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetDir, stateFile, intervalMs: 60000 }) // 1 min interval for demo
        });
    } catch (err) {
        console.error("Failed to toggle schedule", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-bg flex items-center justify-center">
        <div className="text-cyber-accent text-sm font-mono animate-pulse uppercase">Initializing Dashboard...</div>
      </div>
    );
  }

  const timestamps = runState?.timestamps || {};
  const exploit_verifier = runState?.exploit_verifier || {};
  const prs = runState?.pr_composer?.prs || [];

  const activeTargetDir = runState?.local_path || 'seed-repo-vulnerable';
  const activeStateFile = runState?.local_path ? `${runState.local_path}/run_state.json` : '../run_state.json';
  
  const activeSchedule = scheduleStatus?.[activeTargetDir];
  const isScheduled = !!activeSchedule;

  // Reusable animation config for scroll sections
  const sectionProps = {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.6, ease: "easeOut" }
  };

  return (
    <div className="min-h-screen bg-cyber-bg font-sans relative">
      <BackgroundFX />
      
      <div className="max-w-7xl mx-auto px-8 py-12 space-y-16">
        
        {/* HEADER & CLONE INPUT */}
        <header className="flex flex-col gap-8 pb-8 border-b border-cyber-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-gray-100">
              <div className="bg-cyber-accent text-cyber-bg p-2 rounded-sm">
                <Shield size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight uppercase">Security Patch Engine</h1>
                <p className="text-gray-500 font-mono text-xs mt-1">Automated Vulnerability Remediation Pipeline</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {runError && (
                <span className="text-status-vuln font-mono text-xs">{runError}</span>
              )}
              <button 
                onClick={handleRerun}
                disabled={isLiveRunning || isCloning}
                className={`flex items-center gap-2 px-6 py-3 font-bold text-sm uppercase tracking-wider rounded-sm transition-all border
                  ${(isLiveRunning || isCloning)
                    ? 'bg-cyber-card border-cyber-border text-gray-500 cursor-not-allowed' 
                    : 'bg-cyber-accent text-cyber-bg border-cyber-accent hover:bg-transparent hover:text-cyber-accent'
                  }`}
              >
                {isLiveRunning ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-cyber-accent animate-ping mr-2"></span>
                    Executing...
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Re-run Pipeline
                  </>
                )}
              </button>
            </div>
          </div>

          {/* New Scan Repository Section */}
          <div className="bg-cyber-card border border-cyber-border p-6 rounded-sm">
            <h2 className="text-gray-100 font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
              <Search size={16} className="text-cyber-accent" />
              Scan Remote Repository
            </h2>
            <form onSubmit={handleScanRepo} className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <input 
                type="text" 
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                disabled={isLiveRunning || isCloning}
                className="flex-1 bg-cyber-bg border border-cyber-border text-gray-100 px-4 py-2 font-mono text-sm focus:outline-none focus:border-cyber-accent w-full"
              />
              <label className="flex items-center gap-2 text-gray-400 font-mono text-xs cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={autoInstall}
                  onChange={e => setAutoInstall(e.target.checked)}
                  disabled={isLiveRunning || isCloning}
                  className="accent-cyber-accent cursor-pointer"
                />
                <span className="group-hover:text-gray-300 transition-colors">
                  Auto-run npm install
                </span>
                <AlertTriangle size={14} className="text-status-warn ml-1" title="Warning: executes untrusted postinstall scripts" />
              </label>
              <button 
                type="submit"
                disabled={!repoUrl || isLiveRunning || isCloning}
                className="bg-cyber-border hover:bg-cyber-accent text-gray-100 hover:text-cyber-bg px-6 py-2 uppercase font-bold text-sm tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
              >
                {isCloning ? <><Loader2 size={16} className="animate-spin" /> Cloning...</> : 'Scan Repo'}
              </button>
            </form>
            {cloneError && <p className="text-status-vuln font-mono text-xs mt-3">{cloneError}</p>}
          </div>
          
          {/* Scheduled Monitoring Control */}
          {runState && (
            <div className="bg-cyber-card border border-cyber-border p-6 rounded-sm flex items-center justify-between">
              <div>
                <h2 className="text-gray-100 font-bold uppercase tracking-wider text-sm mb-1">Scheduled Monitoring</h2>
                <p className="text-gray-500 font-mono text-xs">Automatically checks and re-runs the pipeline every 1 minute.</p>
              </div>
              <div className="flex items-center gap-6">
                {isScheduled && activeSchedule.msRemaining !== undefined && (
                  <div className="text-cyber-accent font-mono text-sm border border-cyber-accent/30 px-3 py-1 rounded-sm">
                    Next run in: {Math.floor(activeSchedule.msRemaining / 1000)}s
                  </div>
                )}
                <button
                  onClick={() => toggleSchedule(activeTargetDir, activeStateFile, isScheduled)}
                  className={`px-6 py-2 uppercase font-bold text-sm tracking-wide transition-colors border ${isScheduled ? 'bg-status-vuln border-status-vuln text-white hover:bg-transparent hover:text-status-vuln' : 'bg-status-safe border-status-safe text-white hover:bg-transparent hover:text-status-safe'}`}
                >
                  {isScheduled ? 'Stop Monitoring' : 'Start Monitoring'}
                </button>
              </div>
            </div>
          )}
        </header>

        {(!runState && !isLiveRunning) ? (
          <div className="flex justify-center text-status-vuln font-mono text-sm py-12">
            Failed to load run_state.json. Is the Express server running?
          </div>
        ) : (
          <>
            {/* HERO SECTION - ASYMMETRIC GRID */}
            <motion.section {...sectionProps} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <TimeToPatchCounter totalMs={timestamps.total_elapsed_ms || 0} isRunning={isLiveRunning} />
              </div>
              <div className="lg:col-span-1">
                 <ReachabilityChart />
              </div>
            </motion.section>

            {/* SUCCESS METRICS CARD */}
            {successStats && (
              <motion.section {...sectionProps}>
                <div className="bg-cyber-card border border-cyber-border p-6 rounded-sm grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-gray-500 font-mono text-xs uppercase mb-1">Total Packages Processed</div>
                    <div className="text-3xl font-bold text-gray-100">{successStats.total_runs}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 font-mono text-xs uppercase mb-1">Clean Auto-Patch Rate</div>
                    <div className="text-3xl font-bold text-cyber-accent">{successStats.clean_auto_patch_rate}%</div>
                    <div className="text-gray-600 text-xs mt-1">Fully automated fixes</div>
                  </div>
                  <div>
                    <div className="text-gray-500 font-mono text-xs uppercase mb-1">Safely-Handled Rate</div>
                    <div className="text-3xl font-bold text-status-safe">{successStats.safely_handled_rate}%</div>
                    <div className="text-gray-600 text-xs mt-1">Auto-fixed + correctly flagged</div>
                  </div>
                </div>
              </motion.section>
            )}

            {/* PIPELINE TIMELINE */}
            <motion.section {...sectionProps}>
               <PipelineTimeline timestamps={timestamps} liveStage={liveStage} />
            </motion.section>

            {/* COMPARISON PANEL */}
            <motion.section {...sectionProps}>
              <ComparisonPanel />
            </motion.section>

            {/* EXPLOIT VERIFICATION */}
            {exploit_verifier.proofs && exploit_verifier.proofs.length > 0 && (
              <motion.section {...sectionProps}>
                 <ExploitProofPanel proofs={exploit_verifier.proofs} />
              </motion.section>
            )}

            {/* PR PREVIEWS */}
            {prs.length > 0 && (
              <motion.section {...sectionProps} className="pb-16">
                <h3 className="text-lg font-bold text-gray-100 mb-6 tracking-wide uppercase font-sans">Generated Artifacts</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {prs.map((pr, idx) => (
                    <PRPreview key={idx} packageKey={pr.package} />
                  ))}
                </div>
              </motion.section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
