// Checkmark icon that draws itself in, used wherever something is marked done.
import styles from "./AnimatedCheck.module.css";
// Draws the tick's stroke with a CSS dash animation (instant under reduced motion).
export default function AnimatedCheck({ size = 16, className = "", delay = 0 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        className={styles.path}
        style={{ animationDelay: `${delay}s` }}
        d="M5 12.5 10 17.5 19 6.5"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="square"
      />
    </svg>
  );
}
