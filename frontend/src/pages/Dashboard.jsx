// The dashboard: upload slab, summary stats, a sticky filter bar and the numbered list of recordings.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import UploadCard from "../components/UploadCard.jsx";
import LiveRecorder from "../components/LiveRecorder.jsx";
import StatsCard from "../components/StatsCard.jsx";
import RecordingCard from "../components/RecordingCard.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import SearchBar from "../components/SearchBar.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Modal from "../components/ui/Modal.jsx";
import Button from "../components/ui/Button.jsx";
import { MicIcon, UploadCloudIcon } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useLocalStorageSet } from "../hooks/useLocalStorageSet.js";
import { ApiError, deleteNote, listNotes } from "../services/api.js";
import { formatDuration } from "../utils/format.js";
import { isTerminalStatus } from "../utils/status.js";
import styles from "./Dashboard.module.css";
const FILTER_LABELS = {
  all: "All recordings",
  completed: "Summaries",
  favorites: "Favorites",
};
// Loads the notes, works out the stats and the visible subset, and switches between the two layouts.
export default function Dashboard() {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const notify = useToast();
  const { user } = useAuth();
  const favorites = useLocalStorageSet("audio-notes:favorites");
  const filter = searchParams.get("filter");
  const rawQuery = searchParams.get("q") || "";
  const query = rawQuery.trim().toLowerCase();
  const uploadFocusRequestId = searchParams.get("action") === "upload" ? searchParams.toString() : null;
  const isListView = Boolean(filter) || Boolean(query);
  const [searchValue, setSearchValue] = useState(rawQuery);
  useEffect(() => {
    setSearchValue(rawQuery);
  }, [rawQuery]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [filter]);
  const refresh = useCallback(async () => {
    try {
      const result = await listNotes();
      setNotes(result.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your notes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const updateParams = (changes) => {
    const next = new URLSearchParams(searchParams);
    next.delete("action");
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next, { replace: "q" in changes });
  };
  const handleSearch = (value) => {
    setSearchValue(value);
    updateParams({ q: value });
  };
  const handleUploaded = (created) => {
    navigate(`/notes/${created.id}`);
  };
  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteNote(pendingDelete.id);
      setNotes((prev) => prev.filter((n) => n.id !== pendingDelete.id));
      favorites.remove(pendingDelete.id);
      notify(`"${pendingDelete.title}" was deleted`, { type: "success" });
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Could not delete this recording.", { type: "error" });
    } finally {
      setPendingDelete(null);
    }
  };
  const stats = useMemo(() => {
    const completed = notes.filter((n) => n.status === "completed").length;
    const inProgress = notes.filter((n) => !isTerminalStatus(n.status)).length;
    const totalSeconds = notes.reduce((sum, n) => sum + (n.duration || 0), 0);
    const favoritedCount = notes.filter((n) => favorites.has(n.id)).length;
    return { total: notes.length, completed, inProgress, totalSeconds, favoritedCount };
  }, [notes, favorites]);
  const visibleNotes = useMemo(() => {
    let list = notes;
    if (filter === "completed") list = list.filter((n) => n.status === "completed");
    if (filter === "favorites") list = list.filter((n) => favorites.has(n.id));
    if (query) {
      list = list.filter(
        (n) => n.title.toLowerCase().includes(query) || n.original_filename.toLowerCase().includes(query)
      );
    }
    return list;
  }, [notes, filter, query, favorites]);
  const sectionTitle = query ? `Results for "${rawQuery.trim()}"` : FILTER_LABELS[filter] || "Recent recordings";
  const emptyCopy = useMemo(() => {
    if (notes.length === 0) {
      return {
        title: "No recordings yet",
        description: "Upload your first recording and turn it into an AI-powered summary.",
      };
    }
    if (query) {
      return { title: "No matches", description: "Try a different search term." };
    }
    if (filter === "favorites") {
      return { title: "No favorites yet", description: "Star a recording to pin it here." };
    }
    if (filter === "completed") {
      return { title: "No summaries yet", description: "Summaries appear here once processing completes." };
    }
    return { title: "Nothing here", description: "Try a different filter." };
  }, [notes.length, query, filter]);
  const toggles = [
    { id: null, label: "All", count: stats.total },
    { id: "completed", label: "Summaries", count: stats.completed },
    { id: "favorites", label: "Favorites", count: stats.favoritedCount },
  ];
  const activeToggle = filter === "all" ? null : filter;
  return (
    <>
      <div className="page">
        <header className={styles.header}>
          <p className={styles.eyebrow}>
            Dashboard <span className={styles.faint}>{"//"}</span> {user?.email}
          </p>
          <h1 className={styles.title}>{isListView ? sectionTitle : "Your notes."}</h1>
        </header>
        {!isListView && (
          <>
            <div className={styles.inputs}>
              <UploadCard id="upload-card" onUploaded={handleUploaded} focusRequestId={uploadFocusRequestId} />
              <LiveRecorder onSaved={handleUploaded} />
            </div>
            <section className={styles.stats} aria-label="Stats">
              <StatsCard
                label="Recordings"
                value={stats.total}
                note={stats.totalSeconds > 0 ? `${formatDuration(stats.totalSeconds)} of audio` : undefined}
              />
              <StatsCard label="Summaries" value={stats.completed} />
              <StatsCard label="Favorites" value={stats.favoritedCount} />
              <StatsCard label="In progress" value={stats.inProgress} />
            </section>
          </>
        )}
        <div className={styles.filterBar}>
          <div className={styles.filterRow}>
            <div className={styles.search}>
              <SearchBar value={searchValue} onChange={handleSearch} />
            </div>
            <div className={styles.toggles} role="group" aria-label="Filter recordings">
              {toggles.map((t) => {
                const active = (activeToggle ?? null) === t.id;
                return (
                  <button
                    key={t.label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateParams({ filter: t.id })}
                    className={`${styles.toggle} ${active ? styles.toggleActive : ""}`}
                  >
                    {t.label}
                    <span className={styles.badge}>{t.count}</span>
                  </button>
                );
              })}
            </div>
            {isListView && (
              <Button to="/dashboard?action=upload" variant="secondary" size="sm" className={styles.uploadButton}>
                <UploadCloudIcon />
                Upload new
              </Button>
            )}
          </div>
          <p className={styles.summary} aria-live="polite">
            {isLoading
              ? "Loading recordings…"
              : `Showing ${visibleNotes.length} of ${notes.length}${query ? ` // matching "${rawQuery.trim()}"` : ""}`}
          </p>
        </div>
        {!isListView && <h2 className={styles.sectionTitle}>{sectionTitle}</h2>}
        <ErrorBanner message={error} onRetry={refresh} />
      </div>
      {isLoading && (
        <div className={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 132 }} />
          ))}
        </div>
      )}
      {!isLoading && !error && visibleNotes.length === 0 && (
        <div className="page">
          <EmptyState
            icon={<MicIcon />}
            eyebrow="Empty // 0 results"
            title={emptyCopy.title}
            description={emptyCopy.description}
            action={
              notes.length === 0 ? (
                <Button to="/dashboard?action=upload">Upload a recording</Button>
              ) : (
                <Button variant="secondary" onClick={() => setSearchParams(new URLSearchParams())}>
                  Clear filters
                </Button>
              )
            }
          />
        </div>
      )}
      {visibleNotes.length > 0 && (
        <ol className={`${styles.list} onDark`}>
          {visibleNotes.map((note, index) => (
            <RecordingCard
              key={note.id}
              note={note}
              index={index + 1}
              isFavorite={favorites.has(note.id)}
              onToggleFavorite={favorites.toggle}
              onRequestDelete={setPendingDelete}
              delayMs={Math.min(index, 6) * 40}
            />
          ))}
        </ol>
      )}
      <Modal
        open={Boolean(pendingDelete)}
        title="Delete this recording?"
        description={pendingDelete ? `"${pendingDelete.title}" and its transcript/summary will be permanently removed.` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
