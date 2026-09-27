// The stage-by-stage progress panel shown while a recording is still being processed.
import AnimatedCheck from "./ui/AnimatedCheck.jsx";
import { STAGE_LABELS, STAGE_ORDER, getStageChecklist } from "../utils/status.js";
import styles from "./ProcessingStatus.module.css";
const FRIENDLY_LABELS = {
  ...STAGE_LABELS,
  processing: "Preparing audio",
  transcribing: "Transcribing audio",
  summarizing: "Analyzing & summarizing",
};
// The little bouncing bars used as the transcribing stage's activity indicator.
function MiniWaveform() {
  return (
    <span className={styles.bars} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ animationDelay: `${i * 100}ms` }} />
      ))}
    </span>
  );
}
// Picks the right marker for a stage: a filled tick, a live indicator or an empty square.
function StageMarker({ stage, state }) {
  if (state === "done") {
    return (
      <span className={`${styles.marker} ${styles.markerDone}`}>
        <AnimatedCheck size={12} />
      </span>
    );
  }
  if (state === "active") {
    return stage === "transcribing" ? <MiniWaveform /> : <span className={`${styles.marker} ${styles.markerActive}`} />;
  }
  return <span className={styles.marker} />;
}
// Renders a segmented bar that fills as whole stages complete, plus the checklist of stages.
export default function ProcessingStatus({ status, filename }) {
  const stages = getStageChecklist(status).filter((s) => s.stage !== "failed");
  const doneCount = stages.filter((s) => s.state === "done").length;
  return (
    <section className={styles.panel} aria-live="polite">
      <div className={styles.head}>
        <p className={styles.eyebrow}>
          <span className={styles.liveDot} aria-hidden="true" />
          Live // Stage {Math.min(doneCount + 1, STAGE_ORDER.length)} of {STAGE_ORDER.length}
        </p>
        <h2 className={styles.title}>Processing</h2>
        {filename && <p className={styles.filename}>{filename}</p>}
      </div>
      <div className={styles.track} aria-hidden="true">
        {STAGE_ORDER.map((stage, index) => (
          <span key={stage} className={index < doneCount ? styles.segmentDone : styles.segment} />
        ))}
      </div>
      <ol className={styles.stages}>
        {stages.map(({ stage, state }, index) => (
          <li key={stage} className={`${styles.stage} ${styles[state]}`}>
            <span className={styles.stageIndex}>{String(index + 1).padStart(2, "0")}</span>
            <span className={styles.stageLabel}>
              {FRIENDLY_LABELS[stage]}
              {state === "active" ? "…" : ""}
            </span>
            <StageMarker stage={stage} state={state} />
          </li>
        ))}
      </ol>
    </section>
  );
}
