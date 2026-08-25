import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import Button from "./ui/Button.jsx";
import Card from "./ui/Card.jsx";
import AnimatedCheck from "./ui/AnimatedCheck.jsx";
import { UploadCloudIcon } from "./icons.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { ApiError, uploadNote } from "../services/api.js";
import { formatDuration, formatFileSize } from "../utils/format.js";

const SUPPORTED_FORMATS = ["MP3", "WAV", "M4A", "AAC", "OGG", "FLAC"];
const MAX_FILE_SIZE_MB = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB || 200);
const RECOMMENDED_MIN_MINUTES = 2;

/** Best-effort client-side duration preview via the browser's own decoder —
 * the backend re-validates with ffmpeg regardless (see app/utils/audio.py). */
function probeClientDuration(file) {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    const url = URL.createObjectURL(file);
    audio.src = url;
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(audio.duration) ? audio.duration : null);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
  });
}

export default function UploadCard({ onUploaded, focusRequestId, id }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [duration, setDuration] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const cardRef = useRef(null);
  const notify = useToast();

  // Sidebar's "Upload New" link bumps focusRequestId to scroll this card
  // into view and open the file picker, without a separate route/page.
  useEffect(() => {
    if (focusRequestId) {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusRequestId]);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError(null);
    setSelectedFile(file);
    setDuration(await probeClientDuration(file));
  }, []);

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);
    try {
      const result = await uploadNote(selectedFile);
      setJustUploaded(true);
      notify("Recording uploaded successfully", { type: "success" });
      window.setTimeout(() => {
        setSelectedFile(null);
        setDuration(null);
        setJustUploaded(false);
        onUploaded?.(result);
      }, 700);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Upload failed. Please try again.";
      setError(message);
      notify(message, { type: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setDuration(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <Card id={id} ref={cardRef} variant="elevated-lg" className="p-6 sm:p-10">
      {/* No mode="wait" — see NoteDetail.jsx's comment on the same fix: a
          nested AnimatePresence with mode="wait" can leave the *page-level*
          AnimatePresence (App.jsx) unable to finish unmounting this whole
          page if you navigate away while this is mid-exit. */}
      <AnimatePresence>
        {!selectedFile ? (
          <motion.label
            key="dropzone"
            htmlFor="audio-upload-input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, scale: isDragging ? 1.02 : 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors duration-200 ${
              isDragging ? "border-primary bg-primary-light shadow-soft" : "border-primary/20 hover:border-primary/40 hover:bg-primary-light/40"
            }`}
          >
            <motion.span
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light text-primary"
              animate={
                isDragging
                  ? { scale: 1.15 }
                  : { y: [0, -5, 0] }
              }
              transition={isDragging ? { duration: 0.2 } : { duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <UploadCloudIcon className="h-8 w-8" />
            </motion.span>
            <h2 className="text-lg font-bold text-ink">Upload your recording</h2>
            <p className="text-sm text-muted">
              Drag &amp; drop your audio file here, or choose one from your device
            </p>
            <span className="pointer-events-none mt-1 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-soft">
              Choose File
            </span>
            <p className="mt-1 text-xs text-muted">
              {SUPPORTED_FORMATS.join(" · ")} · Recommended {RECOMMENDED_MIN_MINUTES}+ min · Up to {MAX_FILE_SIZE_MB} MB
            </p>
            <input
              id="audio-upload-input"
              ref={inputRef}
              type="file"
              accept=".mp3,.wav,.m4a,.aac,.ogg,.flac,audio/*"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </motion.label>
        ) : (
          <motion.div
            key="selected"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-start justify-between gap-4 rounded-xl border border-glass-border bg-elevated px-4 py-3.5 shadow-inset">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{selectedFile.name}</p>
                <p className="text-xs text-muted">
                  {formatFileSize(selectedFile.size)}
                  {duration !== null ? ` · ${formatDuration(duration)}` : ""}
                </p>
                {duration !== null && duration < RECOMMENDED_MIN_MINUTES * 60 && (
                  <p className="mt-1 text-xs text-warning">
                    Shorter than the recommended {RECOMMENDED_MIN_MINUTES} minutes — it'll still process normally.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={reset}
                disabled={isUploading}
                className="shrink-0 text-xs font-medium text-muted hover:text-ink disabled:opacity-50"
              >
                Remove
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Button variant="primary" size="md" onClick={handleUpload} disabled={isUploading || justUploaded}>
                <AnimatePresence initial={false}>
                  {justUploaded ? (
                    <motion.span key="done" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <AnimatedCheck size={15} />
                      Uploaded
                    </motion.span>
                  ) : isUploading ? (
                    <motion.span key="loading" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <motion.svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      >
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </motion.svg>
                      Uploading...
                    </motion.span>
                  ) : (
                    <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      Upload and process
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger"
        >
          {error}
        </motion.div>
      )}
    </Card>
  );
}
