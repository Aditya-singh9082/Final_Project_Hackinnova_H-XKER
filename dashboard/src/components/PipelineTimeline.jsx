import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, Circle, Search, GitBranch, Shield, Bug, Puzzle, FlaskConical, FileText } from 'lucide-react';

const STAGES = [
  { id: 'scan', label: 'BFS Scanner', key: 'scan_completed_at', icon: Search },
  { id: 'reach', label: 'Reachability', key: 'reachability_completed_at', icon: GitBranch },
  { id: 'patch', label: 'Patch Gen', key: 'patch_generated_at', icon: Shield },
  { id: 'verify', label: 'Exploit Verify', key: 'verified_at', icon: Bug },
  { id: 'compat', label: 'Compat Check', key: 'compat_completed_at', icon: Puzzle },
  { id: 'regress', label: 'Regression', key: 'regression_completed_at', icon: FlaskConical },
  { id: 'pr', label: 'PR Compose', key: 'pr_opened_at', icon: FileText }
];

const PipelineTimeline = ({ timestamps, liveStage }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } }
  };

  const getStageStatus = (stageId) => {
    if (!liveStage) {
      // Not running live — if timestamps exist for this stage, mark complete
      const stage = STAGES.find(s => s.id === stageId);
      if (stage && timestamps && timestamps[stage.key]) return 'complete';
      return 'idle';
    }
    const stageIndex = STAGES.findIndex(s => s.id === stageId);
    const liveIndex = STAGES.findIndex(s => s.id === liveStage);
    
    if (liveStage === 'done') return 'complete';
    if (stageIndex < liveIndex) return 'complete';
    if (stageIndex === liveIndex) return 'running';
    return 'pending';
  };

  const getTimeString = (stage, status) => {
    if (status === 'complete' && timestamps && timestamps[stage.key]) {
      const ts = timestamps[stage.key];
      try {
        return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } catch {
        return ts;
      }
    }
    if (status === 'running') return 'Running...';
    if (status === 'pending') return 'Queued';
    return '';
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-heading font-bold text-slate-900 mb-6 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-orange-500 inline-block animate-pulse" />
        Live Pipeline Execution
      </h3>

      {/* Horizontal pipeline — scrollable on small screens */}
      <motion.div
        className="flex items-start justify-between min-w-[720px] overflow-x-auto relative px-2 pb-2"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {STAGES.map((stage, index) => {
          const isLast = index === STAGES.length - 1;
          const status = getStageStatus(stage.id);
          const timeStr = getTimeString(stage, status);
          const Icon = stage.icon;

          // Color scheme per status
          const nodeColors = {
            complete: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 border-emerald-400',
            running: 'bg-white text-orange-600 border-orange-400 shadow-md shadow-orange-500/20',
            pending: 'bg-slate-100 text-slate-400 border-slate-200',
            idle: 'bg-slate-50 text-slate-400 border-slate-200',
          };

          const labelColors = {
            complete: 'text-emerald-700 font-bold',
            running: 'text-orange-600 font-bold',
            pending: 'text-slate-400 font-medium',
            idle: 'text-slate-500 font-medium',
          };

          const lineColor = status === 'complete' ? 'bg-emerald-400' : 'bg-slate-200';

          return (
            <React.Fragment key={stage.id}>
              {/* Stage Node */}
              <motion.div
                className="flex flex-col items-center relative z-10 w-[96px] shrink-0"
                variants={itemVariants}
              >
                {/* Relative container around Circle Icon ONLY so badge is attached to the icon */}
                <div className="relative">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center border-2 transition-all duration-300 ${nodeColors[status]}`}
                  >
                    {status === 'running' ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : status === 'complete' ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <Icon size={18} />
                    )}
                  </div>

                  {/* Step number badge attached directly to top-right corner of circle icon */}
                  <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm
                    ${status === 'complete' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : status === 'running' ? 'bg-orange-100 text-orange-700 border border-orange-300'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'}`
                  }>
                    {index + 1}
                  </div>

                  {/* Pulse ring for running stage */}
                  {status === 'running' && (
                    <div className="absolute inset-0 rounded-xl border-2 border-orange-400 animate-ping opacity-30 pointer-events-none" />
                  )}
                </div>

                {/* Label + Time below circle */}
                <div className="mt-3 text-center w-full">
                  <p className={`text-[11px] uppercase tracking-wider leading-tight ${labelColors[status]}`}>
                    {stage.label}
                  </p>
                  {timeStr && (
                    <p className={`text-[10px] font-mono mt-1 ${status === 'running' ? 'text-orange-500 animate-pulse' : 'text-slate-400'}`}>
                      {timeStr}
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Connector Line vertically aligned at midpoint of circle (22px from top) */}
              {!isLast && (
                <div className="flex-1 flex items-center pt-[20px] px-1 min-w-[20px]">
                  <div className="w-full h-[3px] bg-slate-200 rounded-full relative overflow-hidden">
                    <motion.div
                      className={`absolute inset-y-0 left-0 ${lineColor} rounded-full`}
                      initial={{ width: '0%' }}
                      animate={{ width: status === 'complete' ? '100%' : '0%' }}
                      transition={{ duration: 0.5, ease: 'easeInOut' }}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </motion.div>
    </div>
  );
};

export default PipelineTimeline;
