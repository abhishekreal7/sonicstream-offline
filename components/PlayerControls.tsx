
import React from 'react';

interface PlayerControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  progress: number;
  duration: number;
  onSeek: (value: number) => void;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  progress,
  duration,
  onSeek
}) => {
  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto p-4">
      {/* Progress Bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400 w-10 text-right">{formatTime(progress)}</span>
        <input 
          type="range" 
          min="0" 
          max={duration || 100} 
          value={progress} 
          onChange={(e) => onSeek(Number(e.target.value))}
          className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <span className="text-xs text-slate-400 w-10">{formatTime(duration)}</span>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-center gap-8">
        <button 
          onClick={onPrev}
          className="text-slate-400 hover:text-white transition-colors p-2"
        >
          <i className="fas fa-step-backward text-xl"></i>
        </button>
        
        <button 
          onClick={onTogglePlay}
          className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-900/40 transition-all hover:scale-105 active:scale-95"
        >
          <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-2xl ${!isPlaying ? 'ml-1' : ''}`}></i>
        </button>

        <button 
          onClick={onNext}
          className="text-slate-400 hover:text-white transition-colors p-2"
        >
          <i className="fas fa-step-forward text-xl"></i>
        </button>
      </div>
    </div>
  );
};

export default PlayerControls;
