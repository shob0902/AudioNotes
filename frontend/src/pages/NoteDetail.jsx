// The single note page: title header, audio player, processing progress, tabbed results and a facts aside.
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ActionItems from "../components/ActionItems.jsx";
import AudioPlayer from "../components/AudioPlayer.jsx";
import BulletList from "../components/BulletList.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import ProcessingStatus from "../components/ProcessingStatus.jsx";
import StatusTag from "../components/StatusTag.jsx";
import SummaryCard from "../components/SummaryCard.jsx";
import TopicChips from "../components/TopicChips.jsx";
import TranscriptViewer from "../components/TranscriptViewer.jsx";
import IconButton from "../components/ui/IconButton.jsx";
import Modal from "../components/ui/Modal.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";
import Spinner from "../components/ui/Spinner.jsx";
import Tabs from "../components/ui/Tabs.jsx";
import { BackIcon, StarIcon, TrashIcon } from "../components/icons.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useLocalStorageSet } from "../hooks/useLocalStorageSet.js";
import { useNoteStatusPolling } from "../hooks/useNoteStatusPolling.js";
import { ApiError, deleteNote, getNote, retryNote } from "../services/api.js";
import { formatDate, formatDateTime, formatDuration, formatFileSize } from "../utils/format.js";
import { isTerminalStatus, STAGE_LABELS } from "../utils/status.js";
import styles from "./NoteDetail.module.css";
// The black pill link back to the dashboard.
function BackLink() {
  return (
    <Link to="/dashboard" className={styles.back}>
      <BackIcon className={styles.backIcon} />
      Dashboard
    </Link>
  );
}
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
      favorites.remove(id);
      notify("Recording deleted", { type: "success" });
      navigate("/dashboard");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Could not delete this note.", { type: "error" });
    }
  };
  if (loadError) {
    return (
      <div className={`page ${styles.page}`}>
        <BackLink />
        <div className={styles.loadError}>
          <ErrorBanner message={loadError} onRetry={fetchNote} />
        </div>
      </div>
    );
  }
  if (!note) {
    return (
      <div className={`page ${styles.page}`}>
        <BackLink />
        <Skeleton style={{ height: 120, marginTop: 28 }} />
        <div className={styles.layout}>
          <Skeleton style={{ height: 320 }} />
          <Skeleton style={{ height: 320 }} />
        </div>
      </div>
    );
  }
  const effectiveStatus = status || note.status;
  const isFailed = effectiveStatus === "failed";
  const isCompleted = effectiveStatus === "completed";
  const errorMessage = liveErrorMessage || note.error_message;
  const isFavorite = favorites.has(note.id);
  const summary = note.summary;
  const tabs = [
    { id: "summary", label: "Summary" },
    { id: "key_points", label: "Key points", count: summary?.key_points?.length },
    { id: "action_items", label: "Action items", count: summary?.action_items?.length },
    { id: "decisions", label: "Decisions", count: summary?.decisions?.length },
    { id: "topics", label: "Topics", count: summary?.topics?.length },
    { id: "transcript", label: "Transcript" },
  ];
  const tabContent = {
    summary: summary && <SummaryCard summary={summary} />,
    key_points: summary && (
      <BulletList title="Key points" items={summary.key_points} emptyText="No key points identified." />
    ),
    action_items: summary && <ActionItems noteId={note.id} items={summary.action_items} />,
    decisions: summary && (
      <BulletList title="Decisions" items={summary.decisions} emptyText="No explicit decisions identified." />
    ),
    topics: summary && <TopicChips topics={summary.topics} />,
    transcript: note.transcript && <TranscriptViewer transcript={note.transcript} />,
  };
  const facts = [
    { label: "File", value: note.original_filename },
    { label: "Uploaded", value: formatDateTime(note.created_at) },
    { label: "Duration", value: formatDuration(note.duration) },
    { label: "Size", value: formatFileSize(note.file_size) },
    { label: "Status", value: STAGE_LABELS[effectiveStatus] || effectiveStatus },
  ];
  return (
    <div className={`page ${styles.page}`}>
      <BackLink />
      <header className={styles.header}>
        <div className={styles.headerMeta}>
          <StatusTag status={effectiveStatus} />
          <span className={styles.metaText}>
            {formatDate(note.created_at)} {"//"} {formatDuration(note.duration)}
          </span>
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{note.title}</h1>
          <div className={styles.actions}>
            <IconButton
              label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              pressed={isFavorite}
              onClick={() => favorites.toggle(note.id)}
            >
              <StarIcon />
            </IconButton>
            <IconButton label="Delete recording" onClick={() => setConfirmDelete(true)}>
              <TrashIcon />
            </IconButton>
          </div>
        </div>
      </header>
      <div className={styles.layout}>
        <div className={styles.main}>
          {note.audio_url && <AudioPlayer audioUrl={note.audio_url} seed={note.id} fallbackDuration={note.duration} />}
          {!isTerminalStatus(effectiveStatus) && (
            <ProcessingStatus status={effectiveStatus} filename={note.original_filename} />
          )}
          {isFailed && (
            <div className={styles.failed}>
              <ErrorBanner message={errorMessage || "This note failed to process."} onRetry={handleRetry} />
              {isRetrying && <Spinner label="Retrying…" />}
            </div>
          )}
          {isCompleted && summary && (
            <div className={styles.results}>
              <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} label="Note sections" />
              <div key={activeTab} role="tabpanel">
                {tabContent[activeTab]}
              </div>
            </div>
          )}
        </div>
        <aside className={styles.aside} aria-label="Recording details">
          <h2 className={styles.asideTitle}>Details</h2>
          <dl className={styles.facts}>
            {facts.map((fact) => (
              <div key={fact.label} className={styles.fact}>
                <dt className={styles.factLabel}>{fact.label}</dt>
                <dd className={styles.factValue}>{fact.value || "—"}</dd>
              </div>
            ))}
          </dl>
          {summary && (
            <div className={styles.counts}>
              <div>
                <span className={styles.count}>{summary.key_points?.length ?? 0}</span>
                <span className={styles.factLabel}>Key points</span>
              </div>
              <div>
                <span className={styles.count}>{summary.action_items?.length ?? 0}</span>
                <span className={styles.factLabel}>Actions</span>
              </div>
              <div>
                <span className={styles.count}>{summary.decisions?.length ?? 0}</span>
                <span className={styles.factLabel}>Decisions</span>
              </div>
            </div>
          )}
        </aside>
      </div>
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
