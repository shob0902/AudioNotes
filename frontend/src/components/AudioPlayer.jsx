// The audio player for a note, wrapping a real audio element with play, seek, speed and volume controls.
import { useEffect, useRef, useState } from "react";
import Waveform from "./Waveform.jsx";
import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon, VolumeIcon } from "./icons.jsx";
import { formatDuration } from "../utils/format.js";
const SPEEDS = [1, 1.25, 1.5, 2];
const SKIP_SECONDS = 10;
// Tracks the audio element's position and duration and wires the transport buttons up to it.
export default function AudioPlayer({ audioUrl, seed, fallbackDuration }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDuration || 0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || fallbackDuration || 0);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [fallbackDuration]);
  if (!audioUrl) return null;
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play().catch(() => {});
    setIsPlaying(!isPlaying);
  };
  const seekToRatio = (ratio) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };
  const skip = (seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(Math.max(audio.currentTime + seconds, 0), duration || Infinity);
    setCurrentTime(audio.currentTime);
  };
  const cycleSpeed = () => {
    const nextIndex = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(nextIndex);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[nextIndex];
  };
  const handleVolumeChange = (e) => {
    const value = Number(e.target.value);
    setVolume(value);
    if (audioRef.current) audioRef.current.volume = value;
  };
  const progress = duration ? currentTime / duration : 0;
  return (
    <div className="rounded-2xl border border-glass-border bg-elevated p-4 shadow-inset sm:p-5">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <Waveform seed={seed} progress={progress} isPlaying={isPlaying} onSeek={seekToRatio} />
      <div className="mt-1 flex items-center justify-between text-xs text-muted tabular-nums">
        <span>{formatDuration(currentTime)}</span>
        <span>{formatDuration(duration)}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => skip(-SKIP_SECONDS)}
          aria-label={`Back ${SKIP_SECONDS} seconds`}
          className="rounded-full p-2 text-muted hover:text-ink"
        >
          <SkipBackIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-soft transition-transform active:scale-95"
        >
          {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5 translate-x-0.5" />}
        </button>
        <button
          type="button"
          onClick={() => skip(SKIP_SECONDS)}
          aria-label={`Forward ${SKIP_SECONDS} seconds`}
          className="rounded-full p-2 text-muted hover:text-ink"
        >
          <SkipForwardIcon className="h-5 w-5" />
        </button>
        <div className="ml-2 flex items-center gap-2">
          <button
            type="button"
            onClick={cycleSpeed}
            className="rounded-lg bg-surface px-2 py-1 text-xs font-semibold text-ink shadow-soft"
            aria-label="Playback speed"
          >
            {SPEEDS[speedIndex]}x
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowVolume((v) => !v)}
              aria-label="Volume"
              className="rounded-lg p-1.5 text-muted hover:text-ink"
            >
              <VolumeIcon className="h-4 w-4" />
            </button>
            {showVolume && (
              <div className="absolute right-0 top-full z-10 mt-2 rounded-lg bg-surface p-2 shadow-soft-lg">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="h-24 w-2 accent-primary [writing-mode:vertical-lr]"
                  aria-label="Volume level"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
