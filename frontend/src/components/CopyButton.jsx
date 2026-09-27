// The small copy-to-clipboard pill that briefly swaps to a "Copied" tick.
import { useState } from "react";
import AnimatedCheck from "./ui/AnimatedCheck.jsx";
import { CopyIcon } from "./icons.jsx";
import { useToast } from "../context/ToastContext.jsx";
import styles from "./CopyButton.module.css";
// Writes the text to the clipboard, shows a toast, and quietly does nothing if access is denied.
export default function CopyButton({ text, label = "Copy", toastMessage, onDark = false }) {
  const [copied, setCopied] = useState(false);
  const notify = useToast();
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopied(true);
      notify(toastMessage || `${label} copied to clipboard`, { type: "success" });
      setTimeout(() => setCopied(false), 1800);
    } catch {
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      className={`${styles.button} ${onDark ? styles.dark : ""}`}
    >
      {copied ? <AnimatedCheck size={14} /> : <CopyIcon className={styles.icon} />}
      {copied ? "Copied" : label}
    </button>
  );
}
