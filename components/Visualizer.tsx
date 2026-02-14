import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
  vizData: number[]; // Array of values 0-100 expected
  palette?: any;
}

const Visualizer: React.FC<VisualizerProps> = ({ vizData, palette }) => {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);

  // We want 13 bars for the design
  // The vizData from useAudioProcessing is 32 bars.
  // We need to sample/average it down to 13.

  useEffect(() => {
    // Map the 32-entry vizData to 13 bars using averaging for better precision
    const barCount = 13;
    const binsPerBar = vizData.length / barCount;

    for (let i = 0; i < barCount; i++) {
      const start = Math.floor(i * binsPerBar);
      const end = Math.floor((i + 1) * binsPerBar);

      let sum = 0;
      let count = 0;
      for (let j = start; j < end; j++) {
        sum += vizData[j] || 0;
        count++;
      }

      const val = count > 0 ? sum / count : 5;

      if (barsRef.current[i]) {
        // Direct style application for zero-lag response
        barsRef.current[i]!.style.height = `${Math.max(5, val)}%`;
      }
    }
  }, [vizData]);

  return (
    <div className="flex items-end h-10 gap-[3px] w-full">
      {Array.from({ length: 13 }).map((_, i) => (
        <div
          key={i}
          ref={el => { if (el) barsRef.current[i] = el; }}
          className="flex-1 vu-bar vu-gradient rounded-t-[1px]"
          style={{ height: '5%', backgroundColor: palette?.primary || '#ec5b13' }}
        />
      ))}
    </div>
  );
};

export default Visualizer;