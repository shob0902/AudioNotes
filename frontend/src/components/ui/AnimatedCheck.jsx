// Checkmark icon that draws itself in, used wherever something is marked done.
import { motion, useReducedMotion } from "framer-motion";
// Animates the tick's stroke, or shows it straight away when reduced motion is preferred.
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
