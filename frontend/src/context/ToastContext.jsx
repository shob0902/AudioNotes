// Toast context that renders the stacked notification popups and hands out a notify function.
import { createContext, useCallback, useContext, useState } from "react";
import styles from "./Toast.module.css";
const ToastContext = createContext(null);
let idCounter = 0;
// Keeps the list of visible toasts, auto-dismisses each one, and renders the stack.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const notify = useCallback(
    (message, { type = "success", duration = 3200 } = {}) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className={styles.stack} aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${styles.toast} ${t.type === "error" ? styles.error : ""} onDark`}
            role="status"
          >
            <span className={`${styles.dot} ${styles[t.type] ?? ""}`} aria-hidden="true" />
            <span className={styles.message}>{t.message}</span>
            <button type="button" className={styles.close} onClick={() => dismiss(t.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
// Returns the notify function and complains if it is used outside the provider.
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
