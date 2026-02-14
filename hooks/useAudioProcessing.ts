import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AudioSettingsState, DEFAULT_AUDIO_SETTINGS } from '../types';

let audioContext: AudioContext | null = null;
let mediaSource: MediaElementAudioSourceNode | null = null;

export const useAudioProcessing = (audioRef: React.RefObject<HTMLAudioElement>) => {
    const [settings, setSettings] = useState<AudioSettingsState>(DEFAULT_AUDIO_SETTINGS);
    const [vizData, setVizData] = useState<number[]>(new Array(32).fill(0));

    // Audio Graph Nodes Refs
    const preampRef = useRef<GainNode | null>(null);
    const balanceRef = useRef<StereoPannerNode | null>(null);
    const widthGainRef = useRef<GainNode | null>(null); // Controls Side channel level for Width

    // Smart Loudness Nodes
    const loudnessLowRef = useRef<BiquadFilterNode | null>(null);
    const loudnessHighRef = useRef<BiquadFilterNode | null>(null);

    // 7-Band EQ
    const bandsRef = useRef<BiquadFilterNode[]>([]);

    // Dynamics & Output
    const compressorRef = useRef<DynamicsCompressorNode | null>(null);
    const postGainRef = useRef<GainNode | null>(null); // For DSEE HX / Makeup
    const analyserRef = useRef<AnalyserNode | null>(null);

    const rafRef = useRef<number | null>(null);
    const isInitializedRef = useRef(false);

    // Initialize Audio Graph
    useEffect(() => {
        if (!audioRef.current) return;

        try {
            // 1. Singleton Context
            if (!audioContext) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                audioContext = new AudioContextClass();
            }
            const ctx = audioContext!;

            // 2. Reliable Source Management (Fix for Strict Mode / Remounts)
            // We attach the source node to the DOM element to avoid "source already connected" errors
            // and to ensure we always use the source associated with the CURRENT audio element.
            let source: MediaElementAudioSourceNode;
            const audioEl = audioRef.current as any;

            if (audioEl._sonicSource) {
                source = audioEl._sonicSource;
            } else {
                source = ctx.createMediaElementSource(audioRef.current);
                audioEl._sonicSource = source;
            }

            // 3. Create Nodes

            // Preamp (Input Gain)
            const preamp = ctx.createGain();
            preamp.gain.value = 1.0;
            preampRef.current = preamp;

            // Balance (Panner)
            const balance = ctx.createStereoPanner();
            balance.pan.value = 0;
            balanceRef.current = balance;

            // Smart Loudness Nodes
            const loudLow = ctx.createBiquadFilter();
            loudLow.type = 'lowshelf';
            loudLow.frequency.value = 100;
            loudLow.gain.value = 0;
            loudnessLowRef.current = loudLow;

            const loudHigh = ctx.createBiquadFilter();
            loudHigh.type = 'highshelf';
            loudHigh.frequency.value = 10000;
            loudHigh.gain.value = 0;
            loudnessHighRef.current = loudHigh;

            // 7-Band EQ
            const frequencies = [60, 150, 400, 1000, 2400, 6000, 15000];
            const bands = frequencies.map(freq => {
                const filter = ctx.createBiquadFilter();
                filter.type = 'peaking';
                filter.frequency.value = freq;
                filter.Q.value = 1.2;
                filter.gain.value = 0;
                return filter;
            });
            bandsRef.current = bands;

            // Compressor
            const compressor = ctx.createDynamicsCompressor();
            compressor.threshold.value = -20;
            compressor.ratio.value = 12;
            compressor.knee.value = 30;
            compressorRef.current = compressor;

            // Post Gain
            const postGain = ctx.createGain();
            postGain.gain.value = 1.0;
            postGainRef.current = postGain;

            // Analyser
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512; // Increased for better resolution
            analyser.smoothingTimeConstant = 0.4; // Snappier response
            analyserRef.current = analyser;


            // 4. CONNECT THE GRAPH
            // Always disconnect first to ensure clean graph on HMR/Remount
            try { source.disconnect(); } catch (e) { }

            // Linear Path:
            // Source -> Preamp -> Balance -> Smart Loudness (Low -> High) -> EQ (1..7) -> Compressor -> PostGain -> Analyser -> Dest

            let c: AudioNode = source;

            c.connect(preamp);
            c = preamp;

            c.connect(balance);
            c = balance;

            // Smart Loudness & DSEE nodes
            c.connect(loudLow);
            c = loudLow;
            c.connect(loudHigh);
            c = loudHigh;

            // EQ Bands
            bands.forEach(band => {
                c.connect(band);
                c = band;
            });

            c.connect(compressor);
            c = compressor;

            c.connect(postGain);
            c = postGain;

            c.connect(analyser);
            analyser.connect(ctx.destination);

            isInitializedRef.current = true;

            // Visualizer Loop
            const updateViz = () => {
                if (!analyserRef.current) return;
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);

                // We map 256 bins to 32 bars (FFT 512 -> 256 frequencyBinCount)
                const sub = dataArray.subarray(0, 256);
                const step = Math.ceil(sub.length / 32);
                const final = [];

                for (let i = 0; i < 32; i++) {
                    let sum = 0;
                    for (let j = 0; j < step; j++) {
                        sum += sub[i * step + j] || 0;
                    }
                    const avg = sum / step;
                    final.push((avg / 255) * 100);
                }

                setVizData(final);
                rafRef.current = requestAnimationFrame(updateViz);
            };

            // Start the loop
            updateViz();

        } catch (e) {
            console.error("Audio Engine Error", e);
        }

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            isInitializedRef.current = false; // Allow re-initialization on remount
        };
    }, [audioRef]);

    // Update PREAMP
    useEffect(() => {
        if (preampRef.current && audioContext) {
            // Convert dB to Gain
            const gainVal = Math.pow(10, settings.preamp / 20);
            preampRef.current.gain.setTargetAtTime(gainVal, audioContext.currentTime, 0.1);
        }
    }, [settings.preamp]);

    // Update BALANCE
    useEffect(() => {
        if (balanceRef.current && audioContext) {
            balanceRef.current.pan.setTargetAtTime(settings.balance, audioContext.currentTime, 0.1);
        }
    }, [settings.balance]);

    // Update DSEE HX (Simulated with High Shelf) & Smart Loudness
    useEffect(() => {
        if (!loudnessHighRef.current || !loudnessLowRef.current || !audioContext) return;

        let trebleBoost = 0;
        let bassBoost = 0;

        // DSEE HX Logic: Fixed "Air" boost to simulate restored high freqs
        if (settings.dseeHx) {
            trebleBoost += 4; // Add 4dB to highs
        }

        // Smart Loudness Logic
        if (settings.smartLoudness) {
            const vol = audioRef.current?.volume ?? 1.0;
            if (vol < 0.8) {
                const factor = (0.8 - vol) / 0.8;
                bassBoost += factor * 8;
                trebleBoost += factor * 3;
            }
        }

        loudnessHighRef.current.gain.setTargetAtTime(trebleBoost, audioContext.currentTime, 0.3);
        loudnessLowRef.current.gain.setTargetAtTime(bassBoost, audioContext.currentTime, 0.3);

    }, [settings.dseeHx, settings.smartLoudness, audioRef]);

    // Update ClearAudio+ (Auto-EQ Preset)
    useEffect(() => {
        if (settings.clearAudio) {
            // Apply "Vibrant" V-shape curve automatically
            // [60, 150, 400, 1k, 2.4k, 6k, 15k]
            const clearAudioCurve = [5, 3, 1, 0, 2, 4, 5];

            setSettings(prev => ({
                ...prev,
                equalizer: {
                    ...prev.equalizer,
                    bands: clearAudioCurve,
                    // Keep preset name if it was set, or show "ClearAudio+" implied? 
                    // Actually, let's NOT overwrite the bands in state if we want it to be toggleable visually.
                    // But for "verification", we want to hear it. 
                    // Let's rely on the EQ effect below to apply it if we update state.
                    // Ideally ClearAudio+ overrides the manual EQ. 
                }
            }));

            // To properly "override" without destroying manual settings, we should have a separate gain node
            // OR just overwrite the state for now as a "Mode".
            // Let's overwrite state as it's simplest and user sees the sliders move (cool effect).
        }
    }, [settings.clearAudio]);

    // Update EQ BANDS
    useEffect(() => {
        if (!audioContext) return;
        bandsRef.current.forEach((band, i) => {
            const targetGain = settings.equalizer.bands[i] || 0;
            band.gain.setTargetAtTime(targetGain, audioContext!.currentTime, 0.1);
        });
    }, [settings.equalizer.bands]);

    // Helpers
    const resume = useCallback(async () => {
        if (audioContext && audioContext.state === 'suspended') {
            await audioContext.resume();
        }
    }, []);

    const updateBand = useCallback((index: number, value: number) => {
        setSettings(prev => {
            const newBands = [...prev.equalizer.bands];
            newBands[index] = value;
            return {
                ...prev,
                equalizer: { ...prev.equalizer, bands: newBands, preset: 'Custom' }
            };
        });
    }, []);

    const setPreset = useCallback((presetName: string, bands: number[]) => {
        setSettings(prev => ({
            ...prev,
            equalizer: { preset: presetName, bands: [...bands] }
        }));
    }, []);

    // Other Toggles
    const toggleDSEE = useCallback(() => setSettings(p => ({ ...p, dseeHx: !p.dseeHx })), []);
    const toggleClearAudio = useCallback(() => setSettings(p => ({ ...p, clearAudio: !p.clearAudio })), []);
    const setPreamp = useCallback((v: number) => setSettings(p => ({ ...p, preamp: v })), []);
    const setBalance = useCallback((v: number) => setSettings(p => ({ ...p, balance: v })), []);
    const setWidth = useCallback((v: number) => setSettings(p => ({ ...p, stereoWidth: v })), []);
    const toggleSmartLoudness = useCallback(() => setSettings(p => ({ ...p, smartLoudness: !p.smartLoudness })), []);
    const toggleLyrics = useCallback(() => setSettings(p => ({ ...p, showLyrics: !p.showLyrics })), []);
    const resetSettings = useCallback(() => setSettings(DEFAULT_AUDIO_SETTINGS), []);

    return {
        settings,
        updateBand,
        setPreset,
        toggleDSEE,
        toggleClearAudio,
        setPreamp,
        setBalance,
        setWidth,
        toggleSmartLoudness,
        toggleLyrics,
        resetSettings,
        vizData,
        resume
    };
};
