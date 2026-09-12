// Generates the decorative waveform bar heights, seeded per note so they never reshuffle.
// Hashes the seed, then runs xorshift32 to produce a fixed set of bar heights between 25% and 100%.
export function generateWaveformBars(seed, count = 48) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const bars = [];
  let state = hash || 1;
  for (let i = 0; i < count; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    const value = (state % 1000) / 1000;
    bars.push(0.25 + value * 0.75);
  }
  return bars;
}
