import { motion, useReducedMotion } from "framer-motion";

/**
 * A checkmark that draws itself via SVG stroke animation. Reused everywhere
 * a "this is done" state appears (key points, action items, upload
 * complete, processing complete) instead of a bespoke animation per spot.
 */
export default function AnimatedCheck({ size = 16, className = "", delay = 0 }) {
  const reduceMotion = useReducedMotion();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <motion.path
        d="M5 12.5 10 17.5 19 6.5"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.35, delay, ease: "easeOut" }}
      />
    </svg>
  );
}
