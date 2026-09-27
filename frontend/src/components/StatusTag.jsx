// The pill tag showing a note's processing status, toned by stage.
import { STAGE_LABELS, statusTone } from "../utils/status.js";
import styles from "./StatusTag.module.css";
// Renders the status label in the pill style for its tone; `onDark` switches to the inverted palette.
export default function StatusTag({ status, onDark = false }) {
  const tone = statusTone(status);
  return (
    <span className={`${styles.tag} ${styles[tone]} ${onDark ? styles.dark : ""}`}>
      {tone === "active" && <span className={styles.dot} aria-hidden="true" />}
      {STAGE_LABELS[status] || status}
    </span>
  );
}
