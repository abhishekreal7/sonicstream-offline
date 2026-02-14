import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat,
  Library, AudioLines, ListMusic, Search,
  Headphones, Bluetooth, BatteryFull, Settings, Music, Sparkles,
  Mic2, Heart // Added icon for Lyrics and Like
} from 'lucide-react';
import { Track, Tab } from '../types';
import Visualizer from './Visualizer';
import { useBluetoothStatus } from '../hooks/useBluetoothStatus';
import { useTheme } from '../context/ThemeContext';

interface WalkmanViewProps {
  track: Track;
  isPlaying: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  isShuffle: boolean;
  isRepeat: boolean;
  progress: number;
  duration: number;
  audioElement: HTMLAudioElement | null;
  batteryLevel: number;
  onNavigate?: (tab: Tab) => void;
  activeTab?: Tab;
  vizData: number[];
  onToggleLike: (trackId: string) => void;
  showMoodAura: boolean;
  onToggleMoodAura: () => void;
  showLyrics: boolean;
}

interface LyricLine {
  time: number;
  text: string;
}

const MoodWaves: React.FC<{ palette: any; mood: string; isPlaying: boolean }> = ({ palette, mood, isPlaying }) => {
  const primaryColor = palette?.primary || '#ec5b13';
  const secondaryColor = palette?.secondary || '#ef4444';

  // Dynamic animation speed based on mood
  const duration = mood === 'Energetic' ? 3 : mood === 'Chill' ? 8 : 5;

  if (!isPlaying) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
      <AnimatePresence>
        <motion.div
          key={mood}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
        >
          {/* Wave 1 */}
          <motion.svg
            viewBox="0 0 1000 1000"
            className="absolute inset-x-0 bottom-0 w-full h-[60%] blur-3xl"
            animate={isPlaying ? {
              y: [0, -40, 0],
              scale: [1, 1.1, 1],
              rotate: [0, 5, 0]
            } : {}}
            transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d="M0,500 C200,400 300,600 500,500 C700,400 800,600 1000,500 L1000,1000 L0,1000 Z" fill={primaryColor} />
          </motion.svg>

          {/* Wave 2 */}
          <motion.svg
            viewBox="0 0 1000 1000"
            className="absolute inset-x-0 bottom-0 w-full h-[50%] blur-2xl"
            animate={isPlaying ? {
              y: [0, -30, 0],
              scale: [1, 1.05, 1],
              rotate: [0, -5, 0]
            } : {}}
            transition={{ duration: duration * 1.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            <path d="M0,600 C200,500 400,700 600,600 C800,500 1000,700 1000,600 L1000,1000 L0,1000 Z" fill={secondaryColor} opacity="0.6" />
          </motion.svg>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const WalkmanView: React.FC<WalkmanViewProps> = ({
  track, isPlaying, onClose, onTogglePlay, onNext, onPrev, onSeek,
  onToggleShuffle, onToggleRepeat, isShuffle, isRepeat, progress, duration, audioElement, batteryLevel,
  onNavigate, activeTab, vizData, onToggleLike, showMoodAura, onToggleMoodAura, showLyrics
}) => {
  const { theme } = useTheme();
  const [isBluetoothConnected, toggleBluetooth] = useBluetoothStatus();

  // Lyrics State
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState<number>(-1);
  const [isLyricsExpanded, setIsLyricsExpanded] = useState<boolean>(false);
  const lyricsBoxRef = useRef<HTMLDivElement>(null);

  // Load lyrics from localStorage
  useEffect(() => {
    const key = `lyrics:${track.title}::${track.artist}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const loaded: LyricLine[] = JSON.parse(saved);

        // Auto-fix legacy bad data (fake timestamps of 3s or 4s intervals)
        const isBadPattern3 = loaded.length > 5 && loaded.every((l, i) => Math.abs(l.time - i * 3) < 0.1);
        const isBadPattern4 = loaded.length > 5 && loaded.every((l, i) => Math.abs(l.time - i * 4) < 0.1);

        if (isBadPattern3 || isBadPattern4) {
          console.log("Detected legacy fake lyrics timestamps, converting to unsynced.");
          const fixed = loaded.map(l => ({ ...l, time: -1 }));
          setLyrics(fixed);
          localStorage.setItem(key, JSON.stringify(fixed));
        } else {
          setLyrics(loaded);
        }
      } catch (e) {
        console.error("Failed to parse saved lyrics", e);
        setLyrics([]);
      }
    } else {
      setLyrics([]);
    }
  }, [track.title, track.artist]);

  // Sync lyrics with progress
  useEffect(() => {
    if (lyrics.length === 0) return;

    // If lyrics are unsynced (time is -1), do not auto-scroll
    if (lyrics[0].time === -1) return;

    // Find the last lyric that has started
    let activeIdx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= progress) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx !== activeLyricIndex) {
      setActiveLyricIndex(activeIdx);

      // Auto-scroll logic
      if (lyricsBoxRef.current && activeIdx !== -1) {
        const container = lyricsBoxRef.current;
        const activeEl = container.children[activeIdx] as HTMLElement;
        if (activeEl) {
          const containerHeight = container.clientHeight;
          const elHeight = activeEl.clientHeight;
          const elTop = activeEl.offsetTop - container.offsetTop;

          // Scroll to center the element
          container.scrollTo({
            top: elTop - containerHeight / 2 + elHeight / 2,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [progress, lyrics, activeLyricIndex]);

  const parseLRC = (text: string): LyricLine[] => {
    const lines = text.split(/\r?\n/);
    const out: LyricLine[] = [];
    const timeRe = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

    for (const line of lines) {
      const times = [...line.matchAll(timeRe)];
      const lyricText = line.replace(timeRe, "").trim();

      for (const m of times) {
        const mm = parseInt(m[1], 10);
        const ss = parseInt(m[2], 10);
        const ms = m[3] ? parseInt(m[3].padEnd(3, "0"), 10) : 0;
        const t = mm * 60 + ss + ms / 1000;
        out.push({ time: t, text: lyricText || "…" });
      }
    }
    return out.sort((a, b) => a.time - b.time);
  };

  const handleImportLyrics = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseLRC(text);
      setLyrics(parsed);

      // Save
      const key = `lyrics:${track.title}::${track.artist}`;
      localStorage.setItem(key, JSON.stringify(parsed));
    } catch (err) {
      console.error("Failed to import lyrics", err);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Maps internal AudioQuality strings to Badge UI text
  const getBadgeDetails = (quality?: string) => {
    switch (quality) {
      case 'DSD':
        return { label: 'DIRECT', tag: 'DSD' };
      case 'Hi-Res Audio':
        return { label: 'HI-RES', tag: 'MAST' };
      case 'Lossless':
        return { label: 'LOSSLESS', tag: 'CD' };
      case 'HQ':
        return { label: 'HQ', tag: 'AUDIO' };
      case 'Standard':
        return { label: 'STANDARD', tag: 'STD' };
      default:
        return { label: 'STANDARD', tag: 'SRC' };
    }
  };

  const badgeDetails = getBadgeDetails(track.quality);
  const accentColor = track.palette?.primary || '#ec5b13';

  // Precision Dolby Detection
  const isDolbyAtmos = useMemo(() => {
    const searchStr = `${track.codec || ''} ${track.format || ''} ${track.title || ''}`.toLowerCase();
    return searchStr.includes('dolby') ||
      searchStr.includes('atmos') ||
      searchStr.includes('ac3') ||
      searchStr.includes('eac3') ||
      searchStr.includes('ec-3') ||
      searchStr.includes('mlp');
  }, [track.codec, track.format, track.title]);

  return (
    <motion.div
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: "spring", damping: 30, stiffness: 200 }}
      className="fixed inset-0 max-w-md mx-auto z-[100] bg-chassis flex flex-col items-center select-none overflow-hidden transition-colors duration-300 border-x border-foreground/5 shadow-2xl"
    >
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 brushed-metal opacity-30 pointer-events-none" />

      {/* Mood Aura Background (Light Mode Only) */}
      <AnimatePresence>
        {
          theme === 'light' && track.palette && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 30%, ${track.palette.primary}, transparent 70%)`
              }}
            />
          )
        }
      </AnimatePresence>

      {/* Dynamic Mood Waves (Light Mode Only) */}
      {(theme === 'light' && showMoodAura) && <MoodWaves palette={track.palette} mood={track.mood || ''} isPlaying={isPlaying} />}

      {/* Top Status Bar */}
      <div
        className="w-full relative z-10 flex items-center justify-between px-6 pb-2 shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)' }}
      >
        <div className="flex items-center gap-2 min-h-[14px]">
          {isBluetoothConnected && (
            <>
              <Bluetooth size={14} className="text-blue-400 drop-shadow-[0_0_4px_rgba(56,189,248,0.5)]" />
              <span className="font-mono text-[9px] tracking-[0.2em] text-blue-400/80 uppercase">LDAC / Bluetooth</span>
            </>
          )}
          {!isBluetoothConnected && (
            <div className="flex items-center gap-2 opacity-20">
              <Headphones size={14} className="text-foreground/40" />
              <span className="font-mono text-[9px] tracking-[0.2em] text-foreground/40 uppercase">Internal DAC</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div onClick={toggleBluetooth} className="cursor-pointer active:scale-95 transition-transform" title="Toggle Bluetooth indicator">
            <Bluetooth
              size={18}
              className={`transition-all duration-700 ${isBluetoothConnected ? 'text-blue-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]' : 'text-foreground/60'}`}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="font-mono text-[10px] text-foreground/60">{batteryLevel}%</span>
            <BatteryFull size={18} className="text-copper" />
          </div>
        </div>
      </div>

      {/* Header Title */}
      <div className="w-full relative z-10 flex items-center justify-between px-6 py-2 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onToggleLike(track.id)}
            className={`size-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${track.isLiked ? 'bg-rose-500/20 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'bg-white/5 text-foreground/20 hover:text-foreground/40 hover:bg-white/10'}`}
            title={track.isLiked ? "Unlike" : "Like"}
          >
            <Heart size={20} fill={track.isLiked ? "currentColor" : "none"} />
          </button>
          <div className="flex flex-col">
            <h2 className="text-[10px] font-mono tracking-[0.3em] text-copper uppercase leading-none">SonicStream</h2>
            <h1 className="text-xs font-light tracking-[0.1em] text-foreground/30 uppercase mt-1">Signature Series</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMoodAura}
            disabled={theme === 'dark'}
            className={`size-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${theme === 'dark' ? 'opacity-0 pointer-events-none' : (showMoodAura ? 'text-copper shadow-[0_0_15px_rgba(236,91,19,0.3)]' : 'text-foreground/20')}`}
            title={theme === 'dark' ? "Mood Aura (Light Mode Only)" : "Toggle Mood Aura"}
          >
            <Sparkles size={20} />
          </button>
          <button
            onClick={onClose}
            className="size-10 rounded-full flex items-center justify-center text-foreground/40 hover:text-foreground transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Album Art / Jewel Case / Metadata Container */}
      <div className="relative z-10 flex-1 w-full overflow-y-auto no-scrollbar">
        <div className="min-h-full flex flex-col items-center justify-center px-8 py-4">
          <div className="relative group w-full max-w-[300px] aspect-square shrink-0">
            <div className="absolute inset-0 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] z-10 pointer-events-none border border-foreground/5"></div>
            <svg
              className="w-full h-full object-cover rounded-xl shadow-2xl border border-white/5"
              viewBox="0 0 1024 1024"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Minimal mountain album art"
            >
              <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f6d6b2" />
                  <stop offset="100%" stopColor="#f1cda9" />
                </linearGradient>
                <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
                  <stop offset="60%" stopColor="rgba(0,0,0,0)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
                </radialGradient>
                <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="18" result="blur" />
                  <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.35 0" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="m1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#7b7057" />
                  <stop offset="100%" stopColor="#5f5845" />
                </linearGradient>
                <linearGradient id="m2" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8b8164" />
                  <stop offset="100%" stopColor="#6c644f" />
                </linearGradient>
              </defs>
              <rect width="1024" height="1024" rx="72" fill="url(#bg)" />
              <rect x="48" y="48" width="928" height="928" rx="64" fill="rgba(255,255,255,0.10)" filter="url(#softGlow)" />
              <circle cx="520" cy="420" r="210" fill="#f4eadb" opacity="0.95" />
              <path d="M220 720 L470 340 L730 720 Z" fill="url(#m1)" />
              <path d="M470 720 L660 390 L860 720 Z" fill="url(#m2)" opacity="0.95" />
              <path d="M470 340 C500 430, 510 520, 500 720 L545 720 C560 560, 560 470, 540 400 C525 360, 500 345, 470 340 Z" fill="rgba(0,0,0,0.10)" />
              <rect x="180" y="720" width="664" height="26" rx="13" fill="rgba(0,0,0,0.08)" />
              <rect width="1024" height="1024" rx="72" fill="url(#vignette)" />
            </svg>
          </div>

          <div className="mt-8 w-full flex flex-col items-center gap-1 shrink-0">
            <h3 className="text-2xl font-medium tracking-tight text-foreground text-center line-clamp-2">{track.title}</h3>
            <p className="text-copper font-medium tracking-wide text-center line-clamp-1">{track.artist}</p>

            {isDolbyAtmos && (
              <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.2)]">
                <span className="material-symbols-outlined text-[14px] text-foreground/70">spatial_audio</span>
                <span className="text-[9px] font-bold tracking-[0.2em] text-foreground/60 uppercase">Dolby Atmos</span>
              </div>
            )}
          </div>

          {/* Minimalist Lyrics Panel */}
          {showLyrics && (
            <div className="mt-8 w-full flex flex-col items-center gap-2 transition-all duration-500 ease-in-out">
              <div
                onClick={() => setIsLyricsExpanded(!isLyricsExpanded)}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                <div className="flex items-center gap-3 text-[10px] font-bold tracking-[0.3em] text-foreground/20 group-hover:text-copper transition-colors uppercase select-none">
                  <span className={`transition-transform duration-300 ${isLyricsExpanded ? 'rotate-180' : ''}`}>&#8964;</span>
                  LYRICS
                  <span className={`transition-transform duration-300 ${isLyricsExpanded ? 'rotate-180' : ''}`}>&#8964;</span>
                </div>

                {!isLyricsExpanded && (
                  <p className="text-sm font-medium text-foreground/50 italic text-center max-w-[280px] line-clamp-1 transition-colors group-hover:text-foreground/80 h-5">
                    {lyrics.length > 0
                      ? (lyrics[0].time === -1 ? "(Unsynced Lyrics)" : (activeLyricIndex !== -1 ? lyrics[activeLyricIndex].text : lyrics[0].text))
                      : ""}
                  </p>
                )}
              </div>

              {!isLyricsExpanded && (
                <div className="mt-5 flex items-center justify-center">
                  <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-foreground/5 border border-foreground/5 backdrop-blur-sm shadow-inner transition-all hover:bg-foreground/10">
                    <span className="text-[10px] font-bold text-copper tracking-wide font-mono whitespace-nowrap">
                      {(() => {
                        const codec = track.format?.toUpperCase() || 'MP3';
                        const sr = track.sampleRate
                          ? (track.sampleRate >= 1000000
                            ? `${(track.sampleRate / 1000000).toFixed(1)}MHz`
                            : `${(track.sampleRate / 1000).toFixed(1)}kHz`)
                          : '44.1kHz';
                        return `${codec} ${sr}`;
                      })()}
                    </span>
                    <span className="w-px h-2.5 bg-foreground/20"></span>
                    <span className="text-[10px] font-medium text-foreground/60 tracking-wider font-mono">
                      {(() => {
                        const parts: string[] = [];
                        if (track.bitrate) parts.push(`${Math.round(track.bitrate / 1000)}kbps`);
                        if (track.bitDepth) {
                          parts.push(`${track.bitDepth}-bit`);
                        } else if (track.quality === 'DSD') {
                          parts.push('1-bit');
                        } else {
                          parts.push('16-bit');
                        }
                        return parts.join(' ');
                      })()}
                    </span>
                    <span className="w-px h-2.5 bg-foreground/20"></span>
                    <span className="text-[10px] font-black text-foreground tracking-widest font-mono uppercase">
                      {badgeDetails.label}
                    </span>
                  </div>
                </div>
              )}

              <div
                className={`w-full max-w-[320px] overflow-hidden transition-all duration-500 ease-in-out rounded-xl border border-white/5 shadow-inner backdrop-blur-sm ${isLyricsExpanded ? 'max-h-[300px] opacity-100 bg-black/20 mt-2' : 'max-h-0 opacity-0'}`}
              >
                <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                  <span className="text-[9px] font-mono font-bold text-foreground/40 uppercase tracking-widest">Full Lyrics</span>
                  <label className="text-[9px] font-bold text-copper/60 border border-copper/20 rounded-full px-2 py-0.5 cursor-pointer hover:bg-copper/10 hover:text-copper transition-colors uppercase tracking-wider flex items-center gap-1">
                    <Mic2 size={10} /> Import .LRC
                    <input type="file" accept=".lrc,.txt" className="hidden" onChange={handleImportLyrics} />
                  </label>
                </div>
                <div
                  ref={lyricsBoxRef}
                  className="h-[240px] overflow-y-auto px-6 py-6 space-y-5 text-center scroll-smooth no-scrollbar"
                >
                  {lyrics.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-foreground/30">
                      <p className="text-sm italic mb-2">No lyrics found</p>
                      <p className="text-[10px] uppercase tracking-widest">Import a .lrc file to sync</p>
                    </div>
                  ) : (
                    lyrics.map((line, idx) => {
                      const isUnsynced = line.time === -1;
                      const isActive = idx === activeLyricIndex;
                      return (
                        <p
                          key={idx}
                          className={`transition-all duration-300 origin-center ${isUnsynced
                            ? 'text-foreground/70 text-sm py-1'
                            : isActive
                              ? 'text-copper text-base font-bold scale-105 drop-shadow-md'
                              : 'text-foreground/30 text-sm blur-[0.5px] scale-95'
                            }`}
                        >
                          {line.text}
                        </p>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {!showLyrics && (
            <div className="mt-8 flex items-center justify-center">
              <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-foreground/5 border border-foreground/5 backdrop-blur-sm shadow-inner transition-all hover:bg-foreground/10">
                <span className="text-[10px] font-bold text-copper tracking-wide font-mono whitespace-nowrap">
                  {(() => {
                    const codec = track.format?.toUpperCase() || 'MP3';
                    const sr = track.sampleRate
                      ? (track.sampleRate >= 1000000
                        ? `${(track.sampleRate / 1000000).toFixed(1)}MHz`
                        : `${(track.sampleRate / 1000).toFixed(1)}kHz`)
                      : '44.1kHz';
                    return `${codec} ${sr}`;
                  })()}
                </span>
                <span className="w-px h-2.5 bg-foreground/20"></span>
                <span className="text-[10px] font-medium text-foreground/60 tracking-wider font-mono">
                  {(() => {
                    const parts: string[] = [];
                    if (track.bitrate) parts.push(`${Math.round(track.bitrate / 1000)}kbps`);
                    if (track.bitDepth) {
                      parts.push(`${track.bitDepth}-bit`);
                    } else if (track.quality === 'DSD') {
                      parts.push('1-bit');
                    } else {
                      parts.push('16-bit');
                    }
                    return parts.join(' ');
                  })()}
                </span>
                <span className="w-px h-2.5 bg-foreground/20"></span>
                <span className="text-[10px] font-black text-foreground tracking-widest font-mono uppercase">
                  {badgeDetails.label}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VU Meter / Visualizer Section */}
      <div className="w-full relative z-10 px-8 py-4 space-y-3 shrink-0">
        <div className="vu-baseline w-full"></div>
        <Visualizer vizData={vizData} palette={track.palette} />
        <div className="flex justify-between font-mono text-[9px] text-foreground/30 tracking-widest px-1">
          <span>-60dB</span>
          <span>-20dB</span>
          <span>-10dB</span>
          <span className="text-copper">0dB</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full relative z-10 px-8 py-4 shrink-0">
        <div className="relative h-1.5 w-full bg-foreground/5 rounded-full">
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-copper shadow-[0_0_10px_rgba(236,91,19,0.5)] transition-all duration-100"
            style={{ width: `${(progress / (duration || 1)) * 100}%` }}
          />
          <input
            type="range" min="0" max={duration || 0} step="0.1" value={progress}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="absolute inset-0 w-full h-4 -top-1 opacity-0 cursor-pointer z-20"
          />
        </div>
        <div className="flex justify-between mt-2 font-mono text-[10px] text-foreground/40 tabular-nums">
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls Section */}
      <div className="w-full relative z-10 px-8 pb-12 pt-4 shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={onToggleShuffle}
            className={`milled-button size-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${isShuffle ? 'text-copper' : 'text-foreground/60'}`}
          >
            <Shuffle size={18} />
          </button>
          <div className="flex items-center gap-6">
            <button
              onClick={onPrev}
              className="milled-button size-14 rounded-full flex items-center justify-center text-foreground/80 active:scale-95 transition-transform"
            >
              <SkipBack size={24} fill="currentColor" className="mr-1" />
            </button>
            <button
              onClick={onTogglePlay}
              className="size-20 rounded-full bg-copper shadow-[0_0_30px_rgba(236,91,19,0.3)] flex items-center justify-center text-black active:scale-95 transition-transform hover:brightness-110"
            >
              {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>
            <button
              onClick={onNext}
              className="milled-button size-14 rounded-full flex items-center justify-center text-foreground/80 active:scale-95 transition-transform"
            >
              <SkipForward size={24} fill="currentColor" className="ml-1" />
            </button>
          </div>
          <button
            onClick={onToggleRepeat}
            className={`milled-button size-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${isRepeat ? 'text-copper' : 'text-foreground/60'}`}
          >
            <Repeat size={18} />
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div
        className="w-full relative z-10 bg-black/40 backdrop-blur-xl border-t border-foreground/5 px-6 pt-4 shrink-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        <div className="flex items-center justify-around">
          <button
            onClick={() => onNavigate?.('library')}
            className={`flex flex-col items-center gap-1 group active:scale-95 transition-transform ${activeTab === 'library' ? 'text-copper' : 'text-foreground/40 hover:text-foreground'}`}
          >
            <Library size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-mono uppercase tracking-tighter">Library</span>
          </button>
          <button
            onClick={() => onNavigate?.('sound')}
            className={`flex flex-col items-center gap-1 group active:scale-95 transition-transform ${activeTab === 'sound' ? 'text-copper' : 'text-foreground/40 hover:text-foreground'}`}
          >
            <AudioLines size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-mono uppercase tracking-tighter">Sound</span>
          </button>
          <button
            onClick={() => onNavigate?.('playlists')}
            className={`flex flex-col items-center gap-1 group active:scale-95 transition-transform ${activeTab === 'playlists' ? 'text-copper' : 'text-foreground/40 hover:text-foreground'}`}
          >
            <ListMusic size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-mono uppercase tracking-tighter">Sets</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default WalkmanView;