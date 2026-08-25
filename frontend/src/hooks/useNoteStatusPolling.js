import { useEffect, useRef, useState } from "react";

import { getNoteStatus } from "../services/api.js";
import { isTerminalStatus } from "../utils/status.js";

const POLL_INTERVAL_MS = 2500;

/**
 * Polls GET /api/notes/{id}/status every ~2.5s while the note is active and
 * stops automatically once it reaches a terminal state (completed/failed).
 * No WebSockets — polling is sufficient at this scale and much simpler to
 * reason about (see /architecture).
 *
 * @param {string} noteId
 * @param {string} initialStatus
 * @param {() => void} onTerminal called once, when the note first reaches a terminal status
 */
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
        // Transient network hiccups while polling shouldn't blow up the UI —
        // just try again on the next tick.
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
