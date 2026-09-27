// The only module that talks to the backend API; everything else calls these functions.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
// Digs a readable message out of an error body, handling both plain and Pydantic detail shapes.
async function readErrorMessage(response) {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail) && body.detail[0]?.msg) return body.detail[0].msg;
  } catch {
  }
  return `Request failed (${response.status}). Please try again.`;
}
// Error type that carries the HTTP status alongside the message.
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
let authToken = null;
let onUnauthorized = null;
// Stores the token that every later request should be sent with.
export function setAuthToken(token) {
  authToken = token;
}
// Registers the callback to run when the server rejects our token.
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}
// Performs a request, attaches the token, and turns any failure into an ApiError.
async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("Couldn't reach the server — it may be down or it hit an internal error. Please try again.", 0);
  }
  if (response.status === 401 && authToken) {
    onUnauthorized?.();
  }
  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
  if (response.status === 204) return null;
  return response.json();
}
// Same as request, but sends the body as JSON.
function requestJson(path, options = {}) {
  return request(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
}
// Asks the backend for the Google consent-screen URL, carrying the browser's CSRF state.
export function getGoogleAuthUrl(state) {
  return request(`/auth/google/url?state=${encodeURIComponent(state)}`);
}
// Swaps the one-time code Google sent back for this app's access token.
export function loginWithGoogle(code) {
  return requestJson("/auth/google", { method: "POST", body: JSON.stringify({ code }) });
}
// Fetches the account the current token belongs to.
export function getCurrentUser() {
  return request("/auth/me");
}
// Uploads one audio file as multipart form data.
export function uploadNote(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/notes", { method: "POST", body: formData });
}
// Saves a note transcribed live in the browser, with the recording attached when there is one.
export function createLiveNote({ transcript, title, duration, audioBlob }) {
  const formData = new FormData();
  formData.append("transcript", transcript);
  if (title) formData.append("title", title);
  if (duration) formData.append("duration", String(duration));
  if (audioBlob && audioBlob.size > 0) {
    const extension = audioBlob.type.includes("mp4") ? "mp4" : audioBlob.type.includes("ogg") ? "ogg" : "webm";
    formData.append("file", audioBlob, `live-recording.${extension}`);
  }
  return request("/notes/live", { method: "POST", body: formData });
}
// Fetches a page of the user's notes.
export function listNotes({ limit = 50, offset = 0 } = {}) {
  return request(`/notes?limit=${limit}&offset=${offset}`);
}
// Fetches one note in full.
export function getNote(id) {
  return request(`/notes/${id}`);
}
// Fetches just the processing status of one note, for polling.
export function getNoteStatus(id) {
  return request(`/notes/${id}/status`);
}
// Asks the backend to re-queue a failed note.
export function retryNote(id) {
  return request(`/notes/${id}/retry`, { method: "POST" });
}
// Deletes a note and its stored audio.
export function deleteNote(id) {
  return request(`/notes/${id}`, { method: "DELETE" });
}
