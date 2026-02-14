import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioSettingsState } from '../types';
import {
    AudioLines, Wand2, Zap, Sliders, Volume2, MoveHorizontal, RotateCw, Power, ChevronDown, ChevronUp, Mic2
} from 'lucide-react';

interface AudioSettingsProps {
    settings: AudioSettingsState;
    onUpdateBand: (index: number, value: number) => void;
    onToggleDSEE: () => void;
    onToggleClearAudio: () => void;
    onReset: () => void;
    vizData: number[];
    onSetPreamp: (value: number) => void;
    onSetBalance: (value: number) => void;
    onSetWidth: (value: number) => void;
    onToggleSmartLoudness: () => void;
    onToggleLyrics: () => void;
    onSetPreset: (name: string, bands: number[]) => void;
}

const AudioSettings: React.FC<AudioSettingsProps> = ({
    settings,
    onUpdateBand,
    onToggleDSEE,
    onToggleClearAudio,
    onReset,
    vizData,
    onSetPreamp,
    onSetBalance,
    onSetWidth,
    onToggleSmartLoudness,
    onToggleLyrics,
    onSetPreset
}) => {
    const [isPresetOpen, setIsPresetOpen] = useState(false);

    // 7 Bands Definition
    const bands = [
        { label: '60', range: 'Sub' },
        { label: '150', range: 'Bass' },
        { label: '400', range: 'Low Mids' },
        { label: '1k', range: 'Mids' },
        { label: '2.4k', range: 'High Mids' },
        { label: '6k', range: 'Presence' },
        { label: '15k', range: 'Air' },
    ];

    const presets: Record<string, number[]> = {
        'Flat': [0, 0, 0, 0, 0, 0, 0],
        'Bass Boost': [5, 4, 2, 0, 0, 0, 0],
        'Treble Boost': [0, 0, 0, 2, 4, 5, 5],
        'Rock': [4, 3, 1, 0, 1, 3, 4],
        'Pop': [2, 1, 3, 1, 1, 2, 2],
        'Jazz': [3, 2, 1, 2, 1, 2, 3],
        'Classical': [4, 3, 2, 1, 1, 2, 3],
        'Vocal': [-2, -1, 0, 4, 4, 2, 1],
    };

    return (
        <div className="h-full w-full flex flex-col p-6 space-y-6 overflow-y-auto no-scrollbar pb-32">

            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-[10px] font-mono tracking-[0.3em] text-copper uppercase leading-none">Sound</h2>
                    <h1 className="text-xl font-bold tracking-tight text-foreground uppercase mt-1">Audio Settings</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onReset}
                        className="size-10 rounded-full bg-foreground/5 flex items-center justify-center hover:bg-foreground/10 transition-colors"
                        title="Reset All"
                    >
                        <RotateCw size={18} className="text-foreground/50" />
                    </button>
                    <div className="size-10 rounded-full bg-foreground/5 flex items-center justify-center border border-foreground/5">
                        <AudioLines size={20} className="text-copper" />
                    </div>
                </div>
            </div>

            {/* DSEE HX & Smart Loudness Group */}
            <div className="grid grid-cols-2 gap-3">
                {/* DSEE HX */}
                <button
                    onClick={onToggleDSEE}
                    className={`relative overflow-hidden rounded-xl p-4 border transition-all duration-300 text-left group ${settings.dseeHx ? 'bg-gradient-to-br from-neutral-900 to-black border-copper/30 shadow-[0_0_20px_rgba(236,91,19,0.1)]' : 'bg-foreground/5 border-transparent'}`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <Zap size={18} className={settings.dseeHx ? 'text-copper' : 'text-foreground/30'} />
                        <div className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${settings.dseeHx ? 'bg-copper' : 'bg-foreground/20'}`}>
                            <motion.div
                                animate={{ x: settings.dseeHx ? 16 : 0 }}
                                className="size-3 rounded-full bg-white shadow-sm"
                            />
                        </div>
                    </div>
                    <h3 className={`text-xs font-bold transition-colors ${settings.dseeHx ? 'text-white' : 'text-foreground'}`}>DSEE HX</h3>
                    <p className={`text-[9px] font-mono mt-0.5 transition-colors ${settings.dseeHx ? 'text-white/40' : 'text-foreground/40'}`}>AI UPSCALING</p>
                </button>

                {/* Smart Loudness */}
                <button
                    onClick={onToggleSmartLoudness}
                    className={`relative overflow-hidden rounded-xl p-4 border transition-all duration-300 text-left group ${settings.smartLoudness ? 'bg-gradient-to-br from-neutral-900 to-black border-copper/30 shadow-[0_0_20px_rgba(236,91,19,0.1)]' : 'bg-foreground/5 border-transparent'}`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <Volume2 size={18} className={settings.smartLoudness ? 'text-copper' : 'text-foreground/30'} />
                        <div className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${settings.smartLoudness ? 'bg-copper' : 'bg-foreground/20'}`}>
                            <motion.div
                                animate={{ x: settings.smartLoudness ? 16 : 0 }}
                                className="size-3 rounded-full bg-white shadow-sm"
                            />
                        </div>
                    </div>
                    <h3 className={`text-xs font-bold transition-colors ${settings.smartLoudness ? 'text-white' : 'text-foreground'}`}>Smart Loudness</h3>
                    <p className={`text-[9px] font-mono mt-0.5 transition-colors ${settings.smartLoudness ? 'text-white/40' : 'text-foreground/40'}`}>DYNAMIC GAIN</p>
                </button>

                {/* Lyrics Master Toggle */}
                <button
                    onClick={onToggleLyrics}
                    className={`relative overflow-hidden rounded-xl p-4 border transition-all duration-300 text-left group ${settings.showLyrics ? 'bg-gradient-to-br from-neutral-900 to-black border-copper/30 shadow-[0_0_20px_rgba(236,91,19,0.1)]' : 'bg-foreground/5 border-transparent'}`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <Mic2 size={18} className={settings.showLyrics ? 'text-copper' : 'text-foreground/30'} />
                        <div className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${settings.showLyrics ? 'bg-copper' : 'bg-foreground/20'}`}>
                            <motion.div
                                animate={{ x: settings.showLyrics ? 16 : 0 }}
                                className="size-3 rounded-full bg-white shadow-sm"
                            />
                        </div>
                    </div>
                    <h3 className={`text-xs font-bold transition-colors ${settings.showLyrics ? 'text-white' : 'text-foreground'}`}>Show Lyrics</h3>
                    <p className={`text-[9px] font-mono mt-0.5 transition-colors ${settings.showLyrics ? 'text-white/40' : 'text-foreground/40'}`}>MASTER SWITCH</p>
                </button>
            </div>

            {/* PREAMP / SPATIAL Section */}
            <div className="bg-foreground/5 rounded-2xl p-4 border border-foreground/5 space-y-5">
                {/* Preamp */}
                <div className="flex items-center gap-4">
                    <Power size={14} className="text-foreground/70" />
                    <span className="text-[10px] uppercase font-bold text-foreground w-16">Preamp</span>
                    <input
                        type="range" min="-12" max="12" step="0.5"
                        value={settings.preamp}
                        onChange={(e) => onSetPreamp(parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-foreground/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-copper"
                    />
                    <span className="text-[10px] font-mono w-10 text-right text-foreground/80">{settings.preamp > 0 ? '+' : ''}{settings.preamp}dB</span>
                </div>

                {/* Balance */}
                <div className="flex items-center gap-4">
                    <MoveHorizontal size={14} className="text-foreground/70" />
                    <span className="text-[10px] uppercase font-bold text-foreground w-16">Balance</span>
                    <input
                        type="range" min="-1" max="1" step="0.1"
                        value={settings.balance}
                        onChange={(e) => onSetBalance(parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-foreground/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-copper"
                    />
                    <span className="text-[10px] font-mono w-10 text-right text-foreground/80">{settings.balance === 0 ? 'C' : settings.balance > 0 ? 'R' : 'L'}</span>
                </div>

                {/* Width */}
                <div className="flex items-center gap-4">
                    <Sliders size={14} className="text-foreground/70" />
                    <span className="text-[10px] uppercase font-bold text-foreground w-16">Stereo</span>
                    <input
                        type="range" min="0" max="2" step="0.1"
                        value={settings.stereoWidth}
                        onChange={(e) => onSetWidth(parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-foreground/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-copper"
                    />
                    <span className="text-[10px] font-mono w-10 text-right text-foreground/80">{Math.round(settings.stereoWidth * 100)}%</span>
                </div>
            </div>

            {/* Equalizer Section */}
            <div className="flex-1 bg-foreground/5 rounded-2xl p-5 border border-foreground/5 relative flex flex-col">

                {/* Preset Selector */}
                <div className="mb-8 relative z-20">
                    <button
                        onClick={() => setIsPresetOpen(!isPresetOpen)}
                        className="w-full flex items-center justify-between p-3 bg-foreground/5 rounded-xl border border-foreground/5 hover:bg-foreground/10 transition-all text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-copper/10 flex items-center justify-center">
                                <Sliders size={14} className="text-copper" />
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-foreground/50 uppercase tracking-wider block mb-0.5">Preset</span>
                                <span className="text-xs font-bold text-foreground uppercase tracking-wide">{settings.equalizer.preset || 'Custom'}</span>
                            </div>
                        </div>
                        {isPresetOpen ? <ChevronUp size={16} className="text-foreground/50" /> : <ChevronDown size={16} className="text-foreground/50" />}
                    </button>

                    <AnimatePresence>
                        {isPresetOpen && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-2 bg-foreground/5 rounded-xl border border-foreground/5 grid grid-cols-2 gap-2">
                                    {Object.keys(presets).map((preset) => (
                                        <button
                                            key={preset}
                                            onClick={() => {
                                                onSetPreset(preset, presets[preset]);
                                                setIsPresetOpen(false);
                                            }}
                                            className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-left transition-all ${settings.equalizer.preset === preset
                                                ? 'bg-copper text-white shadow-md shadow-copper/20'
                                                : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'
                                                }`}
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex justify-between items-end h-48 px-1 relative z-10 w-full max-w-full">
                    {/* Zero Line */}
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-foreground/10 -z-10 border-t border-dashed border-foreground/20"></div>

                    {/* VIZ BACKGROUND */}
                    <div className="absolute inset-x-2 bottom-0 top-0 flex items-end justify-between -z-20 opacity-20 pointer-events-none">
                        {bands.map((_, i) => {
                            // Map vizData to bands roughly (using 32 bins)
                            // 7 bands: 0, 5, 10, 15, 20, 25, 30 approx
                            const bin = Math.floor(i * (vizData.length / bands.length));
                            const height = vizData[bin] || 0;
                            return (
                                <motion.div
                                    key={i}
                                    animate={{ height: `${height}%` }}
                                    transition={{ ease: "linear", duration: 0.1 }}
                                    className="w-full mx-1 bg-copper rounded-t-sm"
                                />
                            )
                        })}
                    </div>

                    {bands.map((band, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-4 h-full group flex-1">
                            <div className="relative flex-1 w-full max-w-[24px] flex items-center justify-center">
                                {/* Slider Track */}
                                <div className="absolute top-0 bottom-0 w-1 bg-foreground/10 rounded-full group-hover:bg-foreground/20 transition-colors"></div>

                                {/* Fill (from center) */}
                                <div
                                    className="absolute w-1 bg-copper rounded-full transition-all duration-100"
                                    style={{
                                        height: `${Math.abs(settings.equalizer.bands[idx]) * 5}%`,
                                        bottom: '50%',
                                        transformOrigin: 'bottom',
                                        transform: settings.equalizer.bands[idx] > 0 ? 'scaleY(1)' : 'scaleY(-1)'
                                    }}
                                />

                                {/* Thumb */}
                                <input
                                    type="range"
                                    min="-10"
                                    max="10"
                                    step="1"
                                    value={settings.equalizer.bands[idx]}
                                    onChange={(e) => onUpdateBand(idx, Number(e.target.value))}
                                    className="absolute inset-0 opacity-0 cursor-ns-resize z-20 w-full"
                                />

                                <div
                                    className="absolute size-3 bg-white rounded-full shadow-lg border border-foreground/10 pointer-events-none transition-transform active:scale-125 key-thumb"
                                    style={{
                                        bottom: `${50 + (settings.equalizer.bands[idx] * 5)}%`,
                                        transform: 'translateY(50%)'
                                    }}
                                >
                                    <div className="absolute inset-0 rounded-full bg-copper opacity-0 group-hover:opacity-20 transition-opacity"></div>
                                </div>
                            </div>
                            <div className="text-center w-full">
                                <p className="text-[9px] font-mono text-foreground mt-0.5 truncate">{band.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ClearAudio+ Toggle */}
            <button
                onClick={onToggleClearAudio}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-foreground/5 hover:bg-foreground/10 transition-colors border border-foreground/5 active:scale-[0.98]"
            >
                <div className="flex items-center gap-3">
                    <div className={`size-10 rounded-full flex items-center justify-center transition-colors ${settings.clearAudio ? 'bg-copper text-white' : 'bg-foreground/10 text-foreground/40'}`}>
                        <Wand2 size={18} />
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground">ClearAudio+</h3>
                            {settings.clearAudio && <span className="text-[8px] font-black text-copper uppercase tracking-wider">Active</span>}
                        </div>
                        <p className="text-[10px] text-foreground/50">Automatically optimizes sound settings.</p>
                    </div>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${settings.clearAudio ? 'bg-copper' : 'bg-foreground/20'}`}>
                    <motion.div
                        animate={{ x: settings.clearAudio ? 16 : 0 }}
                        className="size-4 rounded-full bg-white shadow-sm"
                    />
                </div>
            </button>
        </div>
    );
};

export default AudioSettings;
