// Hook that animates a number counting up to its target value.
import { useEffect, useRef, useState } from "react";
// Eases from 0 to the target over the given duration, skipping the animation if reduced motion is on.
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
