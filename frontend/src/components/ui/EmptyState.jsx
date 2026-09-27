// The centered state block for empty lists, 404s and crashes: icon, big title, copy and actions.
import styles from "./EmptyState.module.css";
// Renders the icon, display title, optional description and optional action buttons.
export default function EmptyState({ icon, eyebrow, title, description, action }) {
  return (
    <div className={styles.state}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.actions}>{action}</div>}
    </div>
  );
}
