// The small inline "nothing here" line used inside a section.
import styles from "./SectionBlock.module.css";
// Renders the given text as a muted mono note.
export function EmptyStateSmall({ text }) {
  return <p className={styles.empty}>{text}</p>;
}
