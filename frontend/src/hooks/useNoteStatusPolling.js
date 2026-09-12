// Hook that polls a note's status until it finishes processing.
import { useEffect, useRef, useState } from "react";
import { getNoteStatus } from "../services/api.js";
import { isTerminalStatus } from "../utils/status.js";
const POLL_INTERVAL_MS = 2500;
// Checks the status every few seconds, stops once it is terminal, and calls back when it gets there.
export function useNoteStatusPolling(noteId, initialStatus, onTerminal) {
  const [status, setStatus] = useState(initialStatus);
  const [errorMessage, setErrorMessage] = useState(null);
  const onTerminalRef = useRef(onTerminal);
  onTerminalRef.current = onTerminal;
  useEffect(() => {
    setStatus(initialStatus);
  }, [noteId, initialStatus]);
  useEffect(() => {
    if (!noteId || isTerminalStatus(status)) return undefined;
    let cancelled = false;
    const poll = async () => {
      try {
        const result = await getNoteStatus(noteId);
        if (cancelled) return;
        setStatus(result.status);
        setErrorMessage(result.error_message);
        if (isTerminalStatus(result.status)) {
          onTerminalRef.current?.();
        }
      } catch {
      }
    };
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [noteId, status]);
  return { status, errorMessage };
}
