import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { Clock } from 'lucide-react';

const TimeToPatchCounter = ({ totalMs, isRunning }) => {
  const count = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isRunning) {
      setDisplayValue(0);
      return;
    }
    const controls = animate(count, totalMs, {
      duration: 2.5,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      }
    });
    return controls.stop;
  }, [totalMs, count, isRunning]);

  const seconds = (displayValue / 1000).toFixed(2);

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-cyber-card rounded-sm border border-cyber-accent h-full w-full relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-cyber-accent"></div>
      <div className="flex items-center gap-3 text-cyber-accent mb-4">
        <Clock size={28} />
        <h2 className="text-xl font-bold uppercase tracking-wider font-sans">End-to-End Time to Patch</h2>
      </div>
      <motion.div 
        className="text-7xl font-mono font-bold text-gray-100"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {seconds}s
      </motion.div>
      <div className="text-gray-500 mt-4 font-mono text-sm uppercase">
        {isRunning ? 'Calculating live...' : `${displayValue} milliseconds`}
      </div>
    </div>
  );
};

export default TimeToPatchCounter;
