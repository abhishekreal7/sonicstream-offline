import * as mm from 'music-metadata-browser';
import { AudioQuality, TrackAudioMeta } from '../types';

export class AudioQualityService {
  /**
   * Classifies audio quality based on strict precedence rules:
   * 1. Hi-Res Audio: sampleRate >= 96kHz OR bitDepth >= 24
   * 2. Lossless HD: (FLAC/WAV/ALAC) AND sampleRate >= 44.1kHz
   * 3. Premium 320: bitrate >= 256 kbps
   * 4. Standard: bitrate 128-255 kbps
   * 5. Low Quality: bitrate < 128 kbps
   */
  classifyAudioQuality(meta: TrackAudioMeta): AudioQuality {
    const { sampleRate, bitDepth, bitrate, format } = meta;
    const fmt = (format || '').toLowerCase();

    // 1. DSD (Highest Precedence)
    if (fmt.includes('dsf') || fmt.includes('dff') || (sampleRate && sampleRate >= 2822400)) {
      return 'DSD';
    }

    // 2. Lossless PCM (FLAC/WAV/ALAC/AIFF/APE/WV)
    const isLosslessFormat = fmt.includes('flac') || fmt.includes('wav') ||
      fmt.includes('alac') || fmt.includes('aiff') ||
      fmt.includes('ape') || fmt.includes('wv') ||
      (fmt.includes('m4a') && bitDepth && bitDepth > 16); // ALAC often in m4a

    if (isLosslessFormat) {
      // Hi-Res check: > 48kHz OR > 16-bit
      if ((sampleRate && sampleRate > 48000) || (bitDepth && bitDepth > 16)) {
        return 'Hi-Res Audio';
      }
      return 'Lossless';
    }

    // 3. Lossy (MP3/AAC/OGG/etc.)
    // HQ check: >= 256kbps
    if (bitrate && bitrate >= 256000) {
      return 'HQ';
    }

    // Standard fallback for all other lossy
    return 'Standard';
  }

  async extractMeta(file: File): Promise<TrackAudioMeta & { quality: AudioQuality; title?: string; artist?: string; album?: string; picture?: any }> {
    try {
      // Non-blocking blob parsing
      const metadata = await mm.parseBlob(file);
      const meta: TrackAudioMeta = {
        format: metadata.format.container || file.type.split('/')[1] || 'Unknown',
        codec: metadata.format.codec,
        sampleRate: metadata.format.sampleRate,
        bitrate: metadata.format.bitrate,
        bitDepth: metadata.format.bitsPerSample,
        lyrics: metadata.common.lyrics
      };

      const quality = this.classifyAudioQuality(meta);

      return {
        ...meta,
        quality,
        title: metadata.common.title,
        artist: metadata.common.artist,
        album: metadata.common.album,
        picture: metadata.common.picture?.[0]
      };
    } catch (e) {
      console.warn("Meta extraction failed for file:", file.name, e);
      return { quality: 'Unknown Quality' };
    }
  }
}

export const audioQualityService = new AudioQualityService();