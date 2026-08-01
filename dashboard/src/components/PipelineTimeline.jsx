import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';

const STAGES = [
  { id: 'scan', label: 'Scanner', key: 'scan_completed_at' },
  { id: 'reach', label: 'Reachability', key: 'reachability_completed_at' },
  { id: 'patch', label: 'Patch Gen', key: 'patch_generated_at' },
  { id: 'verify', label: 'Exploit Verify', key: 'verified_at' },
  { id: 'compat', label: 'Compat Check', key: 'compat_completed_at' },
  { id: 'regress', label: 'Regression', key: 'regression_completed_at' },
  { id: 'pr', label: 'PR Opened', key: 'pr_opened_at' }
];

const PipelineTimeline = ({ timestamps, liveStage }) => {
  const [activeStage, setActiveStage] = useState(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const lineVariants = {
    hidden: { scaleX: 0 },
    show: { scaleX: 1, transition: { duration: 0.3, ease: "easeInOut" } }
  };

  const getStageStatus = (stageId) => {
    if (!liveStage) return 'complete'; // Not running live, show default finished state
    const stageIndex = STAGES.findIndex(s => s.id === stageId);
    const liveIndex = STAGES.findIndex(s => s.id === liveStage);
    
    if (stageIndex < liveIndex) return 'complete';
    if (stageIndex === liveIndex) return 'running';
    return 'pending';
  };

  return (
    <div className="w-full bg-cyber-card p-8 rounded-sm border border-cyber-border overflow-x-auto relative">
      <h3 className="text-lg font-bold text-gray-100 mb-8 tracking-wide font-sans uppercase">Pipeline Execution Sequence</h3>
      
      <motion.div 
        className="flex items-center justify-between min-w-[800px] relative pb-8"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {STAGES.map((stage, index) => {
          const isLast = index === STAGES.length - 1;
          const status = getStageStatus(stage.id);
          
          let timeString = 'Pending...';
          if (status === 'complete' && timestamps[stage.key]) {
            timeString = new Date(timestamps[stage.key]).toISOString().split('T')[1].replace('Z', '');
          } else if (status === 'running') {
            timeString = 'Running...';
          }

          return (
            <React.Fragment key={stage.id}>
              {/* Stage Node */}
              <motion.div 
                className="flex flex-col items-center relative z-10 cursor-pointer group"
                variants={itemVariants}
                onClick={() => setActiveStage(activeStage === stage.id ? null : stage.id)}
              >
                <div className={`w-12 h-12 rounded-sm flex items-center justify-center transition-colors duration-300
                  ${status === 'complete' ? 'bg-cyber-accent text-cyber-bg' : 
                    status === 'running' ? 'bg-transparent border-2 border-cyber-accent text-cyber-accent' :
                    'bg-cyber-bg border-2 border-cyber-border text-gray-500'}
                `}>
                  {status === 'running' ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} />}
                </div>
                <div className="absolute top-14 text-center w-32 -ml-10">
                  <p className={`font-bold text-xs uppercase ${status === 'running' ? 'text-cyber-accent' : status === 'complete' ? 'text-gray-100' : 'text-gray-600'}`}>
                    {stage.label}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono mt-1">{timeString}</p>
                </div>
              </motion.div>

              {/* Connecting Line */}
              {!isLast && (
                <div className="flex-1 h-[2px] bg-cyber-border relative -ml-4 -mr-4 z-0 mt-[-32px]">
                   <motion.div 
                      className="absolute inset-0 bg-cyber-accent origin-left"
                      variants={status === 'complete' ? lineVariants : { hidden: { scaleX: 0 }, show: { scaleX: 0 } }}
                   />
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
