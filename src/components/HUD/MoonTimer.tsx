import React from 'react';
import { motion } from 'motion/react';

const MoonPhase = ({ index, color, size = 14 }: { index: number, color: string, size?: number }) => {
  const getPath = (i: number) => {
    switch (i) {
      case 0: return ""; // New
      case 1: return "M12 2C14.76 2 17.26 3.12 19.07 4.93C17.26 6.74 16.14 9.24 16.14 12C16.14 14.76 17.26 17.26 19.07 19.07C17.26 20.88 14.76 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2Z";
      case 2: return "M12 2V22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2Z";
      case 3: return "M12 2C14.76 2 17.26 3.12 19.07 4.93C20.88 6.74 22 9.24 22 12C22 14.76 20.88 17.26 19.07 19.07C17.26 20.88 14.76 22 12 22V2Z";
      case 4: return "M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z";
      case 5: return "M12 2C9.24 2 6.74 3.12 4.93 4.93C3.12 6.74 2 9.24 2 12C2 14.76 3.12 17.26 4.93 19.07C6.74 20.88 9.24 22 12 22V2Z";
      case 6: return "M12 2V22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z";
      case 7: return "M12 2C9.24 2 6.74 3.12 4.93 4.93C6.74 6.74 7.86 9.24 7.86 12C7.86 14.76 6.74 17.26 4.93 19.07C6.74 20.88 9.24 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z";
      default: return "";
    }
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1" opacity="0.2" />
      <path d={getPath(index)} fill={color} />
    </svg>
  );
};

export const MoonTimer = ({ timeLeft, limit }: { timeLeft: number, limit: number }) => {
  const progress = 1 - (timeLeft / limit); // 0 at start, 1 at end
  
  return (
    <div className="relative w-[120px] h-10 flex items-center justify-between px-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 shadow-2xl">
      {/* Dial/Pointer */}
      <motion.div 
        className="absolute top-0 bottom-0 w-8 -ml-4 flex flex-col items-center justify-between py-0.5 z-10 pointer-events-none"
        animate={{ left: `${progress * 100}%` }}
        transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
      >
        <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[10px] border-t-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
        <div className="w-6 h-6 rounded-full border-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]" />
        <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[10px] border-b-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
      </motion.div>

      {/* Moons */}
      {Array.from({ length: 8 }).map((_, i) => {
        // Color interpolation from zinc-400 to red-500
        const r = Math.floor(161 + (239 - 161) * progress);
        const g = Math.floor(161 + (68 - 161) * progress);
        const b = Math.floor(170 + (68 - 170) * progress);
        const color = `rgb(${r}, ${g}, ${b})`;

        return (
          <div key={i} className="z-0">
            <MoonPhase index={i} color={color} />
          </div>
        );
      })}
    </div>
  );
};
