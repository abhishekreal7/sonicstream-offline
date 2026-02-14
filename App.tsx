import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ChevronRight, Play, Pause, Library, AudioLines, ListMusic,
  Search, SkipBack, SkipForward, Sliders, Sparkles, Disc, Music,
  Headphones, Mic2, X, MoreVertical, ListPlus, Check, Heart, FolderPlus
} from 'lucide-react';
import { Track, PlaybackStatus, Tab, AudioQuality, Playlist } from './types';
import PlaylistView from './components/PlaylistView';
import PlaylistDetailView from './components/PlaylistDetailView';
import { audioQualityService } from './services/audioQualityService';
import WalkmanView from './components/WalkmanView';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import Visualizer from './components/Visualizer';
import AudioSettings from './components/AudioSettings';
import { useAudioProcessing } from './hooks/useAudioProcessing';
import { storageService } from './services/storageService';

const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.onerror = () => resolve(0);
  });
};

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(true);

  // Load Library from Persistent Storage on Mount
  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const savedTracks = await storageService.getAllTracks();
        if (savedTracks.length > 0) {
          // Re-generate Blob URLs for the session
          const tracksWithUrls = savedTracks.map(track => {
            if (track.file) {
              return { ...track, url: URL.createObjectURL(track.file) };
            }
            return track;
          });
          setTracks(tracksWithUrls);
        }
      } catch (err) {
        console.error("Failed to load library from storage", err);
      } finally {
        setIsLibraryLoading(false);
      }
    };
    loadLibrary();
  }, []);

  // Sync Library to Persistent Storage when tracks change
  useEffect(() => {
    if (!isLibraryLoading) {
      storageService.saveTracks(tracks);
    }
  }, [tracks, isLibraryLoading]);

  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>(PlaybackStatus.STOPPED);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [discoveryMode, setDiscoveryMode] = useState(true);
  const [isRepeat, setIsRepeat] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(98);
  const [activeTab, setActiveTab] = useState<Tab>('library');
  const [showMoodAura, setShowMoodAura] = useState(true);
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Filtering state for collections
  const [filterQuality, setFilterQuality] = useState<AudioQuality | null>(null);

  // Playlist State
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [viewingPlaylist, setViewingPlaylist] = useState<Playlist | null>(null);
  const [trackToAddToPlaylist, setTrackToAddToPlaylist] = useState<Track | null>(null);
  const [queueMenu, setQueueMenu] = useState<{ index: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreatePlaylist = (name: string) => {
    const newPlaylist: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      trackIds: []
    };
    setPlaylists([...playlists, newPlaylist]);
  };

  const handleDeletePlaylist = (id: string) => {
    setPlaylists(playlists.filter(p => p.id !== id));
  };

  const handleSelectPlaylist = (playlist: Playlist) => {
    setViewingPlaylist(playlist);
  };

  const handleAddToPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId && !p.trackIds.includes(trackId)) {
        return { ...p, trackIds: [...p.trackIds, trackId] };
      }
      return p;
    }));
    setTrackToAddToPlaylist(null); // Close modal
    showToast("Added to Playlist");
  };

  const handleRemoveTrackFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return { ...p, trackIds: p.trackIds.filter(id => id !== trackId) };
      }
      return p;
    }));
    // Also update viewingPlaylist if it's the one being modified
    if (viewingPlaylist && viewingPlaylist.id === playlistId) {
      setViewingPlaylist(prev => prev ? { ...prev, trackIds: prev.trackIds.filter(id => id !== trackId) } : null);
    }
  };

  // Toast State
  const [toast, setToast] = useState<{ message: string, visible: boolean }>({ message: '', visible: false });

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2000);
  };

  const handleAddToQueue = (track: Track) => {
    // Create a unique instance for the queue to allow duplicates in queue without key collisions
    // and mark it so we can exclude it from the Library view
    const queueItem: Track = {
      ...track,
      id: `${track.id}-${Date.now()}`,
      isQueueItem: true
    };

    // Insert after the current track (Play Next behavior) so user sees it immediately
    setTracks(prev => {
      const newTracks = [...prev];
      const insertIndex = currentTrackIndex + 1;
      newTracks.splice(insertIndex, 0, queueItem);
      return newTracks;
    });

    showToast("Playing Next");
  };

  const handleRemoveFromQueue = (index: number) => {
    setTracks(prev => prev.filter((_, i) => i !== index));
    if (index < currentTrackIndex) {
      setCurrentTrackIndex(prev => Math.max(0, prev - 1));
    }
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = useMemo(() => tracks[currentTrackIndex] || null, [currentTrackIndex, tracks]);

  const toggleLike = (trackId: string) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, isLiked: !t.isLiked } : t));
    const track = tracks.find(t => t.id === trackId);
    if (track) showToast(!track.isLiked ? "Added to Liked" : "Removed from Liked");
  };

  const {
    settings: audioSettings,
    updateBand,
    toggleDSEE,
    toggleClearAudio,
    resetSettings,
    vizData,
    resume,
    setPreset,
    setPreamp,
    setBalance,
    setWidth,
    toggleSmartLoudness,
    toggleLyrics
  } = useAudioProcessing(audioRef);

  // Derived filtered tracks
  const displayedTracks = useMemo(() => {
    // Filter out temporary queue items from Library view
    let filtered = tracks.filter(t => !t.isQueueItem);

    if (filterQuality === 'Liked' as any) {
      filtered = filtered.filter(t => t.isLiked);
    } else if (filterQuality) {
      filtered = filtered.filter(t => t.quality === filterQuality);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [tracks, filterQuality, searchQuery]);

  // Generate Smart Collections from existing tracks
  const collections = useMemo(() => {
    const counts = tracks.reduce((acc, track) => {
      const q = track.quality || 'Unknown Quality';
      acc[q] = (acc[q] || 0) + 1;
      if (track.isLiked) acc['Liked'] = (acc['Liked'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const smartDefs = [
      {
        id: 'Liked',
        title: 'Liked Songs',
        subtitle: 'Your Favorites',
        icon: Heart,
        gradient: 'from-rose-600 to-pink-800',
        badges: ['HEART', 'FAVS'],
        quality: 'Liked' as any,
        count: counts['Liked'] || 0,
        type: 'smart'
      },
      {
        id: 'DSD',
        title: 'Master DSD',
        subtitle: 'Pure Audio',
        icon: Sparkles,
        gradient: 'from-amber-800 to-yellow-900',
        badges: ['DSD', 'DIRECT'],
        quality: 'DSD' as AudioQuality,
        count: counts['DSD'] || 0,
        type: 'smart'
      },
      {
        id: 'Hi-Res',
        title: 'Hi-Res Audio',
        subtitle: 'Master Quality',
        icon: Sparkles,
        gradient: 'from-amber-700 to-yellow-900',
        badges: ['HI-RES', 'MAST'],
        quality: 'Hi-Res Audio' as AudioQuality,
        count: counts['Hi-Res Audio'] || 0,
        type: 'smart'
      },
      {
        id: 'Lossless',
        title: 'Lossless Collection',
        subtitle: 'CD Quality',
        icon: Disc,
        gradient: 'from-slate-600 to-slate-800',
        badges: ['LOSSLESS', 'CD'],
        quality: 'Lossless' as AudioQuality,
        count: counts['Lossless'] || 0,
        type: 'smart'
      },
      {
        id: 'HQ',
        title: 'High Quality',
        subtitle: 'Premium Audio',
        icon: Music,
        gradient: 'from-emerald-700 to-emerald-900',
        badges: ['HQ', 'AUDIO'],
        quality: 'HQ' as AudioQuality,
        count: counts['HQ'] || 0,
        type: 'smart'
      },
      {
        id: 'Standard',
        title: 'Standard Audio',
        subtitle: 'Balanced',
        icon: Headphones,
        gradient: 'from-blue-700 to-blue-900',
        badges: ['STANDARD', 'STD'],
        quality: 'Standard' as AudioQuality,
        count: counts['Standard'] || 0,
        type: 'smart'
      }
    ].filter(def => def.count > 0);

    // Add playlists that have a cover image
    const playlistDefs = playlists
      .filter(p => p.coverImage)
      .map(p => ({
        id: p.id,
        title: p.name,
        subtitle: 'Playlist',
        icon: AudioLines,
        coverImage: p.coverImage,
        badges: ['SET', 'USER'],
        count: p.trackIds.length,
        type: 'playlist',
        playlist: p
      }));

    return [...smartDefs, ...playlistDefs];
  }, [tracks, playlists]);

  // Enhanced Mood Palette Generator with Keyword Detection
  const getMoodPalette = (title: string, artist: string = '') => {
    const text = `${title} ${artist}`.toLowerCase();

    const moods = [
      {
        name: 'Energetic',
        keywords: ['fast', 'energetic', 'party', 'dance', 'workout', 'power', 'heavy', 'rock', 'beat', 'drum'],
        palette: { primary: '#ec5b13', secondary: '#ef4444', ring: 'rgba(236, 91, 19, 0.4)' }
      },
      {
        name: 'Chill',
        keywords: ['chill', 'relax', 'sleep', 'ocean', 'blue', 'soft', 'mellow', 'ambient', 'lof', 'rain'],
        palette: { primary: '#1e3a8a', secondary: '#3b82f6', ring: 'rgba(30, 58, 138, 0.4)' }
      },
      {
        name: 'Focus',
        keywords: ['focus', 'study', 'work', 'zen', 'calm', 'piano', 'instrumental', 'brain'],
        palette: { primary: '#065f46', secondary: '#10b981', ring: 'rgba(6, 95, 70, 0.4)' }
      },
      {
        name: 'Romantic',
        keywords: ['love', 'romantic', 'darling', 'heart', 'kiss', 'sweet', 'valentin', 'pink', 'rose'],
        palette: { primary: '#be123c', secondary: '#fb7185', ring: 'rgba(190, 18, 60, 0.4)' }
      },
      {
        name: 'Sad',
        keywords: ['sad', 'lonely', 'dark', 'pain', 'cry', 'tears', 'broken', 'grey'],
        palette: { primary: '#334155', secondary: '#475569', ring: 'rgba(51, 65, 85, 0.4)' }
      }
    ];

    // 1. Try Keyword Matching
    for (const m of moods) {
      if (m.keywords.some(kw => text.includes(kw))) {
        return { mood: m.name, palette: m.palette };
      }
    }

    // 2. Fallback to Deterministic Hash
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % moods.length;
    return { mood: moods[index].name, palette: moods[index].palette };
  };

  // Assign mood/palette on track load (synchronously now)
  useEffect(() => {
    if (currentTrack && !currentTrack.mood) {
      const { mood, palette } = getMoodPalette(currentTrack.title, currentTrack.artist);
      setTracks(prev => prev.map(t => t.id === currentTrack.id ? { ...t, mood, palette } : t));
    }

    if (currentTrack && audioRef.current) {
      const wasPlaying = playbackStatus === PlaybackStatus.PLAYING;
      audioRef.current.src = currentTrack.url;
      if (wasPlaying) {
        // Resume context if needed before playing
        // (Handled by togglePlay usually, but good to be safe)
        audioRef.current.play().catch(console.warn);
      }
    }
  }, [currentTrackIndex]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        (navigator as any).getBattery()
          .then((b: any) => setBatteryLevel(Math.round(b.level * 100)))
          .catch(() => { });
      } catch (e) {
        console.debug("Battery API not supported");
      }
    }
  }, []);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (playbackStatus === PlaybackStatus.PLAYING) {
      audioRef.current.pause();
      setPlaybackStatus(PlaybackStatus.PAUSED);
    } else {
      await resume(); // Ensure AudioContext is running
      audioRef.current.play().catch(console.warn);
      setPlaybackStatus(PlaybackStatus.PLAYING);
    }
  };

  const nextTrack = () => {
    // REPEAT ONE LOGIC
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.warn);
      return;
    }

    if (tracks.length === 0) return;

    let nextIndex = (currentTrackIndex + 1) % tracks.length;
    const potentialNext = tracks[nextIndex];

    // DISCOVERY MODE: If next track is NOT user-queued (i.e. we are falling back to library), shuffle instead.
    if (discoveryMode && !potentialNext?.isQueueItem) {
      const libIndices = tracks.map((t, i) => !t.isQueueItem ? i : -1).filter(i => i !== -1);
      if (libIndices.length > 0) {
        // Pick random library track
        let randomIdx = libIndices[Math.floor(Math.random() * libIndices.length)];
        // Try not to repeat current track immediately
        if (libIndices.length > 1 && randomIdx === currentTrackIndex) {
          randomIdx = libIndices.find(i => i !== currentTrackIndex) || randomIdx;
        }
        nextIndex = randomIdx;
      }
    }

    setCurrentTrackIndex(nextIndex);
  };

  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });

  const handleImport = async (files: FileList | File[]) => {
    setIsScanning(true);
    const fileArray = Array.from(files);
    setScanProgress({ current: 0, total: fileArray.length });

    const newTracks = await Promise.all(fileArray.map(async (f, i) => {
      try {
        // Skip non-audio
        if (!f.type.startsWith('audio/') && !f.name.match(/\.(mp3|flac|wav|aac|ogg|m4a|dsf|dff)$/i)) return null;

        // Skip duplicates based on name/size (rough check)
        if (tracks.some(t => t.title === f.name.replace(/\.[^/.]+$/, "") && t.duration)) return null;

        const dur = await getAudioDuration(f);
        const meta = await audioQualityService.extractMeta(f);

        // Auto-save embedded lyrics if found
        if (meta.lyrics && meta.lyrics.length > 0) {
          const key = `lyrics:${f.name.replace(/\.[^/.]+$/, "")}::Offline Track`;
          const rawLyrics = meta.lyrics[0];
          if (rawLyrics) {
            // ... (lyrics parsing logic remains SAME)
            const lrcTimeRe = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
            if (lrcTimeRe.test(rawLyrics)) {
              const parsed: any[] = [];
              const lines = rawLyrics.split(/\r?\n/);
              for (const line of lines) {
                const times = [...line.matchAll(lrcTimeRe)];
                const lyricText = line.replace(lrcTimeRe, "").trim();
                for (const m of times) {
                  const mm = parseInt(m[1], 10);
                  const ss = parseInt(m[2], 10);
                  const ms = m[3] ? parseInt(m[3].padEnd(3, "0"), 10) : 0;
                  const t = mm * 60 + ss + ms / 1000;
                  parsed.push({ time: t, text: lyricText || "…" });
                }
              }
              if (parsed.length > 0) {
                parsed.sort((a, b) => a.time - b.time);
                localStorage.setItem(key, JSON.stringify(parsed));
              }
            } else {
              const lines = rawLyrics.split(/\r?\n/).filter(line => line.trim() !== "");
              const parsed = lines.map((text, idx) => ({ time: -1, text: text.trim() }));
              if (parsed.length > 0) localStorage.setItem(key, JSON.stringify(parsed));
            }
          }
        }

        setScanProgress(prev => ({ ...prev, current: prev.current + 1 }));

        return {
          id: `t-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          file: f,
          title: meta.title || f.name.replace(/\.[^/.]+$/, ""),
          artist: meta.artist || "Offline Track",
          album: meta.album || "Unknown Album",
          picture: meta.picture,
          url: URL.createObjectURL(f),
          duration: dur,
          ...meta
        } as Track;
      } catch (e) {
        console.error("Error importing file", f.name, e);
        return null;
      }
    }));

    const validTracks = newTracks.filter((t): t is Track => t !== null);
    if (validTracks.length > 0) {
      setTracks(prev => [...prev, ...validTracks]);
      if (currentTrackIndex === -1) setCurrentTrackIndex(0);
      showToast(`Indexed ${validTracks.length} tracks`);
    }
    setIsScanning(false);
  };

  const handleDirectoryScan = async () => {
    // Check for Modern File System Access API
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await (window as any).showDirectoryPicker();
        setIsScanning(true);
        const files: File[] = [];

        async function scan(dirHandle: any) {
          for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
              const file = await entry.getFile();
              if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|flac|wav|aac|ogg|m4a|dsf|dff)$/i)) {
                files.push(file);
              }
            } else if (entry.kind === 'directory') {
              await scan(entry);
            }
          }
        }

        await scan(handle);
        handleImport(files);
      } catch (err) {
        console.error("Directory scan failed", err);
        setIsScanning(false);
      }
    } else {
      // Fallback: Trigger a hidden webkitdirectory input
      const input = document.createElement('input');
      input.type = 'file';
      (input as any).webkitdirectory = true;
      input.onchange = (e: any) => {
        if (e.target.files) handleImport(e.target.files);
      };
      input.click();
    }
  };

  const handleNavigate = (tab: Tab) => {
    setActiveTab(tab);
    setIsExpanded(false);
  };

  const playTrack = async (trackId: string) => {
    const index = tracks.findIndex(t => t.id === trackId);
    if (index !== -1) {
      await resume(); // Ensure AudioContext is running
      setCurrentTrackIndex(index);
      setPlaybackStatus(PlaybackStatus.PLAYING);
      setIsExpanded(true);
    }
  };

  return (
    <div className="app-container max-w-md mx-auto min-h-screen relative flex flex-col bg-matte-black text-foreground overflow-hidden select-none transition-colors duration-300 shadow-2xl border-x border-foreground/5">

      {/* HEADER / STATUS BAR */}
      <header className="flex items-center justify-between px-6 pt-10 pb-4 shrink-0 bg-matte-black transition-colors duration-300">
        <div className="flex flex-col">
          <span className="text-[10px] tracking-widest text-primary font-bold uppercase">Signature Series</span>
          <h1 className="text-xl font-bold tracking-tight text-foreground whitespace-nowrap">Sonic Stream</h1>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />

          <button
            onClick={() => handleNavigate('sound')}
            className={`size-10 rounded-full flex items-center justify-center border transition-colors ${activeTab === 'sound' ? 'bg-primary text-white border-primary' : 'bg-transparent text-foreground/40 border-foreground/10 hover:text-primary hover:border-primary/50'}`}
          >
            <Sliders size={20} />
          </button>

          <label className="size-10 rounded-full flex items-center justify-center bg-primary/10 border border-primary/20 cursor-pointer active:scale-95 transition-transform" title="Import Files">
            <Plus size={20} className="text-primary" />
            <input type="file" multiple accept="audio/*" className="hidden" onChange={e => { if (e.target.files) handleImport(e.target.files); e.target.value = ''; }} />
          </label>

          <button
            onClick={handleDirectoryScan}
            className="size-10 rounded-full flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-500 active:scale-95 transition-transform"
            title="Scan Music Folder"
          >
            <FolderPlus size={20} />
          </button>

          <button
            onClick={() => setIsSearchVisible(!isSearchVisible)}
            className={`size-10 rounded-full flex items-center justify-center border transition-colors ${isSearchVisible ? 'bg-primary text-white border-primary' : 'bg-transparent text-foreground/40 border-foreground/10 hover:text-primary hover:border-primary/50'}`}
          >
            <Search size={20} />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isSearchVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pb-4 overflow-hidden"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" size={16} />
              <input
                type="text"
                placeholder="Search your library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-foreground/5 border border-foreground/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN SCROLLABLE CONTENT */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-40">

        {/* VIEW: LIBRARY */}
        {activeTab === 'library' && (
          <>
            {/* COLLECTIONS HERO */}
            {collections.length > 0 && (
              <section className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-foreground/40">Smart Collections</h2>
                  {filterQuality && (
                    <button
                      onClick={() => setFilterQuality(null)}
                      className="text-[10px] flex items-center gap-1 text-primary font-bold uppercase tracking-widest hover:text-white transition-colors"
                    >
                      <X size={12} /> Clear Filter
                    </button>
                  )}
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {collections.map((col: any) => {
                    const Icon = col.icon;
                    const isActive = filterQuality === col.quality;
                    const isLikedCard = col.id === 'Liked';

                    const handleClick = () => {
                      if (isLikedCard) {
                        handleNavigate('liked');
                      } else if (col.type === 'playlist') {
                        handleSelectPlaylist(col.playlist);
                        handleNavigate('playlists');
                      } else {
                        setFilterQuality(isActive ? null : col.quality);
                      }
                    };

                    return (
                      <div
                        key={col.id}
                        className={`flex-none w-48 group cursor-pointer transition-all ${isActive ? 'scale-105' : 'hover:scale-[1.02]'}`}
                        onClick={handleClick}
                      >
                        <div className={`relative aspect-[3/4] rounded-xl overflow-hidden border ${isActive ? 'border-primary' : 'border-foreground/5'} copper-glow`}>
                          {col.coverImage ? (
                            <div className="absolute inset-0">
                              <img src={col.coverImage} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                            </div>
                          ) : (
                            <div className={`absolute inset-0 bg-gradient-to-br ${col.gradient} flex items-center justify-center opacity-90`}>
                              <Icon size={48} className="text-white/20" />
                            </div>
                          )}

                          {/* Badges */}
                          <div className="absolute top-3 left-3 flex gap-1">
                            <span className="bg-primary text-[9px] font-black px-1.5 py-0.5 rounded-sm text-white">{col.badges[0]}</span>
                            <span className="bg-black/60 backdrop-blur-md text-[9px] font-bold px-1.5 py-0.5 rounded-sm text-white border border-white/10">{col.badges[1]}</span>
                          </div>

                          {/* Count */}
                          <div className="absolute bottom-3 right-3">
                            <span className="text-[10px] font-mono text-white/60 bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm border border-white/5">{col.count} Tracks</span>
                          </div>
                        </div>
                        <p className={`mt-3 text-sm font-bold truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>{col.title}</p>
                        <p className="text-[11px] text-foreground/40 uppercase tracking-widest">{col.subtitle}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* TRACK LIST HEADER */}
            <section className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-foreground/40">
                  {filterQuality ? `${filterQuality} Tracks` : 'Your Library'}
                </h2>
                <span className="text-[10px] text-foreground/30 font-mono">{displayedTracks.length} tracks</span>
              </div>

              {/* EMPTY STATE */}
              {displayedTracks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed border-foreground/10 rounded-xl">
                  <div className="size-16 rounded-full bg-foreground/5 flex items-center justify-center mb-4">
                    <Plus size={24} className="text-foreground/20" />
                  </div>
                  <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-2">Library is empty</p>
                  <p className="text-[10px] text-foreground/30 text-center max-w-[200px] mb-4">Import local audio files to build your offline Hi-Res collection.</p>
                  <label className="cursor-pointer bg-primary hover:bg-orange-600 text-white text-[10px] font-bold uppercase tracking-widest px-6 py-2 rounded-full transition-colors">
                    Import Files
                    <input type="file" multiple accept="audio/*" className="hidden" onChange={e => e.target.files && handleImport(e.target.files)} />
                  </label>
                </div>
              )}

              <div className="space-y-3">
                {displayedTracks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => playTrack(t.id)}
                    className="flex items-center gap-4 p-2 rounded-lg hover:bg-foreground/5 transition-colors group cursor-pointer"
                  >
                    <div className="size-12 rounded bg-zinc-900 overflow-hidden shrink-0 flex items-center justify-center border border-white/5 relative">
                      {t.palette && <div className="absolute inset-0 opacity-20" style={{ backgroundColor: t.palette.primary }} />}
                      <ListMusic size={20} className="text-white/20 relative z-10" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-foreground truncate">{t.title}</h4>
                      <p className="text-[10px] text-foreground/50 uppercase tracking-widest truncate">{t.artist}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.quality === 'Hi-Res' && <span className="text-[9px] font-bold text-primary border border-primary/30 px-1 rounded-sm mr-1">DSD</span>}

                      <button
                        onClick={(e) => { e.stopPropagation(); toggleLike(t.id); }}
                        className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${t.isLiked ? 'text-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'text-foreground/40 hover:text-foreground'}`}
                        title={t.isLiked ? "Unlike" : "Like"}
                      >
                        <svg className={`size-4 ${t.isLiked ? 'fill-current' : ''}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); setTrackToAddToPlaylist(t); }}
                        className="p-1.5 rounded-full hover:bg-white/10 text-foreground/40 hover:text-foreground transition-colors"
                        title="Add to Playlist"
                      >
                        <ListPlus size={16} />
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleAddToQueue(t); }}
                        className="p-1.5 rounded-full hover:bg-white/10 text-foreground/40 hover:text-foreground transition-colors"
                        title="Add to Queue"
                      >
                        <Plus size={16} />
                      </button>

                      <button onClick={(e) => { e.stopPropagation(); playTrack(t.id); }} className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors">
                        <Play size={16} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* VIEW: LIKED SONGS */}
        {activeTab === 'liked' && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col">
                <span className="text-[10px] tracking-[0.3em] text-rose-500 font-bold uppercase">Your Collection</span>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Liked Songs</h2>
              </div>
              <div className="size-12 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                <Heart size={24} className="text-rose-500" fill="currentColor" />
              </div>
            </div>

            <div className="space-y-3">
              {tracks.filter(t => t.isLiked).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-foreground/20">
                  <div className="p-6 rounded-full bg-foreground/5 mb-6">
                    <Heart size={40} strokeWidth={1} />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2">No liked songs yet</p>
                  <p className="text-[10px] text-center max-w-[200px]">Tap the heart icon on any track to save it to your favorites.</p>
                </div>
              ) : (
                tracks.filter(t => t.isLiked).map((t) => {
                  const originalIndex = tracks.findIndex(x => x.id === t.id);
                  const isPlaying = currentTrackIndex === originalIndex && playbackStatus === PlaybackStatus.PLAYING;

                  return (
                    <div
                      key={t.id}
                      onClick={() => playTrack(t.id)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${isPlaying
                        ? 'bg-rose-500/10 border-rose-500/30 shadow-[0_4px_12px_rgba(244,63,94,0.1)]'
                        : 'bg-foreground/5 border-foreground/5 hover:bg-foreground/10 hover:border-foreground/10'
                        }`}
                    >
                      <div className={`size-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-lg ${isPlaying ? 'bg-rose-500 text-white' : 'bg-foreground/10 text-foreground/40'
                        }`}>
                        {isPlaying ? <span className="animate-pulse">●</span> : <Music size={20} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${isPlaying ? 'text-rose-500' : 'text-foreground'}`}>{t.title}</p>
                        <p className="text-[11px] text-foreground/40 font-bold uppercase tracking-wider truncate">{t.artist}</p>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); toggleLike(t.id); }}
                        className="p-2 rounded-full hover:bg-rose-500/20 text-rose-500 transition-colors"
                      >
                        <Heart size={18} fill="currentColor" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* VIEW: SOUND */}
        {activeTab === 'sound' && (
          <AudioSettings
            settings={audioSettings}
            onUpdateBand={updateBand}
            onToggleDSEE={toggleDSEE}
            onToggleClearAudio={toggleClearAudio}
            onReset={resetSettings}
            vizData={vizData}
            onSetPreamp={setPreamp}
            onSetBalance={setBalance}
            onSetWidth={setWidth}
            onToggleSmartLoudness={toggleSmartLoudness}
            onToggleLyrics={toggleLyrics}
            onSetPreset={setPreset}
          />
        )}

        {/* VIEW: QUEUE */}
        {activeTab === 'queue' && (
          <div className="flex-1 flex flex-col min-h-0 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_6px_rgba(0,0,0,0.4)] p-4 h-[calc(100vh-180px)]">

            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[10px] font-mono font-bold text-foreground/50 uppercase tracking-widest">
                {tracks.some(t => t.isQueueItem) ? "Up Next (Queue Active)" : "Playing from Library"}
              </span>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setTracks(prev => prev.filter(t => !t.isQueueItem));
                    showToast("Queue Cleared");
                  }}
                  className="text-[10px] font-mono font-bold uppercase tracking-widest text-foreground/30 hover:text-red-500 transition-colors"
                >
                  Clear Queue
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1">
              {tracks.length > 0 ? tracks.map((t, idx) => (
                <div
                  key={t.id}
                  onClick={() => { setCurrentTrackIndex(idx); setPlaybackStatus(PlaybackStatus.PLAYING); setIsExpanded(true); }}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${currentTrackIndex === idx
                    ? 'bg-white/10 border-white/20 shadow-[inset_1px_1px_0_rgba(255,255,255,0.1),_inset_-1px_-1px_0_rgba(0,0,0,0.2)]'
                    : 'bg-transparent border-transparent hover:bg-white/5'
                    }`}
                >
                  <div className={`relative size-12 rounded-xl flex items-center justify-center overflow-hidden shadow-lg ${currentTrackIndex === idx ? 'bg-primary text-white' : 'bg-white/5 text-foreground/40'}`}>
                    <span className="font-mono text-sm font-extrabold">{idx + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-extrabold truncate ${currentTrackIndex === idx ? 'text-primary' : 'text-foreground'}`}>{t.title}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] text-foreground/50 font-semibold truncate uppercase tracking-wider">{t.artist}</p>
                      {t.isQueueItem && (
                        <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-[4px] font-bold uppercase tracking-wider">
                          Queued
                        </span>
                      )}
                      {!t.isQueueItem && idx > currentTrackIndex && (
                        <span className="text-[9px] bg-neutral-500/20 text-neutral-600 px-1.5 py-0.5 rounded-[4px] font-bold uppercase tracking-wider">
                          Library
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setQueueMenu(queueMenu?.index === idx ? null : { index: idx });
                      }}
                      className="p-2 rounded-full hover:bg-white/10 text-foreground/40 transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {queueMenu?.index === idx && (
                      <div className="absolute right-0 top-full mt-2 w-32 bg-zinc-900 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFromQueue(idx);
                            setQueueMenu(null);
                          }}
                          className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/10 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-20 text-foreground/30">
                  <p className="text-xs uppercase tracking-widest">Queue is empty</p>
                </div>
              )}
            </div>
          </div>
        )}



        {/* VIEW: PLAYLISTS */}
        {activeTab === 'playlists' && (
          viewingPlaylist ? (
            <PlaylistDetailView
              playlist={viewingPlaylist}
              allTracks={tracks}
              onBack={() => setViewingPlaylist(null)}
              onPlayTrack={(id) => {
                const idx = tracks.findIndex(t => t.id === id);
                if (idx !== -1) {
                  setCurrentTrackIndex(idx);
                  setPlaybackStatus(PlaybackStatus.PLAYING);
                  setIsExpanded(true);
                }
              }}
              onRemoveTrack={handleRemoveTrackFromPlaylist}
              onUpdateImage={(playlistId, img) => {
                setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, coverImage: img } : p));
                setViewingPlaylist(prev => prev && prev.id === playlistId ? { ...prev, coverImage: img } : prev);
              }}
              currentTrackId={currentTrack?.id}
              playbackStatus={playbackStatus}
            />
          ) : (
            <PlaylistView
              playlists={playlists}
              onCreatePlaylist={handleCreatePlaylist}
              onDeletePlaylist={handleDeletePlaylist}
              onSelectPlaylist={handleSelectPlaylist}
            />
          )
        )}

        {/* TRACK ACTION MODAL (Add to Playlist) */}
        <AnimatePresence>
          {trackToAddToPlaylist && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setTrackToAddToPlaylist(null)}>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-5 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Add to Playlist</h3>
                  <button onClick={() => setTrackToAddToPlaylist(null)} className="text-foreground/50 hover:text-foreground">
                    <X size={18} />
                  </button>
                </div>

                <div className="bg-white/5 rounded-xl p-3 mb-4 flex items-center gap-3">
                  <div className="size-10 rounded bg-white/10 flex items-center justify-center">
                    <Music size={20} className="text-white/50" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{trackToAddToPlaylist.title}</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{trackToAddToPlaylist.artist}</p>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                  {playlists.length === 0 ? (
                    <p className="text-center text-zinc-500 text-xs py-4">No playlists yet</p>
                  ) : (
                    playlists.map(pl => {
                      const isAdded = pl.trackIds.includes(trackToAddToPlaylist.id);
                      return (
                        <button
                          key={pl.id}
                          disabled={isAdded}
                          onClick={() => handleAddToPlaylist(pl.id, trackToAddToPlaylist.id)}
                          className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${isAdded ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/50'}`}
                        >
                          <span className={`text-xs font-bold ${isAdded ? 'text-zinc-500' : 'text-white'}`}>{pl.name}</span>
                          {isAdded && <Check size={16} className="text-primary" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] bg-zinc-900 border border-white/10 shadow-2xl px-6 py-3 rounded-full flex items-center gap-3"
          >
            <Check size={16} className="text-primary" />
            <span className="text-xs font-bold text-white tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FIXED BOTTOM UI CONTAINER */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-[60]">
        <AnimatePresence>
          {currentTrack && !isExpanded && (
            <motion.div
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              onClick={() => setIsExpanded(true)}
              className="mx-4 mb-2 glass-player rounded-xl p-3 shadow-2xl overflow-hidden relative cursor-pointer"
            >
              {/* Progress Bar Mini */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-white/5">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(progress / (duration || 1)) * 100}%`,
                    backgroundColor: theme === 'light' ? (currentTrack.palette?.primary || '#ec5b13') : '#ec5b13',
                    boxShadow: theme === 'light' ? `0 0 8px ${currentTrack.palette?.primary || '#ec5b13'}` : 'none'
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="size-10 rounded overflow-hidden shadow-lg border border-white/10 bg-zinc-900 flex items-center justify-center shrink-0">
                    <AudioLines size={20} className="text-white/10" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white tracking-tight truncate">{currentTrack.title}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black uppercase shrink-0" style={{ color: theme === 'light' ? (currentTrack.palette?.primary || '#ec5b13') : '#ec5b13' }}>
                        {currentTrack.mood?.toUpperCase() || 'DSD'}
                      </span>
                      <span className="text-[9px] text-slate-400 uppercase tracking-tighter truncate">{currentTrack.artist}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 pl-2">
                  <button
                    className="text-white hover:text-primary transition-colors p-1"
                    onClick={e => { e.stopPropagation(); setCurrentTrackIndex(p => Math.max(0, p - 1)); }}
                  >
                    <SkipBack size={24} fill="currentColor" className="text-white" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); togglePlay(); }}
                    className="size-9 rounded-full bg-primary flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform"
                    style={{ backgroundColor: theme === 'light' ? (currentTrack.palette?.primary || '#ec5b13') : '#ec5b13' }}
                  >
                    {playbackStatus === PlaybackStatus.PLAYING ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <button
                    className="text-white hover:text-primary transition-colors p-1"
                    onClick={e => { e.stopPropagation(); nextTrack(); }}
                  >
                    <SkipForward size={24} fill="currentColor" className="text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation Bar */}
        <nav
          className="flex items-center justify-between px-8 py-3 bg-matte-black/95 backdrop-blur-xl border-t border-foreground/5 transition-colors duration-300"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
        >
          <button
            onClick={() => handleNavigate('library')}
            className={`flex flex-col items-center gap-1 transition-colors active:scale-95 ${activeTab === 'library' ? 'text-primary' : 'text-foreground/40 hover:text-primary'}`}
          >
            <Library size={20} strokeWidth={activeTab === 'library' ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Library</span>
          </button>

          <button
            onClick={() => handleNavigate('liked')}
            className={`flex flex-col items-center gap-1 transition-colors active:scale-95 ${activeTab === 'liked' ? 'text-rose-500' : 'text-foreground/40 hover:text-rose-500'}`}
          >
            <Heart size={20} strokeWidth={activeTab === 'liked' ? 2.5 : 2} fill={activeTab === 'liked' ? 'currentColor' : 'none'} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Liked</span>
          </button>

          <button
            onClick={() => handleNavigate('queue')}
            className={`flex flex-col items-center gap-1 transition-colors active:scale-95 ${activeTab === 'queue' ? 'text-primary' : 'text-foreground/40 hover:text-primary'}`}
          >
            <ListMusic size={20} strokeWidth={activeTab === 'queue' ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Queue</span>
          </button>

          <button
            onClick={() => handleNavigate('playlists')}
            className={`flex flex-col items-center gap-1 transition-colors active:scale-95 ${activeTab === 'playlists' ? 'text-primary' : 'text-foreground/40 hover:text-primary'}`}
          >
            <AudioLines size={20} strokeWidth={activeTab === 'playlists' ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Sets</span>
          </button>
        </nav>
      </div>

      {/* FULL PLAYER MODAL */}
      <AnimatePresence>
        {isExpanded && currentTrack && (
          <WalkmanView
            track={currentTrack}
            isPlaying={playbackStatus === PlaybackStatus.PLAYING}
            isShuffle={discoveryMode}
            isRepeat={isRepeat}
            onToggleShuffle={() => setDiscoveryMode(!discoveryMode)}
            onToggleRepeat={() => setIsRepeat(!isRepeat)}
            onClose={() => setIsExpanded(false)}
            onTogglePlay={togglePlay}
            onNext={nextTrack}
            onPrev={() => setCurrentTrackIndex(p => Math.max(0, p - 1))}
            onSeek={v => { if (audioRef.current) audioRef.current.currentTime = v; setProgress(v); }}
            progress={progress}
            duration={duration}
            audioElement={audioRef.current}
            batteryLevel={batteryLevel}
            onNavigate={handleNavigate}
            activeTab={activeTab}
            vizData={vizData}
            onToggleLike={toggleLike}
            showMoodAura={showMoodAura}
            onToggleMoodAura={() => setShowMoodAura(!showMoodAura)}
            showLyrics={audioSettings.showLyrics}
          />
        )}
      </AnimatePresence>

      <audio
        ref={audioRef}
        onTimeUpdate={e => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
        onEnded={nextTrack}
      />

      {/* SCANNING OVERLAY */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="bg-zinc-900 border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-[80%] text-center">
              <div className="relative size-16">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                <motion.div
                  className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                ></motion.div>
                <FolderPlus size={24} className="absolute inset-0 m-auto text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white tracking-tight">Indexing Library</h3>
                <p className="text-xs text-zinc-500 font-mono">
                  {scanProgress.total > 0
                    ? `Processing ${scanProgress.current} / ${scanProgress.total}`
                    : 'Searching for audio files...'}
                </p>
              </div>
              <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: scanProgress.total > 0 ? `${(scanProgress.current / scanProgress.total) * 100}%` : '50%' }}
                ></motion.div>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Optimizing for Offline Playback</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;