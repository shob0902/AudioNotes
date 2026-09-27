// The TL;DR slab at the top of a note, showing the one-paragraph summary.
import CopyButton from "./CopyButton.jsx";
import styles from "./SummaryCard.module.css";
// Renders the summary on an inverted black slab alongside a button to copy it.
export default function SummaryCard({ summary }) {
  return (
    <section className={`${styles.slab} onDark`}>
      <div className={styles.head}>
        <span className={styles.eyebrow}>AI // Summary</span>
        <CopyButton text={summary.summary} label="Copy" toastMessage="Summary copied to clipboard" onDark />
      </div>
      <h2 className={styles.title}>TL;DR</h2>
      <p className={styles.text}>{summary.summary}</p>
    </section>
  );
}
