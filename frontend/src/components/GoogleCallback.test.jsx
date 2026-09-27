// Tests for the Google redirect handling: state checks, one-time code exchange, and the error states.
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GoogleCallback from "./GoogleCallback.jsx";
import { ToastProvider } from "../context/ToastContext.jsx";
import { consumePendingSignIn, exchangeOnce, readGoogleCallback } from "../utils/googleAuth.js";
const loginWithGoogle = vi.fn();
vi.mock("../context/AuthContext.jsx", () => ({ useAuth: () => ({ loginWithGoogle }) }));
const PENDING_KEY = "audio-notes:google-oauth";
// Renders the callback at the given URL, with a dashboard route to land on.
function renderAt(url) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/" element={<GoogleCallback />} />
          <Route path="/dashboard" element={<p>dashboard page</p>} />
          <Route path="/notes/:id" element={<p>note page</p>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}
describe("googleAuth utils", () => {
  beforeEach(() => sessionStorage.clear());
  it("only treats URLs with code or error as callbacks", () => {
    expect(readGoogleCallback("?foo=1")).toBeNull();
    expect(readGoogleCallback("?code=abc&state=s")).toEqual({ code: "abc", error: null, state: "s" });
    expect(readGoogleCallback("?error=access_denied")).toMatchObject({ error: "access_denied" });
  });
  it("accepts only the state it stored", () => {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state: "good", from: "/notes/1" }));
    expect(consumePendingSignIn("bad")).toBeNull();
    expect(consumePendingSignIn("good")).toEqual({ from: "/notes/1" });
  });
  it("exchanges each code only once", async () => {
    const exchange = vi.fn().mockResolvedValue("ok");
    await Promise.all([exchangeOnce("code-x", exchange), exchangeOnce("code-x", exchange)]);
    expect(exchange).toHaveBeenCalledTimes(1);
  });
});
describe("GoogleCallback", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.clearAllMocks());
  it("signs in and goes to the page the user was headed to", async () => {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state: "st4te", from: "/notes/42" }));
    loginWithGoogle.mockResolvedValue(undefined);
    renderAt("/?code=code-1&state=st4te");
    expect(await screen.findByText("note page")).toBeInTheDocument();
    expect(loginWithGoogle).toHaveBeenCalledWith("code-1");
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
  });
  it("refuses a callback whose state doesn't match", async () => {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state: "mine", from: "/dashboard" }));
    renderAt("/?code=code-2&state=forged");
    expect(await screen.findByText(/invalid or has expired/i)).toBeInTheDocument();
    expect(loginWithGoogle).not.toHaveBeenCalled();
  });
  it("explains when the user cancelled on Google's screen", async () => {
    renderAt("/?error=access_denied&state=x");
    expect(await screen.findByText(/cancelled Google sign-in/i)).toBeInTheDocument();
  });
  it("shows the backend's message when the exchange fails", async () => {
    const { ApiError } = await import("../services/api.js");
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state: "st", from: "/dashboard" }));
    loginWithGoogle.mockRejectedValue(new ApiError("Google sign-in expired or was already used. Please try again.", 401));
    renderAt("/?code=code-3&state=st");
    await waitFor(() => expect(screen.getByText(/already used/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
