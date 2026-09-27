// Browser side of the Google sign-in redirect: CSRF state, the page to return to, and reading Google's reply.
import { getGoogleAuthUrl } from "../services/api.js";
const PENDING_KEY = "audio-notes:google-oauth";
const exchanges = new Map();
// Makes a random hex string for the OAuth `state` parameter.
function randomState() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
// Remembers the state and return path, then sends the browser to Google's consent screen.
export async function startGoogleSignIn(from = "/dashboard") {
  const state = randomState();
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state, from }));
  const { url } = await getGoogleAuthUrl(state);
  window.location.assign(url);
}
// Reads Google's redirect parameters; returns null when the URL isn't an OAuth callback.
export function readGoogleCallback(search) {
  const params = new URLSearchParams(search);
  const code = params.get("code");
  const error = params.get("error");
  if (!code && !error) return null;
  return { code, error, state: params.get("state") };
}
// Checks the returned state against the one we stored and hands back where the user was headed.
export function consumePendingSignIn(returnedState) {
  let pending = null;
  try {
    pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null");
  } catch {
    pending = null;
  }
  if (!pending || !returnedState || pending.state !== returnedState) return null;
  return { from: pending.from || "/dashboard" };
}
// Clears the stored state once the sign-in has finished either way.
export function clearPendingSignIn() {
  sessionStorage.removeItem(PENDING_KEY);
}
// Runs the code exchange once per code, so React StrictMode's double effect can't spend the code twice.
export function exchangeOnce(code, exchange) {
  if (!exchanges.has(code)) exchanges.set(code, exchange(code));
  return exchanges.get(code);
}
