// The action items list, where each item can be ticked off and the state is kept in this browser.
import SectionBlock from "./SectionBlock.jsx";
import AnimatedCheck from "./ui/AnimatedCheck.jsx";
import { EmptyStateSmall } from "./EmptyStateSmall.jsx";
import { useLocalStorageSet } from "../hooks/useLocalStorageSet.js";
import styles from "./ActionItems.module.css";
// Renders each item as a toggle button and remembers which ones are checked for this note.
export default function ActionItems({ noteId, items }) {
  const { has, toggle } = useLocalStorageSet(`audio-notes:checked-items:${noteId}`);
  const doneCount = items ? items.filter((_, i) => has(String(i))).length : 0;
  return (
    <SectionBlock title="Action Items" eyebrow={items?.length ? `${doneCount} / ${items.length} done` : undefined}>
      {items && items.length > 0 ? (
        <ul className={styles.list}>
          {items.map((item, index) => {
            const key = String(index);
            const checked = has(key);
            return (
              <li key={index} style={{ animationDelay: `${index * 50}ms` }} className={styles.row}>
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  aria-pressed={checked}
                  className={`${styles.item} ${checked ? styles.checked : ""}`}
                >
                  <span className={styles.box} aria-hidden="true">
                    {checked && <AnimatedCheck size={14} />}
                  </span>
                  <span className={styles.text}>{item}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyStateSmall text="No action items identified." />
      )}
    </SectionBlock>
  );
}
