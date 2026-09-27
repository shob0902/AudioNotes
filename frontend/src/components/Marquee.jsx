// The skewed black marquee band: two rows of giant words scrolling in opposite directions.
import styles from "./Marquee.module.css";
// Renders one row, duplicating its words so the -50% translate loops seamlessly.
function MarqueeRow({ items, reverse }) {
  const sequence = [...items, ...items];
  return (
    <div className={`${styles.row} ${reverse ? styles.reverse : ""}`}>
      <div className={styles.track}>
        {sequence.map((item, i) => (
          <span key={i} className={styles.item} aria-hidden={i >= items.length ? "true" : undefined}>
            {item}
            <span className={styles.dot} aria-hidden="true">
              •
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
// Renders the band with an orange left-moving row and a white right-moving row.
export default function Marquee({ top, bottom, speed = "38s", label }) {
  return (
    <section className={styles.band} style={{ "--speed": speed }} aria-label={label}>
      <div className={styles.inner}>
        <MarqueeRow items={top} />
        {bottom && <MarqueeRow items={bottom} reverse />}
      </div>
    </section>
  );
}
