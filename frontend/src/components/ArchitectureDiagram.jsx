// The vertical flow diagram on the architecture page showing a note's journey through the system.
import { DownArrowIcon } from "./icons.jsx";
import styles from "./ArchitectureDiagram.module.css";
const NODES = [
  { label: "Browser", detail: "React + Vite + CSS Modules" },
  { label: "FastAPI", detail: "Validate → Store → Schedule → Respond" },
  { label: "Object Storage", detail: "R2 / Supabase / S3-compatible" },
  { label: "PostgreSQL", detail: "Note metadata, transcript, summary" },
  { label: "Background Task", detail: "In-process (FastAPI BackgroundTasks)" },
  { label: "Gnani ASR", detail: "Chunked speech-to-text" },
  { label: "Groq LLM", detail: "Structured summarization" },
  { label: "PostgreSQL", detail: "Final transcript + summary saved" },
];
const SYNC_COUNT = 2;
// Renders the nodes in order, drawing the background ones as inverted black blocks.
export default function ArchitectureDiagram() {
  return (
    <figure className={styles.diagram}>
      <ol className={styles.nodes}>
        {NODES.map((node, index) => (
          <li key={`${node.label}-${index}`} className={styles.step}>
            <div className={`${styles.node} ${index < SYNC_COUNT ? styles.sync : styles.background}`}>
              <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.label}>{node.label}</span>
              <span className={styles.detail}>{node.detail}</span>
            </div>
            {index < NODES.length - 1 && <DownArrowIcon className={styles.arrow} />}
          </li>
        ))}
      </ol>
      <figcaption className={styles.legend}>
        <span>
          <span className={`${styles.swatch} ${styles.sync}`} /> Synchronous (request/response)
        </span>
        <span>
          <span className={`${styles.swatch} ${styles.background}`} /> Background (in-process task)
        </span>
      </figcaption>
    </figure>
  );
}
