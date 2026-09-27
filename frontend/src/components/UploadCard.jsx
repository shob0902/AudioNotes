// The drag-and-drop upload slab that picks an audio file and sends it to the backend.
import { useCallback, useEffect, useRef, useState } from "react";
import Button from "./ui/Button.jsx";
import AnimatedCheck from "./ui/AnimatedCheck.jsx";
import Spinner from "./ui/Spinner.jsx";
import { AlertIcon, ArrowIcon, UploadCloudIcon } from "./icons.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { ApiError, uploadNote } from "../services/api.js";
import { formatDuration, formatFileSize } from "../utils/format.js";
import styles from "./UploadCard.module.css";
const SUPPORTED_FORMATS = ["MP3", "WAV", "M4A", "AAC", "OGG", "FLAC"];
const MAX_FILE_SIZE_MB = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB || 200);
const RECOMMENDED_MIN_MINUTES = 2;
// Reads the file's duration with the browser's own decoder, just to preview it before upload.
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
// Handles picking or dropping a file, shows its details, and uploads it on confirmation.
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
  const isShort = duration !== null && duration < RECOMMENDED_MIN_MINUTES * 60;
  return (
    <section id={id} ref={cardRef} className={styles.card} aria-label="Upload a recording">
      {!selectedFile ? (
        <label
          htmlFor="audio-upload-input"
          className={`${styles.dropzone} ${isDragging ? styles.dragging : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <span className={styles.eyebrow}>Upload // Audio file</span>
          <span className={styles.headline}>{isDragging ? "Let go." : "Upload it."}</span>
          <span className={styles.copy}>
            Drag &amp; drop a meeting, lecture or voice memo — or pick one from your device. We'll transcribe it and
            pull out the key points.
          </span>
          <span className={styles.row}>
            <span className={styles.choose}>
              <UploadCloudIcon className={styles.chooseIcon} />
              Choose file
            </span>
            <span className={styles.formats}>
              {SUPPORTED_FORMATS.join(" · ")}
              <span className={styles.faint}>
                {` // ${RECOMMENDED_MIN_MINUTES}+ min recommended // up to ${MAX_FILE_SIZE_MB} MB`}
              </span>
            </span>
          </span>
          <input
            id="audio-upload-input"
            ref={inputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.aac,.ogg,.flac,audio/*"
            className="srOnly"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      ) : (
        <div className={styles.selected}>
          <span className={styles.eyebrow}>Ready // 1 file</span>
          <p className={styles.filename}>{selectedFile.name}</p>
          <div className={styles.chips}>
            <span className={styles.chip}>{formatFileSize(selectedFile.size)}</span>
            {duration !== null && <span className={styles.chip}>{formatDuration(duration)}</span>}
          </div>
          {isShort && (
            <p className={styles.notice}>
              <AlertIcon className={styles.noticeIcon} />
              Shorter than the recommended {RECOMMENDED_MIN_MINUTES} minutes — it'll still process normally.
            </p>
          )}
          <div className={styles.actions}>
            <Button onClick={handleUpload} disabled={isUploading || justUploaded} size="lg">
              {justUploaded ? (
                <>
                  <AnimatedCheck size={15} />
                  Uploaded
                </>
              ) : isUploading ? (
                <Spinner label="Uploading…" />
              ) : (
                <>
                  Upload and process
                  <ArrowIcon className="arrow" />
                </>
              )}
            </Button>
            <Button variant="secondary" size="lg" onClick={reset} disabled={isUploading}>
              Remove
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          <AlertIcon className={styles.noticeIcon} />
          {error}
        </p>
      )}
    </section>
  );
}
