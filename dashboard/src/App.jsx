import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Play, Search, AlertTriangle, Loader2, Clock, CheckCircle2, XCircle, GitPullRequest, Info, ChevronRight, Activity, TerminalSquare, AlertOctagon } from 'lucide-react';

import TimeToPatchCounter from './components/TimeToPatchCounter';
import PipelineTimeline from './components/PipelineTimeline';
import ReachabilityChart from './components/ReachabilityChart';
import PRPreview from './components/PRPreview';
import ExploitProofPanel from './components/ExploitProofPanel';

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

  // Package Data Tabs
  const [activePackage, setActivePackage] = useState('');
  const [activeTab, setActiveTab] = useState('exploit'); // exploit, compat, regression

  const fetchState = useCallback(() => {
    fetch('http://localhost:3001/api/state')
      .then(res => res.json())
      .then(data => {
        setRunState(data);
        setLoading(false);
        // Default package selection based on available data
        if (data?.scanner?.detected_cves?.length > 0) {
            const pkgs = [...new Set(data.scanner.detected_cves.map(c => c.package))];
            if (pkgs.length > 0 && !activePackage) setActivePackage(pkgs[0]);
        }
      })
      .catch(err => {
        console.error("Failed to fetch state", err);
        setLoading(false);
      });

    fetch('http://localhost:3001/api/success-rate')
      .then(res => res.json())
      .then(data => setSuccessStats(data))
      .catch(err => console.error("Failed to fetch success stats", err));
  }, [activePackage]);

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
    setIsCloning(true); setCloneError(null); setRunError(null);
    try {
      const res = await fetch('http://localhost:3001/api/clone', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl, autoInstall })
      });
      const data = await res.json();
      if (!res.ok) {
        setCloneError(data.error || 'Failed to clone repository');
        setIsCloning(false); return;
      }
      setIsCloning(false);
      startPipeline(data.targetDir, data.stateFile);
    } catch (err) {
      setCloneError(err.message); setIsCloning(false);
    }
  };

  const startPipeline = (targetDir, stateFile) => {
    if (isLiveRunning) return;
    setIsLiveRunning(true); setLiveStage(null); setRunError(null);

    let url = 'http://localhost:3001/api/scan-repo';
    if (targetDir && stateFile) {
        url += `?targetDir=${encodeURIComponent(targetDir)}&stateFile=${encodeURIComponent(stateFile)}`;
    } else {
        url = 'http://localhost:3001/api/rerun';
    }

    const eventSource = new EventSource(url);
    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.stage === 'done') {
        eventSource.close(); setIsLiveRunning(false); setLiveStage(null); fetchState();
      } else if (data.status === 'failed') {
        eventSource.close(); setIsLiveRunning(false); setLiveStage(null);
        setRunError(`Pipeline failed at stage: ${data.stage}. Error: ${data.error || 'Exit code ' + data.code}`);
      } else if (data.status === 'running') {
        setLiveStage(data.stage);
      }
    };
    eventSource.onerror = (err) => {
      eventSource.close(); setIsLiveRunning(false); setLiveStage(null); setRunError("Lost connection to execution server.");
    };
  };

  const handleRerun = () => startPipeline();

  const toggleSchedule = async (targetDir, stateFile, isCurrentlyActive) => {
    if (!targetDir || !stateFile) { alert("Please load a state file or scan a repo first."); return; }
    const endpoint = isCurrentlyActive ? '/api/schedule/stop' : '/api/schedule/start';
    try {
        await fetch(`http://localhost:3001${endpoint}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetDir, stateFile, intervalMs: 60000 }) 
        });
    } catch (err) {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-bg flex items-center justify-center">
        <div className="gradient-text text-sm font-mono animate-pulse uppercase tracking-widest">Initializing Engine...</div>
      </div>
    );
  }

  const timestamps = runState?.timestamps || {};
  const prs = runState?.pr_composer?.prs || [];
  const cves = runState?.scanner?.detected_cves || [];
  
  const activeTargetDir = runState?.local_path || 'seed-repo-vulnerable';
  const activeStateFile = runState?.local_path ? `${runState.local_path}/run_state.json` : '../run_state.json';
  const activeSchedule = scheduleStatus?.[activeTargetDir];
  const isScheduled = !!activeSchedule;

  const totalCves = cves.length;
  const reachableCount = runState?.reachability?.reachable_packages?.length || 0;
  const patchesGenerated = runState?.patch_generator?.patches?.length || 0;

  // Filter Data for Active Package
  const currentCompat = runState?.compat_checker?.reports?.find(r => r.package === activePackage);
  const currentRegression = runState?.regression_runner?.reports?.find(r => r.package === activePackage);
  const currentExploit = runState?.exploit_verifier?.proofs?.find(p => p.package === activePackage);

  const availablePackages = [...new Set(cves.map(c => c.package))];

  return (
    <div className="min-h-screen bg-cyber-bg font-sans text-gray-200 relative overflow-hidden selection:bg-cyber-violet/30">
      {/* Ambient Gradient Background Spots */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-cyan/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-violet/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-[1440px] mx-auto px-6 py-10 space-y-12 relative z-10">
        
        {/* HEADER SECTION */}
        <header className="flex flex-col xl:flex-row justify-between gap-8 items-start xl:items-center">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-cyber-cyan to-cyber-violet p-[2px] rounded-lg shadow-[0_0_20px_rgba(0,240,255,0.3)]">
              <div className="bg-cyber-slate p-3 rounded-md">
                <Shield size={32} className="text-cyber-cyan" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-heading font-bold tracking-tight text-white">Security Patch Engine</h1>
              <p className="text-gray-400 font-mono text-sm mt-1 flex items-center gap-2">
                <Activity size={14} className={isLiveRunning ? "text-cyber-cyan animate-pulse" : "text-gray-500"} />
                {isLiveRunning ? "Processing Pipeline..." : "System Idle"}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
            {/* Target Repo Input */}
            <form onSubmit={handleScanRepo} className="glass-card flex items-center p-1 pl-4 rounded-full flex-1">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input 
                type="text" placeholder="https://github.com/owner/repo"
                value={repoUrl} onChange={e => setRepoUrl(e.target.value)} disabled={isLiveRunning || isCloning}
                className="bg-transparent border-none focus:ring-0 text-white px-3 py-2 w-full text-sm font-mono placeholder:text-gray-600 outline-none"
              />
              <button type="submit" disabled={!repoUrl || isLiveRunning || isCloning} className="bg-cyber-violet hover:bg-cyber-violet/80 text-white px-6 py-2 rounded-full font-heading font-semibold text-sm transition-all whitespace-nowrap disabled:opacity-50">
                {isCloning ? <Loader2 size={16} className="animate-spin inline" /> : 'Scan Repo'}
              </button>
            </form>
            
            {/* Scheduler Status Pill */}
            <div className="glass-card px-5 py-3 rounded-full flex items-center gap-3">
              <Clock size={16} className={isScheduled ? "text-cyber-cyan" : "text-gray-500"} />
              <span className="font-mono text-sm text-gray-300 hidden md:inline">Scheduler:</span>
              <button onClick={() => toggleSchedule(activeTargetDir, activeStateFile, isScheduled)} className={`font-bold font-mono text-xs px-3 py-1 rounded-full transition-colors ${isScheduled ? 'bg-status-safe/20 text-status-safe border border-status-safe/30' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white'}`}>
                {isScheduled ? (activeSchedule?.msRemaining ? `ACTIVE (${Math.floor(activeSchedule.msRemaining/1000)}s)` : 'ACTIVE') : 'IDLE'}
              </button>
            </div>
          </div>
        </header>

        {runError && (
          <div className="glass-card bg-status-vuln/10 border-status-vuln text-status-vuln p-4 flex items-center gap-3">
            <AlertOctagon size={20} />
            <span className="font-mono text-sm">{runError}</span>
          </div>
        )}

        {/* HERO METRICS */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2 glass-card p-8 flex flex-col justify-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-cyan/5 rounded-full blur-2xl"></div>
             <h2 className="text-gray-400 font-mono uppercase tracking-widest text-xs mb-2">Total Time to Patch</h2>
             <div className="text-5xl md:text-6xl font-heading font-bold text-white flex items-baseline gap-2">
               {isLiveRunning ? <span className="animate-pulse">--</span> : (timestamps.total_elapsed_ms || 0)}
               <span className="text-2xl text-cyber-cyan">ms</span>
             </div>
             <div className="mt-6">
               <button onClick={handleRerun} disabled={isLiveRunning || isCloning} className="flex items-center gap-2 bg-gradient-to-r from-cyber-cyan to-cyber-violet text-white px-6 py-2 rounded font-heading font-bold text-sm tracking-wide hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all disabled:opacity-50">
                 {isLiveRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                 RE-RUN PIPELINE
               </button>
             </div>
          </div>
          <div className="lg:col-span-2 grid grid-cols-3 gap-4">
            <div className="glass-card p-6 flex flex-col justify-center items-center text-center">
              <div className="text-gray-400 font-mono text-xs mb-2 uppercase">CVEs Found</div>
              <div className="text-4xl font-heading font-bold text-status-vuln">{totalCves}</div>
            </div>
            <div className="glass-card p-6 flex flex-col justify-center items-center text-center">
              <div className="text-gray-400 font-mono text-xs mb-2 uppercase">Reachable</div>
              <div className="text-4xl font-heading font-bold text-status-warn">{reachableCount}</div>
            </div>
            <div className="glass-card p-6 flex flex-col justify-center items-center text-center border-b-4 border-b-cyber-cyan">
              <div className="text-gray-400 font-mono text-xs mb-2 uppercase">Patched</div>
              <div className="text-4xl font-heading font-bold text-cyber-cyan">{patchesGenerated}</div>
            </div>
          </div>
        </section>

        {/* PIPELINE TIMELINE */}
        <section className="glass-card p-8">
          <h2 className="text-xl font-heading font-bold text-white mb-8 flex items-center gap-2">
            <TerminalSquare size={20} className="text-cyber-violet" /> Pipeline Execution
          </h2>
          <PipelineTimeline timestamps={timestamps} liveStage={liveStage} />
        </section>

        {/* REACHABILITY & SUCCESS STATS */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ReachabilityChart />
          
          <div className="flex flex-col gap-6">
            {successStats && (
              <div className="glass-card p-6">
                 <h2 className="text-lg font-heading font-bold text-white mb-6 uppercase tracking-wide flex items-center gap-2">
                   <Shield size={18} className="text-cyber-cyan" /> Engine Efficacy Metrics
                 </h2>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="bg-cyber-slate/50 p-4 rounded border border-gray-800">
                      <div className="text-gray-400 font-mono text-xs mb-1">Clean Auto-Patch Rate</div>
                      <div className="text-3xl font-heading font-bold gradient-text">{successStats.clean_auto_patch_rate}%</div>
                      <p className="text-xs text-gray-500 mt-2">Zero human intervention required.</p>
                   </div>
                   <div className="bg-cyber-slate/50 p-4 rounded border border-gray-800">
                      <div className="text-gray-400 font-mono text-xs mb-1">Safely-Handled Rate</div>
                      <div className="text-3xl font-heading font-bold text-status-safe">{successStats.safely_handled_rate}%</div>
                      <p className="text-xs text-gray-500 mt-2">Flagged for manual review correctly.</p>
                   </div>
                 </div>
              </div>
            )}
            
            {/* DEFENSE IN DEPTH */}
            <div className="glass-card p-6 border-l-4 border-l-cyber-violet bg-gradient-to-r from-cyber-violet/10 to-transparent">
               <h3 className="text-lg font-heading font-bold text-white mb-2 flex items-center gap-2">
                 <AlertTriangle size={18} className="text-cyber-violet" /> Defense-in-Depth Insight
               </h3>
               <p className="text-sm text-gray-300 leading-relaxed">
                 During Juice Shop analysis, the engine's multi-layered verification proved critical: <br/><br/>
                 <span className="text-status-vuln font-mono text-xs bg-red-900/30 px-1 rounded">sanitize-html</span> passed the API Compat check but was caught by the <strong>Regression Runner</strong> due to complex runtime breakage.<br/><br/>
                 <span className="text-status-warn font-mono text-xs bg-amber-900/30 px-1 rounded">express-jwt</span> passed Regression (no tests covered it) but was caught by the <strong>API Compat Checker</strong> flagging a major version jump.
               </p>
            </div>
          </div>
        </section>

        {/* PACKAGE DATA TABS */}
        <section className="glass-card p-8 min-h-[500px]">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-800 pb-4">
             <div className="flex items-center gap-4">
                <h2 className="text-xl font-heading font-bold text-white">Package Analysis</h2>
                <select 
                  value={activePackage} 
                  onChange={e => setActivePackage(e.target.value)}
                  className="bg-cyber-slate border border-cyber-cyan/30 text-white font-mono text-sm px-3 py-1 rounded focus:outline-none focus:border-cyber-cyan"
                >
                  {availablePackages.map(pkg => (
                    <option key={pkg} value={pkg}>{pkg}</option>
                  ))}
                </select>
             </div>
             
             <div className="flex gap-2">
               <button onClick={() => setActiveTab('exploit')} className={`px-4 py-2 text-sm font-heading rounded transition-colors ${activeTab === 'exploit' ? 'bg-cyber-cyan text-cyber-bg font-bold' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>Exploit Proof</button>
               <button onClick={() => setActiveTab('compat')} className={`px-4 py-2 text-sm font-heading rounded transition-colors ${activeTab === 'compat' ? 'bg-cyber-cyan text-cyber-bg font-bold' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>API Compatibility</button>
               <button onClick={() => setActiveTab('regression')} className={`px-4 py-2 text-sm font-heading rounded transition-colors ${activeTab === 'regression' ? 'bg-cyber-cyan text-cyber-bg font-bold' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>Regression Tests</button>
             </div>
           </div>

           <div className="mt-6 relative">
              {activeTab === 'exploit' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {currentExploit ? (
                    <div>
                      <div className="flex items-center gap-2 text-gray-400 font-mono text-sm mb-4">
                         <Info size={16} className="text-cyber-cyan"/> Comparing ReDoS Execution Times
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* BEFORE */}
                        <div className="bg-status-vuln/5 border border-status-vuln/30 rounded p-6">
                           <h4 className="text-status-vuln font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2"><XCircle size={16}/> Before Patch</h4>
                           <div className="text-3xl font-mono text-white mb-2">{currentExploit.before_ms}ms</div>
                           <div className="w-full bg-gray-800 h-2 rounded overflow-hidden">
                             <div className="bg-status-vuln h-full" style={{ width: Math.min(100, (currentExploit.before_ms / 1000) * 100) + '%' }}></div>
                           </div>
                        </div>
                        {/* AFTER */}
                        <div className="bg-status-safe/5 border border-status-safe/30 rounded p-6">
                           <h4 className="text-status-safe font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2"><CheckCircle2 size={16}/> After Patch</h4>
                           <div className="text-3xl font-mono text-white mb-2">{currentExploit.after_ms}ms</div>
                           <div className="w-full bg-gray-800 h-2 rounded overflow-hidden">
                             <div className="bg-status-safe h-full" style={{ width: Math.min(100, (currentExploit.after_ms / 1000) * 100) + '%' }}></div>
                           </div>
                        </div>
                      </div>
                    </div>
                  ) : <div className="text-gray-500 text-center py-12 font-mono">No exploit proof available for {activePackage}</div>}
                </div>
              )}

              {activeTab === 'compat' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {currentCompat ? (
                    <div className="space-y-4">
                       <div className="flex items-center gap-3 mb-6">
                         <div className={`px-3 py-1 rounded text-sm font-bold uppercase ${currentCompat.breaking_changes_detected ? 'bg-status-vuln/20 text-status-vuln' : 'bg-status-safe/20 text-status-safe'}`}>
                           {currentCompat.breaking_changes_detected ? 'Breaking Changes Detected' : 'Compatible'}
                         </div>
                       </div>
                       {currentCompat.changes?.map((change, idx) => (
                         <div key={idx} className="bg-gray-800/50 p-4 rounded font-mono text-sm border-l-2 border-status-warn text-gray-300">
                           {change}
                         </div>
                       ))}
                       {(!currentCompat.changes || currentCompat.changes.length === 0) && (
                         <p className="text-gray-400 font-mono">No API signature changes detected.</p>
                       )}
                    </div>
                  ) : <div className="text-gray-500 text-center py-12 font-mono">No API compatibility report available for {activePackage}</div>}
                </div>
              )}

              {activeTab === 'regression' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {currentRegression ? (
                    <div>
                       <div className="flex items-center gap-3 mb-6">
                         <div className={`px-3 py-1 rounded text-sm font-bold uppercase ${currentRegression.status === 'PASSED' ? 'bg-status-safe/20 text-status-safe' : currentRegression.status === 'FAILED' ? 'bg-status-vuln/20 text-status-vuln' : 'bg-status-warn/20 text-status-warn'}`}>
                           {currentRegression.status}
                         </div>
                       </div>
                       {currentRegression.failed_tests?.length > 0 ? (
                         <div className="space-y-3">
                           <h4 className="text-gray-400 text-sm font-mono uppercase mb-2">Failed Tests</h4>
                           {currentRegression.failed_tests.map((ft, idx) => (
                             <div key={idx} className="bg-status-vuln/10 text-red-200 p-3 rounded font-mono text-sm border border-status-vuln/20">
                               {ft}
                             </div>
                           ))}
                         </div>
                       ) : (
                         <p className="text-gray-400 font-mono">All existing tests passed successfully.</p>
                       )}
                    </div>
                  ) : <div className="text-gray-500 text-center py-12 font-mono">No regression test data available for {activePackage}</div>}
                </div>
              )}
           </div>
        </section>

        {/* GENERATED PULL REQUESTS */}
        {prs.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2 pl-2">
              <GitPullRequest size={24} className="text-white" /> Generated Pull Requests
            </h2>
            <div className="grid grid-cols-1 gap-8">
              {prs.map((pr, idx) => (
                <div key={idx} className="glass-card overflow-hidden">
                   <div className="bg-gray-900 px-6 py-4 border-b border-gray-800 flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-status-safe"></div>
                      <span className="font-mono text-sm font-bold text-gray-200">{pr.package} update</span>
                   </div>
                   <div className="p-6 bg-[#0d1117] text-gray-300">
                      <PRPreview packageKey={pr.package} />
                   </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FOOTER */}
        <footer className="pt-12 pb-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500 font-mono border-t border-gray-800 mt-12">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-cyber-cyan" /> Automated Security Patch Engine
          </div>
          <div>
            Last Scan: {timestamps.scan_completed_at ? new Date(timestamps.scan_completed_at).toLocaleString() : 'N/A'}
          </div>
          <div className="flex gap-4">
             <a href="http://localhost:3001/api/state" target="_blank" className="hover:text-cyber-cyan transition-colors">Raw State JSON</a>
             <a href="#" className="hover:text-cyber-cyan transition-colors">Documentation</a>
          </div>
        </footer>

      </div>
    </div>
  );
}

export default App;
