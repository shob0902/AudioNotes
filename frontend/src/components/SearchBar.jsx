// The controlled search pill used in the dashboard filter bar; the filtering itself happens in Dashboard.
import { SearchIcon } from "./icons.jsx";
import styles from "./SearchBar.module.css";
// Renders the input with its magnifier icon and reports every keystroke to the parent.
export default function SearchBar({ value, onChange, placeholder = "Search recordings…" }) {
  return (
    <label className={styles.field}>
      <SearchIcon className={styles.icon} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search recordings"
        className={styles.input}
      />
    </label>
  );
}
