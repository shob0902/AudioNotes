// Tests for the RecordingCard: its content, its link, and its favorite and delete buttons.
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import RecordingCard from "./RecordingCard.jsx";
const baseNote = {
  id: "abc-123",
  title: "Team Meeting",
  original_filename: "meeting.mp3",
  duration: 2520,
  status: "completed",
  created_at: "2026-08-24T10:00:00Z",
};
// Renders a card inside a router with stub callbacks, overridable per test.
function renderCard(note, props = {}) {
  return render(
    <MemoryRouter>
      <RecordingCard
        note={note}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
        onRequestDelete={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  );
}
describe("RecordingCard", () => {
  it("shows the title, filename, and a human-readable duration", () => {
    renderCard(baseNote);
    expect(screen.getByText("Team Meeting")).toBeInTheDocument();
    expect(screen.getByText("meeting.mp3")).toBeInTheDocument();
    expect(screen.getByText(/42 min/)).toBeInTheDocument();
  });
  it("links to the note detail page", () => {
    renderCard(baseNote);
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "/notes/abc-123");
  });
  it("shows a Failed badge for a failed note", () => {
    renderCard({ ...baseNote, status: "failed" });
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });
  it("calls onToggleFavorite when the star button is clicked, without navigating", () => {
    const onToggleFavorite = vi.fn();
    renderCard(baseNote, { onToggleFavorite });
    screen.getByRole("button", { name: /add to favorites/i }).click();
    expect(onToggleFavorite).toHaveBeenCalledWith("abc-123");
  });
  it("calls onRequestDelete with the full note when the delete button is clicked", () => {
    const onRequestDelete = vi.fn();
    renderCard(baseNote, { onRequestDelete });
    screen.getByRole("button", { name: /delete recording/i }).click();
    expect(onRequestDelete).toHaveBeenCalledWith(baseNote);
  });
});
