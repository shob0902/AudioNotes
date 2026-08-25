import { useEffect, useRef, useState } from "react";

/**
 * Animates a number counting up from 0 to `value` over `durationMs`, once,
 * whenever `value` changes. Used by StatsCard — purely presentational, the
 * underlying number always comes from real data (see Dashboard.jsx).
 */
export function useCountUp(value, durationMs = 900) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef();
  const reducedMotion = useRef(
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;

    if (reducedMotion.current) {
      setDisplay(target);
      return undefined;
    }

    const start = performance.now();
    const from = 0;

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, durationMs]);

  return display;
}
