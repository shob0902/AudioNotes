// One recording row in the dashboard's editorial index list, with status, favorite and delete controls.
import { Link } from "react-router-dom";
import IconButton from "./ui/IconButton.jsx";
import StatusTag from "./StatusTag.jsx";
import { ArrowIcon, StarIcon, TrashIcon } from "./icons.jsx";
import { formatDate, formatDuration } from "../utils/format.js";
import styles from "./RecordingCard.module.css";
// The title link stretches over the whole row, while the two action buttons sit above it.
export default function RecordingCard({ note, index, isFavorite, onToggleFavorite, onRequestDelete, delayMs = 0 }) {
  return (
    <li className={styles.row} style={{ animationDelay: `${delayMs}ms` }}>
      <span className={styles.index}>{index ? String(index).padStart(2, "0") : "—"}</span>
      <div className={styles.body}>
        <h3 className={styles.title}>
          <Link to={`/notes/${note.id}`} className={styles.link}>
            {note.title}
          </Link>
        </h3>
        <p className={styles.meta}>
          <span className={styles.filename}>{note.original_filename}</span>
          <span className={styles.sep} aria-hidden="true">
            {"//"}
          </span>
          <span>{formatDate(note.created_at)}</span>
          <span className={styles.sep} aria-hidden="true">
            {"//"}
          </span>
          <span>{formatDuration(note.duration)}</span>
        </p>
        <div className={styles.tags}>
          <StatusTag status={note.status} onDark />
          {isFavorite && <span className={styles.favTag}>★ Favorite</span>}
        </div>
      </div>
      <div className={styles.side}>
        <div className={styles.actions}>
          <IconButton
            label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            pressed={isFavorite}
            onClick={() => onToggleFavorite(note.id)}
          >
            <StarIcon />
          </IconButton>
          <IconButton label="Delete recording" onClick={() => onRequestDelete(note)}>
            <TrashIcon />
          </IconButton>
        </div>
        <ArrowIcon className={styles.arrow} />
      </div>
    </li>
  );
}
