// The single note page: audio player, processing progress, and the tabbed transcript and summary.
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import ActionItems from "../components/ActionItems.jsx";
import AudioPlayer from "../components/AudioPlayer.jsx";
import BulletList from "../components/BulletList.jsx";
import Card from "../components/ui/Card.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Modal from "../components/ui/Modal.jsx";
import ProcessingStatus from "../components/ProcessingStatus.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";
import SummaryCard from "../components/SummaryCard.jsx";
import Tabs from "../components/ui/Tabs.jsx";
import TopicChips from "../components/TopicChips.jsx";
import TranscriptViewer from "../components/TranscriptViewer.jsx";
import { StarIcon, TrashIcon } from "../components/icons.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useLocalStorageSet } from "../hooks/useLocalStorageSet.js";
import { useNoteStatusPolling } from "../hooks/useNoteStatusPolling.js";
import { ApiError, deleteNote, getNote, retryNote } from "../services/api.js";
import { formatDate, formatDuration, formatFileSize } from "../utils/format.js";
import { isTerminalStatus, statusBadgeClasses, STAGE_LABELS } from "../utils/status.js";
const TABS = [
  { id: "summary", label: "Summary" },
  { id: "key_points", label: "Key Points" },
  { id: "action_items", label: "Action Items" },
  { id: "decisions", label: "Decisions" },
  { id: "topics", label: "Topics" },
  { id: "transcript", label: "Transcript" },
];
// Loads the note, polls it while it processes, and handles the retry, favorite and delete actions.
export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const favorites = useLocalStorageSet("audio-notes:favorites");
  const [note, setNote] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const fetchNote = useCallback(async () => {
    try {
      const result = await getNote(id);
      setNote(result);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not load this note.");
    }
  }, [id]);
  useEffect(() => {
    fetchNote();
  }, [fetchNote]);
  const { status, errorMessage: liveErrorMessage } = useNoteStatusPolling(note?.id, note?.status, () => {
    fetchNote();
    notify("AI summary generated", { type: "success" });
  });
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retryNote(id);
      await fetchNote();
      notify("Retrying this recording", { type: "info" });
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Could not retry this note.", { type: "error" });
    } finally {
      setIsRetrying(false);
    }
  };
  const handleDelete = async () => {
    setConfirmDelete(false);
    try {
      await deleteNote(id);
      notify("Recording deleted", { type: "success" });
      navigate("/dashboard");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Could not delete this note.", { type: "error" });
    }
  };
  if (loadError) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={loadError} onRetry={fetchNote} />
        <Link to="/dashboard" className="text-sm font-medium text-primary hover:underline">
          &larr; Back to dashboard
        </Link>
      </div>
    );
  }
  if (!note) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }
  const effectiveStatus = status || note.status;
  const isFailed = effectiveStatus === "failed";
  const isCompleted = effectiveStatus === "completed";
  const errorMessage = liveErrorMessage || note.error_message;
  const isFavorite = favorites.has(note.id);
  const tabContent = {
    summary: note.summary && <SummaryCard summary={note.summary} />,
    key_points: note.summary && (
      <BulletList title="Key Points" items={note.summary.key_points} emptyText="No key points identified." />
    ),
    action_items: note.summary && <ActionItems noteId={note.id} items={note.summary.action_items} />,
    decisions: note.summary && (
      <BulletList title="Decisions" items={note.summary.decisions} emptyText="No explicit decisions identified." />
    ),
    topics: note.summary && <TopicChips topics={note.summary.topics} />,
    transcript: note.transcript && <TranscriptViewer transcript={note.transcript} />,
  };
  return (
    <div className="space-y-6">
      <Link to="/dashboard" className="text-sm font-medium text-primary hover:underline">
        &larr; Back to dashboard
      </Link>
      <Card variant="elevated-lg" className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-ink">{note.title}</h1>
            <p className="mt-1 text-sm text-muted">{note.original_filename}</p>
            <p className="mt-1 text-xs text-muted">
              {formatDate(note.created_at)} · {formatDuration(note.duration)} · {formatFileSize(note.file_size)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClasses(effectiveStatus)}`}>
              {STAGE_LABELS[effectiveStatus] || effectiveStatus}
            </span>
            <motion.button
              whileTap={{ scale: 0.85 }}
              type="button"
              onClick={() => favorites.toggle(note.id)}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              className={`rounded-lg border border-glass-border p-2 shadow-soft transition-colors ${isFavorite ? "bg-warning/15 text-warning" : "bg-elevated text-muted hover:text-ink"}`}
            >
              <StarIcon className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
            </motion.button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete recording"
              className="rounded-lg border border-glass-border bg-elevated p-2 text-muted shadow-soft transition-colors hover:text-danger"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        {note.audio_url && (
          <div className="mt-5">
            <AudioPlayer audioUrl={note.audio_url} seed={note.id} fallbackDuration={note.duration} />
          </div>
        )}
      </Card>
      {!isTerminalStatus(effectiveStatus) && <ProcessingStatus status={effectiveStatus} filename={note.original_filename} />}
      {isFailed && (
        <Card variant="elevated" className="p-6">
          <ErrorBanner message={errorMessage || "This note failed to process."} onRetry={handleRetry} />
          {isRetrying && <p className="mt-2 text-xs text-muted">Retrying...</p>}
        </Card>
      )}
      {isCompleted && note.summary && (
        <div className="space-y-4">
          <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {tabContent[activeTab]}
          </motion.div>
        </div>
      )}
      <Modal
        open={confirmDelete}
        title="Delete this recording?"
        description={`"${note.title}" and its transcript/summary will be permanently removed.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
