// A numbered editorial list, shared by both the Key Points and Decisions sections.
import SectionBlock from "./SectionBlock.jsx";
import styles from "./SectionBlock.module.css";
import { EmptyStateSmall } from "./EmptyStateSmall.jsx";
// Numbers each item 01, 02… with a staggered fade-in, or shows the empty line when the list is empty.
export default function BulletList({ title, items, emptyText }) {
  return (
    <SectionBlock title={title} eyebrow={items?.length ? `${items.length} items` : undefined}>
      {items && items.length > 0 ? (
        <ol className={styles.list}>
          {items.map((item, index) => (
            <li key={index} className={styles.item} style={{ animationDelay: `${index * 50}ms` }}>
              <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.text}>{item}</span>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyStateSmall text={emptyText} />
      )}
    </SectionBlock>
  );
}
