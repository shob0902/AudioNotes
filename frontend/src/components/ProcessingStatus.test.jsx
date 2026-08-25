import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ProcessingStatus from "./ProcessingStatus.jsx";

describe("ProcessingStatus", () => {
  it("renders every pipeline stage label", () => {
    render(<ProcessingStatus status="transcribing" filename="meeting.mp3" />);
    expect(screen.getByText(/Upload complete/)).toBeInTheDocument();
    expect(screen.getByText(/Transcribing audio/)).toBeInTheDocument();
    expect(screen.getByText(/Analyzing & summarizing/)).toBeInTheDocument();
  });

  it("shows an ellipsis on the active stage only", () => {
    render(<ProcessingStatus status="summarizing" />);
    expect(screen.getByText("Analyzing & summarizing…")).toBeInTheDocument();
  });

  it("shows the filename when provided", () => {
    render(<ProcessingStatus status="processing" filename="team-standup.wav" />);
    expect(screen.getByText("team-standup.wav")).toBeInTheDocument();
  });

  it("never fabricates a fine-grained percentage — the progress bar only reflects discrete stage completion", () => {
    render(<ProcessingStatus status="transcribing" />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
