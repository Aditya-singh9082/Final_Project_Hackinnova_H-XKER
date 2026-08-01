import React from 'react';

const BackgroundFX = () => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-cyber-bg pointer-events-none">
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      ></div>
      {/* Very faint animated noise/grain overlay could go here, but a CSS grid is lightweight and performant */}
    </div>
  );
};

export default BackgroundFX;
