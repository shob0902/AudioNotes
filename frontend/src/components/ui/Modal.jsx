// The confirmation dialog used in place of window.confirm, currently for deleting a recording.
import { useEffect, useRef } from "react";
import Button from "./Button.jsx";
import styles from "./Modal.module.css";
// Shows a backdrop and centred dialog; closes on backdrop click, Escape or cancel.
export default function Modal({ open, title, description, confirmLabel = "Confirm", danger, onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <p className={styles.eyebrow}>{danger ? "Warning // Can't be undone" : "Confirm"}</p>
        <h2 id="modal-title" className={styles.title}>
          {title}
        </h2>
        {description && <p className={styles.description}>{description}</p>}
        <div className={styles.actions}>
          <Button ref={cancelRef} variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
