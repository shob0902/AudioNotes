// The section listing a note's topics as outline pill tags.
import SectionBlock from "./SectionBlock.jsx";
import { EmptyStateSmall } from "./EmptyStateSmall.jsx";
import styles from "./TopicChips.module.css";
// Renders each topic as a pill tag, or the empty line when there are no topics.
export default function TopicChips({ topics }) {
  return (
    <SectionBlock title="Topics" eyebrow={topics?.length ? `${topics.length} tags` : undefined}>
      {topics && topics.length > 0 ? (
        <ul className={styles.chips}>
          {topics.map((topic, index) => (
            <li key={topic} className={styles.chip} style={{ animationDelay: `${index * 40}ms` }}>
              {topic}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyStateSmall text="No topics identified." />
      )}
    </SectionBlock>
  );
}
