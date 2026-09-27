// The processing stages and their labels, kept in step with NoteStatus on the backend.
export const STAGE_ORDER = [
  "uploaded",
  "queued",
  "processing",
  "transcribing",
  "summarizing",
  "completed",
];
export const STAGE_LABELS = {
  uploaded: "Upload complete",
  queued: "Queued for processing",
  processing: "Preparing audio",
  transcribing: "Transcribing audio",
  summarizing: "Generating summary",
  completed: "Completed",
  failed: "Failed",
};
export const TERMINAL_STATUSES = new Set(["completed", "failed"]);
// Tells the caller whether a note has reached a status that will never change again.
export function isTerminalStatus(status) {
  return TERMINAL_STATUSES.has(status);
}
// Groups a status into the tone its badge is drawn in: done, failed, waiting or active.
export function statusTone(status) {
  switch (status) {
    case "completed":
      return "done";
    case "failed":
      return "failed";
    case "uploaded":
    case "queued":
      return "waiting";
    default:
      return "active";
  }
}
// Marks every stage as done, active or upcoming so the progress checklist can render itself.
export function getStageChecklist(currentStatus) {
  if (currentStatus === "failed") {
    return STAGE_ORDER.map((stage) => ({ stage, state: "done" })).concat([
      { stage: "failed", state: "failed" },
    ]);
  }
  const currentIndex = STAGE_ORDER.indexOf(currentStatus);
  return STAGE_ORDER.map((stage, index) => {
    let state = "upcoming";
    if (index < currentIndex) state = "done";
    else if (index === currentIndex) state = currentStatus === "completed" ? "done" : "active";
    return { stage, state };
  });
}
