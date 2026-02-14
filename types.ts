
// Added AudioQuality type to define available quality levels for tracks
export type AudioQuality = 'DSD' | 'Hi-Res Audio' | 'Lossless' | 'HQ' | 'Standard' | 'Unknown Quality';

export type Mood = 'Chill' | 'Energetic' | 'Sad' | 'Focus' | 'Romantic' | 'Unknown';

export type Tab = 'library' | 'sound' | 'queue' | 'search' | 'playlists' | 'liked';

export interface MoodPalette {
  primary: string;
  secondary: string;
  accent: string;
}

// Added TrackAudioMeta to represent technical audio properties extracted from files
export interface TrackAudioMeta {
  format?: string;
  codec?: string;
  sampleRate?: number;
  bitrate?: number;
  bitDepth?: number;
  lyrics?: string[];
}

// Updated Track interface to include metadata and quality for high-fidelity features
export interface Track extends TrackAudioMeta {
  id: string;
  file?: File; // File is transient and not saved in localStorage
  handle?: any; // FileSystemFileHandle for persistent secondary storage references
  title: string;
  artist: string;
  album?: string;
  picture?: any;
  url: string;
  duration?: number;
  quality?: AudioQuality;
  mood?: Mood;
  palette?: MoodPalette;
  isQueueItem?: boolean;
  isLiked?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  coverImage?: string;
}

export enum PlaybackStatus {
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED'
}

export interface EqualizerState {
  bands: number[]; // 7 bands
  preset: string;
}

export interface AudioSettingsState {
  dseeHx: boolean;
  clearAudio: boolean;
  dynamicNormalizer: boolean;
  equalizer: EqualizerState;

  // New Professional Features
  preamp: number;       // -12 to +12 dB
  balance: number;      // -1 (Left) to +1 (Right)
  stereoWidth: number;  // 0 (Mono) to 2 (Wide)
  smartLoudness: boolean;
  showLyrics: boolean;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettingsState = {
  dseeHx: false,
  clearAudio: false,
  dynamicNormalizer: false,
  equalizer: {
    bands: [0, 0, 0, 0, 0, 0, 0], // 60, 150, 400, 1k, 2.4k, 6k, 15k
    preset: 'Flat'
  },
  preamp: 0,
  balance: 0,
  stereoWidth: 1, // Normal Stereo
  smartLoudness: false,
  showLyrics: true
};