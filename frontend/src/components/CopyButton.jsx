// The small copy-to-clipboard button that briefly swaps to a "Copied" tick.
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AnimatedCheck from "./ui/AnimatedCheck.jsx";
import { useToast } from "../context/ToastContext.jsx";
// Writes the text to the clipboard, shows a toast, and quietly does nothing if access is denied.
export default function CopyButton({ text, label = "Copy", toastMessage }) {
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
      className="inline-flex items-center gap-1.5 rounded-lg border border-glass-border bg-elevated px-2.5 py-1.5 text-xs font-medium text-ink shadow-soft transition-transform active:scale-95"
    >
      <AnimatePresence initial={false}>
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-primary"
          >
            <AnimatedCheck size={13} />
            Copied
          </motion.span>
        ) : (
          <motion.span key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 0 1 3.75 3.75v1.875C13.5 8.16 14.34 9 15.375 9h1.875A3.75 3.75 0 0 1 21 12.75v3.375C21 17.16 20.16 18 19.125 18h-9.75A1.875 1.875 0 0 1 7.5 16.125V3.375Z" />
              <path d="M15 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 17.25 7.5h-1.875A.375.375 0 0 1 15 7.125V5.25Z" />
              <path d="M4.5 6.375c0-1.036.84-1.875 1.875-1.875H6v9.375A3.375 3.375 0 0 0 9.375 17.25h4.875v.375c0 1.035-.84 1.875-1.875 1.875h-6.75A1.875 1.875 0 0 1 3.75 17.625V8.25c0-1.036.84-1.875 1.875-1.875Z" />
            </svg>
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
