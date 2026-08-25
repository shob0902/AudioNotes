import { motion, useReducedMotion } from "framer-motion";

import { generateWaveformBars } from "../utils/waveform.js";

/**
 * @param {{ seed: string, progress: number, isPlaying: boolean, onSeek?: (ratio: number) => void }} props
 * `progress` is 0..1 of playback through the track.
 */
export default function Waveform({ seed, progress, isPlaying, onSeek }) {
  const reduceMotion = useReducedMotion();
  const bars = generateWaveformBars(seed);
  const activeCount = Math.round(bars.length * Math.min(Math.max(progress, 0), 1));

  const handleClick = (event) => {
    if (!onSeek) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    onSeek(Math.min(Math.max(ratio, 0), 1));
  };

  return (
    <div
      className={`flex h-10 items-end gap-[3px] ${onSeek ? "cursor-pointer" : ""}`}
      onClick={handleClick}
      role={onSeek ? "slider" : undefined}
      aria-label={onSeek ? "Seek audio position" : undefined}
      aria-valuenow={onSeek ? Math.round(progress * 100) : undefined}
    >
      {bars.map((height, i) => {
        const isActive = i < activeCount;
        return (
          <motion.span
            key={i}
            className={`w-1 rounded-full ${isActive ? "bg-primary" : "bg-primary/20"}`}
            style={{ height: `${height * 100}%` }}
            animate={
              isPlaying && !reduceMotion
                ? { scaleY: [1, 0.55 + height * 0.4, 1] }
                : { scaleY: 1 }
            }
            transition={
              isPlaying && !reduceMotion
                ? { duration: 0.7 + (i % 5) * 0.08, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.2 }
            }
          />
        );
      })}
    </div>
  );
}
