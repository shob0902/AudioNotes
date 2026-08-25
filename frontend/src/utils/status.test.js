import { describe, expect, it } from "vitest";

import { getStageChecklist, isTerminalStatus } from "./status.js";

describe("isTerminalStatus", () => {
  it("treats completed and failed as terminal", () => {
    expect(isTerminalStatus("completed")).toBe(true);
    expect(isTerminalStatus("failed")).toBe(true);
  });

  it("treats every in-progress stage as non-terminal", () => {
    for (const stage of ["uploaded", "queued", "processing", "transcribing", "summarizing"]) {
      expect(isTerminalStatus(stage)).toBe(false);
    }
  });
});

describe("getStageChecklist", () => {
  it("marks earlier stages done and the current stage active", () => {
    const checklist = getStageChecklist("transcribing");
    const byStage = Object.fromEntries(checklist.map((s) => [s.stage, s.state]));

    expect(byStage.uploaded).toBe("done");
    expect(byStage.queued).toBe("done");
    expect(byStage.processing).toBe("done");
    expect(byStage.transcribing).toBe("active");
    expect(byStage.summarizing).toBe("upcoming");
    expect(byStage.completed).toBe("upcoming");
  });

  it("marks every real stage done plus a failed marker when status is failed", () => {
    const checklist = getStageChecklist("failed");
    expect(checklist.at(-1)).toEqual({ stage: "failed", state: "failed" });
    expect(checklist.slice(0, -1).every((s) => s.state === "done")).toBe(true);
  });

  it("marks every stage done when completed", () => {
    const checklist = getStageChecklist("completed");
    expect(checklist.every((s) => s.state === "done")).toBe(true);
  });
});
