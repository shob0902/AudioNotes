import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import UploadCard from "../components/UploadCard.jsx";
import StatsCard from "../components/StatsCard.jsx";
import RecordingCard from "../components/RecordingCard.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Modal from "../components/ui/Modal.jsx";
import Button from "../components/ui/Button.jsx";
import { MicIcon, SparkleIcon, StarIcon } from "../components/icons.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useLocalStorageSet } from "../hooks/useLocalStorageSet.js";
import { ApiError, deleteNote, listNotes } from "../services/api.js";
import { formatDuration } from "../utils/format.js";
import { isTerminalStatus } from "../utils/status.js";

const FILTER_LABELS = {
  all: "My Recordings",
  completed: "Summaries",
  favorites: "Favorites",
};

export default function Dashboard() {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const notify = useToast();
  const favorites = useLocalStorageSet("audio-notes:favorites");

  const filter = searchParams.get("filter");
  const query = (searchParams.get("q") || "").trim().toLowerCase();
  const uploadFocusRequestId = searchParams.get("action") === "upload" ? searchParams.toString() : null;

  // A search or a "My Recordings"/"Summaries"/"Favorites" filter switches
  // the page into a compact, list-first view (see below) instead of the
  // full greeting/upload-hero/stats overview — otherwise the filtered list
  // renders far down the page, below the hero and stats, and switching
  // filters can look like nothing happened without scrolling to notice it.
  const isListView = Boolean(filter) || Boolean(query);

  // Whenever the active filter or search changes, snap back to the top so
  // the new results are immediately visible instead of wherever the user
  // happened to have scrolled to.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [filter, query]);

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

  const handleUploaded = (created) => {
    // Jump straight to the note so the user sees the dedicated processing
    // screen and live progress, rather than watching the dashboard's list
    // refresh from a distance.
    navigate(`/notes/${created.id}`);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteNote(pendingDelete.id);
      setNotes((prev) => prev.filter((n) => n.id !== pendingDelete.id));
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
    return { total: notes.length, completed, inProgress, totalSeconds };
  }, [notes]);

  const visibleNotes = useMemo(() => {
    // A search query searches across every recording regardless of which
    // sidebar filter was active — searching only to come up empty because
    // an unrelated filter was still applied is confusing, not useful.
    if (query) {
      return notes.filter(
        (n) => n.title.toLowerCase().includes(query) || n.original_filename.toLowerCase().includes(query)
      );
    }
    if (filter === "completed") return notes.filter((n) => n.status === "completed");
    if (filter === "favorites") return notes.filter((n) => favorites.has(n.id));
    return notes;
  }, [notes, filter, query, favorites]);

  const sectionTitle = query
    ? `Results for "${searchParams.get("q")}"`
    : FILTER_LABELS[filter] || "Recent Recordings";

  const emptyCopy = useMemo(() => {
    if (notes.length === 0) {
      return {
        title: "No recordings yet",
        description: "Upload your first recording and turn it into an AI-powered summary.",
      };
    }
    if (query) {
      return { title: "Nothing matches your search", description: "Try a different search term." };
    }
    if (filter === "favorites") {
      return { title: "No favorites yet", description: "Star a recording to pin it here." };
    }
    if (filter === "completed") {
      return { title: "No summaries yet", description: "Summaries appear here once processing completes." };
    }
    return { title: "Nothing matches here", description: "Try a different filter." };
  }, [notes.length, query, filter]);

  return (
    <div className="space-y-6">
      {!isListView && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-ink sm:text-[28px]">Good to see you</h1>
            <p className="mt-1 text-sm text-muted">
              Turn your recordings into useful notes — upload audio and let AI do the rest.
            </p>
          </div>

          <UploadCard id="upload-card" onUploaded={handleUploaded} focusRequestId={uploadFocusRequestId} />

          <section>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatsCard icon={<MicIcon className="h-4 w-4" />} label="Recordings" value={stats.total} delayMs={0} />
              <StatsCard icon={<SparkleIcon className="h-4 w-4" />} label="Summaries" value={stats.completed} delayMs={100} />
              <StatsCard
                icon={<StarIcon className="h-4 w-4" />}
                label="Favorites"
                value={favorites.set.size}
                delayMs={200}
              />
              <StatsCard icon={<MicIcon className="h-4 w-4" />} label="In Progress" value={stats.inProgress} delayMs={300} />
            </div>
            {stats.totalSeconds > 0 && (
              <p className="mt-2 text-xs text-muted">Total audio processed: {formatDuration(stats.totalSeconds)}</p>
            )}
          </section>
        </>
      )}

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={isListView ? "text-xl font-bold text-ink sm:text-2xl" : "text-lg font-bold text-ink"}>
            {sectionTitle}
          </h2>
          {isListView && (
            <Link to="/dashboard?action=upload">
              <Button variant="secondary" size="sm">
                Upload New
              </Button>
            </Link>
          )}
        </div>

        <div className="mt-4 space-y-3">
          <ErrorBanner message={error} onRetry={refresh} />

          {isLoading &&
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px] w-full rounded-2xl" />)}

          {!isLoading && !error && visibleNotes.length === 0 && (
            <EmptyState icon={<MicIcon className="h-6 w-6" />} title={emptyCopy.title} description={emptyCopy.description} />
          )}

          {visibleNotes.map((note, index) => (
            <RecordingCard
              key={note.id}
              note={note}
              isFavorite={favorites.has(note.id)}
              onToggleFavorite={favorites.toggle}
              onRequestDelete={setPendingDelete}
              delayMs={Math.min(index, 6) * 50}
            />
          ))}
        </div>
      </section>

      <Modal
        open={Boolean(pendingDelete)}
        title="Delete this recording?"
        description={pendingDelete ? `"${pendingDelete.title}" and its transcript/summary will be permanently removed.` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
