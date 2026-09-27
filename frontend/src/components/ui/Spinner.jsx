// The small ring spinner with a mono label, used for inline loading states.
import styles from "./Spinner.module.css";
// Renders the spinning ring, optionally followed by a label.
export default function Spinner({ label }) {
  return (
    <span className={styles.wrap}>
      <span className={styles.ring} aria-hidden="true" />
      {label && <span className={styles.label}>{label}</span>}
    </span>
  );
}
