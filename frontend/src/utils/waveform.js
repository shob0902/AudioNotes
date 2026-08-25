/**
 * Deterministic, per-note "waveform" bar heights. Gnani's API doesn't
 * return amplitude/waveform data (see /architecture), so this is honestly
 * decorative — seeded from the note id so a given recording always renders
 * the same bars rather than reshuffling on every render.
 */
export function generateWaveformBars(seed, count = 48) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const bars = [];
  let state = hash || 1;
  for (let i = 0; i < count; i++) {
    // xorshift32 — fast, deterministic, no external dependency
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    const value = (state % 1000) / 1000; // 0..1
    bars.push(0.25 + value * 0.75); // keep bars visible (25%-100% height)
  }
  return bars;
}
