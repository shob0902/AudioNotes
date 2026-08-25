import { motion } from "framer-motion";

import AnimatedCheck from "./ui/AnimatedCheck.jsx";
import { SparkleIcon } from "./icons.jsx";
import { STAGE_LABELS, STAGE_ORDER, getStageChecklist } from "../utils/status.js";

/** Small animated waveform used as the "transcribing" stage's active
 * indicator — purely decorative motion, not derived from real audio data
 * (see TranscriptViewer.jsx for why we don't fabricate real waveform/timing
 * data from Gnani's response). */
function MiniWaveform() {
  const bars = [6, 10, 16, 10, 6];
  return (
    <span className="flex items-end gap-0.5" aria-hidden="true">
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className="w-1 rounded-full bg-primary"
          style={{ height: h }}
          animate={{ scaleY: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

/** Dots drifting toward a sparkle — the "summarizing" stage's active
 * indicator. */
function AnalyzingDots() {
  return (
    <span className="relative flex h-4 w-8 items-center" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-primary"
          animate={{ x: [0, 22], opacity: [0, 1, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.35, ease: "easeInOut" }}
        />
      ))}
      <SparkleIcon className="absolute right-0 h-4 w-4 text-primary" />
    </span>
  );
}

function StageIcon({ stage, state }) {
  if (state === "done") return <AnimatedCheck size={16} className="text-primary" />;
  if (state === "failed") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-danger">
        <path
          fillRule="evenodd"
          d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (state === "active") {
    if (stage === "transcribing") return <MiniWaveform />;
    if (stage === "summarizing") return <AnalyzingDots />;
    return <span className="h-2.5 w-2.5 animate-pulse-glow rounded-full bg-primary" />;
  }
  return <span className="h-2.5 w-2.5 rounded-full border-2 border-primary/25" />;
}

const FRIENDLY_LABELS = {
  ...STAGE_LABELS,
  processing: "Preparing audio",
  transcribing: "Transcribing audio",
  summarizing: "Analyzing & summarizing",
};

export default function ProcessingStatus({ status, filename }) {
  const stages = getStageChecklist(status).filter((s) => s.stage !== "failed");
  const doneCount = stages.filter((s) => s.state === "done").length;
  const progressRatio = doneCount / STAGE_ORDER.length;

  return (
    <div className="rounded-2xl border border-glass-border bg-surface p-6 shadow-soft">
      <h2 className="text-base font-semibold text-ink">Processing your recording</h2>
      {filename && <p className="mt-0.5 truncate text-sm text-muted">{filename}</p>}

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-elevated shadow-inset">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progressRatio * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <ul className="mt-5 space-y-3">
        {stages.map(({ stage, state }) => (
          <li key={stage} className="flex items-center gap-3">
            <span className="flex h-5 w-8 items-center justify-center">
              <StageIcon stage={stage} state={state} />
            </span>
            <span
              className={
                state === "upcoming"
                  ? "text-sm text-muted"
                  : state === "active"
                    ? "text-sm font-medium text-ink"
                    : "text-sm text-ink"
              }
            >
              {FRIENDLY_LABELS[stage]}
              {state === "active" ? "…" : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
