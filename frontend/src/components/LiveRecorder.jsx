// The live mic panel: speak, watch the transcript appear, then edit it and save it as a note.
import { useEffect, useState } from "react";
import Button from "./ui/Button.jsx";
import Spinner from "./ui/Spinner.jsx";
import ErrorBanner from "./ErrorBanner.jsx";
import { ArrowIcon, MicIcon, StopIcon } from "./icons.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useLiveTranscription } from "../hooks/useLiveTranscription.js";
import { ApiError, createLiveNote } from "../services/api.js";
import styles from "./LiveRecorder.module.css";
// Formats seconds as mm:ss for the running timer.
function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
// A readable default title stamped with the current date and time.
function defaultTitle() {
  const stamp = new Date().toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return `Live note — ${stamp}`;
}
// Drives the transcription hook and hands the saved note back through onSaved.
export default function LiveRecorder({ onSaved }) {
  const { supported, status, finalText, interimText, error, elapsed, audioBlob, start, stop, reset } =
    useLiveTranscription();
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const notify = useToast();
  const isListening = status === "listening";
  const isStopped = status === "stopped";
  useEffect(() => {
    if (isStopped) setDraft(finalText.trim());
  }, [isStopped, finalText]);
  const wordCount = (isStopped ? draft : `${finalText} ${interimText}`).trim().split(/\s+/).filter(Boolean).length;
  const handleStart = () => {
    setSaveError(null);
    setTitle("");
    start();
  };
  const handleDiscard = () => {
    reset();
    setDraft("");
    setTitle("");
    setSaveError(null);
  };
  const handleSave = async () => {
    const transcript = draft.trim();
    if (!transcript) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const result = await createLiveNote({
        transcript,
        title: title.trim() || defaultTitle(),
        duration: Math.round(elapsed * 10) / 10,
        audioBlob,
      });
      notify("Live note saved — summarizing now", { type: "success" });
      handleDiscard();
      onSaved?.(result);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not save this note. Please try again.";
      setSaveError(message);
      notify(message, { type: "error" });
    } finally {
      setIsSaving(false);
    }
  };
  if (!supported) {
    return (
      <section className={`${styles.slab} onDark`} aria-label="Live transcription">
        <span className={styles.eyebrow}>Live {"//"} Mic</span>
        <h2 className={styles.headline}>Speak it.</h2>
        <ErrorBanner message="Live transcription isn't available in this browser. Open Audio Notes in Chrome, Edge or Safari to use the mic." />
      </section>
    );
  }
  return (
    <section className={`${styles.slab} onDark`} aria-label="Live transcription">
      <div className={styles.top}>
        <div>
          <span className={styles.eyebrow}>Live {"//"} Mic</span>
          <h2 className={styles.headline}>{isListening ? "Listening." : isStopped ? "Got it." : "Speak it."}</h2>
        </div>
        <div className={styles.controls}>
          {!isStopped && (
            <button
              type="button"
              onClick={isListening ? stop : handleStart}
              className={`${styles.mic} ${isListening ? styles.micLive : ""}`}
              aria-label={isListening ? "Stop recording" : "Start recording"}
              aria-pressed={isListening}
            >
              {isListening ? <StopIcon /> : <MicIcon />}
            </button>
          )}
          <div className={styles.meter}>
            <span className={styles.timer} aria-label="Elapsed time">
              {isListening && <span className={styles.recDot} aria-hidden="true" />}
              {clock(elapsed)}
            </span>
            <span className={styles.words}>{wordCount} words</span>
          </div>
        </div>
      </div>
      {error && <ErrorBanner message={error} />}
      {isStopped ? (
        <div className={styles.review}>
          <label className={styles.label} htmlFor="live-title">
            Title
          </label>
          <input
            id="live-title"
            className={styles.titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={defaultTitle()}
            maxLength={255}
          />
          <label className={styles.label} htmlFor="live-transcript">
            Transcript — edit before saving
          </label>
          <textarea
            id="live-transcript"
            className={styles.textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
          />
          {!draft.trim() && <p className={styles.hint}>Nothing was transcribed. Discard and try again.</p>}
          {saveError && <ErrorBanner message={saveError} />}
          <div className={styles.actions}>
            <Button variant="accent" size="lg" onClick={handleSave} disabled={isSaving || !draft.trim()}>
              {isSaving ? (
                <Spinner label="Saving…" />
              ) : (
                <>
                  Save as note
                  <ArrowIcon className="arrow" />
                </>
              )}
            </Button>
            <Button variant="outlineDark" size="lg" onClick={handleDiscard} disabled={isSaving}>
              Discard
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.live} aria-live="polite" aria-label="Live transcript">
          {finalText || interimText ? (
            <p className={styles.transcript}>
              {finalText}
              <span className={styles.interim}>{interimText}</span>
            </p>
          ) : (
            <p className={styles.placeholder}>
              {isListening
                ? "Go ahead — your words will appear here as you speak…"
                : "Tap the mic and start talking. Your transcript appears live, then save it as a note and we'll summarize it."}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
