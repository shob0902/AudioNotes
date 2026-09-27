// The inline warning notice used to show an error, with an optional retry button.
import { AlertIcon } from "./icons.jsx";
import styles from "./ErrorBanner.module.css";
// Renders nothing without a message, otherwise the black warning strip and any retry action.
export default function ErrorBanner({ message, onRetry, retryLabel = "Try again" }) {
  if (!message) return null;
  return (
    <div role="alert" className={`${styles.banner} onDark`}>
      <AlertIcon className={styles.icon} />
      <span className={styles.message}>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className={styles.retry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
