// A single dashboard statistic cell with a mono label and a huge counting-up number.
import { useCountUp } from "../hooks/useCountUp.js";
import styles from "./StatsCard.module.css";
// Counts the value up from zero and renders it under its label.
export default function StatsCard({ label, value, suffix = "", note }) {
  const display = useCountUp(value);
  return (
    <div className={styles.cell}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>
        {display}
        {suffix}
      </p>
      <p className={styles.note} aria-hidden={note ? undefined : "true"}>
        {note || " "}
      </p>
    </div>
  );
}
