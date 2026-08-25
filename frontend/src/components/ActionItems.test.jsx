import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import ActionItems from "./ActionItems.jsx";

describe("ActionItems", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows an empty state when there are no action items", () => {
    render(<ActionItems noteId="note-1" items={[]} />);
    expect(screen.getByText("No action items identified.")).toBeInTheDocument();
  });

  it("renders each item as plain text, without inventing an assignee", () => {
    render(<ActionItems noteId="note-1" items={["Fix the authentication bug"]} />);
    expect(screen.getByText("Fix the authentication bug")).toBeInTheDocument();
  });

  it("checking an item marks it visually complete and persists per-note", () => {
    render(<ActionItems noteId="note-1" items={["Deploy backend"]} />);

    const item = screen.getByRole("button", { name: /deploy backend/i });
    expect(item).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(item);
    expect(item).toHaveAttribute("aria-pressed", "true");
    expect(JSON.parse(localStorage.getItem("audio-notes:checked-items:note-1"))).toEqual(["0"]);
  });

  it("scopes checked state per note id", () => {
    localStorage.setItem("audio-notes:checked-items:note-1", JSON.stringify(["0"]));
    render(<ActionItems noteId="note-2" items={["Some other task"]} />);
    expect(screen.getByRole("button", { name: /some other task/i })).toHaveAttribute("aria-pressed", "false");
  });
});
