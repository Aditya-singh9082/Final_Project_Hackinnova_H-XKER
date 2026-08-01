import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, Play } from 'lucide-react';

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
  
  // Live Re-run State
  const [isLiveRunning, setIsLiveRunning] = useState(false);
  const [liveStage, setLiveStage] = useState(null);
  const [runError, setRunError] = useState(null);

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
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleRerun = () => {
    if (isLiveRunning) return;
    setIsLiveRunning(true);
    setLiveStage(null);
    setRunError(null);

    const eventSource = new EventSource('http://localhost:3001/api/rerun');

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

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-bg flex items-center justify-center">
        <div className="text-cyber-accent text-sm font-mono animate-pulse uppercase">Initializing Dashboard...</div>
      </div>
    );
  }

  if (!runState && !isLiveRunning) {
    return (
      <div className="min-h-screen bg-cyber-bg flex items-center justify-center text-status-vuln font-mono text-sm">
        Failed to load run_state.json. Is the Express server running?
      </div>
    );
  }

  const timestamps = runState?.timestamps || {};
  const exploit_verifier = runState?.exploit_verifier || {};

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
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-cyber-border gap-6">
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
              disabled={isLiveRunning}
              className={`flex items-center gap-2 px-6 py-3 font-bold text-sm uppercase tracking-wider rounded-sm transition-all border
                ${isLiveRunning 
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
        </header>

        {/* HERO SECTION - ASYMMETRIC GRID */}
        <motion.section {...sectionProps} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <TimeToPatchCounter totalMs={timestamps.total_elapsed_ms || 0} isRunning={isLiveRunning} />
          </div>
          <div className="lg:col-span-1">
             <ReachabilityChart />
          </div>
        </motion.section>

        {/* PIPELINE TIMELINE */}
        <motion.section {...sectionProps}>
           <PipelineTimeline timestamps={timestamps} liveStage={liveStage} />
        </motion.section>

        {/* COMPARISON PANEL */}
        <motion.section {...sectionProps}>
          <ComparisonPanel />
        </motion.section>

        {/* EXPLOIT VERIFICATION */}
        <motion.section {...sectionProps}>
           <ExploitProofPanel proofs={exploit_verifier.proofs} />
        </motion.section>

        {/* PR PREVIEWS */}
        <motion.section {...sectionProps} className="pb-16">
          <h3 className="text-lg font-bold text-gray-100 mb-6 tracking-wide uppercase font-sans">Generated Artifacts</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <PRPreview packageKey="lodash" />
            <PRPreview packageKey="marked" />
          </div>
        </motion.section>

      </div>
    </div>
  );
}

export default App;
