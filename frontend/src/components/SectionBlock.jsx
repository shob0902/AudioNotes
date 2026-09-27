// A white ruled panel with a display heading and a rule underneath, used by the note detail sections.
import styles from "./SectionBlock.module.css";
// Renders the heading row (with optional actions on the right) above the section body.
export default function SectionBlock({ title, eyebrow, actions, children }) {
  return (
    <section className={styles.block}>
      <div className={styles.head}>
        <div className={styles.titles}>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          <h2 className={styles.title}>{title}</h2>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
