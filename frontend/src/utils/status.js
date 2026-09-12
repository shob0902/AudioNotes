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
// Picks the badge colour classes that go with a given status.
export function statusBadgeClasses(status) {
  switch (status) {
    case "completed":
      return "bg-success/15 text-success";
    case "failed":
      return "bg-danger/15 text-danger";
    case "uploaded":
    case "queued":
      return "bg-elevated text-muted";
    default:
      return "bg-primary-light text-primary";
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
