// The clickable waveform strip in the audio player, showing playback position.
import { generateWaveformBars } from "../utils/waveform.js";
import styles from "./Waveform.module.css";
// Draws the bars, highlights the played portion, and reports clicks/arrow keys back for seeking.
export default function Waveform({ seed, progress, isPlaying, onSeek }) {
  const bars = generateWaveformBars(seed);
  const clamped = Math.min(Math.max(progress, 0), 1);
  const activeCount = Math.round(bars.length * clamped);
  const handleClick = (event) => {
    if (!onSeek) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    onSeek(Math.min(Math.max(ratio, 0), 1));
  };
  const handleKeyDown = (event) => {
    if (!onSeek) return;
    if (event.key === "ArrowRight") onSeek(Math.min(clamped + 0.05, 1));
    else if (event.key === "ArrowLeft") onSeek(Math.max(clamped - 0.05, 0));
    else return;
    event.preventDefault();
  };
  return (
    <div
      className={`${styles.wave} ${onSeek ? styles.seekable : ""} ${isPlaying ? styles.playing : ""}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onSeek ? 0 : undefined}
      role={onSeek ? "slider" : undefined}
      aria-label={onSeek ? "Seek audio position" : undefined}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? 100 : undefined}
      aria-valuenow={onSeek ? Math.round(clamped * 100) : undefined}
    >
      {bars.map((height, i) => (
        <span
          key={i}
          className={i < activeCount ? styles.barActive : styles.bar}
          style={{ height: `${height * 100}%`, animationDelay: `${(i % 7) * 90}ms` }}
        />
      ))}
    </div>
  );
}
