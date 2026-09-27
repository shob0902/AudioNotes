// Shared layout for the sign-in page: giant headline on the left, the sign-in panel on the right.
import styles from "./AuthLayout.module.css";
// Renders the eyebrow and headline beside a white ruled panel holding the form and footer link.
export default function AuthLayout({ eyebrow, headline, lead, children, footer }) {
  return (
    <div className={`page ${styles.layout}`}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.headline}>{headline}</h1>
        {lead && <p className={styles.lead}>{lead}</p>}
      </div>
      <div className={styles.panel}>
        {children}
        {footer && <p className={styles.footer}>{footer}</p>}
      </div>
    </div>
  );
}
