
import React from 'react';
import { motion } from 'framer-motion';
import { Track } from '../types';

interface CassetteViewProps {
  track: Track;
  isPlaying: boolean;
}

const CassetteView: React.FC<CassetteViewProps> = ({ track, isPlaying }) => {
  const isHiRes = track.quality === 'Hi-Res';
  const isLossless = track.quality === 'Lossless HD';
  
  // Choose tape color based on hardware quality
  const tapeColor = isHiRes ? 'from-[#d4af37] to-[#8b7325]' : isLossless ? 'from-[#a0a0a0] to-[#404040]' : 'from-[#222] to-[#000]';
  const labelColor = isHiRes ? 'bg-[#fffbeb]' : 'bg-[#f4f4f5]';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-[360px] aspect-[1.58/1] bg-[#0c0c0c] rounded-2xl p-4 shadow-[0_30px_70px_rgba(0,0,0,0.7)] border-t border-white/10 relative overflow-hidden"
    >
      {/* Tape Shell */}
      <div className={`w-full h-full rounded-xl bg-gradient-to-br ${tapeColor} relative border border-black/60 overflow-hidden shadow-[inset_0_2px_10px_rgba(255,255,255,0.1)]`}>
        <div className="absolute inset-0 bg-black/20 mix-blend-overlay opacity-30" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/brushed-alum.png")' }} />
        
        {/* Top Label */}
        <div className={`absolute top-2.5 left-1/2 -translate-x-1/2 w-[92%] h-14 ${labelColor} rounded-[2px] shadow-sm flex items-center px-6 overflow-hidden border-b-[3px] border-black/5`}>
           <span className="text-black/70 font-['Permanent_Marker',_cursive] text-lg truncate rotate-[-1deg] tracking-wide opacity-80">
             {track.title}
           </span>
        </div>

        {/* Center Viewing Window */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[65%] h-20 bg-black/90 rounded-lg border-[6px] border-[#222] shadow-[inset_0_5px_15px_rgba(0,0,0,0.8)] flex justify-around items-center px-8">
           {/* Reels */}
           {[1, 2].map((i) => (
             <motion.div 
               key={i}
               animate={{ rotate: isPlaying ? 360 : 0 }}
               transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
               className="w-12 h-12 border-[3px] border-white/5 rounded-full flex items-center justify-center relative shadow-xl"
             >
                <div className="w-1.5 h-1.5 bg-white/20 rounded-full" />
                <div className="absolute top-0 w-[2px] h-4 bg-white/10 left-1/2 -translate-x-1/2" />
                <div className="absolute left-0 h-[2px] w-4 bg-white/10 top-1/2 -translate-y-1/2" />
                {/* Spindle teeth */}
                {[0, 60, 120, 180, 240, 300].map(deg => (
                  <div key={deg} className="absolute w-[3px] h-3 bg-zinc-700/80 rounded-full" style={{ transform: `rotate(${deg}deg) translateY(-18px)` }} />
                ))}
             </motion.div>
           ))}
        </div>

        {/* Hardware Details Labels */}
        <div className="absolute bottom-3 left-6 right-6 flex justify-between">
           <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.4em]">Type {isHiRes ? 'IV Metal' : isLossless ? 'II Chrome' : 'I Normal'}</span>
           <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.4em]">{track.format} DIGITAL MASTER 4.4MM</span>
        </div>
      </div>
      
      {/* Tape Screw Details */}
      {[0, 1, 2, 3].map(i => (
        <div key={i} className={`absolute w-3 h-3 bg-black rounded-full border border-white/5 flex items-center justify-center ${i === 0 ? 'top-2 left-2' : i === 1 ? 'top-2 right-2' : i === 2 ? 'bottom-2 left-2' : 'bottom-2 right-2'}`}>
           <div className="w-1.5 h-0.5 bg-white/10 rotate-45" />
        </div>
      ))}
    </motion.div>
  );
};

export default CassetteView;
