// Tests for the LiveRecorder: unsupported browsers, live interim/final text, and saving as a note.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LiveRecorder from "./LiveRecorder.jsx";
import { ToastProvider } from "../context/ToastContext.jsx";
import { createLiveNote } from "../services/api.js";
vi.mock("../services/api.js", async (importOriginal) => ({
  ...(await importOriginal()),
  createLiveNote: vi.fn(),
}));
let instances = [];
// Minimal stand-in for the browser SpeechRecognition that lets tests fire events by hand.
class FakeRecognition {
  constructor() {
    this.start = vi.fn();
    this.stop = vi.fn(() => this.onend?.());
    this.abort = vi.fn();
    instances.push(this);
  }
}
// Builds a SpeechRecognition result event from [text, isFinal] pairs.
function resultEvent(pairs, resultIndex = 0) {
  const results = pairs.map(([transcript, isFinal]) => Object.assign([{ transcript }], { isFinal }));
  return { resultIndex, results };
}
// Renders the recorder inside the toast provider it needs.
function renderRecorder(props = {}) {
  return render(
    <ToastProvider>
      <LiveRecorder {...props} />
    </ToastProvider>
  );
}
describe("LiveRecorder", () => {
  const stopTrack = vi.fn();
  beforeEach(() => {
    instances = [];
    window.SpeechRecognition = FakeRecognition;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] }) },
    });
  });
  afterEach(() => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    vi.clearAllMocks();
  });
  it("tells the user to switch browsers when speech recognition is missing", () => {
    delete window.SpeechRecognition;
    renderRecorder();
    expect(screen.getByRole("alert")).toHaveTextContent(/Chrome, Edge or Safari/);
    expect(screen.queryByRole("button", { name: /start recording/i })).not.toBeInTheDocument();
  });
  it("shows final and interim words live while listening", async () => {
    renderRecorder();
    fireEvent.click(screen.getByRole("button", { name: /start recording/i }));
    await waitFor(() => expect(instances).toHaveLength(1));
    const recognition = instances[0];
    expect(recognition.continuous).toBe(true);
    expect(recognition.interimResults).toBe(true);
    act(() => recognition.onresult(resultEvent([["hello team", true], ["we should", false]])));
    expect(screen.getByText(/hello team/)).toBeInTheDocument();
    expect(screen.getByText("we should")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stop recording/i })).toBeInTheDocument();
  });
  it("restarts recognition when the browser ends a session mid-recording", async () => {
    renderRecorder();
    fireEvent.click(screen.getByRole("button", { name: /start recording/i }));
    await waitFor(() => expect(instances).toHaveLength(1));
    act(() => instances[0].onend());
    expect(instances).toHaveLength(2);
    expect(instances[1].start).toHaveBeenCalled();
  });
  it("lets the user edit the transcript and save it as a note", async () => {
    createLiveNote.mockResolvedValue({ id: "note-1", status: "queued" });
    const onSaved = vi.fn();
    renderRecorder({ onSaved });
    fireEvent.click(screen.getByRole("button", { name: /start recording/i }));
    await waitFor(() => expect(instances).toHaveLength(1));
    act(() => instances[0].onresult(resultEvent([["ship it on friday", true], ["pending", false]])));
    fireEvent.click(screen.getByRole("button", { name: /stop recording/i }));
    const textarea = await screen.findByLabelText(/edit before saving/i);
    expect(textarea).toHaveValue("ship it on friday pending");
    expect(stopTrack).toHaveBeenCalled();
    fireEvent.change(textarea, { target: { value: "Ship it on Friday." } });
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Release call" } });
    fireEvent.click(screen.getByRole("button", { name: /save as note/i }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: "note-1", status: "queued" }));
    expect(createLiveNote).toHaveBeenCalledWith(
      expect.objectContaining({ transcript: "Ship it on Friday.", title: "Release call" })
    );
  });
  it("shows a friendly message when mic access is blocked", async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(new Error("denied"));
    renderRecorder();
    fireEvent.click(screen.getByRole("button", { name: /start recording/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Microphone access was blocked/);
    expect(instances).toHaveLength(0);
  });
});
