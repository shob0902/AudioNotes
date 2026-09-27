// The audio player for a note, wrapping a real audio element with play, seek, speed and volume controls.
import { useEffect, useRef, useState } from "react";
import Waveform from "./Waveform.jsx";
import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon, VolumeIcon } from "./icons.jsx";
import styles from "./AudioPlayer.module.css";
const SPEEDS = [1, 1.25, 1.5, 2];
const SKIP_SECONDS = 10;
// Formats seconds as m:ss for the running clock.
function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
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
    <div className={`${styles.player} onDark`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <div className={styles.meta}>
        <span className={styles.eyebrow}>{isPlaying ? "Now playing" : "Playback"}</span>
        <span className={styles.clock}>
          {clock(currentTime)} <span className={styles.clockTotal}>/ {clock(duration)}</span>
        </span>
      </div>
      <Waveform seed={seed} progress={progress} isPlaying={isPlaying} onSeek={seekToRatio} />
      <div className={styles.controls}>
        <div className={styles.transport}>
          <button
            type="button"
            onClick={() => skip(-SKIP_SECONDS)}
            aria-label={`Back ${SKIP_SECONDS} seconds`}
            className={styles.skip}
          >
            <SkipBackIcon />
          </button>
          <button type="button" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"} className={styles.play}>
            {isPlaying ? <PauseIcon /> : <PlayIcon className={styles.playIcon} />}
          </button>
          <button
            type="button"
            onClick={() => skip(SKIP_SECONDS)}
            aria-label={`Forward ${SKIP_SECONDS} seconds`}
            className={styles.skip}
          >
            <SkipForwardIcon />
          </button>
        </div>
        <div className={styles.extras}>
          <button type="button" onClick={cycleSpeed} className={styles.chip} aria-label="Playback speed">
            {SPEEDS[speedIndex]}×
          </button>
          <div className={styles.volumeWrap}>
            <button
              type="button"
              onClick={() => setShowVolume((v) => !v)}
              aria-label="Volume"
              aria-expanded={showVolume}
              className={`${styles.chip} ${showVolume ? styles.chipActive : ""}`}
            >
              <VolumeIcon className={styles.chipIcon} />
            </button>
            {showVolume && (
              <div className={styles.volumePanel}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  className={styles.range}
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
