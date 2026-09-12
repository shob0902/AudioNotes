// The controlled search input in the topbar; the filtering itself happens in Dashboard.
import { SearchIcon } from "./icons.jsx";
// Renders the input with its magnifier icon and reports every keystroke to the parent.
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
