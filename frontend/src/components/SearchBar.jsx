import { SearchIcon } from "./icons.jsx";

/** Controlled search input — filtering logic lives in Dashboard.jsx, which
 * owns the notes list this searches over (title + filename; topics aren't
 * available in the list endpoint, see app/schemas/note.py NoteListItem). */
export default function SearchBar({ value, onChange, placeholder = "Search recordings, summaries, topics..." }) {
  return (
    <label className="relative flex w-full items-center">
      <SearchIcon className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search recordings"
        className="w-full rounded-xl border border-glass-border bg-elevated py-2.5 pl-10 pr-3.5 text-sm text-ink shadow-inset transition-shadow duration-300 placeholder:text-muted focus:border-primary/50 focus:shadow-soft-hover focus:outline-none"
      />
    </label>
  );
}
