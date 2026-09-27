// The pill tab switcher used on the note page.
import styles from "./Tabs.module.css";
// Renders one pill per tab and reports the chosen id back through onChange.
export default function Tabs({ tabs, active, onChange, label = "Sections" }) {
  return (
    <div role="tablist" aria-label={label} className={styles.tabs}>
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`${styles.tab} ${isActive ? styles.active : ""}`}
          >
            {tab.label}
            {typeof tab.count === "number" && <span className={styles.count}>{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
