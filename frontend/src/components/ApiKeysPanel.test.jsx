// Tests for the API keys panel: listing, creating (key shown once with the setup command) and revoking.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ApiKeysPanel, { buildClaudeCommand } from "./ApiKeysPanel.jsx";
import { ToastProvider } from "../context/ToastContext.jsx";
import { createApiKey, listApiKeys, revokeApiKey } from "../services/api.js";
vi.mock("../services/api.js", () => ({
  API_ORIGIN: "https://api.example.com",
  listApiKeys: vi.fn(),
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
}));
const EXISTING = {
  id: "k1",
  name: "Laptop",
  prefix: "an_abcdefg",
  created_at: "2026-11-01T00:00:00Z",
  last_used_at: null,
};
// Renders the panel inside the toast provider it needs.
function renderPanel() {
  return render(
    <ToastProvider>
      <ApiKeysPanel />
    </ToastProvider>
  );
}
describe("ApiKeysPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listApiKeys.mockResolvedValue({ items: [EXISTING] });
  });
  it("lists existing keys by name and prefix only", async () => {
    renderPanel();
    expect(await screen.findByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText(/an_abcdefg… · created/)).toBeInTheDocument();
    expect(screen.getByText(/last used never/)).toBeInTheDocument();
  });
  it("shows a new key once with a ready-made Claude Code command", async () => {
    createApiKey.mockResolvedValue({ ...EXISTING, id: "k2", name: "Claude Code", key: "an_secret123" });
    renderPanel();
    await screen.findByText("Laptop");
    fireEvent.click(screen.getByRole("button", { name: "Create key" }));
    expect(await screen.findByText("an_secret123")).toBeInTheDocument();
    expect(createApiKey).toHaveBeenCalledWith("Claude Code");
    expect(screen.getByText(buildClaudeCommand("an_secret123"))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByText("an_secret123")).not.toBeInTheDocument();
  });
  it("revokes a key after confirmation", async () => {
    revokeApiKey.mockResolvedValue(null);
    renderPanel();
    await screen.findByText("Laptop");
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    expect(screen.getByText("Revoke this API key?")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button", { name: "Revoke" });
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(revokeApiKey).toHaveBeenCalledWith("k1"));
    await waitFor(() => expect(screen.queryByText("Laptop")).not.toBeInTheDocument());
  });
});
describe("buildClaudeCommand", () => {
  it("points uvx at the mcp-server folder and passes the URL and key", () => {
    const command = buildClaudeCommand("an_x");
    expect(command).toContain("-e AUDIONOTES_API_URL=https://api.example.com");
    expect(command).toContain("-e AUDIONOTES_API_KEY=an_x");
    expect(command).toContain("#subdirectory=mcp-server audionotes-mcp");
  });
});
