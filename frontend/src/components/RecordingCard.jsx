import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import Card from "./ui/Card.jsx";
import { MicIcon, StarIcon, TrashIcon } from "./icons.jsx";
import { formatDate, formatDuration } from "../utils/format.js";
import { STAGE_LABELS, statusBadgeClasses } from "../utils/status.js";

export default function RecordingCard({ note, isFavorite, onToggleFavorite, onRequestDelete, delayMs = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delayMs / 1000, ease: "easeOut" }}
    >
      {/* Hover lift/glow comes from Card itself (see ui/Card.jsx) — no
          separate whileHover here to avoid stacking two transforms. */}
      <Card variant="elevated" className="p-4">
        <div className="flex items-start gap-2.5 sm:gap-4">
          <Link to={`/notes/${note.id}`} className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary sm:h-11 sm:w-11">
              <MicIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{note.title}</p>
              <p className="truncate text-sm text-muted">{note.original_filename}</p>
              <p className="mt-0.5 truncate text-xs text-muted">
                {formatDate(note.created_at)} · {formatDuration(note.duration)}
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-0.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => onToggleFavorite(note.id)}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={isFavorite}
              className={`rounded-lg p-2 transition-colors ${isFavorite ? "text-warning" : "text-muted hover:text-ink"}`}
            >
              <StarIcon className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => onRequestDelete(note)}
              aria-label="Delete recording"
              className="rounded-lg p-2 text-muted transition-colors hover:text-danger"
            >
              <TrashIcon className="h-4 w-4" />
            </motion.button>
          </div>
        </div>

        <Link to={`/notes/${note.id}`}>
          <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClasses(note.status)}`}>
            {STAGE_LABELS[note.status] || note.status}
          </span>
        </Link>
      </Card>
    </motion.div>
  );
}
